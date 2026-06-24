import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  GraduationCap, LogOut, Loader2, Search, ShieldAlert, CheckCircle2, XCircle,
  Clock, Printer, ShieldCheck, Wallet, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/admin.functions";
import {
  searchByMatricule, listPendingApprovals, listAwaitingPayment, decideApplication,
  recordPayment, listSettlements, getBursarCounters, getReceipt, listRegisteredStudents,
} from "@/lib/bursar.functions";
import { printReceipt } from "@/lib/receipt";
import { useT, LangSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/bursar")({
  head: () => ({ meta: [{ title: "Bursar Workstation · SchoolConnect" }] }),
  component: BursarPage,
});

function BursarPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else setReady(true);
    });
  }, [navigate]);
  if (!ready) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <BursarShell />;
}

function BursarShell() {
  const t = useT();
  const navigate = useNavigate();
  const roleFn = useServerFn(getMyRole);
  const qc = useQueryClient();
  const { data: role, isLoading } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });

  useEffect(() => {
    if (role?.role === "admin") navigate({ to: "/admin", replace: true });
  }, [role, navigate]);

  useEffect(() => {
    const ch = supabase.channel("bursar-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => qc.invalidateQueries())
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, () => qc.invalidateQueries())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (role?.role !== "bursar") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="card-surface p-8 text-center max-w-md">
          <ShieldAlert className="h-10 w-10 text-warning mx-auto" />
          <h1 className="mt-3 text-xl font-bold">{t("Bursar access required")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("Ask the school administrator to deploy a bursar account for you.")}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <LangSwitcher />
            <button onClick={signOut} className="btn-ghost">{t("Sign out")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg hero-gradient">
              <GraduationCap className="h-5 w-5" />
            </span>
            {t("Bursar Workstation")}
          </Link>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <LangSwitcher />
            <span className="chip-success hidden md:inline-flex"><ShieldCheck className="h-3.5 w-3.5" /> {t("Audited Engine · Live")}</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">{role.full_name}</span>
            <button onClick={signOut} className="btn-ghost"><LogOut className="h-4 w-4" /> {t("Sign out")}</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <MatriculeSearch cashier={role.full_name ?? "Bursar"} />
        <Counters />
        <PendingApprovalsSection />
        <AwaitingPaymentSection cashier={role.full_name ?? "Bursar"} />
        <RegisteredStudentsSection cashier={role.full_name ?? "Bursar"} />
        <SettlementLedger cashier={role.full_name ?? "Bursar"} />
      </main>
    </div>
  );
}

function MatriculeSearch({ cashier }: { cashier: string }) {
  const t = useT();
  const fn = useServerFn(searchByMatricule);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);

  async function go() {
    if (!q.trim()) return;
    setBusy(true);
    try { setResult(await fn({ data: { matricule: q.trim() } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">1 · {t("Direct Matricule Ledger Search")}</h2>
      <div className="card-surface p-5">
        <div className="flex gap-2">
          <input className="input-field flex-1" placeholder={t("Matricule") + " e.g. DEMO-26-0001"} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
          <button onClick={go} disabled={busy} className="btn-primary"><Search className="h-4 w-4" /> {t("Search Network")}</button>
        </div>
        {result === null && !busy && q && <div className="mt-3 text-sm text-muted-foreground">{t("No matching student.")}</div>}
        {result && (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{t("Student")}</div>
              <div className="font-semibold text-lg">{result.full_name}</div>
              <div className="text-sm text-muted-foreground">{result.classes?.name} · {result.gender} · {result.parent_phone}</div>
              <div className="font-mono text-xs mt-2">{result.matricule}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className={result.application_status === "APPROVED" ? "chip-success" : "chip-warning"}>{t(result.application_status.replace("_"," "))}</span>
              <span className="text-sm">{t("Tuition paid:")} <strong>{Number(result.tuition_paid).toLocaleString()} XAF</strong></span>
              {result.application_status === "APPROVED" && (
                <button onClick={() => setShowPay(true)} className="btn-primary"><Wallet className="h-4 w-4" /> {t("Record payment")}</button>
              )}
            </div>
          </div>
        )}
        {showPay && result && (
          <PaymentDialog student={result} cashier={cashier} onClose={() => setShowPay(false)} />
        )}
      </div>
    </section>
  );
}

function Counters() {
  const t = useT();
  const fn = useServerFn(getBursarCounters);
  const { data } = useQuery({ queryKey: ["counters"], queryFn: () => fn() });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="card-surface p-5 flex items-center gap-4">
        <Clock className="h-7 w-7 text-warning" />
        <div><div className="text-xs uppercase text-muted-foreground">{t("Pending Approvals")}</div><div className="text-2xl font-bold">{data?.pending ?? 0}</div></div>
      </div>
      <div className="card-surface p-5 flex items-center gap-4">
        <Wallet className="h-7 w-7 text-primary" />
        <div><div className="text-xs uppercase text-muted-foreground">{t("Waiting Registration Payment")}</div><div className="text-2xl font-bold">{data?.awaiting ?? 0}</div></div>
      </div>
    </div>
  );
}

function PendingApprovalsSection() {
  const t = useT();
  const list = useServerFn(listPendingApprovals);
  const decide = useServerFn(decideApplication);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pending"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (v: { student_id: string; status: "APPROVED" | "REJECTED" }) => decide({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">2 · {t("Pending Approvals")}</h2>
      <div className="card-surface p-5">
        {data?.length === 0 && <div className="text-sm text-muted-foreground">{t("No applications waiting.")}</div>}
        <div className="grid gap-3">
          {data?.map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-lg p-4">
              <div>
                <div className="font-semibold">{s.full_name}</div>
                <div className="text-sm text-muted-foreground">{s.classes?.name} · {s.gender} · DOB {s.date_of_birth} · {s.parent_phone}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => m.mutate({ student_id: s.id, status: "APPROVED" })} className="btn-primary text-sm"><CheckCircle2 className="h-4 w-4" /> {t("Approve")}</button>
                <button onClick={() => m.mutate({ student_id: s.id, status: "REJECTED" })} className="btn-outline text-sm"><XCircle className="h-4 w-4" /> {t("Reject")}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AwaitingPaymentSection({ cashier }: { cashier: string }) {
  const t = useT();
  const list = useServerFn(listAwaitingPayment);
  const { data } = useQuery({ queryKey: ["awaiting"], queryFn: () => list() });
  const [payFor, setPayFor] = useState<any>(null);
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">3 · {t("Waiting Registration Payment")}</h2>
      <div className="card-surface p-5">
        {data?.length === 0 && <div className="text-sm text-muted-foreground">{t("No approved applications waiting for payment.")}</div>}
        <div className="grid gap-3">
          {data?.map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-lg p-4">
              <div>
                <div className="font-semibold">{s.full_name}</div>
                <div className="text-sm text-muted-foreground">{s.classes?.name} · {s.parent_phone}</div>
              </div>
              <button onClick={() => setPayFor(s)} className="btn-primary text-sm"><Wallet className="h-4 w-4" /> {t("Settle Registration")}</button>
            </div>
          ))}
        </div>
        {payFor && <PaymentDialog student={payFor} cashier={cashier} forcedType="REGISTRATION" onClose={() => setPayFor(null)} />}
      </div>
    </section>
  );
}

function RegisteredStudentsSection({ cashier }: { cashier: string }) {
  const t = useT();
  const list = useServerFn(listRegisteredStudents);
  const { data } = useQuery({ queryKey: ["registered"], queryFn: () => list() });
  const [payFor, setPayFor] = useState<any>(null);
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Users className="h-3.5 w-3.5" /> 4 · {t("Registered Students")}
      </h2>
      <div className="card-surface p-5">
        <p className="text-xs text-muted-foreground mb-3">{t("Click a row to record a tuition payment.")}</p>
        {(!data || data.length === 0) && <div className="text-sm text-muted-foreground">{t("No registered students yet.")}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2">{t("Matricule")}</th>
                <th>{t("Student")}</th>
                <th>{t("Class")}</th>
                <th className="text-right">{t("Fee")}</th>
                <th className="text-right">{t("Paid")}</th>
                <th className="text-right">{t("Remaining")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((s: any) => {
                const fullyPaid = s.tuition_owed === 0;
                return (
                  <tr
                    key={s.id}
                    onClick={() => !fullyPaid && setPayFor(s)}
                    className={"border-b border-border " + (fullyPaid ? "opacity-60" : "cursor-pointer hover:bg-muted")}
                    title={fullyPaid ? t("Tuition fully paid") : t("Click to pay tuition")}
                  >
                    <td className="py-2 font-mono text-xs">{s.matricule ?? "—"}</td>
                    <td className="font-medium">{s.full_name}</td>
                    <td>{s.class_name ?? "—"}</td>
                    <td className="text-right font-mono">{s.tuition_fee.toLocaleString()}</td>
                    <td className="text-right font-mono">{s.tuition_paid.toLocaleString()}</td>
                    <td className="text-right font-mono font-semibold">
                      {fullyPaid ? <span className="chip-success">{t("Tuition fully paid")}</span> : s.tuition_owed.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {payFor && (
          <PaymentDialog
            student={{ id: payFor.id, full_name: payFor.full_name, matricule: payFor.matricule, classes: { name: payFor.class_name }, is_registered: true, tuition_paid: payFor.tuition_paid }}
            cashier={cashier}
            forcedType="TUITION"
            maxAmount={payFor.tuition_owed}
            onClose={() => setPayFor(null)}
          />
        )}
      </div>
    </section>
  );
}

function SettlementLedger({ cashier }: { cashier: string }) {
  const t = useT();
  const list = useServerFn(listSettlements);
  const recFn = useServerFn(getReceipt);
  const { data } = useQuery({ queryKey: ["settlements"], queryFn: () => list() });

  async function reprint(id: string) {
    try {
      const tx: any = await recFn({ data: { transaction_id: id } });
      printReceipt({
        reference: tx.reference, created_at: tx.created_at, type: tx.type,
        amount: Number(tx.amount), payment_method: tx.payment_method, payment_phone: tx.payment_phone,
        student_name: tx.students?.full_name, student_matricule: tx.students?.matricule,
        class_name: tx.students?.classes?.name, cashier,
      });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">5 · {t("Settlement Ledger")}</h2>
      <div className="card-surface p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr><th className="py-2">{t("Student")}</th><th>{t("Class")}</th><th>{t("Allocation")}</th><th>{t("Method")}</th><th className="text-right">{t("Value")}</th><th>{t("Action")}</th></tr>
          </thead>
          <tbody>
            {data?.map((tx: any) => (
              <tr key={tx.id} className="border-b border-border">
                <td className="py-2"><div className="font-medium">{tx.students?.full_name}</div><div className="font-mono text-xs text-muted-foreground">{tx.students?.matricule}</div></td>
                <td>{tx.students?.classes?.name ?? "—"}</td>
                <td>{tx.type}</td>
                <td>{tx.payment_method.replace("_"," ")}</td>
                <td className="text-right font-mono">{Number(tx.amount).toLocaleString()}</td>
                <td><button onClick={() => reprint(tx.id)} className="btn-outline text-xs"><Printer className="h-3.5 w-3.5" /> {t("Reprint")}</button></td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">{t("No settlements yet.")}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentDialog({ student, cashier, forcedType, maxAmount, onClose }: { student: any; cashier: string; forcedType?: "REGISTRATION" | "TUITION"; maxAmount?: number; onClose: () => void }) {
  const t = useT();
  const pay = useServerFn(recordPayment);
  const qc = useQueryClient();
  const [type, setType] = useState<"REGISTRATION" | "TUITION">(forcedType ?? (student.is_registered ? "TUITION" : "REGISTRATION"));
  const [amount, setAmount] = useState<number>(maxAmount ?? 0);
  const [method, setMethod] = useState<"CASH" | "BANK">("CASH");
  const [phone, setPhone] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (amount <= 0) return toast.error(t("Amount (XAF)") + " > 0");
    if (maxAmount != null && amount > maxAmount) return toast.error(t("Maximum payable: {max} XAF", { max: maxAmount.toLocaleString() }));
    setBusy(true);
    try {
      const res: any = await pay({ data: { student_id: student.id, type, amount, payment_method: method, payment_phone: method === "BANK" ? (bankRef || undefined) : (phone || undefined) } });
      printReceipt({
        reference: res.reference, created_at: new Date().toISOString(), type,
        amount, payment_method: method, payment_phone: phone,
        student_name: student.full_name, student_matricule: student.matricule,
        class_name: student.classes?.name, cashier,
      });
      toast.success(t("Payment received"));
      qc.invalidateQueries();
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="card-surface p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-lg">{t("Record payment")}</h3>
        <p className="text-sm text-muted-foreground">{student.full_name} · {student.classes?.name}</p>
        <div className="mt-4 grid gap-3">
          {!forcedType && (
            <label><span className="text-sm font-medium">{t("Allocation type")}</span>
              <select className="input-field mt-1" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="REGISTRATION">{t("Registration")}</option>
                <option value="TUITION">{t("Tuition")}</option>
              </select>
            </label>
          )}
          <label><span className="text-sm font-medium">{t("Amount (XAF)")}</span>
            <input type="number" max={maxAmount} className="input-field mt-1" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            {maxAmount != null && (
              <span className="text-xs text-muted-foreground mt-1 block">{t("Maximum payable: {max} XAF", { max: maxAmount.toLocaleString() })}</span>
            )}
          </label>
          <label><span className="text-sm font-medium">{t("Payment route")}</span>
            <select className="input-field mt-1" value={method} onChange={e => setMethod(e.target.value as any)}>
              <option value="CASH">{t("Cash (received at counter)")}</option>
              <option value="BANK">{t("Bank deposit (receipt verified)")}</option>
            </select>
            <span className="text-xs text-muted-foreground mt-1 block">
              {t("MoMo payments are handled by parents directly from the portal.")}
            </span>
          </label>
          {method === "BANK" && (
            <label><span className="text-sm font-medium">{t("Bank receipt reference")}</span>
              <input className="input-field mt-1" value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="e.g. BANK-RCPT-2026-0001" />
            </label>
          )}
          <div className="flex gap-2 mt-2">
            <button onClick={submit} disabled={busy} className="btn-primary flex-1">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Settle & Print Receipt")}</button>
            <button onClick={onClose} className="btn-ghost">{t("Cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}