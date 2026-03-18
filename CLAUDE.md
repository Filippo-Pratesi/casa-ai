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

## Project Structure

```
web/
├── app/
│   ├── (app)/          # Protected routes (dashboard, listings, contacts, etc.)
│   │   ├── listing/[id]/edit/  # Listing edit page with tone regeneration
│   │   └── ...         # archive, campaigns, calendar, contacts, notifications,
│   │                   #   plans, settings, team, todos
│   ├── (auth)/         # Login/signup flows
│   ├── api/            # API routes:
│   │   ├── ai-assistant/       # AI chat widget endpoint
│   │   ├── archive/export/     # Archive CSV/JSON export
│   │   ├── appointments/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── calendar/
│   │   ├── campaigns/
│   │   ├── contacts/
│   │   ├── group/
│   │   ├── listing/[id]/update/  # Listing update + tone regeneration
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── search/             # Global search endpoint
│   │   ├── social/
│   │   ├── todos/
│   │   ├── track/
│   │   └── workspace/
│   ├── not-found.tsx   # Custom 404 page
│   └── p/              # Public property pages
├── components/         # React components organized by feature
│   ├── ai-assistant/   # AI widget (ai-widget.tsx, ai-widget-gate.tsx)
│   ├── shared/         # Reusable UI components
│   └── ui/             # shadcn/ui primitives
├── hooks/              # Custom React hooks (use-mobile.ts)
├── lib/
│   ├── supabase/       # Supabase client (browser + server)
│   ├── i18n/           # Internationalization (Italian)
│   ├── gemini.ts       # Google AI wrapper
│   ├── deepseek.ts     # DeepSeek wrapper
│   ├── facebook.ts     # Meta Graph API
│   ├── google-calendar.ts
│   ├── plan-limits.ts  # Subscription tier logic
│   └── utils.ts        # General utilities (cn, etc.)
├── public/             # Static assets (SVG icons)
└── supabase/
    └── migrations/     # 23 numbered SQL migration files (001–023)
```

## Commands

```bash
cd casa-ai/web && npm run dev      # Start dev server (port 3000)
cd casa-ai/web && npm run build    # Production build
cd casa-ai/web && npm run lint     # ESLint
```

## Database

Supabase PostgreSQL with RLS policies. All tables are workspace-scoped (multi-tenant).

Key entities: workspaces, users, listings, contacts, appointments, campaigns, notifications, todos, google_calendar_tokens, listing_stats, price_history, floor_plans.

Enums: `user_role` (admin/agent), `property_type` (apartment/house/villa/commercial/land/garage/other), `tone` (standard/luxury/approachable/investment), `listing_status` (draft/published), `workspace_plan` (trial/starter/growth/network), `contact_type` (buyer/seller/renter/landlord/other).

**Important:** When changing the schema, always create a new migration file with the next number in `web/supabase/migrations/` (current highest: 042). Never modify existing migration files.

## Environment Variables

See `web/.env.local.example` for required vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_CLOUD_VISION_API_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Coding Conventions

- All UI text is in Italian
- Use shadcn/ui components from `components/ui/` — don't create custom equivalents
- Use `cn()` from `lib/utils.ts` for conditional class merging
- API routes go in `app/api/[feature]/route.ts`
- Feature components go in `components/[feature]/`
- Always validate workspace_id in API routes (see SECURITY_AUDIT.md for known gaps)
- Use Supabase RLS as the primary access control layer
- Toast notifications use Sonner

## Git & Commits

**MANDATORY:** Commit after every code change using conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code refactoring
- `docs:` for documentation
- `style:` for formatting/styling
- `test:` for tests
- `chore:` for maintenance

**At session end:** If approaching token limit, request explicit user approval to commit and push before closing the session. Never leave uncommitted work.

## Recent Changes (March 2026)

**Sprint H — Accounting & Proposals (complete, branch `sprint-h-accounting-proposals`, March 18):**
- **Contabilità module** — Full invoicing with IVA/ritenuta/cassa, PDF export, Resend email, mark-paid. DB migration 024. Pages: `/contabilita`, `/contabilita/nuova`, `/contabilita/[id]`. API: `/api/invoices` (full CRUD + mark-paid + send + pdf + next-number).
- **Proposte d'acquisto** — Purchase proposals with vincoli (mutuo/vendita/perizia), caparra, seller counter-proposal. DB migration 025. Pages: `/proposte`, `/proposte/nuova`, `/proposte/[id]`, `/proposte/[id]/counter-offer`. API: `/api/proposals` (full CRUD + respond + pdf + counter-offer + next-number).
- Dark mode: lifted background to oklch(0.155), softer foreground, sidebar gradient uses brighter values
- Fixed hydration mismatch (`suppressHydrationWarning` on `<html>`)
- 26 bug/UX fixes across 2 review rounds: auth null guards, mobile hover-only actions, dark mode TYPE_COLORS, sidebar CasaAI gradient, loading skeletons, missing invoice detail page, broken proposal action buttons
- See `web/SPRINT-H-CHANGES.md` for full details

**Sprint F — UX Redesign (complete, commit `83eba84`, March 17-18):**
- "Warm futurism" design system overhaul — 51 improvements across all major pages
- Redesigned: dashboard (bento stat cards), listings, contacts, calendar, campaigns, archive, settings, notifications, todos
- New components: AI assistant chat widget (`/components/ai-assistant/`), archive export, notification preferences
- New pages: `listing/[id]/edit` (edit + per-tone regeneration), custom 404
- New API routes: `ai-assistant`, `archive/export`, `search`, `listing/[id]/update`
- Global: spring animations, gradient treatments, glass/blur effects, dark mode refinements
- See `web/UX CHANGES IMPLEMENTED.md` for full details (51 items)

## Sprint I — Banca Dati Immobiliare (Completo, branch `sprint-i-banca-dati`, Marzo 2026)

**Status:** All phases 0-7 complete. 15 migrations applied to live DB.

**Live DB:** 164 properties, 246 events, 5 zones, 25 annunci linked — seed data applied.

### Overview
Fundamental architecture change: add **property lifecycle management** from discovery through sale/rental. Every property discovered by agents enters the database and is tracked through all stages (sconosciuto → ignoto → conosciuto → incarico → venduto/locato → disponibile) with complete chronistoria (append-only event log), multi-role contacts, zone management, and automatic notifications.

### Key Features
- **Property lifecycle stages** with automatic and manual state transitions
- **Owner disposition tracking** — seller intent with auto-updates (incarico_firmato, appena_acquistato with 3-month reset)
- **Cronistoria** — append-only event log capturing every interaction
- **Multi-contact system** — multiple roles per property (proprietario, moglie, vicino, avvocato, etc.)
- **Zone management** — zones + sub-zones with agent defaults, substitution UI
- **Vicinanza search** — properties within 100m radius using Haversine distance
- **Locazioni cycle** — rental with automatic notifications at 90/60/30/0 days before expiry
- **PDF contracts** — vendita and locazione templates with automatic field population
- **Mapbox geocoding** — address autocomplete and coordinate validation

### Specification Files
All technical specifications are documented in separate files in `web/`:

| File | Content |
|------|---------|
| `SPEC-DATABASE.md` | Schema: 6 new tables (properties, property_events, zones, sub_zones, agent_zones, property_contacts), 6 enums, RLS policies, indices, Haversine function |
| `SPEC-API.md` | 15+ API endpoints with request/response specs, validation, stage advancement logic, geocoding proxy, vicinanza search |
| `SPEC-UI.md` | 3 new pages (/banca-dati, /banca-dati/nuovo, /banca-dati/[id]), sidebar restructure, progressive form, timeline component |
| `SPEC-AFFITTI.md` | Rental lifecycle (incarico→locato→disponibile), 4 automatic notifications, lease_type enum, proposal locazione with canone_agevolato |
| `SPEC-PDF-TEMPLATES.md` | 2 contract templates (vendita, locazione), 20+ field placeholders, dropdown auto-population, email+WhatsApp sending |
| `SPEC-SICUREZZA.md` | Security checklist: RLS policies, workspace isolation, input validation, rate limiting, XSS prevention, GPS coordinate protection |
| `SPEC-TESTING.md` | 70+ test cases covering all features, mock data (30+ properties, 5+ zones, 15+ contacts, 50+ events) |
| `REQUISITI-STRUMENTI.md` | Mapbox setup (free token: 100k requests/month), PDF templates (user-provided), future Google Maps + property valuation APIs |

### Development Workflow

**Phase Structure:** Each of 9 phases (0–8) ends with a commit and PLAN update:
1. **Phase 0** (✅ complete): Specification files drafted, committed with `docs: Sprint I — specifiche tecniche Banca Dati Immobiliare`
2. **Phase 1** (in progress): 7 database migrations (028–034) — create properties, events, zones, contacts tables, update existing tables for RLS
3. **Phase 2**: API backend — CRUD, geocoding, stage advancement, vicinanza, cron notifications
4. **Phase 3**: UI — list, create, detail pages, sidebar redesign, zone management
5. **Phase 4**: Incarico & PDF — contract generation, email/WhatsApp sending
6. **Phase 5**: Integration — contacts page, annunci auto-creation, dashboard card
7. **Phase 6**: Testing & mock data — run all 70+ test cases
8. **Phase 7**: Security review — RLS, isolation, validation, rate limiting
9. **Phase 8**: Ralph Loop (5 iterations) — explore and propose UX improvements

**Commit Protocol (MANDATORY):**
- After each phase completion: create commit with `feat:` or `docs:` prefix
- Include phase number in message: `feat: Sprint I Fase X — [summary]`
- Update `PLAN.md` in commit: mark completed phase, describe changes, note blockers

**PLAN Update Protocol:**
- File: `PLAN-Client Discovery.md` (or specified plan document)
- Update after each phase with: completion date, what was built, what's next, any adjustments
- Keep PLAN and code in sync — if implementation changes approach, update PLAN before next phase

### Database Additions (Phase 1)
**New tables:** properties, property_events, zones, sub_zones, agent_zones, property_contacts
**New enums:** property_stage, owner_disposition, property_event_type, proposal_type, lease_type, property_contact_role
**Modified tables:** contacts (add roles[], codice_fiscale, partita_iva), listings (add property_id), proposals (add proposal_type + rental fields)
**RLS policies:** All new tables scoped to workspace_id
**See:** `SPEC-DATABASE.md` for complete schema

## Known Issues

See `web/SECURITY_AUDIT.md` for 11 security findings (2 critical, 3 high) that need remediation. Key gaps: missing workspace_id checks in some API routes, no rate limiting, no CORS config.
