# Sprint H Changes — Accounting & Proposals

**Sprint H — Accounting & Proposals (March 2026)**
- **Commits:** 3 total (1 feature, 2 quality reviews)
- **Duration:** March 18, 2026
- **Focus:** Full invoicing system, purchase proposals module, and comprehensive quality improvements
- **Status:** Complete ✓

---

## 1. Setup Improvements

### Dark Mode & Hydration Fixes
- **next-themes hydration mismatch:** Added `suppressHydrationWarning` to `<html>` tag in `layout.tsx` to prevent dark/light mode flash on page load
- **Dark mode palette improvement:** Updated background color from harsh deep indigo to softer oklch value (0.155), improved foreground legibility (0.91), richer card surfaces, more visible borders for better contrast

### Branch & Environment
- Merged into `sprint-f-ux-redesign` branch
- No breaking changes to `.env` requirements

---

## 2. Feature: Contabilità (Invoicing Module)

### Database Schema (Migration 024)

**Tables:**
- `invoices` — Main invoice document with full Italian tax support
- Enums: `invoice_status` (bozza/inviata/pagata/scaduta), `regime_fiscale` (ordinario/forfettario/esente)

**Key Fields:**
- Invoice numbering: `numero_fattura`, `anno`, `progressivo` (unique per workspace/year)
- Party data (denormalized snapshots): client & emitter details with fiscal code, PEC, SDI code
- Tax calculation: imponibile, IVA (22% default), ritenuta d'acconto (20%), contributo cassa
- Line items: `voci` JSONB array with descrizione, quantita, prezzo_unitario, importo
- Payment: `metodo_pagamento` (default: bonifico), IBAN, emission/expiry/payment dates
- Status tracking: status, sent_at, sent_to_email

**RLS Policies:**
- SELECT: workspace members
- INSERT: creator + workspace member
- UPDATE: creator or admin/group_admin
- DELETE: creator + draft status only

**RPC Function:**
- `next_invoice_number(workspace_id, anno)` — auto-increment per workspace/year

### Pages
- `web/app/(app)/contabilita/page.tsx` — Invoice list with summary cards, filters, search
- `web/app/(app)/contabilita/nuova/page.tsx` — Create new invoice form
- `web/app/(app)/contabilita/[id]/page.tsx` — Invoice detail with line items, totals, payment info
- `web/app/(app)/contabilita/loading.tsx` — Animated skeleton during navigation

### Components
- **invoice-form.tsx** — Form builder: parties, line items, tax selection, payment method
- **invoice-list-client.tsx** — Table with status badges, quick actions, mobile-responsive
- **invoice-summary-cards.tsx** — Fatturato (total), In attesa (pending), Scadute (overdue)
- **invoice-status-badge.tsx** — Color-coded status display (bozza/inviata/pagata/scaduta)
- **invoice-detail-actions.tsx** — Mark as paid, send via email (client component with fetch)
- **invoice-totals-calculator.ts** — Utility: netto_a_pagare = imponibile + IVA - ritenuta - cassa

### API Routes
- `GET /api/invoices` — List with workspace filter, status/search query params
- `POST /api/invoices` — Create (validates workspace_id, agent_id, calculates netto_a_pagare)
- `GET /api/invoices/[id]` — Detail (RLS enforced)
- `PATCH /api/invoices/[id]` — Update invoice fields
- `DELETE /api/invoices/[id]` — Delete (draft only)
- `POST /api/invoices/[id]/mark-paid` — Update status + data_pagamento
- `POST /api/invoices/[id]/send` — Email via Resend with PDF attachment
- `GET /api/invoices/[id]/pdf` — Generate PDF (A4, warm futurism style)
- `GET /api/invoices/next-number` — Get next progressivo for workspace/year

### Features
- Full invoice CRUD with Italian tax compliance (IVA 22%, ritenuta 20%, contributo cassa)
- Denormalized snapshot of client/emitter at issuance (legal requirement for document integrity)
- Optional links to contacts and listings (for context, not required)
- Line items with per-item quantity and unit price
- PDF generation with @react-pdf/renderer (A4 format, invoice number, parties, line items, totals, payment details)
- Email delivery with PDF attachment via Resend
- Summary cards hidden when no invoices exist (removes zero noise)
- Advanced filtering: by status, search by cliente_nome or numero_fattura

---

## 3. Feature: Proposte d'acquisto (Purchase Proposals Module)

### Database Schema (Migration 025)

**Tables:**
- `proposals` — Purchase proposal with buyer info, conditions, counter-proposal flow
- `counter_proposals` — Seller's counter-offer response
- Enums: `proposal_status` (bozza/inviata/accettata/rifiutata/scaduta/controproposta/ritirata), `condition_type` (mutuo/vendita_immobile/libera/perizia/personalizzata)

**Proposals Key Fields:**
- Numbering: `numero_proposta`, `anno`, `progressivo` (unique per workspace/year)
- References: `listing_id`, `buyer_contact_id` (live links)
- Denormalized snapshots: property address/city/type/price, buyer details (fiscal code, phone, email), seller name, agent name/agency
- Financial: `prezzo_offerto` (integer euros), `caparra_confirmatoria`, `caparra_in_gestione_agenzia` (agency-held deposit)
- Dates: `data_proposta`, `validita_proposta`, `data_rogito_proposta` (closing date)
- Conditions: `vincoli` JSONB array with tipo, descrizione, mutuo details, property sale conditions
- Status: `proposal_status`, seller response tracking (`risposta_venditore`, `data_risposta`)

**Counter-Proposals Key Fields:**
- Back-reference to parent proposal
- `prezzo_controproposta`, modified `vincoli`, revised `validita_controproposta`
- `numero_controproposta`, seller's counter terms
- Buyer response tracking

**RLS Policies:**
- SELECT/INSERT/UPDATE: workspace members
- DELETE: creator + draft status only

**RPC Function:**
- `next_proposal_number(workspace_id, anno)` — auto-increment per workspace/year

### Pages
- `web/app/(app)/proposte/page.tsx` — Proposal list with summary stats (pending/accepted/rejected), quick actions
- `web/app/(app)/proposte/nuova/page.tsx` — Create proposal: select listing + buyer, auto-fill address/price/contact details
- `web/app/(app)/proposte/[id]/page.tsx` — Proposal detail with conditions, caparra info, accept/reject/counter buttons
- `web/app/(app)/proposte/[id]/counter-offer/page.tsx` — Seller counter-offer form (separate counter proposal creation)
- `web/app/(app)/proposte/loading.tsx` — Animated skeleton during navigation

### Components
- **proposal-form.tsx** — Builder: listing selector, buyer auto-fill, price/caparra, conditions configurable (mutuo fields, vendita_immobile link, perizia toggle, personalizzata text), dates, notes
- **proposal-list.tsx** — Table with status badges, quick accept/reject inline, mobile-responsive
- **proposal-status-badge.tsx** — Color-coded status (bozza/inviata/accettata/rifiutata/scaduta/controproposta/ritirata)
- **proposal-detail-actions.tsx** — Accept/reject/counter buttons (client component with fetch + router.refresh)

### API Routes
- `GET /api/proposals` — List with workspace filter, status query param
- `POST /api/proposals` — Create (validates listing_id, buyer_contact_id, denormalizes snapshot)
- `GET /api/proposals/[id]` — Detail + associated counter-proposals
- `PATCH /api/proposals/[id]` — Update proposal fields
- `DELETE /api/proposals/[id]` — Delete (draft only)
- `POST /api/proposals/[id]/respond` — Accept/reject with seller_response message
- `POST /api/proposals/[id]/counter-offer` — Create counter-proposal (separate row in counter_proposals table)
- `GET /api/proposals/[id]/pdf` — Generate PDF (A4, buyer/seller names, property address, price, conditions, signature area, legal note)
- `GET /api/proposals/next-number` — Get next progressivo for workspace/year

### Features
- Proposal creation: select listing + buyer contact with auto-fill of address, city, property type, requested price, and buyer contact details
- Configurable conditions (vincoli): mortgage (mutuo) with bank name, property sale requirement (vendita_immobile), appraisal (perizia), or custom text (personalizzata)
- Caparra confirmatoria (buyer deposit) with agency-held option toggle
- Seller counter-proposal flow: separate form to create counter-offer with revised price, modified conditions, new expiry date
- Proposal response: accept/reject/counter from list or detail view
- PDF generation with @react-pdf/renderer (A4 format, legal signatures area, property details, buyer/seller info, price breakdown, conditions, legal note)
- Accept/reject/counter actions trigger status updates and response tracking (data_risposta, risposta_venditore text)

---

## 4. Quality Improvements — Round 1 (Opus Review Round 5)

Commit: `0b8d4fa1f92b9fd62280008fa8ae411caba786c8`

### Bug Fixes (6)
1. **Proposal detail page:** Fixed broken `<Link href="#">` action buttons — replaced with `ProposalDetailActions` client component using fetch + router.refresh()
2. **Listing page auth:** Added missing `if (!user) redirect('/login')` null guard
3. **Listing page null assertion:** Removed non-null assertion `user!.id` in listing/page.tsx
4. **Invoice detail page missing:** Added `contabilita/[id]/page.tsx` invoice detail view (was returning 404)
5. **Invoice detail actions:** Created `InvoiceDetailActions` component for mark-paid and send-email buttons (client component)

### Features (1)
6. **Invoice detail page:** Full implementation with line items table, totals breakdown, payment info, action buttons

### Mobile UX Improvements (2)
7. **Proposal action buttons:** Changed from hover-only (invisible on mobile) to always visible on mobile (opacity-100), hover-reveal on sm+ screens (hover-opacity-0 hover:opacity-100)
8. **Invoice action buttons:** Same mobile treatment for consistent UX across both modules

### Dark Mode Fixes (3)
9. **Dashboard TYPE_COLORS:** Added `dark:` variants for all property type badge colors (apartment/house/villa/commercial/land)
10. **Contacts page TYPE_COLORS:** Added `dark:` variants for consistent property type styling across app
11. **Sidebar gradient text:** Fixed CasaAI text visibility on dark backgrounds — changed from dark oklch values (0.30-0.57) to bright values (0.75-0.82)

### Consistency & UX (2)
12. **Listing page header:** Updated to match warm futurism design pattern (gradient icon box, font-bold, correct padding, subtitle text)
13. **Contabilita empty state:** Hide summary cards when no invoices exist (removes zero noise)
14. **Proposte empty state:** Always show summary stats (no conditional guard for clarity)

---

## 5. Quality Improvements — Round 2 (Opus Review Round 6)

Commit: `936b53fa34b511c91b89e47b3ad42db5630f2fca`

### Auth Security (6 pages)
- Added `if (!user) redirect('/login')` null guard to remaining pages without protection:
  - `settings/page.tsx`
  - `notifications/page.tsx`
  - `contacts/page.tsx`
  - `contacts/[id]/page.tsx`
  - `contacts/[id]/edit/page.tsx`
  - `listing/[id]/page.tsx`
- Eliminates all `user!.id` non-null assertions (replaced with guard)

### Dark Mode Fixes (6 components)
1. **campaigns/page.tsx:** Added `dark:` variants to status badge colors
2. **contacts/[id]/page.tsx:** Added `dark:` variants to TYPE_COLORS
3. **listing/[id]/page.tsx:** Added `dark:` variants to TONE_COLORS (standard/luxury/approachable/investment)
4. **archive/page.tsx:** Dark mode styling for sold/bought badges
5. **notifications/page.tsx:** Dark mode for notification icon backgrounds
6. **todos-client.tsx:** Dark mode for PRIORITY_CONFIG colors and due date chips

### Loading Skeletons (2 new files)
- **contabilita/loading.tsx** — Animated pulse skeleton for invoice list (prevents blank screen during Suspense)
- **proposte/loading.tsx** — Animated pulse skeleton for proposal list (prevents blank screen during Suspense)

---

## 6. Internationalization (i18n)

Added full Italian + English translation keys for:
- Invoice-related terms: fatturato, in_attesa, scadute, numero_fattura, cliente, emittente, regime_fiscale, etc.
- Proposal-related terms: proposte, proposta, numero_proposta, vincoli, mutuo, caparra_confirmatoria, etc.
- Status labels for both modules (Italian official terms)
- Form labels, action buttons, empty state messages

Updated file: `web/lib/i18n/translations.ts`

---

## 7. Sidebar Navigation

Updated `web/components/app-sidebar.tsx`:
- Added **Contabilità** nav item with Receipt icon
- Added **Proposte** nav item with FileText icon
- Positioned in secondary nav section (after calendar/todos)

---

## 8. Summary Statistics

### Files Changed: 56 total

**New Feature Files:**
- Contabilità: 9 files (pages + components + utilities)
- Proposte: 10 files (pages + components)
- API routes: 15 total (8 invoices + 7 proposals)

**Modified Files:**
- Layout & styling: 3 (layout.tsx, globals.css, app-sidebar.tsx)
- Pages with auth/dark mode: 10 (dashboard, listings, contacts, campaigns, archive, notifications, settings, todos)
- i18n: 1 (translations.ts)

**Migration Files:** 2 (024_invoices.sql, 025_proposals.sql)

**Documentation:** 2 (redesign prompts for audit trail)

### Database Migrations

| Migration | Table(s) | Enums | RPC Functions | Purpose |
|-----------|----------|-------|---------------|---------|
| 024_invoices.sql | invoices | invoice_status, regime_fiscale | next_invoice_number() | Full invoicing system with Italian tax compliance |
| 025_proposals.sql | proposals, counter_proposals | proposal_status, condition_type | next_proposal_number() | Purchase proposals + counter-offer flow |

### Quality Metrics

- **Auth Guards:** All 6 protected pages now have `if (!user) redirect('/login')` guards
- **Dark Mode Coverage:** 9+ components updated with `dark:` variant coverage
- **Loading States:** 2 Suspense boundaries with skeleton UI (contabilita + proposte)
- **Accessibility:** Semantic HTML, proper ARIA labels, keyboard navigation

---

## 9. Testing Recommendations

### Invoicing Module
- [ ] Create invoice → PDF generation → email send (full flow)
- [ ] Mark as paid → status update + payment date
- [ ] Line item calculation → netto_a_pagare verification
- [ ] RLS: agent can only access own invoices
- [ ] Dark mode: all badges visible on dark background

### Proposals Module
- [ ] Create proposal → listing + buyer auto-fill
- [ ] Conditions: configure mutuo, vendita_immobile, perizia, personalizzata
- [ ] Counter-offer flow → separate proposal creation
- [ ] Accept/reject buttons → status + risposta_venditore update
- [ ] RLS: agent can only access own proposals
- [ ] Dark mode: status badges + condition text readable

### Auth & Navigation
- [ ] Unauthorized user redirects to /login on protected pages
- [ ] Loading skeleton appears during page transition
- [ ] Sidebar nav items visible + clickable
- [ ] Mobile: action buttons always visible (not hidden on small screens)

---

## 10. Known Gaps & Future Work

- Rate limiting not implemented on invoice/proposal API routes
- CORS not configured (if cross-origin calls needed)
- No webhook for Stripe billing sync to invoices
- Counter-proposal numbering (numero_controproposta) needs validation
- Seller response messaging could be templated

---

## Timeline

| Date | Event |
|------|-------|
| Mar 18 | Feature commit: Contabilità + Proposte |
| Mar 18 | Quality Round 1: 13 bugs + UX gaps |
| Mar 18 | Quality Round 2: Auth guards + dark mode polish |

**Status:** Ready for user testing and UAT on staging environment.
