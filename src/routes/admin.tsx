import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import {
  GraduationCap, LogOut, Loader2, ShieldAlert, QrCode, Download, Wallet, Users, Clock,
  Plus, Trash2, UserPlus, Filter, Smartphone, Banknote, Landmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyRole, claimAdminIfNone, getAdminOverview, getSchoolConfig, updateSchoolConfig,
  listClasses, addClass, deleteClass, listBursars, createBursar, listStudentLedger,
  getRevenueByRoute,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Command Board · SchoolConnect" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else setReady(true);
    });
  }, [navigate]);
  if (!ready) return <Center><Loader2 className="h-6 w-6 animate-spin text-primary" /></Center>;
  return <AdminShell />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}

function AdminShell() {
  const navigate = useNavigate();
  const roleFn = useServerFn(getMyRole);
  const claimFn = useServerFn(claimAdminIfNone);
  const qc = useQueryClient();
  const { data: role, isLoading } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });

  useEffect(() => {
    if (role?.role === "bursar") navigate({ to: "/bursar", replace: true });
  }, [role, navigate]);

  const claim = useMutation({
    mutationFn: () => claimFn(),
    onSuccess: () => { toast.success("You're now the school admin."); qc.invalidateQueries({ queryKey: ["my-role"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Realtime — refresh any open admin query on student/transaction/print changes
  useEffect(() => {
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => qc.invalidateQueries())
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, () => qc.invalidateQueries())
      .on("postgres_changes", { event: "*", schema: "public", table: "print_jobs" }, () => qc.invalidateQueries())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) return <Center><Loader2 className="h-6 w-6 animate-spin text-primary" /></Center>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg hero-gradient">
              <GraduationCap className="h-5 w-5" />
            </span>
            Command Board · Admin
          </Link>
          <button onClick={signOut} className="btn-ghost"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {role?.role !== "admin" ? (
          <div className="card-surface p-8 text-center max-w-lg mx-auto">
            <ShieldAlert className="h-10 w-10 text-warning mx-auto" />
            <h1 className="mt-3 text-xl font-bold">No admin access yet</h1>
            {role?.adminCount === 0 ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  No admin exists yet. Claim the role to bootstrap the system.
                </p>
                <button onClick={() => claim.mutate()} disabled={claim.isPending} className="btn-primary mt-5">
                  {claim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim admin role"}
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Ask an existing admin to grant you access.</p>
            )}
          </div>
        ) : (
          <>
            <DashboardSummary />
            <RevenueByRoute />
            <FinancialRulesEngine />
            <ClassSegments />
            <BursarProvisioning />
            <StudentLedger />
          </>
        )}
      </main>
    </div>
  );
}

/* ===== 1. DASHBOARD SUMMARY ===== */
function DashboardSummary() {
  const ov = useServerFn(getAdminOverview);
  const { data } = useQuery({ queryKey: ["overview"], queryFn: () => ov() });
  const portalUrl = typeof window !== "undefined" ? window.location.origin + "/portal" : "";
  const [qrUrl, setQrUrl] = useState<string>("");
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (portalUrl) QRCode.toDataURL(portalUrl, { width: 320, margin: 1 }).then(setQrUrl);
  }, [portalUrl]);

  function downloadPdf() {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFontSize(20); pdf.text("Demo Academy", 105, 30, { align: "center" });
    pdf.setFontSize(12); pdf.text("Parent Portal — scan to register", 105, 40, { align: "center" });
    if (qrUrl) pdf.addImage(qrUrl, "PNG", 65, 55, 80, 80);
    pdf.setFontSize(10); pdf.text(portalUrl, 105, 145, { align: "center" });
    pdf.save("schoolconnect-portal-qr.pdf");
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">1 · Dashboard Summary</h2>
      <div className="grid lg:grid-cols-4 sm:grid-cols-2 gap-3">
        <button onClick={() => setShowQr(v => !v)} className="card-surface p-5 text-left hover:border-primary transition">
          <QrCode className="h-6 w-6 text-primary" />
          <div className="mt-2 font-semibold">Parent Portal QR</div>
          <div className="text-xs text-muted-foreground">Tap to view & download as PDF</div>
        </button>
        <Kpi icon={Wallet} label="Gross Revenue" value={`${(data?.grossRevenue ?? 0).toLocaleString()} XAF`} />
        <Kpi icon={Users} label="Registered Active Students" value={`${data?.registeredActive ?? 0} / ${data?.totalStudents ?? 0}`} />
        <Kpi icon={Clock} label="Pending Action" value={`${data?.pendingAction ?? 0}`} accent={(data?.pendingAction ?? 0) > 0} />
      </div>

      {showQr && (
        <div className="card-surface p-6 mt-4 flex flex-col sm:flex-row gap-6 items-center">
          {qrUrl ? <img src={qrUrl} alt="Parent portal QR" className="h-56 w-56 rounded-lg border border-border" /> : <Loader2 className="h-6 w-6 animate-spin" />}
          <div className="flex-1">
            <h3 className="font-semibold">Print & display this QR code</h3>
            <p className="text-sm text-muted-foreground mt-1 break-all">{portalUrl}</p>
            <button onClick={downloadPdf} className="btn-primary mt-4"><Download className="h-4 w-4" /> Download PDF</button>
          </div>
        </div>
      )}
    </section>
  );
}
function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={"card-surface p-5 " + (accent ? "border-warning" : "")}>
      <Icon className="h-6 w-6 text-primary" />
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

/* ===== Revenue by payment route ===== */
function RevenueByRoute() {
  const fn = useServerFn(getRevenueByRoute);
  const { data } = useQuery({ queryKey: ["revenue-by-route"], queryFn: () => fn() });
  const buckets = data?.buckets;
  const grand = data?.grand ?? 0;
  const rows: { key: "MOMO" | "CASH" | "BANK"; label: string; sub: string; icon: any }[] = [
    { key: "MOMO", label: "MoMo (Parent self-pay)", sub: "MTN MoMo + Orange Money", icon: Smartphone },
    { key: "CASH", label: "Cash (Bursar counter)",  sub: "Received at the bursar's desk", icon: Banknote },
    { key: "BANK", label: "Bank deposit",           sub: "Parent paid at bank, receipt verified", icon: Landmark },
  ];
  function pct(v: number) { return grand > 0 ? Math.round((v / grand) * 100) : 0; }
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        1b · Revenue by Payment Route
      </h2>
      <div className="grid lg:grid-cols-3 gap-3">
        {rows.map(r => {
          const b = buckets?.[r.key] ?? { total: 0, registration: 0, tuition: 0, count: 0 };
          const Icon = r.icon;
          return (
            <div key={r.key} className="card-surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="mt-2 font-semibold">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.sub}</div>
                </div>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{pct(b.total)}%</span>
              </div>
              <div className="mt-3 text-2xl font-bold">{b.total.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">XAF</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted rounded p-2">
                  <div className="text-muted-foreground">Registration</div>
                  <div className="font-mono">{b.registration.toLocaleString()}</div>
                </div>
                <div className="bg-muted rounded p-2">
                  <div className="text-muted-foreground">Tuition</div>
                  <div className="font-mono">{b.tuition.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{b.count} transaction{b.count === 1 ? "" : "s"}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Total across all routes: <strong className="text-foreground">{grand.toLocaleString()} XAF</strong>
      </div>
    </section>
  );
}

/* ===== 2. FINANCIAL RULES ENGINE ===== */
function FinancialRulesEngine() {
  const cfgFn = useServerFn(getSchoolConfig);
  const saveFn = useServerFn(updateSchoolConfig);
  const qc = useQueryClient();
  const { data: cfg } = useQuery({ queryKey: ["school-config"], queryFn: () => cfgFn() });
  const save = useMutation({
    mutationFn: (vars: any) => saveFn({ data: vars }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["school-config"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    save.mutate({
      fee_structure: String(fd.get("fee_structure")) as "UNIFORM" | "SEGMENTED",
      uniform_registration_fee: Number(fd.get("uniform_registration_fee")),
      uniform_tuition_fee: Number(fd.get("uniform_tuition_fee")),
      settlement_account: String(fd.get("settlement_account") || "") || null,
    });
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">2 · Financial Rules Engine</h2>
      <form onSubmit={onSubmit} className="card-surface p-6 grid sm:grid-cols-2 gap-4">
        <Labeled label="Fee allocation architecture">
          <select name="fee_structure" defaultValue={cfg?.fee_structure ?? "UNIFORM"} className="input-field">
            <option value="UNIFORM">Uniform (same fees for all classes)</option>
            <option value="SEGMENTED">Segmented (per-class fees)</option>
          </select>
        </Labeled>
        <Labeled label="Settlement wallet / account">
          <input name="settlement_account" defaultValue={cfg?.settlement_account ?? ""} className="input-field" placeholder="e.g. MTN MoMo 670 000 000" />
        </Labeled>
        <Labeled label="Admission / Base Registration Fee (XAF)">
          <input type="number" name="uniform_registration_fee" defaultValue={cfg?.uniform_registration_fee ?? 0} className="input-field" />
        </Labeled>
        <Labeled label="Base Tuition Fee (XAF)">
          <input type="number" name="uniform_tuition_fee" defaultValue={cfg?.uniform_tuition_fee ?? 0} className="input-field" />
        </Labeled>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</button></div>
      </form>
    </section>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium">{label}</span><div className="mt-1">{children}</div></label>;
}

/* ===== 3. CLASS SEGMENTS ===== */
function ClassSegments() {
  const list = useServerFn(listClasses);
  const add = useServerFn(addClass);
  const del = useServerFn(deleteClass);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["classes-admin"], queryFn: () => list() });
  const [name, setName] = useState("");
  const addM = useMutation({
    mutationFn: () => add({ data: { name } }),
    onSuccess: () => { setName(""); toast.success("Class added"); qc.invalidateQueries({ queryKey: ["classes-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">3 · Class Segments Management</h2>
      <div className="card-surface p-6">
        <div className="flex gap-2 flex-wrap">
          <input className="input-field flex-1 min-w-[200px]" placeholder="Class name (e.g. Form 5)" value={name} onChange={e => setName(e.target.value)} />
          <button className="btn-primary" disabled={!name || addM.isPending} onClick={() => addM.mutate()}>
            <Plus className="h-4 w-4" /> Add Class
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data?.map(c => (
            <span key={c.id} className="inline-flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm">
              {c.name}
              <button onClick={() => delM.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== 4. BURSAR PROVISIONING ===== */
function BursarProvisioning() {
  const list = useServerFn(listBursars);
  const create = useServerFn(createBursar);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["bursars"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (vars: any) => create({ data: vars }),
    onSuccess: () => { toast.success("Bursar account deployed"); qc.invalidateQueries({ queryKey: ["bursars"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    m.mutate({
      full_name: String(fd.get("full_name") || ""),
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
    });
    (e.currentTarget as HTMLFormElement).reset();
  }
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">4 · Bursar / Account Provisioning</h2>
      <div className="card-surface p-6">
        <form onSubmit={onSubmit} className="grid sm:grid-cols-4 gap-3">
          <input name="full_name" required placeholder="Staff name" className="input-field" />
          <input name="email" type="email" required placeholder="Email" className="input-field" />
          <input name="password" type="password" required minLength={6} placeholder="Password" className="input-field" />
          <button className="btn-primary" disabled={m.isPending}><UserPlus className="h-4 w-4" /> Deploy Account</button>
        </form>
        <div className="mt-5 grid gap-2">
          {data?.length === 0 && <div className="text-sm text-muted-foreground">No bursars yet.</div>}
          {data?.map((b: any) => (
            <div key={b.user_id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-2 text-sm">
              <span className="font-medium">{b.full_name}</span>
              <span className="text-muted-foreground">{b.email}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== 5. SEGMENTED STUDENT LEDGER ===== */
function StudentLedger() {
  const listC = useServerFn(listClasses);
  const listS = useServerFn(listStudentLedger);
  const { data: classes } = useQuery({ queryKey: ["classes-admin"], queryFn: () => listC() });
  const [classId, setClassId] = useState<string | null>(null);
  const { data: rows } = useQuery({
    queryKey: ["ledger", classId],
    queryFn: () => listS({ data: { class_id: classId } }),
  });

  function exportCsv() {
    const header = ["Matricule","Full Name","Class","Verification","Tuition Paid (XAF)"];
    const body = (rows ?? []).map((r: any) => [
      r.matricule ?? "", r.full_name, r.classes?.name ?? "",
      r.application_status, Number(r.tuition_paid).toString(),
    ]);
    const csv = [header, ...body].map(r => r.map(c => `"${String(c).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "student-ledger.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">5 · Segmented Student Ledger</h2>
      <div className="card-surface p-6">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button onClick={() => setClassId(null)} className={"px-3 py-1.5 rounded-full text-sm font-medium " + (classId === null ? "bg-primary text-primary-foreground" : "bg-muted")}>All</button>
          {classes?.map(c => (
            <button key={c.id} onClick={() => setClassId(c.id)}
              className={"px-3 py-1.5 rounded-full text-sm font-medium " + (classId === c.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {c.name}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={exportCsv} className="btn-outline text-sm"><Download className="h-4 w-4" /> Master Export</button>
        </div>

        <div className="overflow-x-auto mt-5">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr><th className="py-2">Matricule</th><th>Student</th><th>Class</th><th>Verification</th><th className="text-right">Tuition Paid</th></tr>
            </thead>
            <tbody>
              {rows?.map((r: any) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="py-2 font-mono text-xs">{r.matricule ?? "—"}</td>
                  <td>{r.full_name}</td>
                  <td>{r.classes?.name ?? "—"}</td>
                  <td>
                    <span className={r.application_status === "APPROVED" ? "chip-success" : r.application_status === "REJECTED" ? "chip-danger" : "chip-warning"}>
                      {r.application_status.replace("_"," ")}
                    </span>
                  </td>
                  <td className="text-right font-mono">{Number(r.tuition_paid).toLocaleString()}</td>
                </tr>
              ))}
              {(!rows || rows.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No students.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
