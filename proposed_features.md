# casa-ai — Proposed Features from Ralph Loop

**Source:** 5-iteration Ralph Loop review (2026-03-20)
**Total proposals:** 15 (3 per iteration)
**Status:** Not yet implemented — available for sprint planning

---

## Table of Contents

| # | Title | Source | One-line Description |
|---|-------|--------|----------------------|
| 1 | Centralize Supabase Database Type Definitions | Iter 1 | Auto-generate complete TypeScript types from live schema to eliminate `as any` casts |
| 2 | Extract Shared Constants and Utility Modules | Iter 1 | Consolidate duplicated constants and utility functions into canonical shared files |
| 3 | Rate Limiting and Input Sanitization Middleware | Iter 1 | Add middleware-based rate limiting, CORS config, and PostgREST filter sanitization |
| 4 | Automatic Proposal Expiry Detection | Iter 2 | Cron job to auto-mark expired proposals as `scaduta` when `validita_proposta` passes |
| 5 | Unified Search with Proposals and Invoices | Iter 2 | Extend global search to cover proposals and invoices, not just listings and contacts |
| 6 | Batch PDF/XML Export for Invoices | Iter 2 | ZIP export of all invoice PDFs or XML files for a selected date range |
| 7 | Unified Activity Feed / Dashboard Timeline | Iter 3 | Merge property events, contact events, appointments, and notifications into one feed |
| 8 | Bulk Operations on Banca Dati Properties | Iter 3 | Multi-select with bulk reassign, disposition change, batch note, and CSV export |
| 9 | Offline-Capable Property Notes via Service Worker | Iter 3 | IndexedDB queue for offline note/event creation, synced on reconnection |
| 10 | Archived Listing Restore / Reactivate Flow | Iter 4 | "Ripristina annuncio" button to restore archived listings as draft with audit trail |
| 11 | Invoice Payment Tracking with Partial Payments | Iter 4 | Multi-installment payment records per invoice with auto status transitions |
| 12 | Dashboard Activity Feed / Timeline | Iter 4 | Collapsible "Attività recenti" section on dashboard aggregating all workspace events |
| 13 | Listing Activity Feed with Agent Collaboration | Iter 5 | Internal notes, file attachments, and @-mentions on listing cronistoria |
| 14 | Automated Listing Performance Alerts and Recommendations | Iter 5 | AI-driven alerts for stale listings, high-interest/low-conversion, price suggestions |
| 15 | Comparative Market Analysis (CMA) Report Generator | Iter 5 | Full CMA PDF with selected comparables, OMI data, price-per-sqm analysis, email delivery |

---

## Proposals by Priority

### High Priority
*(Core business value, relatively straightforward to implement)*

- **#1 — Centralize Supabase Database Type Definitions** — Eliminates ~80% of `as any` casts across the codebase in one step, improving compile-time safety and developer experience with zero user-facing changes.
- **#4 — Automatic Proposal Expiry Detection** — Extends an existing cron pattern already used for invoices; critical for pipeline accuracy and currently unimplemented.
- **#5 — Unified Search with Proposals and Invoices** — Extends an existing search endpoint; high daily-use value for agents who look up proposals by buyer name or invoices by number.
- **#10 — Archived Listing Restore / Reactivate Flow** — Highly requested in real estate workflows when sales fall through; uses existing archive infrastructure.
- **#11 — Invoice Payment Tracking with Partial Payments** — Matches Italian real estate payment norms (caparra + balance); `payment_records` table + UI modal.

### Medium Priority
*(Significant value, moderate complexity)*

- **#2 — Extract Shared Constants and Utility Modules** — Technical debt reduction; improves maintainability; low risk but requires careful refactoring across many files.
- **#6 — Batch PDF/XML Export for Invoices** — High value at quarter/year-end filing; requires ZIP generation on the server but no new UI paradigms.
- **#7 — Unified Activity Feed / Dashboard Timeline** — Requires a new aggregation API endpoint; strong admin value for workspace oversight; see also #12.
- **#12 — Dashboard Activity Feed / Timeline** — Proposed independently in Iter 4; essentially the same feature as #7 but scoped to the dashboard widget. Consider merging with #7.
- **#8 — Bulk Operations on Banca Dati Properties** — Significant time-saver for agencies managing hundreds of properties; requires multi-select UI and a `/api/properties/bulk` endpoint.
- **#14 — Automated Listing Performance Alerts and Recommendations** — Leverages existing `listing_stats` and `contact_events` data; high engagement value; requires a `listing_alerts` table and notification hooks.
- **#15 — Comparative Market Analysis (CMA) Report Generator** — Directly replaces manual Excel CMAs; integrates existing OMI valuation and `@react-pdf/renderer`; strong seller-facing value.

### Lower Priority
*(Nice-to-have, higher complexity or more speculative value)*

- **#3 — Rate Limiting and Input Sanitization Middleware** — Addresses known security gaps (SECURITY_AUDIT.md); important but requires infrastructure decisions (Redis vs. in-memory).
- **#9 — Offline-Capable Property Notes via Service Worker** — Genuinely useful for field agents in poor-connectivity zones; high complexity (service worker lifecycle, IndexedDB, sync conflicts).
- **#13 — Listing Activity Feed with Agent Collaboration** — Valuable for multi-agent teams; moderate complexity but overlaps with #7/#12 activity feed work; @-mention notifications require additional infrastructure.

---

## Full Proposals

---

### Proposal 1: Centralize Supabase Database Type Definitions

**Source:** Iteration 1, C1

**Description:**
The `Database` type in `web/lib/supabase/types.ts` only covers 4 tables (groups, workspaces, users, listings) out of 20+ tables in the application. This forces every query on other tables — properties, property_events, contact_events, match_results, invoices, proposals, etc. — to use `(admin as any)`, disabling TypeScript's compile-time safety entirely. Column name typos, wrong filter values, and incorrect select shapes all pass the compiler silently.

The Supabase CLI can auto-generate the complete type definitions from the live database schema in seconds:
```bash
npx supabase gen types typescript --project-id <project-id> > web/lib/supabase/types.ts
```

**Business Value:**
Eliminates approximately 80% of `as any` casts across the codebase. Catches column name errors at compile time. Improves developer velocity through IDE autocompletion on all tables. Reduces the risk of silent data-access bugs introduced during future development.

**Technical Approach:**
1. Run `supabase gen types typescript` against the production or staging project.
2. Replace the contents of `web/lib/supabase/types.ts`.
3. Fix any TypeScript errors surfaced — these represent real bugs that were previously hidden by `as any`.
4. Add type generation as a `package.json` script for ongoing use after schema migrations.

**Estimated Complexity:** Low

---

### Proposal 2: Extract Shared Constants and Utility Modules

**Source:** Iteration 1, C2

**Description:**
Multiple files in the codebase independently define the same constants and utility functions:
- `ROLE_LABELS` — defined in 3 files (partially addressed in Iter 1, but more instances remain)
- `PROPERTY_TYPE_IT` — defined in 2 files
- `STAGE_LABELS` / `STAGE_COLORS` — defined in 2 files
- `TYPE_LABELS` / `TYPE_COLORS` — defined in 2+ files
- `birthdayDaysLeft` — was in 3 files (partially addressed in Iter 1)

Each duplication is a maintenance hazard: adding a new property type, role, or stage requires updating multiple files, and missing one creates subtle inconsistencies.

**Business Value:**
Reduces maintenance burden across the codebase. Prevents the class of bugs where one copy of a constant is updated but others are not. Enables confident addition of new enum values knowing there is a single source of truth.

**Technical Approach:**
Create a `web/lib/constants/` directory:
- `property-roles.ts` — canonical `ROLE_LABELS`
- `property-types.ts` — canonical `PROPERTY_TYPE_IT`
- `property-stages.ts` — canonical `STAGE_LABELS` / `STAGE_COLORS`
- `contact-types.ts` — canonical `TYPE_LABELS` / `TYPE_COLORS`

Import from these files everywhere. Remove inline duplicates.

**Estimated Complexity:** Low

---

### Proposal 3: Rate Limiting and Input Sanitization Middleware

**Source:** Iteration 1, C3

**Description:**
The SECURITY_AUDIT.md identifies missing rate limiting as a high-priority issue. Currently, any authenticated user can call AI generation endpoints, match engine endpoints, or cron endpoints without any frequency restrictions. Input sanitization is also inconsistent — the contacts search parameter is now sanitized (fixed in Iter 3), but other search endpoints may still accept unescaped PostgREST filter characters.

**Business Value:**
Protects against API abuse, runaway AI API costs, and potential injection attacks. Addresses 3 of the 11 findings in `SECURITY_AUDIT.md`. Required before the application is suitable for production use by external customers.

**Technical Approach:**
1. Implement a middleware-based rate limiter using `next-rate-limit` or an in-memory token bucket (with Redis for multi-instance deployments).
2. Apply per-user rate limits on: AI generation (`/api/listing/generate`), match engine (`/api/match-engine/trigger`), birthday messages, and social posting.
3. Add CORS configuration in `next.config.ts` restricting origins to the app domain.
4. Audit remaining search endpoints for unescaped PostgREST filter interpolation.

**Estimated Complexity:** Medium

---

### Proposal 4: Automatic Proposal Expiry Detection

**Source:** Iteration 2, C1

**Description:**
Proposals have a `validita_proposta` (validity date) field, but there is no mechanism to automatically transition them to `scaduta` status when this date passes. Agents reviewing the proposal pipeline see stale proposals stuck in `inviata` status long after they have legally expired, skewing pipeline metrics and cluttering the view.

This pattern already exists for invoices (`check-overdue` endpoint) — a direct parallel implementation is needed for proposals.

**Business Value:**
Keeps the proposal pipeline accurate with zero manual intervention. Enables the `scaduta` filter to function correctly. Prevents agents from accidentally acting on expired proposals.

**Technical Approach:**
1. Create `web/app/api/proposals/check-expired/route.ts` — queries all `inviata` proposals where `validita_proposta < NOW()` and updates status to `scaduta`.
2. Protect with `x-cron-secret` header auth (same pattern as `check-overdue`).
3. Register in the cron scheduler (Vercel Cron or external) on a daily schedule.
4. Optionally send a notification to the responsible agent when their proposal expires.

**Estimated Complexity:** Low

---

### Proposal 5: Unified Search with Proposals and Invoices

**Source:** Iteration 2, C2

**Description:**
The global search API (`/api/search`) currently searches listings, contacts, and properties. Proposals and invoices are completely absent from search. Italian agents frequently need to locate a proposal by buyer name or an invoice by client name or invoice number — tasks that currently require navigating to the respective section and manually scanning.

**Business Value:**
Significantly improves daily navigation efficiency. Reduces the time to locate a specific financial document or proposal from a minute of manual scanning to a single keystroke.

**Technical Approach:**
1. Extend `/api/search/route.ts` to query `proposals` (by `buyer_name`, `seller_name`, listing address) and `invoices` (by `cliente_nome`, `numero_fattura`).
2. Add two new result types to the search response schema: `proposal` and `invoice`.
3. Add result cards for each type in the command palette (`components/shared/command-palette.tsx`) with appropriate icons and links to `/proposte/{id}` and `/contabilita/{id}`.
4. Ensure all queries include `workspace_id` scoping.

**Estimated Complexity:** Low

---

### Proposal 6: Batch PDF/XML Export for Invoices

**Source:** Iteration 2, C3

**Description:**
Currently invoices can only be downloaded one at a time (PDF or XML). Italian agencies are required to submit electronic invoices to the Agenzia delle Entrate/SDI in bulk. At quarter-end or year-end, agents must tediously download dozens of XML files individually. A batch export generating a single ZIP archive would eliminate this entirely.

**Business Value:**
Directly reduces a repetitive end-of-period administrative burden. Aligns the invoicing module with the actual SDI submission workflow used by Italian accountants.

**Technical Approach:**
1. Create `web/app/api/invoices/export-batch/route.ts` accepting `year`, `month` (optional), and `format` (`pdf`|`xml`) query params.
2. Use the `archiver` or `jszip` npm package to stream multiple invoice files into a single ZIP response.
3. For PDF: reuse the existing `/api/invoices/[id]/pdf` generation logic.
4. For XML: reuse the existing XML generation utility.
5. Add a "Esporta tutto" dropdown button in the invoice list header.

**Estimated Complexity:** Medium

---

### Proposal 7: Unified Activity Feed / Dashboard Timeline

**Source:** Iteration 3, C1

**Description:**
Events in the application are siloed: property events are visible only on the Banca Dati detail page, contact events only on the contact detail page, appointments only in the calendar. There is no workspace-level view of "what happened today." Admins must navigate across multiple sections to understand recent workspace activity, and agents miss events that don't fall in their section.

**Business Value:**
Gives admins a bird's-eye view of all workspace activity. Helps agents quickly identify items requiring attention without navigating between sections. Reduces reliance on memory or external communication tools to track recent changes.

**Technical Approach:**
1. Create `/api/activity-feed/route.ts` that unions `property_events`, `contact_events`, `appointments` (next 48h), and `notifications` into a single chronological list, scoped to `workspace_id`, with a configurable limit (e.g., 50 events).
2. Create `components/dashboard/activity-feed.tsx` with event-type icons, entity links, and relative timestamps.
3. Add filtering by agent, event type, and date range.
4. Consider a `collapsible` wrapper so admins can hide/show the feed.

**Estimated Complexity:** Medium

---

### Proposal 8: Bulk Operations on Banca Dati Properties

**Source:** Iteration 3, C2

**Description:**
The Banca Dati list only supports individual property operations. Common real-estate workflows require bulk actions — an agency owner may need to reassign all properties in a zone after an agent leaves, or advance 20 `sconosciuto` properties that share the same owner after a meeting.

**Business Value:**
Dramatically reduces repetitive work for agencies managing hundreds of properties. A single bulk reassignment currently requires clicking through each property individually — this feature could save hours per week.

**Technical Approach:**
1. Add multi-select checkboxes to `banca-dati-table.tsx` with a floating action bar that appears when items are selected.
2. Create `/api/properties/bulk/route.ts` supporting:
   - `{ action: 'assign_agent', agent_id }` — bulk agent reassignment
   - `{ action: 'set_disposition', disposition }` — bulk owner disposition
   - `{ action: 'add_note', content }` — add a batch event/note to all selected properties
   - `{ action: 'export' }` — return CSV of selected properties
3. All bulk operations must validate `workspace_id` for every property ID in the request.

**Estimated Complexity:** Medium

---

### Proposal 9: Offline-Capable Property Notes via Service Worker

**Source:** Iteration 3, C3

**Description:**
Real estate agents frequently visit properties in areas with poor or no mobile connectivity (underground parking, basements, rural locations, building interiors). Currently, adding a note or event to a property during a visit requires an active connection — a failed fetch causes data loss. Agents resort to external notes apps and then manually re-enter the information later.

**Business Value:**
Directly addresses a daily pain point for field agents. Prevents data loss during property visits. Improves data quality by enabling immediate capture of observations while at the property.

**Technical Approach:**
1. Register a service worker (`web/public/sw.js`) using the Workbox library.
2. Create `web/lib/offline-queue.ts` using IndexedDB (via `idb` library) to persist queued event submissions.
3. Modify `components/banca-dati/event-timeline.tsx` to detect offline state and route submissions to the offline queue.
4. Show a persistent "X eventi in attesa di sincronizzazione" badge when the queue is non-empty.
5. On reconnection, flush queued events to the API in order, handling conflicts (e.g., property deleted in the meantime).

**Estimated Complexity:** High

---

### Proposal 10: Archived Listing Restore / Reactivate Flow

**Source:** Iteration 4, C1

**Description:**
Archiving a listing is currently a one-way operation. There is no way to restore an archived listing if it was archived by mistake or if a sale falls through (a common real estate scenario). Agents must recreate the listing from scratch, losing all AI-generated content, photos, stats, price history, and cronistoria.

**Business Value:**
Saves significant agent time when sales fall through or listings are incorrectly archived. Preserves all historical data (stats, price history, generated content). The infrastructure is already in place — `archived_listings` contains a complete copy of the listing.

**Technical Approach:**
1. Add a "Ripristina annuncio" button on the archived listing detail page (`/archive/[id]`).
2. Show a confirmation dialog explaining restoration creates a draft listing.
3. Create `/api/archive/restore/[id]/route.ts`:
   - Copy all fields from `archived_listings` to a new `listings` row with `status = 'draft'`.
   - Set a `restored_from_archive_id` column for audit trail (requires migration 069).
   - Optionally mark the archive record as `restored = true` for bookkeeping.
4. Redirect to the restored listing's edit page after success.

**Estimated Complexity:** Low

---

### Proposal 11: Invoice Payment Tracking with Partial Payments

**Source:** Iteration 4, C2

**Description:**
The current invoicing system only supports a binary paid/unpaid state. Italian real estate transactions commonly involve installment payments: a `caparra confirmatoria` at signing and the balance at `rogito`. When an agent marks an invoice as `pagata`, the full amount is recorded regardless of what was actually received. Partial payments are invisible in the system.

**Business Value:**
Accurately reflects real-world Italian real estate payment flows. Eliminates the need for agents to track installments in external spreadsheets. Enables more accurate cash flow reporting in the invoicing dashboard.

**Technical Approach:**
1. Create a `payment_records` table (migration 069 or 070): `id`, `invoice_id`, `workspace_id`, `amount_cents`, `payment_date`, `method`, `reference`, `created_at`.
2. Add a new invoice status `parzialmente_pagata` to the `invoice_status` enum.
3. Add auto-transition logic: `inviata` → `parzialmente_pagata` (when sum of payments < total) → `pagata` (when sum >= total).
4. Add a "Registra incasso" button on the invoice detail page opening a modal for payment entry.
5. Display a payment timeline in the invoice detail sidebar.
6. Update aging report and stats calculations to account for partial payments.

**Estimated Complexity:** Medium

---

### Proposal 12: Dashboard Activity Feed / Timeline

**Source:** Iteration 4, C3

**Description:**
The dashboard currently shows static stat cards and a listing grid. It provides no sense of recent activity — agents must visit individual sections to understand what happened recently. There is no way to see at a glance that a new proposal came in, an invoice was paid, or an appointment is tomorrow.

Note: This proposal is closely related to Proposal 7 (Iter 3, C1). Consider implementing them as a single feature with the aggregation API serving both a dedicated activity page and the dashboard widget.

**Business Value:**
Transforms the dashboard from a static metrics view into an actionable operations center. Reduces the number of page navigations required to understand daily priorities.

**Technical Approach:**
1. Create `/api/activity-feed/route.ts` (see Proposal 7) aggregating the 15-20 most recent events from: new contacts, proposals created/accepted/rejected, invoices sent/paid, property stage changes, listings published/archived, upcoming appointments (next 48h).
2. Add a collapsible "Attività recenti" section to the dashboard below the stat cards.
3. Each event shows: type icon, description, relative timestamp, link to entity.
4. Persist collapse state to `localStorage`.

**Estimated Complexity:** Medium

---

### Proposal 13: Listing Activity Feed with Agent Collaboration

**Source:** Iteration 5, C1

**Description:**
The listing detail page shows a read-only cronistoria compiled from `property_events` and `contact_events`. Agents cannot add internal notes, attach files, or communicate about a specific listing within the application. All listing-specific agent communication currently happens outside the system (WhatsApp, email) and is therefore invisible and untracked.

**Business Value:**
Transforms the listing cronistoria from a passive log into an active collaboration tool. Reduces reliance on external chat for listing-specific coordination. Creates a searchable audit trail of agent decisions and observations.

**Technical Approach:**
1. Create a `listing_notes` table: `id`, `listing_id`, `workspace_id`, `agent_id`, `content`, `attachments` (JSONB), `mentions` (uuid[]), `created_at`.
2. Add a note composition area at the bottom of the listing cronistoria.
3. Support file attachments reusing the existing Supabase Storage upload pattern.
4. Parse `@username` mentions and generate `notifications` entries for the mentioned agents.
5. Add a filter bar to the cronistoria allowing filtering by event source: property events / contact events / agent notes.

**Estimated Complexity:** Medium

---

### Proposal 14: Automated Listing Performance Alerts and Recommendations

**Source:** Iteration 5, C2

**Description:**
The listing detail page shows static performance metrics (views, shares, days on market, proposte count, visite count). These numbers require manual interpretation. Agents do not receive any proactive signal when a listing is underperforming or when data suggests a change is needed.

**Business Value:**
Converts raw metrics into actionable intelligence. Reduces the time between a listing stagnating and an agent taking corrective action. The weekly digest would keep agents informed without requiring them to check every listing individually.

**Technical Approach:**
1. Create a `listing_alerts` table: `id`, `listing_id`, `workspace_id`, `alert_type`, `message`, `dismissed_at`, `created_at`.
2. Create a cron endpoint `/api/cron/listing-alerts` (runs daily) that:
   - Flags listings on market >30 days with zero visite.
   - Flags listings with >20 views and zero proposte.
   - Suggests tone changes based on segment benchmarks.
3. Surface active alerts on the listing detail page as a dismissible banner.
4. Create a weekly digest email (via Resend, already integrated) sent to each agent summarizing their listings' KPIs.

**Estimated Complexity:** Medium

---

### Proposal 15: Comparative Market Analysis (CMA) Report Generator

**Source:** Iteration 5, C3

**Description:**
The `ValuationWidget` currently shows a simple bar chart comparing the listing price against a few automatically selected sold comparables. Agents who need to present a full valuation to a seller — a mandatory step in the Italian incarico workflow — still create manual Excel-based CMAs outside the application. This is a significant gap in the Banca Dati workflow.

**Business Value:**
Directly replaces a time-consuming manual process. Integrates with existing Banca Dati and OMI data already in the system. A branded PDF CMA sent via email is a professional deliverable that strengthens the agent's credibility with sellers.

**Technical Approach:**
1. Extend the `ValuationWidget` with a "Genera CMA" button that opens a modal.
2. In the modal, agents can select specific comparables from Banca Dati (not just the auto-filtered ones) and adjust parameters.
3. Create `/api/listing/[id]/cma/route.ts` that:
   - Assembles subject property details, selected comparables, OMI data.
   - Generates a branded PDF using `@react-pdf/renderer` (already in the stack) via a new `CMAPdfTemplate` component.
   - Stores the report in a new `analysis_reports` table: `id`, `listing_id`, `workspace_id`, `generated_at`, `pdf_url`, `parameters` (JSONB).
4. Add an "Invia al proprietario" button that sends the PDF via Resend (already integrated) to the listing's owner contact email.

**Estimated Complexity:** High
