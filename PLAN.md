# CasaAI — Real Estate Agency AI Stack
## Product Plan v4.0 (Updated 2026-03-17)

---

## Context

Italian real estate agents lose 2-3 hours per listing on admin: writing descriptions, creating social posts, drafting WhatsApp broadcasts and emails. Lead follow-up is inconsistent — agents respond late or not at all to portal inquiries. Agencies spend almost nothing on software.

**Opportunity**: Build an AI back-office that handles content generation and lead nurturing, starting with a single friend's branch as a beachhead, with a clear path to the full 10-office network and beyond.

**Entry point**: Friend is branch manager of a 5-agent office, part of a ~10-office regional network. He becomes an internal advocate and de-facto sales partner.

---

## Agreed Vision

### What We're Building (current state — web app in active development)

1. **Web App (desktop-first)** — Full real estate back-office: listing management, AI content generation, contact CRM, team management, appointments, social publishing, archive
2. **iOS App (React Native + Expo)** — Planned for Sprint D

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Web frontend | Next.js 14 (App Router) | Fast, SEO-ready, great DX, Vercel-native |
| Mobile app | React Native + Expo | Shared TypeScript codebase, camera/gallery built-in |
| Backend | Next.js API routes + Supabase Edge Functions | No separate server |
| Database | Supabase (PostgreSQL) | Auth + DB + storage in one |
| Auth | Supabase Auth | Email/password + magic link, multi-tenant workspaces |
| AI (text + vision) | Gemini 2.0 Flash (Google) | ~$0.09/100 listings |
| AI (birthday messages) | DeepSeek API | Cheaper for simple generation tasks |
| File Storage | Supabase Storage | Photos, PDFs, documents, avatars |
| Social Publishing | Instagram Graph API + Facebook Pages API | Direct publish |
| Email | Resend | Transactional email |
| Payments | Stripe | Subscriptions |
| Deployment | Vercel (web) + Expo EAS (mobile) |
| Styling | Tailwind CSS + shadcn/ui |

---

## ✅ Already Built

| Feature | Status |
|---------|--------|
| Auth (login, register, invite) | ✅ Done |
| Multi-tenant workspaces | ✅ Done |
| Group / multi-agency support | ✅ Done |
| Role-based access (group_admin / admin / agent) | ✅ Done |
| Listing form + photo upload | ✅ Done |
| AI content generation (IT + EN + Instagram + Facebook + WhatsApp + Email) | ✅ Done |
| Tone selector (Standard / Luxury / Accessibile / Investimento) | ✅ Done |
| Output tabs with copy-to-clipboard | ✅ Done |
| Regenerate individual tabs | ✅ Done |
| Social publishing (Instagram + Facebook) | ✅ Done |
| Contact CRM (create, view, edit, delete) | ✅ Done |
| Contact attachments + storage quota by plan | ✅ Done |
| Listing attachments + storage quota | ✅ Done |
| Property archive (sold / deleted) with filters | ✅ Done |
| Archive detail page (clickable agent/buyer links) | ✅ Done |
| Internal buyer linking in archive (sold_to_contact_id) | ✅ Done |
| Team overview (admin view, leaderboard, rankings) | ✅ Done |
| Team calendar (multi-agent, per-agent toggle) | ✅ Done |
| Agent profile page with individual calendar | ✅ Done |
| Appointments system (create/edit/delete/cancel, by type) | ✅ Done |
| Workspace settings (name, default tone, logo) | ✅ Done |
| User profile page (avatar, phone, address, P.IVA, bio) | ✅ Done |
| Catastral data fields on listings | ✅ Done |
| Listing condition field | ✅ Done |
| Dashboard (recent listings, contacts, stats) | ✅ Done |
| Sidebar navigation | ✅ Done |
| Subscription system (Trial/Starter/Agenzia/Network, Stripe, plan gates) | ✅ Done |
| PDF Brochure Generator (@react-pdf/renderer, download button) | ✅ Done |
| Portal Export XML (per-listing + bulk workspace export) | ✅ Done |
| Trial banner in sidebar + Usage meters in settings | ✅ Done |
| **Email Campaigns** (compose, send via Resend, open tracking pixel) | ✅ Done |
| **Birthday reminder** (contact card, AI message via DeepSeek, agent notification) | ✅ Done |
| **WhatsApp direct link** (wa.me/ on contact cards and listing output) | ✅ Done |
| **Price history** (listing_price_history table, timeline component) | ✅ Done |
| **In-app notifications** (table, API, /notifications page, sidebar badge) | ✅ Done |
| **Property valuation widget** (archived comps by city, avg price bar chart) | ✅ Done |
| **Floor plan upload** (drag-drop, Supabase storage, floor_plan_url on listings) | ✅ Done |
| **Campaign email attachments** (file picker, Supabase Storage upload) | ✅ Done |
| **Agent notification on appointment assignment** | ✅ Done |

---

## 🌍 Competitor Landscape (Full Research — March 2026)

### Key Competitors Identified

| Competitor | Users | Pricing | AI | Unique |
|-----------|-------|---------|----|----|
| **Getrix** | 16,000+ installs | Custom | ✗ | Market leader by volume |
| **Gestim** | 18,000+ users | €3+/mo | ✗ | Franchise network adoption |
| **AGIM** | 3,000+ agencies | Annual | ✗ | 26-year track record, luxury |
| **onOffice** | Enterprise | Custom | ✓ | 180+ portals, AI furnishing viz |
| **Apimo** | International | Trial | ✓ | 250+ portals, 15 languages |
| **Cometa** | Established | Unlimited | ✗ | Integrated accounting, 30yr |
| **Realgest** | Growing | **FREE** | ✗ | Zero cost, unlimited features |
| **GestionaleRe** | Mid-size | Custom | ✗ | 80+ portals, auction specialist |
| **GestiFIAIP** | FIAIP network | Custom | ✗ | 2,000+ MLS network |
| **GestionaleImmobiliare** | — | Annual | ✗ | 1,000+ portals |
| **X-Immobiliare** | Solo agents | €49 one-time | ✗ | No subscription, perpetual |
| **Kiwi Online** | 700+ agencies | Annual | ✗ | Mobile-first |

### Critical Competitive Insight

**AI is the gap nobody has filled.** Only onOffice (AI furnishing €0.30/image) and Apimo (AI matching) have any AI features. Every other competitor is a 2000s-era CRUD CRM. CasaAI's AI-native positioning is the core moat.

**Realgest is a threat**: completely free with no limitations. Our counter: AI features they'll never have + superior UX + mobile app + multi-agency management.

### Features Every Competitor Has (we must match)

- MLS / inter-agency collaboration
- Auto matching (buyer preferences → listings)
- Google Calendar sync
- Portal sync (real-time for top 4: Immobiliare.it, Wikicasa, Idealista, Casa.it)
- WhatsApp integration (direct messaging)
- Agency website (static or dynamic)

### Features Nobody Has (our differentiators)

- **AI content generation** (descriptions, social, email, WhatsApp) — our core
- **AI lead scoring** and prioritization
- **AI property valuation** using comps
- **AI market reports** (auto-generated PDF)
- **iOS mobile app** (most have web-responsive only; some Android)
- **Modern UX** (all competitors have 2005-era interfaces)

---

## 🔴 Full Feature Gap Analysis (v3 Updated)

### Priority 1 — Sprint B ✅ COMPLETE

| Feature | Status |
|---------|--------|
| Email Campaigns | ✅ Done |
| Auto Matching display (buyer prefs → listings count on listing detail) | 🔄 Partial — display only, notify button pending |
| Birthday reminder + AI message | ✅ Done |
| WhatsApp direct link | ✅ Done |
| Price history | ✅ Done |

### Priority 2 — Sprint C ✅ COMPLETE

| Feature | Description | Effort | Status |
|---------|-------------|--------|--------|
| **Auto-matching buyers alert** | On listing detail: show matched buyer count + "Notifica acquirenti" button | M | ✅ |
| **Compatible listings on contact** | On buyer contact detail: show matching active listings | S | ✅ |
| **Google Calendar sync** | OAuth2 read+write: push CasaAI appointments to Google Calendar, pull Google events to show alongside | M | ✅ |
| **MLS (basic)** | Share listings across workspaces in same group. "Condividi con rete" toggle on listing. Shared listings visible read-only to other group workspaces | L | ✅ |
| **Listing stats (mocked)** | View count, shares, portal clicks — shown on listing detail. Mocked data, real tracking later | S | ✅ |

### Priority 3 — Sprint D ✅ COMPLETE (UX & Features)

| Feature | Description | Effort | Status |
|---------|-------------|--------|--------|
| **Modern UI redesign** | Sidebar gradient logo, nav hover animations, dashboard stats bar, frosted header | M | ✅ |
| **Calendar week view** | 7-column week grid with appointments per day, month/week switcher persisted in localStorage | M | ✅ |
| **Calendar agent toggle** | Colored pill per agent (admin), toggle show/hide events per agent, colors persisted | M | ✅ |
| **Calendar hover effects** | Blue tint on cell hover, date circle highlight, native tooltip with event list | S | ✅ |
| **Export contacts CSV** | Admin-only "Esporta CSV" button on contacts page, all fields, Content-Disposition download | S | ✅ |
| **Import contacts CSV** | Settings section with file picker, 5-row preview, batch insert, duplicate skip by email | M | ✅ |
| **Security audit** | Full audit report (SECURITY_AUDIT.md) with 2 critical, 3 high, 4 medium fixes identified | S | ✅ |
| **Security fixes** | workspace_id enforcement on appointments PATCH/DELETE, campaign attachment DELETE | S | ✅ |

### Priority 3b — Sprint E ✅ MOSTLY COMPLETE (UX & Workflow improvements)

| Feature | Description | Effort | Status |
|---------|-------------|--------|--------|
| **Contacts: filtri avanzati** | Filtro lista clienti per tipo, budget, città, stanze. Toggle vista card/lista | M | ✅ Done |
| **Contacts: icona WhatsApp** | Icona SVG ufficiale WhatsApp sul bottone nella scheda cliente | S | ✅ Done |
| **Team: filtri dinamici** | Filtri per agente, per periodo personalizzato (from/to month) | M | ✅ Done |
| **Import CSV: template scaricabile** | Bottone "Scarica template CSV" in Impostazioni → Importa contatti | S | ✅ Done |
| **Thank you email automatica** | Quando venduto, AI genera bozza email ringraziamento via Gemini, salvata in Campagne | M | ✅ Done |
| **i18n (IT/EN)** | Traduzione completa IT/EN con language switcher in sidebar; tutte le pagine tradotte | M | ✅ Done |
| **To Do system** | Tab To Do con priorità, scadenze, assegnazione colleghi, badge sidebar | M | ✅ Done |
| **Fix AI generation bug** | Profilo non trovato su genera/rigenera — ora usa admin client | S | ✅ Done |
| **Lead nurturing sequences** | Timed follow-up email/WhatsApp sequences per contact | XL | ❌ Not started |

### Priority 3c — Sprint F (Mobile App)

| Feature | Description | Effort | Status |
|---------|-------------|--------|--------|
| **React Native + Expo app** | Camera, photo upload, listing form, AI generation, social publish, push notifications | L | ❌ |

### Postponed to v3

| Feature | Description | Notes |
|---------|-------------|-------|
| **Agency website (basic)** | Static site from DB listings. Custom domain. €20/mo add-on. | Postponed — bassa priorità rispetto a mobile e UX improvements |

### Security Sprint (from SECURITY_AUDIT.md)

| Task | Severity | Effort |
|------|----------|--------|
| Rate limiting on AI generation endpoints (Upstash) | 🟠 ALTA | M |
| CORS policy explicit configuration | 🟠 ALTA | S |
| File upload size validation (10MB cap) | 🟠 ALTA | S |
| Stripe webhook secret guard (fail if not set) | 🟡 MEDIA | S |
| CSV formula injection sanitization | 🟡 MEDIA | S |
| Google tokens encryption at rest (pgsodium) | 🟡 MEDIA | M |
| Global rate limiting middleware | 🟡 MEDIA | M |
| Content-Security-Policy headers | 🟢 BASSA | S |

### Priority 4 — v3 (Scale Phase)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Direct portal API sync** | Real-time push to Immobiliare.it, Idealista, Casa.it APIs | L |
| **Contract templates + digital signature** | Pre-filled forms, Namirial/InfoCert certified e-sign | XL |
| **Invoicing module** | Pro-forma, SDI electronic invoicing, payment tracking | XL |
| **AML compliance** (D.lgs. 231) | Client identity, PEP screening, risk assessment | XL |
| **Cadastral lookup** | Owner lookup, map, yield calc via Agenzia Entrate API | L |
| **AI market reports** | Auto-generated weekly PDF with neighborhood stats | L |

### 🔮 Future Enhancements (post-v3)

| Feature | Notes |
|---------|-------|
| **360° Virtual tours** | Matterport embed or 360° photo viewer. Removed from active sprints — low priority for Italian SME agencies, high complexity |
| **Android app** | After iOS validates mobile strategy |
| **AI furnishing visualizer** | Similar to onOffice €0.30/img |

### Priority 5 — Landing Page (LAST)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Marketing landing page** | Public-facing site at `/` or separate domain | L |
| **Competitor comparison table** | Feature-by-feature vs Gestim, Getrix, GestionaleImmobiliare | S |
| **Pricing tab** | Public pricing page | S |
| **Trial signup flow** | Onboarding wizard | M |

---

## 📋 Implementation Plan

### ✅ Sprint A — COMPLETE
- [x] Subscription system (plan-limits, Stripe checkout, webhooks, portal)
- [x] PDF Brochure Generator
- [x] Portal Export XML (per-listing + bulk)
- [x] Trial banner in sidebar
- [x] Usage meters in /settings

### ✅ Sprint B — COMPLETE
- [x] Email Campaigns (`/campaigns`, compose, send, open tracking)
- [x] Birthday reminder (badge, AI message via DeepSeek, agent notification)
- [x] WhatsApp direct link on contacts + listing output
- [x] Price history timeline
- [x] In-app notifications (table, API, /notifications, sidebar badge)
- [x] Property valuation widget (archived comps)
- [x] Floor plan upload

### ✅ Sprint C — COMPLETE
**Goal**: Daily operational tool — matching, Google Calendar, MLS

- [x] **Auto-matching buyers on listing detail** — matched count + "Notifica acquirenti" button
- [x] **Compatible listings on contact detail** — buyer contacts see matching active listings
- [x] **Google Calendar sync** — OAuth2, push/pull, show Google events in calendar view
- [x] **MLS basic** — share listings across group workspaces (toggle + read-only view)
- [x] **Listing stats (mocked)** — view count, shares on listing detail

### ✅ Sprint D — COMPLETE (CSV, Security, UX)
- [x] Export contacts CSV (admin)
- [x] Import contacts CSV (settings, 5-row preview, duplicate skip)
- [x] CSV template download button in settings
- [x] Security audit + fixes (workspace_id enforcement)
- [x] Modern UI redesign (sidebar, dashboard stats bar)
- [x] Calendar week view + agent toggles

### ✅ Sprint E — COMPLETE (Workflow & i18n)
- [x] Contacts advanced filters (type, budget, city, rooms)
- [x] Contacts WhatsApp SVG icon
- [x] Team dynamic filters (per agent, date range)
- [x] Thank-you email AI draft on sold listing
- [x] Full i18n IT/EN with language switcher
- [x] To Do system (priority, due dates, team assignment, sidebar badge)
- [x] AI generation bug fix (admin client for profile lookup)

### Sprint F — iOS App
**Goal**: Field tool for agents

- React Native + Expo
  - Supabase auth, camera/gallery, listing form
  - AI content generation, social publish
  - Push notifications
  - App Store via EAS

---

## Revenue Model

| Plan | Price/mo | Target |
|------|----------|--------|
| Trial | Free 30d | Any agency |
| Starter | €149 | Solo agent / 1 office, max 3 agents |
| Agenzia | €299 | Branch office, max 15 agents |
| Network | €899 | Multi-branch group, unlimited agents |

Friend's branch: **free forever** as founding partner. Referral fee 10-15% on network sign-ups.

---

## Competitive Advantage Summary

1. **AI-native** — only product in Italy where AI is core, not bolt-on
2. **Modern UX** — all competitors are 2005-era desktop CRMs
3. **Price** — competitive vs enterprise, dramatically better vs Realgest (free but dumb)
4. **Multi-agency group management** — built-in from day one
5. **Mobile app** (iOS) — most competitors are web-only
6. **Speed** — listing content in <10s; competitors require manual copy-paste

---

## Feature Status Master Table

| Feature | Competitors | CasaAI | Target |
|---------|-----------|--------|--------|
| Listing management | ✅ All | ✅ | ✅ |
| Contact CRM | ✅ All | ✅ | ✅ |
| AI content generation | ✅ onOffice/Apimo only | ✅ core | ✅ |
| Social publishing | ✅ AGIM | ✅ | ✅ |
| Multi-agency group | ✅ most | ✅ | ✅ |
| Role-based access | ✅ most | ✅ | ✅ |
| PDF Brochure | ✅ all | ✅ | ✅ |
| Portal export XML | ✅ all | ✅ | ✅ |
| Subscription billing | ✅ all | ✅ | ✅ |
| Trial banner + usage meters | — | ✅ | ✅ |
| Calendar + appointments | ✅ all | ✅ | ✅ |
| Email campaigns | ✅ all | ✅ | ✅ |
| Birthday reminders + AI msg | ✅ AGIM, Cometa | ✅ | ✅ |
| WhatsApp direct link | ✅ GestionaleRe | ✅ | ✅ |
| Price history | ✅ most | ✅ | ✅ |
| In-app notifications | ✅ most | ✅ | ✅ |
| Property valuation widget | ✅ onOffice | ✅ | ✅ |
| Floor plan upload | ✅ all | ✅ | ✅ |
| **Auto buyer matching** | ✅ all | ✅ | ✅ |
| **Google Calendar sync** | ✅ Gestim, Cometa, Kiwi | ✅ | ✅ |
| **MLS / listing share** | ✅ all | ✅ | ✅ |
| **Listing stats** | ✅ standard | ✅ | ✅ |
| **Contacts advanced filters** | ✅ most | ✅ | ✅ |
| **Team dynamic filters** | ✅ most | ✅ | ✅ |
| **CSV import/export + template** | ✅ all | ✅ | ✅ |
| **Thank-you email on sold** | ❌ none with AI | ✅ | ✅ |
| **IT/EN i18n** | ✅ Apimo | ✅ | ✅ |
| **To Do task system** | ❌ none | ✅ | ✅ |
| Agency website | ✅ Getrix, AGIM, Cometa | ❌ | Sprint D |
| iOS app | ✅ Gestim, Getrix, AGIM | ❌ | Sprint D |
| Android app | ✅ most | ❌ | Future |
| Portal API sync (real-time) | ✅ GestionaleRe (80+) | ❌ | v3 |
| Digital signature | ✅ add-on | ❌ | v3 |
| Invoicing | ✅ Cometa | ❌ | v3 |
| AML compliance | ✅ add-on | ❌ | v3 |
| AI market reports | ❌ nobody | ❌ | v3 |
| AI lead scoring | ❌ nobody | ❌ | v3 |
| 360° Virtual tours | ✅ most | ❌ | Future enhancement |
| AI furnishing visualizer | ✅ onOffice €0.30/img | ❌ | Future enhancement |
