import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, GraduationCap, Search, UserPlus, CheckCircle2, Clock, XCircle, Loader2, Wallet, Printer,
} from "lucide-react";
import {
  getSchoolBootstrap, registerStudent, getStudent, recoverByPhone, computeFees, parentPay,
  findStudentForPayment,
} from "@/lib/portal.functions";
import { supabase } from "@/integrations/supabase/client";
import { printReceipt } from "@/lib/receipt";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Parent Portal — SchoolConnect" },
      { name: "description", content: "Register your child, check status, and pay fees." },
    ],
  }),
  component: Portal,
});

const STORAGE_KEY = "edu_app_id";
type Mode = "home" | "register" | "status" | "recover" | "paytuition";

function Portal() {
  const [mode, setMode] = useState<Mode>("home");
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id) { setStudentId(id); setMode("status"); }
  }, []);

  function gotoStatus(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setStudentId(id); setMode("status");
  }
  function clearSession() {
    localStorage.removeItem(STORAGE_KEY); setStudentId(null); setMode("home");
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg hero-gradient">
            <GraduationCap className="h-5 w-5" />
          </span>
          SchoolConnect
        </Link>
        {mode !== "home" && mode !== "status" && (
          <button className="btn-ghost" onClick={() => setMode("home")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-16">
        {mode === "home" && <Home onChoose={setMode} hasSession={!!studentId} resume={() => setMode("status")} />}
        {mode === "register" && <RegisterForm onSuccess={gotoStatus} />}
        {mode === "status" && studentId && <Status studentId={studentId} onClear={clearSession} />}
        {mode === "recover" && <Recover />}
        {mode === "paytuition" && <PayTuitionFlow />}
      </main>
    </div>
  );
}

function Home({ onChoose, hasSession, resume }: { onChoose: (m: Mode) => void; hasSession: boolean; resume: () => void }) {
  return (
    <div className="card-surface p-8">
      <h1 className="text-3xl font-bold">Welcome, parent.</h1>
      <p className="mt-1 text-muted-foreground">What would you like to do today?</p>
      {hasSession && (
        <button onClick={resume} className="mt-6 w-full text-left card-surface p-4 hover:border-primary transition flex items-center justify-between">
          <div>
            <div className="font-semibold">Resume my application</div>
            <div className="text-sm text-muted-foreground">Continue where you left off</div>
          </div>
          <Clock className="h-5 w-5 text-primary" />
        </button>
      )}
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        <button onClick={() => onChoose("register")} className="card-surface p-5 text-left hover:border-primary transition">
          <UserPlus className="h-6 w-6 text-primary" />
          <div className="mt-3 font-semibold">Register a student</div>
          <div className="text-sm text-muted-foreground">Submit a new application</div>
        </button>
        <button onClick={() => onChoose("paytuition")} className="card-surface p-5 text-left hover:border-primary transition">
          <Wallet className="h-6 w-6 text-primary" />
          <div className="mt-3 font-semibold">Pay tuition fee</div>
          <div className="text-sm text-muted-foreground">By matricule or parent phone</div>
        </button>
        <button onClick={() => onChoose("recover")} className="card-surface p-5 text-left hover:border-primary transition">
          <Search className="h-6 w-6 text-primary" />
          <div className="mt-3 font-semibold">Recover matricule</div>
          <div className="text-sm text-muted-foreground">Look up by phone number</div>
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium">{label}</span><div className="mt-1">{children}</div></label>;
}

function RegisterForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const bootstrap = useServerFn(getSchoolBootstrap);
  const register = useServerFn(registerStudent);
  const { data, isLoading } = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootstrap() });
  const m = useMutation({
    mutationFn: (vars: any) => register({ data: vars }),
    onSuccess: (res) => { toast.success("Application submitted! Awaiting school verification."); onSuccess(res.id); },
    onError: (e: any) => toast.error(e.message),
  });
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    m.mutate({
      full_name: String(fd.get("full_name") || ""),
      gender: String(fd.get("gender") || "MALE"),
      date_of_birth: String(fd.get("date_of_birth") || ""),
      place_of_birth: String(fd.get("place_of_birth") || ""),
      parent_phone: String(fd.get("parent_phone") || ""),
      class_id: String(fd.get("class_id") || ""),
    });
  }
  if (isLoading) return <div className="card-surface p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;
  return (
    <div className="card-surface p-8">
      <h1 className="text-2xl font-bold">Student application</h1>
      <p className="mt-1 text-sm text-muted-foreground">Demo Academy · {data?.classes.length} classes available</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <Field label="Full name"><input name="full_name" required className="input-field" placeholder="e.g. Awa Mbeng" /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Gender"><select name="gender" required className="input-field">
            <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select>
          </Field>
          <Field label="Date of birth"><input name="date_of_birth" type="date" required className="input-field" /></Field>
        </div>
        <Field label="Place of birth"><input name="place_of_birth" className="input-field" placeholder="e.g. Yaoundé" /></Field>
        <Field label="Parent phone"><input name="parent_phone" type="tel" required className="input-field" placeholder="+237 6XX XXX XXX" /></Field>
        <Field label="Class"><select name="class_id" required className="input-field">
          <option value="">Select a class</option>
          {data?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></Field>
        <button disabled={m.isPending} className="btn-primary mt-2">
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
        </button>
      </form>
    </div>
  );
}

function Status({ studentId, onClear }: { studentId: string; onClear: () => void }) {
  const get = useServerFn(getStudent);
  const compute = useServerFn(computeFees);
  const qc = useQueryClient();
  const { data: student, isLoading } = useQuery({ queryKey: ["student", studentId], queryFn: () => get({ data: { id: studentId } }) });
  const { data: fees } = useQuery({ queryKey: ["fees", studentId], queryFn: () => compute({ data: { student_id: studentId } }), enabled: !!student });
  const [payOpen, setPayOpen] = useState<"REGISTRATION" | "TUITION" | null>(null);

  useEffect(() => {
    const ch = supabase.channel("st-" + studentId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "students", filter: `id=eq.${studentId}` },
        () => { qc.invalidateQueries({ queryKey: ["student", studentId] }); qc.invalidateQueries({ queryKey: ["fees", studentId] }); toast.message("Application updated"); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [studentId, qc]);

  if (isLoading) return <div className="card-surface p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;
  if (!student) return <div className="card-surface p-8">Application not found. <button onClick={onClear} className="text-primary underline">Start over</button></div>;

  const status = student.application_status;
  const chip = status === "APPROVED" ? "chip-success" : status === "REJECTED" ? "chip-danger" : "chip-warning";
  const Icon = status === "APPROVED" ? CheckCircle2 : status === "REJECTED" ? XCircle : Clock;

  return (
    <div className="space-y-4">
      <div className="card-surface p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Application</div>
            <h1 className="mt-1 text-2xl font-bold">{student.full_name}</h1>
            <div className="text-sm text-muted-foreground">{student.classes?.name} · {student.gender}</div>
          </div>
          <span className={chip}><Icon className="h-3.5 w-3.5" />{status.replace("_"," ")}</span>
        </div>

        {status === "PENDING_REVIEW" && (
          <div className="mt-6 rounded-lg bg-primary-soft border border-primary/20 p-4 text-sm">
            <strong>Awaiting bursar verification.</strong> You'll see updates here as soon as your application is reviewed.
          </div>
        )}
        {status === "REJECTED" && (
          <div className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm">
            Your application was not approved. Please contact the school.
          </div>
        )}
        {status === "APPROVED" && fees && (
          <>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <Stat label="Matricule" value={student.matricule ?? "—"} mono />
              <Stat label="Registered" value={student.is_registered ? "Yes" : "Pending payment"} />
              <Stat label="Registration fee" value={`${fees.registration_fee.toLocaleString()} ${fees.currency}`} />
              <Stat label="Tuition" value={`${Number(student.tuition_paid).toLocaleString()} / ${fees.tuition_fee.toLocaleString()} ${fees.currency}`} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {!student.is_registered && (
                <button onClick={() => setPayOpen("REGISTRATION")} className="btn-primary">
                  <Wallet className="h-4 w-4" /> Pay registration · {fees.registration_fee.toLocaleString()} XAF
                </button>
              )}
              {student.is_registered && fees.tuition_owed > 0 && (
                <button onClick={() => setPayOpen("TUITION")} className="btn-primary"><Wallet className="h-4 w-4" /> Pay tuition</button>
              )}
              {student.is_registered && fees.tuition_owed === 0 && (
                <span className="chip-success"><CheckCircle2 className="h-3.5 w-3.5" /> Tuition fully paid</span>
              )}
              <span className="text-xs text-muted-foreground self-center">Or leave it — the bursar can collect at the desk.</span>
            </div>
          </>
        )}

        <button onClick={onClear} className="btn-ghost mt-6 text-sm text-muted-foreground">Switch to another student</button>
      </div>

      {payOpen && fees && (
        <ParentPayDialog
          student={student} type={payOpen}
          amount={payOpen === "REGISTRATION" ? fees.registration_fee : fees.tuition_owed}
          locked={payOpen === "REGISTRATION"}
          onClose={() => setPayOpen(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-lg bg-muted p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={"font-semibold " + (mono ? "font-mono" : "")}>{value}</div>
  </div>;
}

function ParentPayDialog({ student, type, amount: initialAmount, locked, onClose }: {
  student: any; type: "REGISTRATION" | "TUITION"; amount: number; locked?: boolean; onClose: () => void;
}) {
  const fn = useServerFn(parentPay);
  const qc = useQueryClient();
  const [amount, setAmount] = useState(initialAmount);
  const [method, setMethod] = useState<"MTN_MOMO" | "ORANGE_MONEY">("MTN_MOMO");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string } | null>(null);

  async function submit() {
    if (!phone) return toast.error("Enter the MoMo number");
    if (amount <= 0) return toast.error("Amount must be greater than 0");
    setBusy(true);
    try {
      const res: any = await fn({ data: { student_id: student.id, type, amount, payment_method: method, payment_phone: phone } });
      setDone({ reference: res.reference });
      toast.success("Payment successful · sent to bursar's receipt printer");
      qc.invalidateQueries();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  function reprintHere() {
    if (!done) return;
    printReceipt({
      reference: done.reference, created_at: new Date().toISOString(), type, amount,
      payment_method: method, payment_phone: phone,
      student_name: student.full_name, student_matricule: student.matricule,
      class_name: student.classes?.name,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="card-surface p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        {!done ? (
          <>
            <h3 className="font-semibold text-lg">Pay {type === "REGISTRATION" ? "registration" : "tuition"}</h3>
            <div className="mt-4 grid gap-3">
              <Field label="Amount (XAF)"><input type="number" className="input-field" value={amount} disabled={locked} onChange={e => setAmount(Number(e.target.value))} /></Field>
              <Field label="Payment method">
                <div className="grid grid-cols-2 gap-2">
                  {(["MTN_MOMO","ORANGE_MONEY"] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMethod(m)}
                      className={"rounded-lg border-2 p-3 text-sm font-semibold transition " + (method === m ? "border-primary bg-primary-soft" : "border-border bg-surface")}>
                      {m === "MTN_MOMO" ? "MTN MoMo" : "Orange Money"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Mobile number"><input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" /></Field>
              <div className="flex gap-2 mt-2">
                <button disabled={busy} onClick={submit} className="btn-primary flex-1">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${amount.toLocaleString()} XAF`}</button>
                <button onClick={onClose} className="btn-ghost">Cancel</button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Simulated payment. The bursar will print your official receipt at the school.</p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h2 className="mt-2 text-xl font-bold">Payment received</h2>
            <p className="text-sm text-muted-foreground">Reference {done.reference}</p>
            <p className="mt-3 text-sm">Your receipt will be printed at the bursar's desk. You can also print a copy from here:</p>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={reprintHere} className="btn-outline"><Printer className="h-4 w-4" /> Print copy</button>
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Recover() {
  const fn = useServerFn(recoverByPhone);
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!phone) return;
    setBusy(true);
    try { setRows(await fn({ data: { phone } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card-surface p-8">
      <h1 className="text-2xl font-bold">Recover matricule</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter the parent phone used during registration.</p>
      <div className="mt-5 flex gap-2">
        <input className="input-field flex-1" placeholder="+237 6XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
        <button onClick={go} disabled={busy} className="btn-primary"><Search className="h-4 w-4" /> Search</button>
      </div>
      {rows && (
        <div className="mt-6 grid gap-2">
          {rows.length === 0 && <div className="text-sm text-muted-foreground">No applications found for that number.</div>}
          {rows.map(r => (
            <div key={r.id} className="border border-border rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold">{r.full_name}</div>
                <div className="text-sm text-muted-foreground">{r.classes?.name}</div>
                <div className="font-mono text-xs mt-1">{r.matricule ?? "no matricule yet"}</div>
              </div>
              <span className={r.application_status === "APPROVED" ? "chip-success" : "chip-warning"}>{r.application_status.replace("_"," ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * PAY TUITION FLOW — standalone, no session required.
 * Step 1: lookup by matricule (or phone if unknown)
 * Step 2: confirm "This is my child"
 * Step 3: pay (partial allowed) via ParentPayDialog
 * Realtime subscription keeps balance live during the flow.
 * ========================================================= */
function PayTuitionFlow() {
  const lookup = useServerFn(findStudentForPayment);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"matricule" | "phone">("matricule");
  const [matricule, setMatricule] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<any | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Live updates for the picked student so balance stays fresh.
  useEffect(() => {
    if (!picked?.id) return;
    const ch = supabase.channel("pt-" + picked.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "students", filter: `id=eq.${picked.id}` }, async () => {
        const fresh: any[] = await lookup({ data: { matricule: picked.matricule ?? undefined, phone: picked.matricule ? undefined : picked.parent_phone } });
        const updated = fresh.find(r => r.id === picked.id);
        if (updated) setPicked(updated);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [picked?.id, picked?.matricule, lookup]);

  async function go() {
    setBusy(true); setResults(null); setPicked(null); setConfirmed(false);
    try {
      const payload = mode === "matricule" ? { matricule: matricule.trim() } : { phone: phone.trim() };
      const rows: any[] = await lookup({ data: payload });
      setResults(rows);
      if (rows.length === 1) setPicked(rows[0]);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  // Adapter for ParentPayDialog (expects student shape with classes.name)
  function pickedAsStudent() {
    return picked ? {
      id: picked.id, full_name: picked.full_name, matricule: picked.matricule,
      classes: { name: picked.class_name },
    } : null;
  }

  return (
    <div className="card-surface p-8">
      <h1 className="text-2xl font-bold">Pay tuition fee</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the student's matricule. No matricule? Use the phone number you registered with.
      </p>

      <div className="mt-5 grid gap-3">
        <div className="flex gap-2 text-sm">
          <button onClick={() => setMode("matricule")}
            className={"px-3 py-1.5 rounded-md border " + (mode === "matricule" ? "border-primary bg-primary-soft" : "border-border")}>
            By matricule
          </button>
          <button onClick={() => setMode("phone")}
            className={"px-3 py-1.5 rounded-md border " + (mode === "phone" ? "border-primary bg-primary-soft" : "border-border")}>
            By phone number
          </button>
        </div>
        {mode === "matricule" ? (
          <div className="flex gap-2">
            <input className="input-field flex-1" placeholder="e.g. DEMO-26-0001"
              value={matricule} onChange={e => setMatricule(e.target.value)}
              onKeyDown={e => e.key === "Enter" && go()} />
            <button onClick={go} disabled={busy || !matricule.trim()} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" /> Find</>}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input className="input-field flex-1" type="tel" placeholder="+237 6XX XXX XXX"
              value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && go()} />
            <button onClick={go} disabled={busy || !phone.trim()} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" /> Find</>}
            </button>
          </div>
        )}
      </div>

      {results && results.length === 0 && (
        <div className="mt-5 text-sm text-muted-foreground">No matching student. Check the matricule or phone and try again.</div>
      )}

      {results && results.length > 1 && !picked && (
        <div className="mt-5 grid gap-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Which child?</div>
          {results.map(r => (
            <button key={r.id} onClick={() => setPicked(r)}
              className="text-left border border-border rounded-lg p-4 hover:border-primary transition">
              <div className="font-semibold">{r.full_name}</div>
              <div className="text-sm text-muted-foreground">{r.class_name ?? "—"} · {r.matricule ?? "no matricule"}</div>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <div className="mt-6 rounded-lg border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Confirm</div>
          <div className="mt-1 text-xl font-bold">{picked.full_name}</div>
          <div className="text-sm text-muted-foreground">{picked.class_name ?? "—"} · {picked.matricule ?? "no matricule yet"}</div>

          {picked.application_status !== "APPROVED" || !picked.is_registered ? (
            <div className="mt-4 rounded-md bg-warning/10 border border-warning/30 p-3 text-sm">
              This student is not yet approved & registered. The bursar must complete registration before tuition can be paid.
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-muted p-3"><div className="text-xs text-muted-foreground">Total fee</div><div className="font-semibold">{picked.tuition_fee.toLocaleString()} {picked.currency}</div></div>
                <div className="rounded-md bg-muted p-3"><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold">{picked.tuition_paid.toLocaleString()} {picked.currency}</div></div>
                <div className="rounded-md bg-muted p-3"><div className="text-xs text-muted-foreground">Remaining</div><div className="font-semibold">{picked.tuition_owed.toLocaleString()} {picked.currency}</div></div>
              </div>
              {picked.tuition_owed === 0 ? (
                <div className="mt-4 chip-success"><CheckCircle2 className="h-3.5 w-3.5" /> Tuition fully paid</div>
              ) : !confirmed ? (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setConfirmed(true)} className="btn-primary">Yes, this is my child — continue</button>
                  <button onClick={() => { setPicked(null); setConfirmed(false); }} className="btn-ghost">Pick another</button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {picked && confirmed && picked.tuition_owed > 0 && pickedAsStudent() && (
        <ParentPayDialog
          student={pickedAsStudent()!}
          type="TUITION"
          amount={picked.tuition_owed}
          onClose={() => {
            setConfirmed(false);
            // Refresh after dialog close
            qc.invalidateQueries();
            go();
          }}
        />
      )}
    </div>
  );
}
