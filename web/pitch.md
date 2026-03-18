# CasaAI — Product Pitch

## The Problem

Italian real estate agents waste 2–3 hours per listing on manual admin:
- Writing property descriptions (Italian + English)
- Creating Instagram, Facebook, WhatsApp, and email content
- Managing follow-ups with buyers and sellers
- Generating invoices and tracking payments
- Drafting and tracking purchase proposals

Most agencies still rely on Excel spreadsheets, WhatsApp groups, and email chains. Existing software (Getrix, Gestim, AGIM) is expensive, outdated, and has zero AI.

---

## The Solution

**CasaAI** is an AI-powered back-office platform built specifically for Italian real estate agents. One platform replaces their fragmented workflow.

### Core Value Props

| Pain | CasaAI Solution |
|------|-----------------|
| Hours writing listings | AI generates all content in 10 seconds (IT + EN + Social + Email) |
| Forgetting leads | Contact CRM with birthday reminders, WhatsApp direct links, email campaigns |
| Calendar chaos | Team calendar with appointment types, agent view, Google Calendar sync |
| Invoice headaches | Full invoicing with IVA/ritenuta/cassa, PDF, send via email, mark paid |
| Proposal paperwork | Digital purchase proposals with vincoli, caparra, counter-offers, PDF |
| No business visibility | Dashboard with stats, archive analytics, team leaderboard |

---

## Features (March 2026)

### 🤖 AI Content Engine
- **Gemini 2.0 Flash** generates listing descriptions, Instagram posts, Facebook posts, WhatsApp messages, email copy
- 4 tones: Standard, Luxury, Approachable, Investment
- Bilingual output (Italian + English)
- Per-tone regeneration without losing other outputs

### 🏠 Listing Management
- Full listing form (address, rooms, price, catastral data, conditions, energy class)
- Photo upload with AI-powered Vision analysis
- Floor plan upload
- PDF brochure generation
- Portal XML export (MLS/portals)
- Price history timeline

### 👥 Contact CRM
- Full contact database (buyers, sellers, renters, landlords)
- Birthday reminders with AI-generated messages (DeepSeek)
- WhatsApp direct links
- File attachments (documents, contracts)
- Link contacts to listings

### 📅 Appointments & Calendar
- Multi-agent team calendar
- Appointment types (visite, riunioni, scadenze)
- Google Calendar sync
- Agent-level views + group view

### 📧 Email Campaigns
- Compose + send via Resend
- Open tracking pixel
- File attachments
- Recipient filtering by contact type

### 💰 Contabilità (Invoicing)
- Create/edit invoices with multiple line items
- Italian tax engine: IVA 22%, ritenuta d'acconto 20%, contributo cassa
- Regime fiscale: ordinario, forfettario, esente
- PDF generation (A4, professional layout)
- Send invoices via email with PDF attachment
- Status tracking: bozza → inviata → pagata / scaduta
- Summary dashboard: fatturato, in attesa, scadute

### 📋 Proposte d'acquisto (Purchase Proposals)
- Select listing + buyer (auto-fills property and buyer details)
- Configurable conditions (vincoli): mutuo, vendita immobile, perizia, personalizzata
- Caparra confirmatoria with agency-held option
- Counter-proposal (controproposta) flow from seller
- Accept / reject / counter actions
- PDF generation with legal language and signature fields
- Status tracking: bozza → inviata → accettata / rifiutata / controproposta

### 🏗️ Multi-tenant Architecture
- Workspace isolation (multi-agency safe)
- Role-based access: group_admin, admin, agent
- Group/multi-branch networks
- Subscription tiers with plan gates

### 📊 Analytics & Archive
- Sold property archive with buyer links
- Property valuation widget (comparable sales by city)
- Team leaderboard and agent stats

---

## Competitive Position

| | CasaAI | Getrix | Gestim | AGIM |
|---|---|---|---|---|
| AI content generation | ✅ Full | ❌ | ❌ | ❌ |
| Invoice management | ✅ | Partial | ✅ | ✅ |
| Purchase proposals | ✅ PDF | Basic | Basic | ✅ |
| Email campaigns | ✅ | ❌ | ❌ | ❌ |
| Modern UX | ✅ | ❌ Old | ❌ Old | ❌ Old |
| Pricing | €149–899/mo | Custom | €3+/mo | Annual |
| AI-first design | ✅ | ❌ | ❌ | ❌ |

**CasaAI is the only platform purpose-built for Italian real estate with AI at its core.**

---

## Business Model

| Plan | Price/month | Target |
|------|-------------|--------|
| Trial | Free 30 days | Any agency |
| Starter | €149 | Solo agent / 1 office, ≤3 agents |
| Agenzia | €299 | Branch office, ≤15 agents |
| Network | €899 | Multi-branch group, unlimited agents |

**Unit economics:**
- LTV at Agenzia tier (3yr): ~€10,764
- CAC target: <€500 (warm referral network)
- Gross margin: ~85% (SaaS)

---

## Traction & Go-to-Market

**Beachhead**: Single branch manager (friend) at a 5-agent office in a ~10-office regional network. Acts as internal champion and de-facto sales partner.

**Expansion path**:
1. Prove ROI at branch → 5 agents save 2hrs/week each = 10hrs saved per week
2. Branch manager introduces to the 10-office network → €8,990/month
3. Network becomes reference customer for Italian real estate → scale to 100+ agencies

---

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript 5)
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Tailwind CSS 4 + shadcn/ui** — warm futurism design system
- **Gemini 2.0 Flash** — AI content (low cost, high quality)
- **DeepSeek V3** — birthday messages (ultra-low cost)
- **Resend** — transactional email + campaigns
- **Stripe** — subscriptions + billing
- **@react-pdf/renderer** — PDF generation (invoices, proposals, brochures)
- **Meta Graph API** — Instagram + Facebook publishing
- **Google Calendar API** — calendar sync
- **Vercel** — deployment

---

## Roadmap

### Next: Sprint G — iOS App
- React Native + Expo for field agents
- Camera/gallery integration for listing photos
- Push notifications
- App Store via EAS

### Future Sprints
- **Portals integration**: auto-publish to Immobiliare.it, Casa.it, Idealista
- **Lead import**: scrape portal inquiries into contacts automatically
- **E-signature**: digital signing for proposals (via DocuSign/Yousign)
- **Revenue analytics**: commission tracking, pipeline value, forecast
- **White-label**: agencies host under their own domain
- **iOS app**: field tool for agents (camera, voice notes, appointments)

---

## Why Now

1. Italian real estate market is €28B/year — 60,000+ registered agencies
2. AI tools are mature enough to generate professional real estate copy
3. Existing platforms are 10–20 years old with no AI roadmap
4. Agents are mobile-first and increasingly expect modern software
5. Post-COVID price surge = agents busier than ever, desperate for time-saving tools

---

*Built with Claude Code · Spring 2026*
