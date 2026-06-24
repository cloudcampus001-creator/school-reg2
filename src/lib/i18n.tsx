import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";

type Lang = "en" | "fr";

const FR: Record<string, string> = {
  // Common
  "Sign out": "Déconnexion",
  "Sign in": "Connexion",
  "Cancel": "Annuler",
  "Back": "Retour",
  "Done": "Terminé",
  "Save changes": "Enregistrer",
  "Search": "Rechercher",
  "Loading…": "Chargement…",
  "Continue": "Continuer",
  "Welcome": "Bienvenue",
  "Email": "Email",
  "Password": "Mot de passe",
  "Print copy": "Imprimer une copie",
  "Reprint": "Réimprimer",

  // Landing
  "Parent portal": "Espace parents",
  "School staff": "Personnel de l'école",
  "Built for schools in Cameroon": "Conçu pour les écoles du Cameroun",
  "Skip the registration queue.": "Évitez la file d'attente.",
  "Pay tuition from your phone.": "Payez la scolarité depuis votre téléphone.",
  "SchoolConnect digitises admissions, mobile-money payments, and printed receipts into one simple workflow — for parents, bursars, and school admins.":
    "SchoolConnect numérise les inscriptions, les paiements mobile money et les reçus imprimés dans un seul flux simple — pour les parents, l'économe et l'administration.",
  "Open parent portal": "Ouvrir l'espace parents",
  "School admin sign in": "Connexion administration",
  "Zero-contact admission": "Inscription sans contact",
  "MTN & Orange Money": "MTN & Orange Money",
  "Thermal printing": "Impression thermique",
  "One platform, every step.": "Une plateforme, à chaque étape.",
  "From the application form to the printed receipt at the school gate.":
    "Du formulaire d'inscription au reçu imprimé à l'entrée de l'école.",
  "Online admissions": "Inscriptions en ligne",
  "Parents submit applications in minutes. Real-time status updates.":
    "Les parents soumettent les dossiers en quelques minutes. Mises à jour en temps réel.",
  "Mobile money": "Mobile Money",
  "MTN MoMo & Orange Money for registration and tuition payments.":
    "MTN MoMo & Orange Money pour les frais d'inscription et de scolarité.",
  "Matricule recovery": "Récupération du matricule",
  "Lost a matricule? Look it up by parent phone number.":
    "Matricule perdu ? Retrouvez-le grâce au numéro du parent.",
  "Thermal receipts": "Reçus thermiques",
  "Print queue feeds Bluetooth thermal printers at the bursar's desk.":
    "La file d'impression alimente les imprimantes thermiques Bluetooth chez l'économe.",
  "Try the live demo": "Essayer la démo",
  "Register a student at the demo school, watch the status update in real time, and pay with simulated mobile money.":
    "Inscrivez un élève à l'école de démo, suivez le statut en temps réel et payez avec un mobile money simulé.",
  "Admin sign-in": "Connexion admin",
  "Built for schools in Cameroon · XAF": "Conçu pour les écoles du Cameroun · XAF",

  // Portal
  "Welcome, parent.": "Bienvenue, cher parent.",
  "What would you like to do today?": "Que souhaitez-vous faire aujourd'hui ?",
  "Resume my application": "Reprendre mon dossier",
  "Continue where you left off": "Reprendre là où vous vous êtes arrêté",
  "Register a student": "Inscrire un élève",
  "Submit a new application": "Soumettre une nouvelle demande",
  "Pay tuition fee": "Payer la scolarité",
  "By matricule or parent phone": "Par matricule ou numéro du parent",
  "Recover matricule": "Retrouver mon matricule",
  "Look up by phone number": "Rechercher par numéro de téléphone",
  "Student application": "Demande d'inscription",
  "Full name": "Nom complet",
  "Gender": "Genre",
  "Male": "Masculin",
  "Female": "Féminin",
  "Other": "Autre",
  "Date of birth": "Date de naissance",
  "Place of birth": "Lieu de naissance",
  "Parent phone": "Téléphone du parent",
  "Class": "Classe",
  "Select a class": "Sélectionner une classe",
  "Submit application": "Soumettre la demande",
  "Application": "Demande",
  "Awaiting bursar verification.": "En attente de vérification par l'économe.",
  "You'll see updates here as soon as your application is reviewed.":
    "Vous verrez les mises à jour ici dès que votre dossier sera examiné.",
  "Your application was not approved. Please contact the school.":
    "Votre demande n'a pas été acceptée. Veuillez contacter l'école.",
  "Matricule": "Matricule",
  "Registered": "Inscrit",
  "Yes": "Oui",
  "Pending payment": "Paiement en attente",
  "Registration fee": "Frais d'inscription",
  "Tuition": "Scolarité",
  "Pay registration": "Payer l'inscription",
  "Pay tuition": "Payer la scolarité",
  "Tuition fully paid": "Scolarité entièrement payée",
  "Or leave it — the bursar can collect at the desk.":
    "Ou laissez-le — l'économe peut encaisser au comptoir.",
  "Switch to another student": "Changer d'élève",
  "Pay registration": "Payer l'inscription",
  "Amount (XAF)": "Montant (XAF)",
  "Payment method": "Mode de paiement",
  "Mobile number": "Numéro mobile",
  "Simulated payment. The bursar will print your official receipt at the school.":
    "Paiement simulé. L'économe imprimera votre reçu officiel à l'école.",
  "Payment received": "Paiement reçu",
  "Reference": "Référence",
  "Your receipt will be printed at the bursar's desk. You can also print a copy from here:":
    "Votre reçu sera imprimé chez l'économe. Vous pouvez aussi en imprimer une copie ici :",
  "Enter the parent phone used during registration.":
    "Entrez le numéro de téléphone utilisé lors de l'inscription.",
  "No applications found for that number.": "Aucun dossier trouvé pour ce numéro.",
  "no matricule yet": "pas encore de matricule",
  "Enter the student's matricule. No matricule? Use the phone number you registered with.":
    "Entrez le matricule de l'élève. Pas de matricule ? Utilisez le numéro utilisé lors de l'inscription.",
  "By matricule": "Par matricule",
  "By phone number": "Par numéro de téléphone",
  "Find": "Trouver",
  "No matching student. Check the matricule or phone and try again.":
    "Aucun élève correspondant. Vérifiez le matricule ou le numéro et réessayez.",
  "Which child?": "Quel enfant ?",
  "Confirm": "Confirmer",
  "This student is not yet approved & registered. The bursar must complete registration before tuition can be paid.":
    "Cet élève n'est pas encore approuvé et inscrit. L'économe doit finaliser l'inscription avant tout paiement de scolarité.",
  "Total fee": "Frais total",
  "Paid": "Payé",
  "Remaining": "Restant",
  "Yes, this is my child — continue": "Oui, c'est mon enfant — continuer",
  "Pick another": "Choisir un autre",

  // Auth
  "Staff sign-in — SchoolConnect": "Connexion personnel — SchoolConnect",
  "School staff portal": "Espace du personnel",
  "Sign in to your admin or bursar account.":
    "Connectez-vous à votre compte administrateur ou économe.",
  "Create the first administrator account.":
    "Créez le premier compte administrateur.",
  "Create account": "Créer un compte",
  "First time here?": "Première visite ?",
  "Already have an account?": "Déjà inscrit ?",
  "Create the admin account": "Créer le compte administrateur",
  "Bursar accounts": "Comptes économe",
  "are deployed by the administrator from the Command Board.":
    "sont créés par l'administrateur depuis le tableau de bord.",

  // Bursar
  "Bursar Workstation": "Poste de l'économe",
  "Audited Engine · Live": "Moteur audité · En direct",
  "Bursar access required": "Accès économe requis",
  "Ask the school administrator to deploy a bursar account for you.":
    "Demandez à l'administrateur de créer un compte économe pour vous.",
  "Direct Matricule Ledger Search": "Recherche directe par matricule",
  "Search Network": "Rechercher",
  "No matching student.": "Aucun élève correspondant.",
  "Student": "Élève",
  "Tuition paid:": "Scolarité payée :",
  "Record payment": "Enregistrer un paiement",
  "Pending Approvals": "Demandes en attente",
  "Waiting Registration Payment": "En attente du paiement d'inscription",
  "No applications waiting.": "Aucune demande en attente.",
  "Approve": "Approuver",
  "Reject": "Rejeter",
  "No approved applications waiting for payment.":
    "Aucune demande approuvée en attente de paiement.",
  "Settle Registration": "Régler l'inscription",
  "Settlement Ledger": "Registre des paiements",
  "Allocation": "Allocation",
  "Method": "Mode",
  "Value": "Montant",
  "Action": "Action",
  "No settlements yet.": "Aucun paiement enregistré.",
  "Allocation type": "Type d'allocation",
  "Registration": "Inscription",
  "Payment route": "Mode de paiement",
  "Cash (received at counter)": "Espèces (reçu au comptoir)",
  "Bank deposit (receipt verified)": "Dépôt bancaire (reçu vérifié)",
  "MoMo payments are handled by parents directly from the portal.":
    "Les paiements MoMo sont effectués par les parents depuis l'espace parents.",
  "Bank receipt reference": "Référence du reçu bancaire",
  "Settle & Print Receipt": "Régler & imprimer le reçu",
  "Registered Students": "Élèves inscrits",
  "Click a row to record a tuition payment.":
    "Cliquez sur une ligne pour enregistrer un paiement de scolarité.",
  "No registered students yet.": "Aucun élève inscrit pour le moment.",
  "Fee": "Frais",
  "Click to pay tuition": "Cliquer pour payer la scolarité",
  "Maximum payable: {max} XAF": "Maximum payable : {max} XAF",

  // Admin
  "Command Board · Admin": "Tableau de bord · Admin",
  "No admin access yet": "Pas encore d'accès admin",
  "No admin exists yet. Claim the role to bootstrap the system.":
    "Aucun administrateur n'existe encore. Revendiquez le rôle pour initialiser le système.",
  "Claim admin role": "Revendiquer le rôle admin",
  "Ask an existing admin to grant you access.":
    "Demandez à un administrateur existant de vous accorder l'accès.",
  "Dashboard Summary": "Résumé du tableau de bord",
  "Parent Portal QR": "QR de l'espace parents",
  "Tap to view & download as PDF": "Cliquez pour voir et télécharger en PDF",
  "Gross Revenue": "Recettes brutes",
  "Registered Active Students": "Élèves actifs inscrits",
  "Pending Action": "Actions en attente",
  "Print & display this QR code": "Imprimez et affichez ce QR code",
  "Download PDF": "Télécharger le PDF",
  "Revenue by Payment Route": "Recettes par mode de paiement",
  "MoMo (Parent self-pay)": "MoMo (paiement parent)",
  "MTN MoMo + Orange Money": "MTN MoMo + Orange Money",
  "Cash (Bursar counter)": "Espèces (comptoir économe)",
  "Received at the bursar's desk": "Reçu chez l'économe",
  "Bank deposit": "Dépôt bancaire",
  "Parent paid at bank, receipt verified": "Parent a payé en banque, reçu vérifié",
  "Total across all routes:": "Total tous modes confondus :",
  "Financial Rules Engine": "Règles financières",
  "Fee allocation architecture": "Architecture des frais",
  "Uniform (same fees for all classes)": "Uniforme (mêmes frais pour toutes les classes)",
  "Segmented (per-class fees)": "Segmenté (frais par classe)",
  "Settlement wallet / account": "Compte de règlement",
  "Admission / Base Registration Fee (XAF)": "Frais d'inscription de base (XAF)",
  "Base Tuition Fee (XAF)": "Frais de scolarité de base (XAF)",
  "Class Segments Management": "Gestion des classes",
  "Add Class": "Ajouter une classe",
  "Bursar / Account Provisioning": "Création de comptes économe",
  "Staff name": "Nom du personnel",
  "Deploy Account": "Créer le compte",
  "No bursars yet.": "Aucun économe enregistré.",
  "Segmented Student Ledger": "Registre des élèves par classe",
  "All": "Tous",
  "Master Export": "Export PDF complet",
  "Verification": "Vérification",
  "Tuition Paid": "Scolarité payée",
  "No students.": "Aucun élève.",

  // Statuses
  "APPROVED": "APPROUVÉ",
  "PENDING REVIEW": "EN EXAMEN",
  "REJECTED": "REJETÉ",
};

function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("lang");
  if (saved === "en" || saved === "fr") return saved;
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("fr") ? "fr" : "en";
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string, vars?: Record<string, string | number>) => string };
const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (s) => s });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { setLangState(detectLang()); }, []);
  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }
  function t(s: string, vars?: Record<string, string | number>) {
    let out = lang === "fr" ? (FR[s] ?? s) : s;
    if (vars) for (const k in vars) out = out.replaceAll(`{${k}}`, String(vars[k]));
    return out;
  }
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() { return useContext(I18nCtx); }
export function useT() { return useContext(I18nCtx).t; }

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={"inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1 py-0.5 text-xs " + className}>
      <Languages className="h-3.5 w-3.5 text-muted-foreground mx-1" />
      <button
        onClick={() => setLang("en")}
        className={"px-2 py-0.5 rounded " + (lang === "en" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground")}
        aria-pressed={lang === "en"}
      >EN</button>
      <button
        onClick={() => setLang("fr")}
        className={"px-2 py-0.5 rounded " + (lang === "fr" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground")}
        aria-pressed={lang === "fr"}
      >FR</button>
    </div>
  );
}