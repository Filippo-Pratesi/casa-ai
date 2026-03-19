# VERIFICATION PASSED — 16/16 PASS

# Review Iteration 3 — casa-ai

**Model:** Claude Sonnet 4.6 (acting as senior full-stack architect + UX designer)
**Date:** 2026-03-19

---

## Section A — Logical / Data / Architectural Changes

### A1. Contact detail page runs 4 sequential DB queries — O(n) latency stack
**Problem:** `app/(app)/contacts/[id]/page.tsx` fetches agent name (lines ~104-112), then appointments (~116-124), then matching listings (~129-145), then property links (three queries ~164-186) — all sequentially. Each waits for the previous to complete, adding ~100-200ms per hop.
**Affected files:** `app/(app)/contacts/[id]/page.tsx`
**Fix:** Merge the agent/appointments/properties fetches into a single `Promise.all([agentQuery, appointmentsQuery, listingsQuery, propLinksQuery])`. All four are independent and can run in parallel.

### A2. Calendar page runs listings and contacts queries sequentially
**Problem:** `app/(app)/calendar/page.tsx` (lines ~27-41) fetches listings and contacts in sequence — each waits for the previous. These two queries are fully independent.
**Affected files:** `app/(app)/calendar/page.tsx`
**Fix:** Wrap both in `Promise.all()`. Follow the pattern already used in the admin branch (lines ~50-63) where `Promise.all` is used correctly.

### A3. Todos API accepts `priority` and `due_date` without validation
**Problem:** `app/api/todos/route.ts` (lines ~65-67) inserts `priority` and `due_date` directly from request body with no validation. An invalid priority string (e.g., `"critical"`) or invalid date string (e.g., `"not-a-date"`) is passed to the database, which may silently store garbage or throw a DB error returned as a 500.
**Affected files:** `app/api/todos/route.ts`
**Fix:** Validate `priority` against the allowed enum values (`['bassa','media','alta']`). Validate `due_date` with `!isNaN(new Date(due_date).getTime())`. Return 400 on invalid values.

### A4. Contacts API accepts `preferred_types` without enum validation
**Problem:** `app/api/contacts/route.ts` (lines ~87-88) inserts `preferred_cities` and `preferred_types` as raw arrays from the request body. `preferred_types` should only contain valid `property_type` enum values (`apartment/house/villa/commercial/land/garage/other`), but there is no validation — any string array is accepted and stored.
**Affected files:** `app/api/contacts/route.ts`
**Fix:** Add validation: `const VALID_TYPES = ['apartment','house','villa','commercial','land','garage','other']` and filter `preferred_types` to only valid values, or return 400 on invalid input. Also validate email format with a regex check.

### A5. Contact detail page fetches 100 listings then filters client-side
**Problem:** `app/(app)/contacts/[id]/page.tsx` (lines ~129-145) fetches up to 100 listings and then filters them in JavaScript to find matching ones. This wastes bandwidth and DB resources. With 100+ listings the query could be slow, and only the first 5 results are shown anyway.
**Affected files:** `app/(app)/contacts/[id]/page.tsx`
**Fix:** Move the filter to the DB level. Apply budget, rooms, sqm, and city filters in the Supabase query using `.gte()`, `.lte()`, `.contains()` etc. Limit to 5 results with `.limit(5)` since only 5 are displayed.

### A6. Invoice list date range filter has no ordering validation
**Problem:** `components/contabilita/invoice-list-client.tsx` applies a date range filter with `dateFrom` and `dateTo` inputs. There is no guard preventing `dateTo < dateFrom`, which results in an empty result set with no explanation to the user.
**Affected files:** `components/contabilita/invoice-list-client.tsx`
**Fix:** After user sets both dates, check `if (dateTo && dateFrom && dateTo < dateFrom)` and show a warning toast: `"La data 'al' deve essere successiva alla data 'dal'"`. Disable the filter from applying until corrected.

### A7. Campaign stats computed with two array passes — consolidate to one
**Problem:** `app/(app)/campaigns/page.tsx` (lines ~55-60) computes `avgOpenRate` by first calling `.filter(c => c.sent_count > 0)` (one pass) and then `.reduce(...)` (second pass). This creates an intermediate array and iterates twice over the same data.
**Affected files:** `app/(app)/campaigns/page.tsx`
**Fix:** Consolidate into a single `.reduce()` that accumulates both sum and count: `campaigns.reduce((acc, c) => c.sent_count > 0 ? { sum: acc.sum + ..., n: acc.n + 1 } : acc, { sum: 0, n: 0 })`. Compute average from `sum / n`.

### A8. TYPE_LABELS and TYPE_COLORS constants duplicated across contact files
**Problem:** `app/(app)/contacts/[id]/page.tsx` and `components/contacts/contacts-client.tsx` both define their own `TYPE_LABELS` and `TYPE_COLORS` record objects for contact types. This duplicates the same data in two places, creating a maintenance burden: changes must be made in both files.
**Affected files:** `app/(app)/contacts/[id]/page.tsx`, `components/contacts/contacts-client.tsx`
**Fix:** Extract `TYPE_LABELS` and `TYPE_COLORS` to a single shared file `lib/contact-utils.ts` and import from both files.

---

## Section B — UX / UI Design / Aesthetic Changes

### B1. Contacts list has no empty state when filtered results are empty
**Problem:** `components/contacts/contacts-client.tsx` applies client-side filters (type, search) but when the filtered results are empty, it renders nothing — no message, no illustration, no suggestion. Users may think the page is broken or still loading.
**Affected files:** `components/contacts/contacts-client.tsx`
**Fix:** After filtering, if `filteredContacts.length === 0`, render an empty state: icon (e.g., `UserRound`), headline "Nessun cliente trovato", subtext "Prova a modificare i filtri o aggiungi un nuovo cliente", and a "Nuovo cliente" CTA button.

### B2. Contact detail page timeline lacks semantic list markup — fails accessibility
**Problem:** `app/(app)/contacts/[id]/page.tsx` (line ~522) renders a timeline of appointment/interaction history as raw divs. Screen readers cannot identify this as a list. Users navigating by list landmarks will miss the content.
**Affected files:** `app/(app)/contacts/[id]/page.tsx`
**Fix:** Wrap the timeline in `<ul role="list" aria-label="Cronologia appuntamenti">` and each item in `<li>`. This gives screen readers the list count and navigation.

### B3. Campaign open rate progress bar uses hardcoded `bg-green-500` — inconsistent with design tokens
**Problem:** `app/(app)/campaigns/page.tsx` (line ~167) renders a progress bar with `className="... bg-green-500"`. This uses a Tailwind default green rather than the app's oklch-based "Warm Futurism" color system. Other UI elements use custom oklch colors.
**Affected files:** `app/(app)/campaigns/page.tsx`
**Fix:** Replace `bg-green-500` with the app's primary gradient: `bg-gradient-to-r from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)]`. Use the same gradient on other percentage indicators in the same card.

### B4. Invoice action buttons (PDF, email) have no loading state — user may double-click
**Problem:** `components/contabilita/invoice-list-client.tsx` has an `actionLoading` state but the loading spinner or disabled state is not applied to the action buttons in the dropdown menu. Users cannot tell whether their click was registered, leading to potential double-submissions.
**Affected files:** `components/contabilita/invoice-list-client.tsx`
**Fix:** Add `disabled={actionLoading === invoice.id}` to each action button and show a `<Loader2 className="h-3 w-3 animate-spin" />` icon while loading. Optionally dim the entire row with `opacity-60` during loading.

### B5. Contact detail action buttons (WhatsApp, Call, Email) missing `aria-label`
**Problem:** `app/(app)/contacts/[id]/page.tsx` (lines ~291-319) renders icon-only buttons for WhatsApp, phone call, and email. Without `aria-label`, screen reader users hear "button" with no context. Keyboard-only users also cannot distinguish which action to invoke.
**Affected files:** `app/(app)/contacts/[id]/page.tsx`
**Fix:** Add descriptive `aria-label` to each: `aria-label="Apri WhatsApp"`, `aria-label="Chiama"`, `aria-label="Invia email"`. For links (`<a href="tel:...">`, `<a href="mailto:...">`), add `aria-label` with the contact's name: `aria-label={`Chiama ${contact.name}`}`.

### B6. Invoice dates rendered as plain text — should use semantic `<time>` element
**Problem:** `components/contabilita/invoice-list-client.tsx` renders invoice dates (emissione, scadenza, pagamento) as plain text strings. This prevents search engines and assistive technologies from understanding these as machine-readable dates.
**Affected files:** `components/contabilita/invoice-list-client.tsx`
**Fix:** Wrap each displayed date in `<time dateTime={isoDateString}>{formattedDate}</time>`. Use the ISO date string (e.g., `data_emissione`) as the `dateTime` attribute and the formatted Italian date as the display text.

### B7. Todos page has no empty state — blank page confuses new users
**Problem:** `app/(app)/todos/page.tsx` renders the `TodosClient` component which, when the workspace has no todos, shows nothing but the page chrome. New users see a blank content area with no guidance on what this section is for.
**Affected files:** `app/(app)/todos/page.tsx` or the todos client component
**Fix:** When `todos.length === 0`, render an empty state: `CheckSquare` icon with gradient background, headline "Nessun task ancora", description "Crea il tuo primo task per tenere traccia delle attività", and a "Nuovo task" button.

### B8. Campaigns list empty state missing a CTA button to create first campaign
**Problem:** `app/(app)/campaigns/page.tsx` (lines ~76-98) has an empty state block but inspection shows only text "Crea la tua prima campagna" with a link. The link/button styling is inconsistent with the `btn-ai` class used on other primary CTAs across the app (e.g., contabilità empty state, dashboard).
**Affected files:** `app/(app)/campaigns/page.tsx`
**Fix:** Update the empty state CTA to use `className="btn-ai inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"` consistent with empty states in `/contabilita`, `/listings`, and `/contacts`.

---

## Implementation Notes

Priority: A1 (parallel contact queries), A2 (parallel calendar queries), A3 (todos validation), B1 (contacts empty state), B4 (invoice loading state), B7 (todos empty state).
No database migrations required. All changes are application-layer only.
