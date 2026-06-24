import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const DEMO_SCHOOL_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_SCHOOL_SLUG = "DEMO";

async function ensureStaff(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "bursar"]).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: staff role required");
  return data.role as "admin" | "bursar";
}

// Search by matricule
export const searchByMatricule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matricule: z.string().trim().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("students")
      .select("id, full_name, matricule, application_status, is_registered, tuition_paid, gender, date_of_birth, parent_phone, classes(name)")
      .ilike("matricule", `%${data.matricule}%`).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// Pending approvals
export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("students")
      .select("id, full_name, gender, date_of_birth, parent_phone, created_at, classes(name)")
      .eq("school_id", DEMO_SCHOOL_ID).eq("application_status", "PENDING_REVIEW")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Approved but not yet registered (awaiting registration payment)
export const listAwaitingPayment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("students")
      .select("id, full_name, parent_phone, classes(name)")
      .eq("school_id", DEMO_SCHOOL_ID).eq("application_status", "APPROVED").eq("is_registered", false)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Approve / Reject
export const decideApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    student_id: z.string().uuid(),
    status: z.enum(["APPROVED", "REJECTED"]),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("students")
      .update({ application_status: data.status }).eq("id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Record payment (simulated). Used by bursar (and parent via portal.functions).
export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    student_id: z.string().uuid(),
    type: z.enum(["REGISTRATION", "TUITION"]),
    amount: z.number().positive(),
    payment_method: z.enum(["CASH", "MTN_MOMO", "ORANGE_MONEY", "BANK"]),
    payment_phone: z.string().trim().max(40).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureStaff(context.userId);
    return await performPayment(data);
  });

// Recent settlements
export const listSettlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("financial_transactions")
      .select("id, amount, type, payment_method, reference, created_at, students(full_name, matricule, classes(name))")
      .eq("school_id", DEMO_SCHOOL_ID).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Counters for the dashboard
export const getBursarCounters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [pending, awaiting] = await Promise.all([
      supabaseAdmin.from("students").select("*", { count: "exact", head: true })
        .eq("school_id", DEMO_SCHOOL_ID).eq("application_status", "PENDING_REVIEW"),
      supabaseAdmin.from("students").select("*", { count: "exact", head: true })
        .eq("school_id", DEMO_SCHOOL_ID).eq("application_status", "APPROVED").eq("is_registered", false),
    ]);
    return { pending: pending.count ?? 0, awaiting: awaiting.count ?? 0 };
  });

// Get receipt content for reprint
export const getReceipt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ transaction_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tx, error } = await supabaseAdmin.from("financial_transactions")
      .select("id, amount, type, payment_method, reference, created_at, payment_phone, students(full_name, matricule, classes(name))")
      .eq("id", data.transaction_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!tx) throw new Error("Transaction not found");
    return tx;
  });

// Shared payment logic — also called from portal (parent-initiated)
export async function performPayment(data: {
  student_id: string;
  type: "REGISTRATION" | "TUITION";
  amount: number;
  payment_method: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | "BANK";
  payment_phone?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: student, error: sErr } = await supabaseAdmin
    .from("students").select("*, classes(name)").eq("id", data.student_id).maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!student) throw new Error("Student not found");
  if (student.application_status !== "APPROVED")
    throw new Error("Application must be approved before payment");
  if (data.type === "REGISTRATION" && student.is_registered)
    throw new Error("This student is already registered — registration cannot be paid twice.");
  if (data.type === "TUITION") {
    // Compute tuition fee + already-paid so we can reject overpay client-side too
    // (the DB trigger also enforces this — belt and braces).
    const { data: cfg } = await supabaseAdmin
      .from("school_configs").select("fee_structure, uniform_tuition_fee")
      .eq("school_id", student.school_id).maybeSingle();
    let fee = Number(cfg?.uniform_tuition_fee ?? 0);
    if (cfg?.fee_structure === "SEGMENTED" && student.class_id) {
      const { data: cls } = await supabaseAdmin
        .from("classes").select("segmented_tuition_fee").eq("id", student.class_id).maybeSingle();
      if (cls?.segmented_tuition_fee != null) fee = Number(cls.segmented_tuition_fee);
    }
    const paid = Number(student.tuition_paid);
    const remaining = Math.max(0, fee - paid);
    if (remaining <= 0) throw new Error("Tuition is already fully paid for this student.");
    if (data.amount > remaining) throw new Error(`Amount exceeds remaining tuition (${remaining.toLocaleString()} XAF left).`);
  }

  const reference = "TX-" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const { data: tx, error: tErr } = await supabaseAdmin
    .from("financial_transactions").insert({
      school_id: DEMO_SCHOOL_ID, student_id: data.student_id,
      amount: data.amount, type: data.type,
      payment_method: data.payment_method,
      payment_phone: data.payment_phone ?? null,
      status: "SUCCESS", reference,
    }).select("id").single();
  if (tErr) throw new Error(tErr.message);

  if (data.type === "REGISTRATION" && !student.is_registered) {
    const { data: matRes, error: mErr } = await supabaseAdmin
      .rpc("generate_matricule", { _school_slug: DEMO_SCHOOL_SLUG });
    if (mErr) throw new Error(mErr.message);
    await supabaseAdmin.from("students").update({
      is_registered: true, matricule: matRes as unknown as string,
    }).eq("id", data.student_id);
  } else if (data.type === "TUITION") {
    const newPaid = Number(student.tuition_paid) + data.amount;
    await supabaseAdmin.from("students").update({ tuition_paid: newPaid }).eq("id", data.student_id);
  }

  return { transaction_id: tx.id, reference };
}

// Registered + approved students with their tuition computation.
// Bursar UI uses this to render the clickable "Registered Students" table.
export const listRegisteredStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [studentsRes, cfgRes] = await Promise.all([
      supabaseAdmin.from("students")
        .select("id, full_name, matricule, parent_phone, tuition_paid, class_id, application_status, is_registered, classes(name, segmented_tuition_fee)")
        .eq("school_id", DEMO_SCHOOL_ID).eq("application_status", "APPROVED").eq("is_registered", true)
        .order("full_name", { ascending: true }),
      supabaseAdmin.from("school_configs").select("fee_structure, uniform_tuition_fee, currency")
        .eq("school_id", DEMO_SCHOOL_ID).maybeSingle(),
    ]);
    if (studentsRes.error) throw new Error(studentsRes.error.message);
    const cfg = cfgRes.data;
    const segmented = cfg?.fee_structure === "SEGMENTED";
    return (studentsRes.data ?? []).map((s: any) => {
      const fee = segmented && s.classes?.segmented_tuition_fee != null
        ? Number(s.classes.segmented_tuition_fee) : Number(cfg?.uniform_tuition_fee ?? 0);
      const paid = Number(s.tuition_paid);
      return {
        id: s.id, full_name: s.full_name, matricule: s.matricule,
        parent_phone: s.parent_phone, class_id: s.class_id,
        class_name: s.classes?.name ?? null,
        tuition_fee: fee, tuition_paid: paid,
        tuition_owed: Math.max(0, fee - paid),
        currency: cfg?.currency ?? "XAF",
        is_registered: true,
      };
    });
  });
