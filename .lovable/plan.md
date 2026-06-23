## Goal

Recreate the `creator-school-reg` project in this workspace from the uploaded repomix, then add the two requested features on top: end-to-end realtime sync, and a complete tuition-fee payment flow (bursar + parent portal) with partial payments and printable receipts.

## Phase 1 — Scaffold the existing project from the upload

Bring the codebase back to where the upload left off so we have something to extend.

1. Enable Lovable Cloud (Supabase) in this workspace.
2. Apply the 3 SQL migrations from the upload (schools, classes, school_configs, students, financial_transactions, print_jobs, user_roles, `has_role`, `generate_matricule`, demo seed) — plus the realtime publication line and the later `settlement_account` / `full_name` columns.
3. Recreate source files from the repomix exactly:
   - `src/integrations/supabase/*` (client, client.server, auth-middleware, auth-attacher, types)
   - `src/lib/*.functions.ts` (admin, bursar, portal), `src/lib/config.server.ts`, `src/lib/receipt.ts`
   - Routes: `__root.tsx`, `index.tsx`, `auth.tsx`, `admin.tsx`, `bursar.tsx`, `portal.tsx`, `sitemap[.]xml.ts`
   - `src/start.ts`, `src/server.ts`, `src/styles.css`, sitemap/robots
4. Verify dev build is green and the existing flows render.

## Phase 2 — Realtime across the registration lifecycle

Eliminate every "refresh to see the new state" point.

1. **Database**
   - Ensure `students`, `financial_transactions`, and `print_jobs` are all in `supabase_realtime` (students already is — add the other two via migration). Set `REPLICA IDENTITY FULL` on each so updates carry old/new rows.
2. **Client hook** — add `src/hooks/use-realtime-table.ts`: subscribes via `supabase.channel(...).on('postgres_changes', ...)` and calls `queryClient.invalidateQueries({ queryKey })` on every INSERT/UPDATE/DELETE (filterable by `school_id` or `student_id`).
3. **Wire it into every screen**:
   - **Bursar dashboard** — subscribe to `students` (filter: `school_id=eq.<id>`) and `financial_transactions`. New applications appear instantly; status flips from `PENDING_REVIEW` → `APPROVED` → `PAID` live; tuition balance updates as payments land.
   - **Admin dashboard** — same subscriptions for global stats / lists.
   - **Parent portal** — subscribe to `students` filtered by `parent_phone` or by the matricule(s) they've looked up, and to `financial_transactions` filtered by `student_id`. Approval, matricule assignment, and tuition balance changes appear without a refresh.
4. Replace any manual `refetch()` / "Refresh" buttons with passive realtime; keep a small `Last updated …` indicator.

## Phase 3 — Tuition fee payment system

### 3a. Admin: set the fee
- Already supported via `school_configs.uniform_tuition_fee` (UNIFORM mode) and `classes.segmented_tuition_fee` (SEGMENTED mode). Add an admin UI section "Tuition fees" that edits these in place and writes through a `setTuitionFees` server fn (admin-only via `has_role`).

### 3b. Shared helpers (new `src/lib/tuition.ts` + `tuition.functions.ts`)
- `getTuitionFee(student)` → reads class-segmented fee when the school is SEGMENTED, otherwise the uniform fee.
- `getTuitionSummary(studentId)` server fn → returns `{ fee, paid, remaining, currency, history: Transaction[] }` by summing `financial_transactions` where `type='TUITION'` and `status='SUCCESS'`.
- `payTuition({ studentId, amount, paymentMethod, paymentPhone? })` server fn:
   - Validates the student is APPROVED and `is_registered=true`.
   - Validates `amount > 0` and `amount <= remaining` (rejects overpay).
   - Inserts a `financial_transactions` row (`type='TUITION'`, `status='SUCCESS'`).
   - Updates `students.tuition_paid = tuition_paid + amount`.
   - Inserts a `print_jobs` row with rendered receipt text.
   - Returns `{ transaction, newRemaining, receipt }`.
- Two entry points to this fn: bursar (auth required, `requireSupabaseAuth` + bursar role) and parent (public, no auth — see 3d for matching rules).

### 3c. Bursar UI — "Pay tuition" on a registered student
- In `bursar.tsx`, clicking a registered/approved student opens a detail drawer with a **Pay tuition** action.
- Drawer shows: fee, paid-to-date, remaining, history of past tuition transactions.
- "Pay tuition" form: amount (defaults to remaining, editable for partial), payment method, optional payer phone, Confirm.
- On success: toast, drawer numbers update via realtime, and `ReceiptDialog` opens with auto-`window.print()` (uses the existing `src/lib/receipt.ts` renderer).

### 3d. Parent portal — third button "Pay tuition fee"
- In `portal.tsx`, add a third primary action **Pay tuition fee** alongside the existing two.
- Step 1 — Identify student:
   - Input: matricule. If empty, switch to "I don't know the matricule" → phone-number lookup (the registration phone). If the phone matches multiple children, render a chooser list.
   - Server fn `findStudentForPortal({ matricule?, phone? })` (public, rate-limited by simple in-memory token bucket per IP) returns `{ id, full_name, class_name, matricule, fee, paid, remaining }` — never PII beyond name + class.
- Step 2 — Approval screen: shows full name + class + remaining; parent confirms "This is my child".
- Step 3 — Amount + payment method (partial allowed, validated server-side as in 3b).
- Step 4 — Success screen with the receipt and a Print button (`window.print()` of the receipt component); the dialog also subscribes so the remaining balance updates live if another payment is recorded simultaneously.

### 3e. Receipts
- Extend `src/lib/receipt.ts` to support TUITION receipts: school header, student name + matricule + class, transaction reference, amount paid, payment method, paid-to-date / remaining / total fee, date/time, cashier name (or "Parent self-service").
- `ReceiptDialog` component triggers `window.print()` on open and exposes a manual Print button. Uses a print-only CSS block in `styles.css`.

## Phase 4 — Hardening

- RLS: tuition INSERT remains allowed for `anon` (parent self-pay) and `authenticated` (bursar). Add a CHECK trigger `validate_tuition_payment` that re-computes `remaining` server-side and rejects overpay / payments on non-approved students — so the rule holds even if a client skips validation.
- Indexes: `financial_transactions(student_id, type, status)` for fast summaries.
- Zod validation on every server fn input.
- Public `findStudentForPortal` returns minimal fields only.

## Phase 5 — Verification

- Manual flow via Playwright: register as parent → bursar sees it appear without refresh → approves → parent sees approval without refresh → bursar pays partial tuition → both bursar and parent see new remaining live → parent pays the balance from portal → receipt prints.
- Confirm no "Refresh" buttons remain on bursar/admin/portal dashboards.

## Technical notes

- All server logic in `createServerFn` under `src/lib/*.functions.ts`; admin Supabase loaded with `await import("@/integrations/supabase/client.server")` inside `.handler()`.
- Parent endpoints are public `createServerFn` (no `requireSupabaseAuth`) but locked down by: minimal returned fields, server-side overpay guard, rate limit, and Zod validation.
- Realtime subscriptions live in components, cleaned up on unmount; they invalidate React Query keys rather than mutating cache manually.
- No new third-party deps required.
