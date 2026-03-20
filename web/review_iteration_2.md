# Review — Iteration 2

## A) Logical / Data / Architectural Issues

### A1. Floor-plan DELETE bypasses workspace_id check (IDOR vulnerability)
**Problem:** The `DELETE` handler in the floor-plan route updates the listing by `id` only, without filtering by `workspace_id`. Any authenticated user can null-out the `floor_plan_url` of any listing in any workspace by guessing or enumerating listing IDs.
**File(s):** `app/api/listing/[id]/floor-plan/route.ts`, lines 88-95
**Fix:** Add `.eq('workspace_id', profile.workspace_id)` to the delete update query. Also fetch `profile` data (the DELETE handler currently skips the profile/workspace lookup entirely).

### A2. Attachment download has no workspace ownership check (path traversal risk)
**Problem:** The `GET /api/listing/[id]/attachments/download` route accepts an arbitrary `path` query parameter and downloads that file from Supabase storage. It authenticates the user but never verifies the requested `path` belongs to the user's workspace. An attacker can read any file in the `listing-docs` bucket by supplying another workspace's storage path.
**File(s):** `app/api/listing/[id]/attachments/download/route.ts`, lines 13-28
**Fix:** Before downloading, look up the attachment record by `storage_path` in `listing_attachments` and verify it has a matching `workspace_id`. Alternatively, validate that `storagePath` starts with `${profile.workspace_id}/`.

### A3. Invoice email divides `totale_documento` by 100 but the DB stores euros, not cents (wrong display)
**Problem:** The send-invoice email template displays `(invoice.totale_documento / 100).toFixed(2)` (line 66). However, the invoice form and `computeTotals` calculator work in euro-cents internally in the UI, but the API route `POST /api/invoices` saves `body.totale_documento` directly from the client. The invoice-form component sends cent values from `computeTotals()`, so the DB stores cents. But the PDF route calls `fmt(invoice.totale_documento)` which uses `Intl.NumberFormat` on the raw value — treating it as euros. This means either the email or the PDF displays the wrong amount (off by 100x), depending on what the DB actually stores.
**File(s):** `app/api/invoices/[id]/send/route.ts` line 66, `app/api/invoices/[id]/pdf/route.tsx` line 216, `components/contabilita/invoice-totals-calculator.ts` (all values documented as "euro cents"), `components/contabilita/invoice-form.tsx` line 187-196
**Fix:** Decide on a single unit of measure (euros or cents) across the stack. The `invoice-totals-calculator.ts` clearly documents "euro cents" and the form sends those values. The PDF `fmt()` function and the email template must both divide by 100. Audit every place `totale_documento`, `imponibile`, `netto_a_pagare` are displayed and ensure consistent conversion. The CSV export route (`invoices/export/route.ts` line 37-40) also calls `centsToEuro()` which divides by 100 — this is correct only if cents are stored.

### A4. Proposals GET list has no pagination (unbounded query)
**Problem:** `GET /api/proposals` fetches all proposals for a workspace with no `.limit()`. As an agency accumulates hundreds or thousands of proposals over years, this query will grow unbounded and degrade performance.
**File(s):** `app/api/proposals/route.ts`, lines 17-21
**Fix:** Add `.limit(200)` or implement cursor-based pagination with `offset` and `limit` query parameters, similar to how listings already has `.limit(200)`.

### A5. Invoices GET list has no pagination (unbounded query)
**Problem:** Same as A4 — `GET /api/invoices` fetches all invoices for a workspace with no limit. The stats endpoint also fetches all invoices without limit.
**File(s):** `app/api/invoices/route.ts`, lines 17-21; `app/api/invoices/stats/route.ts`, lines 42-45
**Fix:** Add `.limit(500)` to the list endpoint. For stats, consider a server-side aggregate query instead of fetching all rows to JS.

### A6. `check-overdue` endpoint has no authentication or authorization
**Problem:** `POST /api/invoices/check-overdue` has zero auth checks. Anyone on the internet can call it and update invoice statuses across ALL workspaces. It uses `createAdminClient()` without filtering by workspace, so it affects the entire database.
**File(s):** `app/api/invoices/check-overdue/route.ts`, lines 5-20
**Fix:** Either add `x-cron-secret` header validation (like the match-engine compute route does), or add user authentication + workspace_id filtering. This should also be scoped to a single workspace or protected as an internal cron endpoint.

### A7. `generate-from-urls` route spreads unvalidated user input into DB insert
**Problem:** The route receives `{ listing, photoUrls }` from the client and uses `...listing` to spread the entire listing object directly into the database insert (line 66). This allows a malicious client to set any column, including `workspace_id`, `agent_id`, `status`, or any other protected field.
**File(s):** `app/api/listing/generate-from-urls/route.ts`, line 66
**Fix:** Explicitly pick only the allowed fields from `listing` instead of spreading the entire user-provided object. Apply the same field validation that the main `generate/route.ts` uses.

### A8. Proposal form sends PUT for edit but API only defines PATCH handler
**Problem:** The proposal form uses `PUT` as the HTTP method when `mode === 'edit'` (line 139). However, the proposals `[id]/route.ts` only defines `GET`, `PATCH`, and `DELETE` handlers — there is no `PUT` export. This means editing a proposal will always return 405 Method Not Allowed.
**File(s):** `components/proposals/proposal-form.tsx` line 139; `app/api/proposals/[id]/route.ts` (no PUT handler)
**Fix:** Change the method in `proposal-form.tsx` from `'PUT'` to `'PATCH'`, or add a `PUT` handler to the API route.

### A9. Proposal status transition has no state machine validation
**Problem:** The `respond` endpoint allows any status transition. For example, a proposal that is already `accettata` can be moved to `rifiutata`, or a `bozza` can be moved to `accettata` (skipping `inviata`). The Italian legal workflow requires: bozza -> inviata -> accettata/rifiutata/controproposta/scaduta. Currently there are no checks on `existing.status` before applying the transition.
**File(s):** `app/api/proposals/[id]/respond/route.ts`, lines 40-54
**Fix:** Add a state machine guard. For example, `accettata`/`rifiutata` should only be allowed from `inviata` or `controproposta` status. `inviata` should only be allowed from `bozza`.

### A10. `getWorkspaceStorageUsed` fetches all rows instead of using SQL aggregation
**Problem:** The storage quota check fetches every individual attachment row with `select('size_bytes')` for both tables, then sums them in JS. For workspaces with thousands of attachments, this transfers huge amounts of data unnecessarily.
**File(s):** `lib/storage-limits.ts`, lines 29-49
**Fix:** Use a Supabase RPC function or raw SQL `SELECT COALESCE(SUM(size_bytes), 0) FROM ...` to aggregate server-side. Alternatively, maintain a `storage_used_bytes` counter on the workspace table.

## B) UX / UI / Aesthetic Issues

### B1. Proposal form has no loading spinner on submit buttons
**Problem:** The proposal form "Salva bozza" and "Salva e invia al venditore" buttons show `Salvataggio...` text when saving but no spinner icon, unlike the listing form which shows a `Loader2` spinner. This is inconsistent and provides weaker visual feedback.
**File(s):** `components/proposals/proposal-form.tsx`, lines 353-358
**Fix:** Add `{saving && <Loader2 className="h-4 w-4 animate-spin" />}` before the text label in both buttons, matching the pattern used in `listing-form.tsx` line 505.

### B2. Invoice form has no loading spinner on submit buttons
**Problem:** Same issue as B1 — the invoice form buttons show "Salvataggio..." text but no Loader2 spinner icon.
**File(s):** `components/contabilita/invoice-form.tsx`, lines 536-549
**Fix:** Add a `Loader2` spinner inside the buttons when `saving` is true.

### B3. Listing edit form duplicates PROPERTY_TYPES, FEATURES, TONES, CONDITIONS constants
**Problem:** The constants `PROPERTY_TYPES`, `FEATURES`, `TONES`, and `CONDITIONS` are defined identically in both `listing-form.tsx` and `listing-edit-form.tsx`. This is a maintenance risk: if a new property type or feature is added, it must be updated in two places.
**File(s):** `components/listing/listing-form.tsx` lines 19-54; `components/listing/listing-edit-form.tsx` lines 18-53
**Fix:** Extract these constants into a shared file such as `components/listing/listing-constants.ts` and import from both forms.

### B4. Proposal form uses raw `<select>` elements instead of shadcn Select component
**Problem:** The proposal form uses native `<select>` elements with custom styling for the listing, buyer, and seller dropdowns. Other forms in the codebase use the shadcn `<Select>` component. This creates visual inconsistency (native select has different appearance per OS/browser).
**File(s):** `components/proposals/proposal-form.tsx`, lines 167-178, 200-209, 239-249
**Fix:** Replace native `<select>` elements with the shadcn `Select/SelectContent/SelectItem` components already used elsewhere (e.g., in `listing-form.tsx` for the bathrooms selector). The same issue exists in the invoice form.

### B5. Mobile layout breaks on proposal list action buttons
**Problem:** The proposal list shows action buttons (`handleRespond`, `handleDelete`, PDF download) in a horizontal row that is always visible on mobile (`opacity-100`). With 4-5 icon buttons, this row can overflow or compress the proposal details on narrow screens. There is no dropdown menu for mobile, unlike the invoice list which has `InvoiceRowMenu` for small screens.
**File(s):** `components/proposals/proposal-list.tsx`, lines 216-268
**Fix:** Add a mobile dropdown menu (similar to `InvoiceRowMenu` in `invoice-list-client.tsx`) and hide the inline buttons on small screens with `hidden sm:flex`, showing the dropdown with `sm:hidden`.

### B6. Proposal list row is not clickable — requires finding the small chevron icon
**Problem:** To view a proposal's detail page, the user must find and click the small `ChevronRight` icon button at the far right of the row. The row itself is not wrapped in a `<Link>`. In contrast, the invoice list makes the entire details area a `<Link>` (line 336). This makes proposals harder to navigate.
**File(s):** `components/proposals/proposal-list.tsx`, lines 183-268
**Fix:** Wrap the proposal details section (lines 194-205) in a `<Link href={/proposte/${p.id}}>` to make the entire middle area clickable, matching the invoice list pattern.

### B7. Listing form does not show validation errors inline
**Problem:** If the user submits the listing form with missing required fields, the browser's native `required` attribute shows a tooltip, but there are no inline error messages. For the price/sqm/rooms fields, the API returns a generic error via toast but the user cannot see which specific field caused the issue.
**File(s):** `components/listing/listing-form.tsx`, lines 143-181
**Fix:** Add client-side validation before submission: check that `form.address`, `form.city`, `form.price`, `form.sqm`, `form.rooms` are filled. Show inline red text below each invalid field (e.g., "Campo obbligatorio") and focus the first invalid field.

### B8. Invoice form line items display shows price_unitario/100 creating confusing UX
**Problem:** Line item `prezzo_unitario` is stored as cents but displayed by dividing by 100 in the input field (`value={voce.prezzo_unitario / 100}`). When the user types "1000", `parseCurrencyToCents` converts it to 100000 cents. The input then shows "1000.00" on next render. This is correct but confusing because the `importo` (shown nowhere in the form) is also in cents. Users have no visual cue of what the line item total is per row.
**File(s):** `components/contabilita/invoice-form.tsx`, lines 336-377
**Fix:** Add a read-only "Importo" column showing `formatCurrency(voce.importo)` per row so users can verify the calculated total per line item.

### B9. No confirmation dialog before sending invoice via email
**Problem:** Clicking "Invia via email" on the invoice list sends the email immediately with no confirmation dialog. Sending an invoice is a significant business action (it changes the status to "inviata" and triggers reminder creation). The delete action properly shows a `confirm()` dialog, but send does not.
**File(s):** `components/contabilita/invoice-list-client.tsx`, line 133 (`handleSendEmail`)
**Fix:** Add `if (!confirm('Inviare la fattura via email al cliente?')) return` before proceeding with the API call.

## C) Major Feature Proposals

### C1. Automatic proposal expiry (scaduta) detection
**Description:** Proposals have a `validita_proposta` date but there is no mechanism to automatically mark them as `scaduta` when the validity date passes, similar to how `check-overdue` handles invoices. An agent checking the proposal list sees stale proposals stuck in "inviata" status long after they expired. A cron job or on-demand check endpoint that transitions `inviata` proposals past their `validita_proposta` to `scaduta` would keep the pipeline accurate and enable "scadute" filtering to work correctly.

### C2. Unified search with proposals and invoices
**Description:** The global search API (`/api/search`) searches listings, contacts, and properties but not proposals or invoices. Italian agents frequently need to look up a proposal by buyer name or an invoice by number. Adding proposals and invoices to the search results (with appropriate result types and links to `/proposte/{id}` and `/contabilita/{id}`) would significantly improve navigation efficiency in daily use.

### C3. Batch PDF/XML export for invoices
**Description:** Currently, invoices can only be downloaded one at a time (PDF or XML). Italian agencies must submit electronic invoices to the SDI in bulk. A batch export feature that generates a ZIP file of all XML files for a selected date range would eliminate the tedious one-by-one download workflow. This is especially valuable at quarter/year-end when dozens of invoices need to be filed.
