// Renders a hidden, print-only receipt and triggers window.print().
// Standard browser print works with thermal printers via the OS print dialog.
export type ReceiptData = {
  reference: string;
  created_at: string;
  type: "REGISTRATION" | "TUITION";
  amount: number;
  payment_method: string;
  payment_phone?: string | null;
  student_name: string;
  student_matricule?: string | null;
  class_name?: string | null;
  cashier?: string | null;
  settlement_account?: string | null;
};

export function printReceipt(r: ReceiptData) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) {
    alert("Pop-ups blocked. Please allow pop-ups to print receipts.");
    return;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${r.reference}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
    .ctr { text-align: center; }
    .row { display: flex; justify-content: space-between; }
    h1 { font-size: 14px; margin: 4px 0; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .big { font-size: 16px; font-weight: bold; }
    .lbl { color: #000; }
    @media screen { body { padding: 16px; background:#f6f6f6; } .sheet{background:#fff;padding:14px;box-shadow:0 0 6px #0002;} }
  </style></head><body><div class="sheet">
    <div class="ctr"><h1>DEMO ACADEMY</h1><div>Official Payment Receipt</div></div>
    <hr/>
    <div class="row"><span class="lbl">Date</span><span>${new Date(r.created_at).toLocaleString()}</span></div>
    <div class="row"><span class="lbl">Ref</span><span>${r.reference}</span></div>
    ${r.cashier ? `<div class="row"><span class="lbl">Cashier</span><span>${r.cashier}</span></div>` : ""}
    <hr/>
    <div><strong>Student</strong></div>
    <div>${r.student_name}</div>
    ${r.student_matricule ? `<div>Matricule: ${r.student_matricule}</div>` : ""}
    ${r.class_name ? `<div>Class: ${r.class_name}</div>` : ""}
    <hr/>
    <div class="row"><span>Type</span><span>${r.type}</span></div>
    <div class="row"><span>Method</span><span>${r.payment_method.replace("_", " ")}</span></div>
    ${r.payment_phone ? `<div class="row"><span>Phone</span><span>${r.payment_phone}</span></div>` : ""}
    ${r.settlement_account ? `<div class="row"><span>Settles to</span><span>${r.settlement_account}</span></div>` : ""}
    <hr/>
    <div class="row big"><span>TOTAL</span><span>${r.amount.toLocaleString()} XAF</span></div>
    <hr/>
    <div class="ctr">Thank you!<br/>Keep this receipt for your records.</div>
  </div>
  <script>window.onload = () => { window.print(); setTimeout(()=>window.close(), 600); };</script>
  </body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
