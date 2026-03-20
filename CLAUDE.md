# casa-ai

Real estate AI SaaS for Italian agencies. The app lives in `./web/`.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui + Base UI
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **AI:** Gemini 2.0 Flash (primary), GPT-4o (luxury tone), DeepSeek V3
- **Payments:** Stripe (subscription billing)
- **Email:** Resend
- **Social:** Meta Graph API (Instagram integration)
- **Calendar:** Google Calendar API
- **PDF:** @react-pdf/renderer
- **Maps:** Mapbox (geocoding + address autocomplete)

## Project Structure

```
web/
├── app/
│   ├── (app)/              # Protected routes
│   │   ├── admin/          # Admin panel
│   │   ├── analytics/      # Analytics dashboard
│   │   ├── archive/        # Archived contacts/listings
│   │   ├── banca-dati/     # Property database (lifecycle management)
│   │   ├── calendar/       # Appointments
│   │   ├── campaigns/      # Email/WhatsApp campaigns
│   │   ├── contabilita/    # Invoicing & accounting
│   │   ├── contacts/       # CRM contacts
│   │   ├── dashboard/      # Main dashboard
│   │   ├── listing/        # Property listings (annunci)
│   │   ├── mls/            # MLS integration
│   │   ├── notifications/  # Notification center
│   │   ├── plans/          # Subscription plans
│   │   ├── profile/        # User profile
│   │   ├── proposte/       # Purchase proposals
│   │   ├── settings/       # Workspace settings
│   │   └── todos/          # Task management
│   ├── (auth)/             # Login/signup flows
│   ├── api/                # API routes
│   │   ├── agent-zones/    # Agent zone defaults
│   │   ├── ai-assistant/   # AI chat widget
│   │   ├── appointments/
│   │   ├── archive/        # CSV/JSON export
│   │   ├── banca-dati/     # Property DB helpers
│   │   ├── billing/        # Stripe webhooks + billing
│   │   ├── calendar/       # Google Calendar sync
│   │   ├── campaigns/
│   │   ├── catasto/        # Cadastral data
│   │   ├── contacts/       # CRM CRUD
│   │   ├── cron/           # Scheduled jobs (lease expiry, etc.)
│   │   ├── geocode/        # Mapbox geocoding proxy
│   │   ├── group/          # Multi-workspace group
│   │   ├── invoices/       # Invoicing CRUD + PDF + email
│   │   ├── listing/        # Listing CRUD + AI generation
│   │   ├── match-engine/   # Contact↔property matching
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── properties/     # Banca Dati CRUD + stage transitions
│   │   ├── proposals/      # Purchase proposals CRUD + PDF
│   │   ├── search/         # Global search
│   │   ├── settings/
│   │   ├── social/         # Instagram publishing
│   │   ├── todos/
│   │   ├── track/          # Analytics tracking
│   │   ├── workspace/
│   │   └── zones/          # Zone + sub-zone management
│   ├── not-found.tsx
│   └── p/                  # Public property pages
├── components/             # Feature-organized React components
│   ├── ai-assistant/       # AI chat widget
│   ├── analytics/
│   ├── archive/
│   ├── banca-dati/         # Property DB UI components
│   ├── calendar/
│   ├── campaigns/
│   ├── contabilita/        # Invoicing UI
│   ├── contacts/           # CRM UI + cronistoria
│   ├── dashboard/
│   ├── listing/
│   ├── notifications/
│   ├── proposals/
│   ├── settings/
│   ├── shared/             # Reusable components (AttachmentsSection, etc.)
│   └── ui/                 # shadcn/ui primitives
├── hooks/
├── lib/
│   ├── supabase/           # Browser + server + admin clients
│   ├── i18n/               # Italian translations
│   ├── contact-event-types.ts  # Contact cronistoria event config
│   ├── contact-utils.ts
│   ├── gemini.ts           # Google AI wrapper
│   ├── deepseek.ts
│   ├── facebook.ts         # Meta Graph API
│   ├── google-calendar.ts
│   ├── match-scoring.ts    # Deterministic contact↔property scoring
│   ├── omi-valuation.ts    # OMI property valuation
│   ├── plan-limits.ts      # Subscription tier logic
│   └── utils.ts
├── docs/
│   └── specs/              # Technical specs for implemented features
│       ├── SPEC-DATABASE.md
│       ├── SPEC-API.md
│       ├── SPEC-UI.md
│       ├── SPEC-AFFITTI.md
│       ├── SPEC-PDF-TEMPLATES.md
│       ├── SPEC-SICUREZZA.md
│       ├── SPEC-TESTING.md
│       └── REQUISITI-STRUMENTI.md
└── supabase/
    └── migrations/         # 68 numbered SQL migration files (001–068)
```

## Commands

```bash
cd casa-ai/web && npm run dev      # Start dev server (port 3000)
cd casa-ai/web && npm run build    # Production build
cd casa-ai/web && npm run lint     # ESLint
```

## Database

Supabase PostgreSQL with RLS. All tables are workspace-scoped (multi-tenant). Uses `createAdminClient()` (service role) in all API routes — never the user JWT client for DB writes.

**Core tables:** workspaces, users, listings, contacts, appointments, campaigns, notifications, todos, google_calendar_tokens, listing_stats, price_history, floor_plans, archived_contacts, archived_listings

**Banca Dati tables:** properties, property_events, zones, sub_zones, agent_zones, property_contacts

**Finance tables:** invoices, proposals

**Other:** match_results, contact_events, omi_zones

**Key enums:**
- `user_role`: admin / agent
- `property_type`: apartment / house / villa / commercial / land / garage / other
- `property_stage`: sconosciuto / ignoto / conosciuto / incarico / venduto / locato
- `owner_disposition`: non_specificato / vuole_vendere / non_vuole_vendere / indeciso / incarico_firmato / appena_acquistato
- `tone`: standard / luxury / approachable / investment
- `listing_status`: draft / published
- `workspace_plan`: trial / starter / growth / network
- `contact_type`: buyer / seller / renter / landlord / other
- `lease_type`: standard / concordato / transitorio / studenti
- `proposal_type`: acquisto / locazione

**Important:** When changing the schema, always create a new migration file with the next number in `web/supabase/migrations/` (current highest: **068**). Never modify existing migration files.

**Contact types:** Contacts support multiple types via the `types` (text[]) column alongside the legacy `type` column. Always write both when updating. The `types` array is the source of truth for filtering and display.

## Environment Variables

See `web/.env.local.example` for required vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_CLOUD_VISION_API_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

## Coding Conventions

- All UI text is in Italian
- Use shadcn/ui components from `components/ui/` — don't create custom equivalents
- Use `cn()` from `lib/utils.ts` for conditional class merging
- API routes go in `app/api/[feature]/route.ts`
- Feature components go in `components/[feature]/`
- **Always use `createAdminClient()`** in API routes for DB operations (RLS blocks user-JWT queries on cross-table lookups)
- Always validate `workspace_id` in API routes (see `SECURITY_AUDIT.md` for known gaps)
- Toast notifications use Sonner
- Detail pages use two-column layout on desktop: `grid grid-cols-1 lg:grid-cols-[1fr_300px]` with sticky right sidebar for cronistoria

## Git & Commits

**MANDATORY:** Commit after every code change using conventional commits:
- `feat:` new features
- `fix:` bug fixes
- `refactor:` refactoring
- `docs:` documentation
- `chore:` maintenance

**At session end:** If approaching token limit, commit and push before closing. Never leave uncommitted work.

## Implemented Features (Current State)

### Annunci (Listings)
Full listing lifecycle: create → AI content generation (Gemini/GPT-4o/DeepSeek per tone) → publish → social share → archive. Tone regeneration per-section. PDF brochure. MLS toggle. Valuation widget (OMI). Price history. Floor plan upload. Stats tracking.

### Banca Dati Immobiliare
Property discovery-to-sale lifecycle management:
- **Stages:** sconosciuto → ignoto → conosciuto → incarico → venduto/locato
- **Cronistoria:** append-only event log on each property
- **Multi-contact roles:** proprietario, moglie/marito, avvocato, vicino, etc.
- **Zone management:** zones + sub-zones, agent default zones
- **Vicinanza search:** properties within radius via Haversine
- **Geocoding:** Mapbox address autocomplete + coordinates
- **Incarico:** digital signing flow, PDF contract generation (vendita + locazione)
- **Locazioni:** automatic notifications at 90/60/30/0 days before expiry
- **Auto-events:** stage changes, contact links, incarico signing, sale completion

### CRM Contatti
- Multi-type contacts (`types[]`: buyer, seller, renter, landlord, other)
- Cronistoria with auto-events (linked property, type change, incarico, sale)
- Buyer preference matching against Banca Dati (deterministic + AI scoring)
- Privacy consent (GDPR), birthday reminders, attachments
- Contact detail page: two-column layout, cronistoria sticky right sidebar
- Filtering works across all types in `types[]`, not just primary `type`

### Contabilità
Invoicing with IVA / ritenuta d'acconto / cassa previdenziale. PDF export. Email via Resend. Mark-paid. Auto invoice numbering.

### Proposte d'acquisto
Purchase proposals with vincoli (mutuo/vendita/perizia), caparra tracking, seller counter-proposal flow. PDF generation.

### Calendar
Appointments with Google Calendar sync. Contact linking.

### Campaigns
Email/WhatsApp campaigns to contact segments.

### Match Engine
Contact ↔ property matching: deterministic scoring (budget, rooms, sqm, city, type) + AI adjustment layer. Results stored in `match_results` table.

### AI Assistant
Chat widget available on all pages, workspace-scoped context.

### Analytics
Dashboard stats, listing performance tracking.

## Known Issues

See `web/SECURITY_AUDIT.md` for 11 security findings (2 critical, 3 high). Key gaps:
- Missing `workspace_id` checks in some API routes
- No rate limiting on API endpoints
- No CORS configuration
