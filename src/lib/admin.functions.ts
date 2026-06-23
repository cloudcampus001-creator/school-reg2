import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const DEMO_SCHOOL_ID = "11111111-1111-1111-1111-111111111111";

async function ensureAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

// Current user's role (admin | bursar | null) — used by UI to route
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles").select("role, full_name")
      .eq("user_id", context.userId).limit(1).maybeSingle();
    const { count } = await supabaseAdmin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    return {
      role: (data?.role ?? null) as "admin" | "bursar" | null,
      full_name: data?.full_name ?? null,
      adminCount: count ?? 0,
    };
  });

// First-admin self-grant
export const claimAdminIfNone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists.");
    const { error } = await supabaseAdmin.from("user_roles").insert({
      user_id: context.userId, role: "admin", school_id: DEMO_SCHOOL_ID, full_name: "School Administrator",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ DASHBOARD SUMMARY ============
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [txRes, studentsRes] = await Promise.all([
      supabaseAdmin.from("financial_transactions").select("amount").eq("school_id", DEMO_SCHOOL_ID),
      supabaseAdmin.from("students").select("application_status, is_registered").eq("school_id", DEMO_SCHOOL_ID),
    ]);
    const tx = txRes.data ?? [];
    const students = studentsRes.data ?? [];
    return {
      grossRevenue: tx.reduce((s, t) => s + Number(t.amount), 0),
      registeredActive: students.filter(s => s.is_registered).length,
      pendingAction: students.filter(s => s.application_status === "PENDING_REVIEW").length,
      totalStudents: students.length,
    };
  });

// ============ FINANCIAL RULES ENGINE ============
export const getSchoolConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("school_configs").select("*").eq("school_id", DEMO_SCHOOL_ID).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateSchoolConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    fee_structure: z.enum(["UNIFORM", "SEGMENTED"]),
    uniform_registration_fee: z.number().min(0),
    uniform_tuition_fee: z.number().min(0),
    settlement_account: z.string().trim().max(120).nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("school_configs").update({
      fee_structure: data.fee_structure,
      uniform_registration_fee: data.uniform_registration_fee,
      uniform_tuition_fee: data.uniform_tuition_fee,
      settlement_account: data.settlement_account ?? null,
    }).eq("school_id", DEMO_SCHOOL_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ CLASSES ============
export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("classes")
      .select("id, name, sort_order").eq("school_id", DEMO_SCHOOL_ID).order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: maxRow } = await supabaseAdmin.from("classes")
      .select("sort_order").eq("school_id", DEMO_SCHOOL_ID).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const next = (maxRow?.sort_order ?? 0) + 1;
    const { error } = await supabaseAdmin.from("classes")
      .insert({ school_id: DEMO_SCHOOL_ID, name: data.name, sort_order: next });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ BURSAR PROVISIONING ============
export const listBursars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("user_roles")
      .select("user_id, full_name, created_at").eq("role", "bursar").eq("school_id", DEMO_SCHOOL_ID)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // also fetch emails via admin api
    const enriched: any[] = [];
    for (const r of data ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      enriched.push({ ...r, email: u.user?.email ?? null });
    }
    return enriched;
  });

export const createBursar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    full_name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(72),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.full_name, role: "bursar" },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: uid, role: "bursar", school_id: DEMO_SCHOOL_ID, full_name: data.full_name,
    });
    if (rErr) throw new Error(rErr.message);
    return { ok: true };
  });

// ============ STUDENT LEDGER ============
export const listStudentLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ class_id: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("students")
      .select("id, full_name, matricule, application_status, is_registered, tuition_paid, class_id, classes(name)")
      .eq("school_id", DEMO_SCHOOL_ID).order("created_at", { ascending: false });
    if (data.class_id) q = q.eq("class_id", data.class_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ REVENUE BY PAYMENT ROUTE ============
// Buckets transactions into MOMO (MTN/Orange), CASH, BANK so the admin can
// see how much money came through each route.
export const getRevenueByRoute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("financial_transactions")
      .select("amount, type, payment_method, status")
      .eq("school_id", DEMO_SCHOOL_ID)
      .eq("status", "SUCCESS");
    if (error) throw new Error(error.message);
    const buckets = {
      MOMO:  { total: 0, registration: 0, tuition: 0, count: 0 },
      CASH:  { total: 0, registration: 0, tuition: 0, count: 0 },
      BANK:  { total: 0, registration: 0, tuition: 0, count: 0 },
    } as Record<"MOMO" | "CASH" | "BANK", { total: number; registration: number; tuition: number; count: number }>;
    for (const t of data ?? []) {
      const amt = Number(t.amount);
      const bucket: "MOMO" | "CASH" | "BANK" =
        t.payment_method === "CASH" ? "CASH"
        : t.payment_method === "BANK" ? "BANK"
        : "MOMO";
      buckets[bucket].total += amt;
      buckets[bucket].count += 1;
      if (t.type === "REGISTRATION") buckets[bucket].registration += amt;
      else if (t.type === "TUITION") buckets[bucket].tuition += amt;
    }
    const grand = buckets.MOMO.total + buckets.CASH.total + buckets.BANK.total;
    return { buckets, grand };
  });
