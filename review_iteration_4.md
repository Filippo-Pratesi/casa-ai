# Review Iteration 4 -- Archive, Contabilita, Proposals, Public Pages, Lib Utilities, Shared Components, Dashboard

---

## Section A: Logical / Architectural Issues

### A1. Public property page exposes unpublished/draft listings to anyone

**File:** `web/app/p/[id]/page.tsx`, lines 39-45

**Problem:** The public listing page fetches a listing by `id` with no filter on `status`. A draft listing (`status = 'draft'`) is fully viewable by anyone who guesses or receives the UUID. The query uses `createAdminClient()` (bypassing RLS), which makes the exposure worse -- there is zero access control.

**Fix:** Add `.eq('status', 'published')` to the query on line 43. Alternatively, add an explicit check after fetching: if the listing is not published, return `notFound()`. This prevents leaking unpublished data to the public internet.

---

### A2. Archive API route uses user-scoped Supabase client instead of adminClient

**File:** `web/app/api/archive/route.ts`, lines 6-32

**Problem:** The GET handler uses `createClient()` (user JWT) for both auth check and data fetching. This is inconsistent with the coding convention that all API routes must use `createAdminClient()` for DB operations. If RLS is not perfectly configured on `archived_listings` / `archived_contacts`, this route will silently return empty results. The archive page itself (`app/(app)/archive/page.tsx`) correctly uses `createAdminClient()`, so the API and page are inconsistent.

**Fix:** Change the data-fetching queries to use `createAdminClient()`, consistent with every other API route in the codebase.

---

### A3. Counter-offer page resolves params via `.then()` inside render, causing race condition

**File:** `web/app/(app)/proposte/[id]/counter-offer/page.tsx`, lines 26-31

**Problem:** The `proposalId` is resolved by calling `params.then(p => setProposalId(p.id))` inside the render body (not in `useEffect`). This is a side effect during render, which React Strict Mode will execute twice. More critically, the initial render has `proposalId === null`, so the form briefly renders in an unusable state and the back-link points to `/proposte` instead of the correct proposal. If the user submits before the promise resolves, the guard on line 35 (`if (!proposalId) return`) silently swallows the submission with no feedback.

**Fix:** Use `React.use(params)` (React 19 pattern) to unwrap the promise synchronously, or resolve it in a `useEffect` and show a loading spinner until `proposalId` is available. Also add a toast or disable the submit button visibly when `proposalId` is null.

---

### A4. `fmtEur` in proposal detail returns "EUR 0" for falsy but valid zero-value amounts

**File:** `web/app/(app)/proposte/[id]/page.tsx`, lines 11-13

**Problem:** `fmtEur` guards with `if (!n) return 'EUR 0'`. The value `0` is falsy in JS, so `fmtEur(0)` returns `'EUR 0'` -- which happens to be correct by coincidence. However, `fmtEur(null)` and `fmtEur(undefined)` also hit this branch. More importantly, the `!n` check means a legitimate `prezzo_offerto` of `0` (a zero-offer scenario, e.g., donation) formats identically to "data not set". This masks a missing-data state.

**Fix:** Check `if (n == null) return '---'` to distinguish "not provided" from "zero". Apply the same pattern to `formatCurrency` usages in the invoicing module.

---

### A5. `check-overdue` cron endpoint accepts requests when CRON_SECRET is not set

**File:** `web/app/api/invoices/check-overdue/route.ts`, lines 7-13

**Problem:** If `process.env.CRON_SECRET` is undefined (e.g., forgotten in production env), the entire auth check is skipped (`if (cronSecret) { ... }`). Any anonymous user can POST to this endpoint and bulk-update all `inviata` invoices to `scaduta`. The same pattern exists in `send-reminders/route.ts` (lines 8-12).

**Fix:** Fail closed: if `CRON_SECRET` is not defined, return 500 with a configuration error. Never skip the auth check when the secret is missing.

---

### A6. Archive contacts date filter is not applied

**File:** `web/app/(app)/archive/page.tsx`, lines 100-108

**Problem:** The date filters (`date_from`, `date_to`) are applied to the listings query (lines 97-98) but NOT to the contacts query (lines 103-107). When a user filters by date range, they expect both listings and contacts to be filtered, but contacts always show the full unfiltered list.

**Fix:** Apply the same `.gte('archived_at', date_from)` and `.lte('archived_at', date_to + 'T23:59:59')` conditions to the contacts query.

---

### A7. Match scoring silently returns 0 when `property.city` is null/undefined

**File:** `web/lib/match-scoring.ts`, line 69

**Problem:** The location scoring calls `property.city.toLowerCase()`. The `PropertyForMatch` interface declares `city: string` (non-nullable), but in practice Supabase rows can have null cities (especially for `sconosciuto` stage properties). If `property.city` is null at runtime, this line throws a TypeError and crashes the entire match computation for that property.

**Fix:** Add a null guard: `const cityLower = property.city?.toLowerCase() ?? ''`. Consider also normalizing whitespace and accents for Italian city name matching (e.g., "Forte dei Marmi" vs "forte dei marmi").

---

### A8. Invoice PATCH endpoint allows arbitrary field injection

**File:** `web/app/api/invoices/[id]/route.ts`, lines 64-66

**Problem:** The PATCH handler strips a few known protected fields (`id`, `workspace_id`, `agent_id`, `numero_fattura`, `anno`, `progressivo`) but then passes the rest of the body directly to Supabase's `.update()`. An attacker could inject fields like `status: 'pagata'` or `data_pagamento: '2020-01-01'` to mark invoices as paid, or even modify `document_type` to change a fattura into a nota_credito. The `bozza` status check that exists on the DELETE handler is missing here.

**Fix:** Use an allowlist of updatable fields instead of a denylist. Only allow known mutable fields: `cliente_nome`, `cliente_indirizzo`, `voci`, `imponibile`, `importo_iva`, `note`, etc. Reject any fields not on the allowlist.

---

## Section B: UX / UI Improvements

### B1. Archive page stats grid breaks on mobile (3 columns)

**File:** `web/app/(app)/archive/page.tsx`, line 177

**Problem:** The stats bar uses `grid grid-cols-3 gap-3` with no responsive breakpoint. On narrow mobile screens (<375px), three cards of financial data with EUR formatting are extremely cramped and text overflows.

**Improvement:** Use `grid grid-cols-1 sm:grid-cols-3 gap-3` to stack cards vertically on small screens, or `grid-cols-2 sm:grid-cols-3` for a 2-1 layout.

---

### B2. Archive export buttons are defined but never rendered on the page

**File:** `web/components/archive/archive-export-buttons.tsx` (entire file) and `web/app/(app)/archive/page.tsx`

**Problem:** The `ArchiveExportButtons` component exists and works, but is never imported or rendered on the archive page. Users have no way to discover or use the CSV export functionality for archived data, despite the API endpoint being fully implemented.

**Improvement:** Add the `ArchiveExportButtons` component to the archive page header, next to the date filter. This completes the export feature that is already built end-to-end.

---

### B3. Command palette missing keyboard navigation (up/down/enter)

**File:** `web/components/shared/command-palette.tsx`, lines 113-210

**Problem:** The command palette supports mouse clicking on results but has no keyboard navigation. Users cannot use arrow keys to move between results or press Enter to select. For a Ctrl+K palette, keyboard-only navigation is table-stakes UX. The footer even says "Enter to open" but the feature is not implemented.

**Improvement:** Add `selectedIndex` state, handle ArrowUp/ArrowDown to move the index, and Enter to navigate to the selected item. Highlight the active item with a visual indicator.

---

### B4. Invoice aging summary individual invoices are not clickable

**File:** `web/components/contabilita/invoice-aging-summary.tsx`, lines 119-130

**Problem:** When the user expands an aging bucket and sees individual overdue invoices, the invoice rows are plain `<div>` elements with no click handler. Users must manually navigate to each invoice via the main list to take action on overdue items.

**Improvement:** Wrap each aging invoice row in a `<Link href={/contabilita/${inv.id}}>` so users can click through directly to the invoice detail page from the aging report.

---

### B5. Proposal detail does not show counter-offer details after one is submitted

**File:** `web/app/(app)/proposte/[id]/page.tsx`, lines 53-231

**Problem:** After a seller submits a counter-offer (prezzo_controproposto, validita_risposta, note_venditore), the proposal detail page has no section displaying these fields. The counter-offer data is stored in the database but invisible on the detail page. Users must remember the counter-offer details or check the raw data.

**Improvement:** Add a "Controproposta" card in the sidebar (below the "Offerta economica" card) that displays `prezzo_controproposto`, `validita_risposta`, `data_rogito_proposta`, and `note_venditore` when these fields are populated.

---

### B6. Public listing page shows hardcoded muted foreground text "Prezzo" inside colored price block

**File:** `web/app/p/[id]/page.tsx`, lines 92-95

**Problem:** The price block has a vibrant `oklch(0.57_0.20_33)` background with white text, but the "Prezzo" label uses `text-muted-foreground` which renders as a gray color with low contrast against the colored background. This fails WCAG contrast requirements.

**Improvement:** Change `text-muted-foreground` to `text-white/70` so the label is visible against the colored background.

---

### B7. Dashboard listing card images have no alt text fallback for missing agent names

**File:** `web/components/dashboard/listing-card.tsx`, line 23

**Problem:** The `<img>` tag uses `alt={l.address}` which is reasonable, but the agent name at line 94 shows `l.agent?.name ?? '---'`. The em-dash placeholder provides no information. A more user-friendly approach would show the listing creation date or "Non assegnato" instead.

**Improvement:** Replace `'---'` with `'Non assegnato'` to clearly communicate that no agent is assigned, rather than showing a cryptic dash character.

---

### B8. Invoice list shows duplicate empty state -- once from parent page, once from InvoiceListClient

**File:** `web/app/(app)/contabilita/page.tsx`, lines 68-82, and `web/components/contabilita/invoice-list-client.tsx`, lines 214-225

**Problem:** The contabilita page renders its own empty state (lines 68-82) when `invoices.length === 0`, and then conditionally renders `InvoiceListClient` only when there are invoices (line 95). However, `InvoiceListClient` also has its own empty state (lines 214-225) for when `invoices.length === 0`. This dead code is confusing for maintainers and the two empty states have different styling.

**Improvement:** Remove the empty state from `InvoiceListClient` (it can never be reached given the parent guard), or remove the parent guard and let the component handle both states uniformly.

---

## Section C: Major Feature Proposals

### C1. Archived Listing Restore / Reactivate Flow

Currently, archiving a listing is a one-way operation. There is no way to reactivate an archived listing if it was archived by mistake or if a sale falls through. Agents must re-create the listing from scratch, losing all generated content, photos, stats, and history.

**Proposal:** Add a "Ripristina annuncio" button on the archived listing detail page (`/archive/[id]`) that:
1. Creates a new `listings` row by copying all fields from `archived_listings`.
2. Sets `status = 'draft'` on the restored listing.
3. Adds a `restored_from_archive_id` field for audit trail.
4. Shows a confirmation dialog explaining that the listing will be restored as a draft.
5. Optionally delete the archive record (or mark it as `restored = true` for bookkeeping).

This would save significant time for agents who accidentally archive listings or whose sales fall through after archiving.

---

### C2. Invoice Payment Tracking with Partial Payments

The current invoicing system only supports a binary paid/unpaid state. Italian real estate transactions often involve installment payments (e.g., caparra at signing, balance at rogito). When an agent marks an invoice as "pagata", the full amount is recorded regardless of what was actually received.

**Proposal:** Extend the invoicing module with a `payment_records` table:
- Each invoice can have multiple payment records (date, amount, method, reference).
- The invoice status auto-transitions: `inviata` -> `parzialmente_pagata` (when sum < total) -> `pagata` (when sum >= total).
- The invoice detail page shows a payment timeline with each installment.
- The summary cards and aging report account for partial payments in their calculations.
- A "Registra incasso" button on the invoice detail page opens a modal to record a payment.

This better reflects real-world payment flows in Italian real estate brokerage.

---

### C3. Dashboard Activity Feed / Timeline

The dashboard currently shows static stat cards and a listing grid, but provides no sense of recent activity across the workspace. Agents must visit individual sections (contacts, proposals, invoices) to understand what happened recently.

**Proposal:** Add a collapsible "Attivita recenti" timeline section to the dashboard, below the stat cards and above the listing grid. It would aggregate the most recent 15-20 events from:
- New contacts added
- Proposals created/accepted/rejected
- Invoices sent/paid
- Properties that changed stage (Banca Dati)
- Listings published or archived
- Appointments in the next 48 hours

Each event shows an icon, description, timestamp, and a link to the relevant entity. The feed is workspace-scoped and fetched via a single aggregation API endpoint. This gives agents an at-a-glance overview of workspace activity without navigating away from the dashboard.
