import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck, Smartphone, Printer, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { useT, LangSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SchoolConnect — Digital admissions & tuition for schools" },
      { name: "description", content: "Zero-contact student registration, mobile money tuition, matricule recovery, and thermal-print receipts. Built for schools in Cameroon and beyond." },
      { property: "og:title", content: "SchoolConnect" },
      { property: "og:description", content: "Digital admissions and mobile money tuition." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const t = useT();
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg hero-gradient">
            <GraduationCap className="h-5 w-5" />
          </span>
          SchoolConnect
        </Link>
        <nav className="flex items-center gap-2">
          <LangSwitcher />
          <Link to="/portal" className="btn-ghost hidden sm:inline-flex">{t("Parent portal")}</Link>
          <Link to="/auth" className="btn-outline">{t("School staff")}</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-20 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <span className="chip">{t("Built for schools in Cameroon")}</span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
            {t("Skip the registration queue.")}
            <span className="block text-primary">{t("Pay tuition from your phone.")}</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            {t("SchoolConnect digitises admissions, mobile-money payments, and printed receipts into one simple workflow — for parents, bursars, and school admins.")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/portal" className="btn-primary">
              {t("Open parent portal")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="btn-outline">
              {t("School admin sign in")}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t("Zero-contact admission")}</div>
            <div className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t("MTN & Orange Money")}</div>
            <div className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t("Thermal printing")}</div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card-surface p-6 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full hero-gradient opacity-30 blur-2xl" />
            <div className="relative">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Demo Academy</div>
              <div className="mt-1 font-display text-2xl font-bold">Form 3 · A. Mbeng</div>
              <div className="mt-4 chip-success"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">Matricule</div>
                  <div className="font-mono font-semibold">DEMO-26-0042</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">Tuition</div>
                  <div className="font-semibold">120,000 / 140,000 XAF</div>
                </div>
              </div>
              <button className="btn-primary w-full mt-5">Pay 20,000 XAF · MTN MoMo</button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-3xl font-bold">{t("One platform, every step.")}</h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          {t("From the application form to the printed receipt at the school gate.")}
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: GraduationCap, title: t("Online admissions"), body: t("Parents submit applications in minutes. Real-time status updates.") },
            { icon: Smartphone, title: t("Mobile money"), body: t("MTN MoMo & Orange Money for registration and tuition payments.") },
            { icon: Search, title: t("Matricule recovery"), body: t("Lost a matricule? Look it up by parent phone number.") },
            { icon: Printer, title: t("Thermal receipts"), body: t("Print queue feeds Bluetooth thermal printers at the bursar's desk.") },
          ].map((f) => (
            <div key={f.title} className="card-surface p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pb-24">
        <div className="card-surface hero-gradient p-10 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto opacity-90" />
          <h2 className="mt-4 text-3xl font-bold">{t("Try the live demo")}</h2>
          <p className="mt-2 opacity-90 max-w-xl mx-auto">
            {t("Register a student at the demo school, watch the status update in real time, and pay with simulated mobile money.")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/portal" className="btn-outline">{t("Parent portal")}</Link>
            <Link to="/auth" className="btn-outline">{t("Admin sign-in")}</Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-5 py-8 text-sm text-muted-foreground flex justify-between">
        <div>© {new Date().getFullYear()} SchoolConnect</div>
        <div>{t("Built for schools in Cameroon · XAF")}</div>
      </footer>
    </div>
  );
}
