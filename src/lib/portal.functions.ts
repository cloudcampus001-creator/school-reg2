import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const DEMO_SCHOOL_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_SCHOOL_SLUG = "DEMO";

function getClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const phoneRe = /^[+0-9\s\-()]{6,20}$/;

export const getSchoolBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getClient();
  const [schoolRes, configRes, classesRes] = await Promise.all([
    sb.from("schools").select("id, name, slug").eq("id", DEMO_SCHOOL_ID).maybeSingle(),
    sb.from("school_configs").select("*").eq("school_id", DEMO_SCHOOL_ID).maybeSingle(),
    sb.from("classes").select("id, name, sort_order").eq("school_id", DEMO_SCHOOL_ID).order("sort_order"),
  ]);
  if (schoolRes.error) throw new Error(schoolRes.error.message);
  if (configRes.error) throw new Error(configRes.error.message);
  if (classesRes.error) throw new Error(classesRes.error.message);
  return { school: schoolRes.data!, config: configRes.data!, classes: classesRes.data ?? [] };
});

const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  place_of_birth: z.string().trim().max(120).optional(),
  parent_phone: z.string().trim().regex(phoneRe),
  class_id: z.string().uuid(),
});

export const registerStudent = createServerFn({ method: "POST" })
  .inputValidator((d) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getClient();
    const { data: row, error } = await sb.from("students").insert({
      school_id: DEMO_SCHOOL_ID, class_id: data.class_id,
      full_name: data.full_name, gender: data.gender,
      date_of_birth: data.date_of_birth, place_of_birth: data.place_of_birth ?? null,
      parent_phone: data.parent_phone,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getStudent = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getClient();
    const { data: row, error } = await sb.from("students")
      .select("id, full_name, gender, date_of_birth, place_of_birth, parent_phone, matricule, application_status, is_registered, tuition_paid, class_id, classes(name)")
      .eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const recoverByPhone = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().trim().regex(phoneRe) }).parse(d))
  .handler(async ({ data }) => {
    const sb = getClient();
    const { data: rows, error } = await sb.from("students")
      .select("id, full_name, matricule, application_status, classes(name)")
      .eq("parent_phone", data.phone).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const computeFees = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ student_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getClient();
    const [studentRes, configRes] = await Promise.all([
      sb.from("students").select("id, class_id, tuition_paid, is_registered").eq("id", data.student_id).maybeSingle(),
      sb.from("school_configs").select("*").eq("school_id", DEMO_SCHOOL_ID).maybeSingle(),
    ]);
    if (studentRes.error) throw new Error(studentRes.error.message);
    if (configRes.error) throw new Error(configRes.error.message);
    const s = studentRes.data!;
    const cfg = configRes.data!;
    return {
      currency: cfg.currency,
      registration_fee: Number(cfg.uniform_registration_fee),
      tuition_fee: Number(cfg.uniform_tuition_fee),
      tuition_paid: Number(s.tuition_paid),
      tuition_owed: Math.max(0, Number(cfg.uniform_tuition_fee) - Number(s.tuition_paid)),
      is_registered: s.is_registered,
    };
  });

// Parent-initiated payment (no auth required, but only if application is APPROVED).
// Reuses the same writing logic from bursar.functions.performPayment via direct admin client.
export const parentPay = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    student_id: z.string().uuid(),
    type: z.enum(["REGISTRATION", "TUITION"]),
    amount: z.number().positive().max(10_000_000),
    payment_method: z.enum(["MTN_MOMO", "ORANGE_MONEY"]),
    payment_phone: z.string().trim().regex(phoneRe),
  }).parse(d))
  .handler(async ({ data }) => {
    const { performPayment } = await import("@/lib/bursar.functions");
    return await performPayment(data);
  });
