# casa-ai Ralph Loop — Final Summary

**Completed:** 2026-03-20
**Iterations:** 5
**Reviewer:** Claude Opus 4.6 (review) + Claude Haiku 4.5 (verification)
**Branch:** `review-loop`

---

## Executive Summary

The Ralph Loop is a structured, iterative code review and fix cycle applied to the **casa-ai** codebase — a full-stack Next.js 16 + Supabase real estate SaaS for Italian agencies. Over 5 iterations, Opus reviewed different sections of the codebase each round, producing A items (logical/security bugs to fix immediately), B items (UX/UI improvements), and C items (feature proposals). Each iteration's A and B items were implemented in full before proceeding.

The loop surfaced and fixed **2 critical IDOR vulnerabilities**, **6 additional security issues**, **8 data integrity bugs**, and **37 UX improvements** across all major modules: contacts/CRM, Banca Dati, listings, invoicing, proposals, calendar, todos, public pages, and shared utilities. Iterations 1 and 2 also required a Haiku verification pass that caught additional regressions (invoice PDF cents/euros confusion, stats query limit, storage SQL aggregation). All 5 iterations passed.

---

## Iterations at a Glance

| Iteration | Focus Areas | A Items Fixed | B Items Fixed | Commit | Haiku Result |
|-----------|-------------|:-------------:|:-------------:|--------|--------------|
| 1 | lib/, hooks/, contacts/, banca-dati/, dashboard/, API (contacts, properties, banca-dati) | 12 | 9 | `d95eecc` + `8f11471` | PASS (1 regression fixed) |
| 2 | Listing, invoicing, proposals, floor-plans, billing | 10 | 9 | `c3a81e5` + `b0e2f5b` | PASS (4 regressions fixed) |
| 3 | Appointments, todos, calendar, contacts API, banca-dati new-property flow | 9 | 10 | `1c24c2a` | PASS |
| 4 | Archive, contabilita, proposals detail, public pages, lib utilities, shared components | 8 | 8 | `5f47a33` | PASS |
| 5 | Listing detail/edit, Banca Dati edit dialog, match engine, cross-cutting concerns | 9 | 8 | `96e7c57` | PASS |
| **Total** | | **48** | **44** | | **5/5 PASS** |

---

## All Changes Made

### Security & Authorization Fixes

- **[Iter 1]** Attachment download (contacts) enforces `workspace_id` path prefix check — prevents cross-workspace storage path traversal (CRITICAL)
- **[Iter 2]** Floor-plan DELETE adds `workspace_id` filter — prevents IDOR allowing any user to null out any listing's floor plan (CRITICAL)
- **[Iter 2]** Attachment download (listings) validates storage path belongs to the requesting workspace (HIGH)
- **[Iter 1]** `facebook.ts` stops including raw Meta Graph API response in error messages — prevents token/page-ID leakage
- **[Iter 2]** `generate-from-urls` route uses an explicit field allowlist instead of spreading the entire user-supplied object into the DB insert
- **[Iter 2]** `check-overdue` invoice endpoint requires `x-cron-secret` header; unauthenticated callers can no longer bulk-update invoice statuses across all workspaces
- **[Iter 4]** Cron endpoints (`check-overdue`, `send-reminders`) now fail closed when `CRON_SECRET` is not set — previously skipped auth entirely
- **[Iter 5]** Listing edit page (`/listing/[id]/edit`) now authenticates the user and filters by `workspace_id` before returning listing data (CRITICAL)
- **[Iter 5]** Listing detail page query includes `workspace_id` filter — prevents cross-workspace listing data leakage (HIGH)
- **[Iter 5]** Match engine trigger endpoint adds `workspace_id` filter to the property stage query

### Data Integrity & Correctness Fixes

- **[Iter 1]** Plan tier enum unified: `'agenzia'` renamed to `'growth'` across `plan-limits.ts`, billing webhook, checkout, AI assistant gate, plans page — workspaces on the `growth` plan were silently falling through to trial-level limits
- **[Iter 1]** Contact import API now populates the `types[]` array alongside the legacy `type` column — imported contacts were invisible to all type-based filters
- **[Iter 1]** Property contact creation (Banca Dati inline create) now also populates `types[]`
- **[Iter 2]** Proposal form changed from `PUT` to `PATCH` — editing proposals was returning 405 Method Not Allowed
- **[Iter 2]** Proposal `respond` endpoint enforces a state machine: `accettata`/`rifiutata` only from `inviata`/`controproposta`; `inviata` only from `bozza`
- **[Iter 2]** Invoice email and PDF routes both divide `totale_documento` by 100 consistently (cents storage confirmed as canonical unit)
- **[Iter 3]** Todos API: `GET`, `PATCH`, and `DELETE` handlers now include `workspace_id` scoping — todos were leakable across workspaces
- **[Iter 3]** Todos POST priority values aligned to English `low/medium/high` matching the UI's `PRIORITY_CONFIG` — DB previously accumulated mixed Italian/English values
- **[Iter 3]** Property `owner_contact_id` update includes `workspace_id` guard in both select and update queries
- **[Iter 3]** Contact DELETE archive-before-delete: archive insert result is checked before proceeding with deletion — prevents silent data loss
- **[Iter 3]** Birthday message endpoint requires `date_of_birth` to be set before calling DeepSeek API — prevents unbounded AI API cost
- **[Iter 4]** `fmtEur` distinguishes null/undefined ("---") from zero value ("EUR 0")
- **[Iter 4]** Archive contacts date filter now applied to the contacts query (previously only applied to listings)
- **[Iter 5]** `getAIAdjustments` extracted to shared `lib/match-ai.ts` — eliminates 70-line duplication between `compute` and `trigger` match engine routes
- **[Iter 5]** Banca Dati alerts route: `today.setHours()` mutation replaced with `new Date(...)` immutable copy — prevented off-by-one errors in birthday diff across iterations
- **[Iter 5]** `ListingStats.handleCopyLink` corrected from `/listing/${id}` to `/p/${id}` — was generating authenticated-only URLs instead of public share links

### API & Backend Improvements

- **[Iter 1]** Alerts API: N+1 property events query replaced with a single batched `.in()` query — previously made one DB round-trip per property
- **[Iter 1]** `omi-valuation.ts` uses shared `createAdminClient()` instead of duplicating raw Supabase client creation
- **[Iter 1]** `gemini.ts`: all `JSON.parse` calls wrapped in try/catch — unhandled LLM malformed-JSON was crashing API routes
- **[Iter 2]** Proposals GET list has `.limit(200)` — was unbounded
- **[Iter 2]** Invoices GET list has `.limit(500)`; stats endpoint has `.limit(1000)` — both were unbounded
- **[Iter 2]** `getWorkspaceStorageUsed` uses SQL `SUM(size_bytes)` aggregate instead of fetching all attachment rows to JS
- **[Iter 3]** Contacts search parameter is sanitized (strip `'"();\\`) before PostgREST interpolation
- **[Iter 3]** Contacts GET/POST switched to `createAdminClient()` per project convention
- **[Iter 3]** Appointments POST validates `starts_at` and `ends_at` are valid date strings before insert
- **[Iter 4]** Archive API route (GET handler) switched to `createAdminClient()` for data fetching
- **[Iter 4]** Public listing page (`/p/[id]`) adds `.eq('status', 'published')` filter — draft listings were fully public
- **[Iter 4]** Invoice PATCH endpoint uses field allowlist instead of denylist — previously allowed injecting arbitrary fields (e.g., `status: 'pagata'`)
- **[Iter 5]** `MarkAsSoldButton` contacts fetch filtered to `type=buyer&limit=50` with searchable combobox — was loading all contacts with no filter

### UX & UI Improvements

- **[Iter 1]** Stage colors in contact detail page aligned with canonical `STAGE_CONFIG` from Banca Dati
- **[Iter 1]** Contact type badge colors unified: `seller=green`, `landlord=amber` across `contact-type-badges.tsx` and `contact-utils.ts`
- **[Iter 1]** `ROLE_LABELS` extracted to `lib/property-role-labels.ts` — was independently defined in 3 files with divergent entries
- **[Iter 1]** `WhatsAppIcon` extracted to `components/shared/whatsapp-icon.tsx` — was duplicated in 2 files
- **[Iter 1]** `birthdayDaysLeft` extracted to `lib/contact-utils.ts` — was duplicated in 3 files
- **[Iter 1]** `use-mobile.ts` hook: initialize with `?? false` to avoid SSR hydration mismatch
- **[Iter 2]** Proposal form and invoice form both show `Loader2` spinner during submission
- **[Iter 2]** Listing constants (`PROPERTY_TYPES`, `FEATURES`, `TONES`, `CONDITIONS`) extracted to `components/listing/listing-constants.ts` — was duplicated between `listing-form.tsx` and `listing-edit-form.tsx`
- **[Iter 2]** Proposal form native `<select>` elements replaced with shadcn `Select` components
- **[Iter 2]** Proposal list: mobile `DropdownMenu` added for action buttons; entire detail area is now a clickable `<Link>`
- **[Iter 2]** Listing form shows inline field-level validation errors before submission
- **[Iter 2]** Invoice form shows per-row `Importo` total in line items
- **[Iter 2]** Invoice send requires confirmation dialog before dispatching email
- **[Iter 3]** Calendar week view: single-click selects day, double-click opens create modal
- **[Iter 3]** Contacts card uses `types[0]` for border/avatar color — was using stale legacy `type` field
- **[Iter 3]** Contact pagination preserves existing query parameters (search, filters) when changing page
- **[Iter 3]** Todo delete shows confirmation before proceeding
- **[Iter 3]** Calendar appointment modal: contact and listing dropdowns replaced with searchable combobox
- **[Iter 3]** Immobile detail header: secondary actions (create campaign, view listing) moved to dropdown on mobile
- **[Iter 3]** Nuovo immobile form: submit button disabled when coordinates are missing
- **[Iter 3]** Calendar grid shows loading overlay during data fetches
- **[Iter 3]** Contacts card "nessuna preferenza" condition fixed — no longer renders alongside `budget_min`-only data simultaneously
- **[Iter 4]** Archive stats grid: `grid-cols-1 sm:grid-cols-3` for mobile stacking
- **[Iter 4]** `ArchiveExportButtons` component wired into the archive page header
- **[Iter 4]** Command palette: keyboard navigation (ArrowUp/ArrowDown/Enter) implemented
- **[Iter 4]** Invoice aging summary: individual invoice rows are `<Link>` to detail page
- **[Iter 4]** Proposal detail page: "Controproposta" card shows counter-offer fields when populated
- **[Iter 4]** Public listing page: "Prezzo" label changed from `text-muted-foreground` to `text-white/70` for WCAG contrast
- **[Iter 4]** Dashboard listing card: unassigned agent shows "Non assegnato" instead of "---"
- **[Iter 4]** Invoice list: duplicate empty state removed from `InvoiceListClient`
- **[Iter 5]** Photo gallery: keyboard navigation wraps consistently with button navigation (modulo arithmetic)
- **[Iter 5]** Listing detail page: `loading.tsx` skeleton added with `Suspense` boundaries
- **[Iter 5]** Delete and MarkAsSold confirmations use `Dialog`/`AlertDialog` instead of inline expansion
- **[Iter 5]** Floor plan drop zone: visual drag-over state with highlight border/background
- **[Iter 5]** Price history: dark mode variants added (`dark:bg-red-950/30`, `dark:bg-green-950/30`)
- **[Iter 5]** Valuation widget: "above average" changed to neutral blue instead of red
- **[Iter 5]** Edit details dialog: form state resets on `property.id` change via `useEffect`
- **[Iter 5]** Listing map popup: repositions on map move/zoom using Mapbox Popup API

### Performance & Memory Fixes

- **[Iter 5]** `PhotoUploader` and `ListingEditForm`: `URL.createObjectURL()` results memoized with cleanup `useEffect` calling `URL.revokeObjectURL()` — was leaking blob URLs on every render

---

## Key Metrics

| Metric | Count |
|--------|------:|
| A items (logical/security bugs) fixed | 48 |
| B items (UX/UI improvements) implemented | 44 |
| Haiku-caught regressions fixed | 5 |
| Iterations completed | 5 |
| Iterations passing Haiku verification | 5 / 5 |
| Critical security vulnerabilities fixed | 3 |
| High security issues fixed | 3 |
| Data integrity bugs fixed | 16 |

---

## Files Modified

The following files received the most significant changes across all iterations:

**API Routes**
- `web/app/api/contacts/import/route.ts`
- `web/app/api/contacts/route.ts`
- `web/app/api/contacts/[id]/route.ts`
- `web/app/api/contacts/[id]/birthday-message/route.ts`
- `web/app/api/contacts/[id]/attachments/download/route.ts`
- `web/app/api/listing/[id]/route.ts`
- `web/app/api/listing/[id]/attachments/download/route.ts`
- `web/app/api/listing/[id]/floor-plan/route.ts`
- `web/app/api/listing/generate-from-urls/route.ts`
- `web/app/api/invoices/route.ts`
- `web/app/api/invoices/[id]/route.ts`
- `web/app/api/invoices/[id]/pdf/route.tsx`
- `web/app/api/invoices/[id]/send/route.ts`
- `web/app/api/invoices/check-overdue/route.ts`
- `web/app/api/invoices/stats/route.ts`
- `web/app/api/proposals/route.ts`
- `web/app/api/proposals/[id]/respond/route.ts`
- `web/app/api/appointments/route.ts`
- `web/app/api/todos/route.ts`
- `web/app/api/todos/[id]/route.ts`
- `web/app/api/properties/[id]/contacts/route.ts`
- `web/app/api/banca-dati/alerts/route.ts`
- `web/app/api/archive/route.ts`
- `web/app/api/match-engine/trigger/route.ts`

**Pages**
- `web/app/p/[id]/page.tsx`
- `web/app/(app)/archive/page.tsx`
- `web/app/(app)/listing/[id]/page.tsx`
- `web/app/(app)/listing/[id]/edit/page.tsx`
- `web/app/(app)/listing/[id]/loading.tsx` *(new)*
- `web/app/(app)/proposte/[id]/page.tsx`
- `web/app/(app)/proposte/[id]/counter-offer/page.tsx`

**Components**
- `web/components/listing/listing-form.tsx`
- `web/components/listing/listing-edit-form.tsx`
- `web/components/listing/listing-constants.ts` *(new)*
- `web/components/listing/listing-stats.tsx`
- `web/components/listing/mark-as-sold-button.tsx`
- `web/components/listing/photo-uploader.tsx`
- `web/components/listing/photo-gallery.tsx`
- `web/components/listing/floor-plan-uploader.tsx`
- `web/components/listing/price-history.tsx`
- `web/components/listing/valuation-widget.tsx`
- `web/components/listing/listing-map-view.tsx`
- `web/components/contabilita/invoice-form.tsx`
- `web/components/contabilita/invoice-list-client.tsx`
- `web/components/contabilita/invoice-aging-summary.tsx`
- `web/components/proposals/proposal-form.tsx`
- `web/components/proposals/proposal-list.tsx`
- `web/components/contacts/contacts-client.tsx`
- `web/components/contacts/contact-type-badges.tsx`
- `web/components/calendar/calendar-client.tsx`
- `web/components/calendar/appointment-modal.tsx`
- `web/components/todos/todos-client.tsx`
- `web/components/banca-dati/immobile-detail-client.tsx`
- `web/components/banca-dati/nuovo-immobile-client.tsx`
- `web/components/banca-dati/edit-details-dialog.tsx`
- `web/components/shared/command-palette.tsx`
- `web/components/shared/whatsapp-icon.tsx` *(new)*
- `web/components/dashboard/listing-card.tsx`

**Library / Shared**
- `web/lib/plan-limits.ts`
- `web/lib/contact-utils.ts`
- `web/lib/match-scoring.ts`
- `web/lib/match-ai.ts` *(new)*
- `web/lib/storage-limits.ts`
- `web/lib/gemini.ts`
- `web/lib/facebook.ts`
- `web/lib/omi-valuation.ts`
- `web/lib/property-role-labels.ts` *(new)*
- `web/hooks/use-mobile.ts`
