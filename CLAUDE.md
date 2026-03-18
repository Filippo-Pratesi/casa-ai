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
│   ├── (auth)/         # Login/signup flows
│   ├── api/            # API routes (ai-assistant, appointments, auth, billing,
│   │                   #   calendar, campaigns, contacts, group, listing,
│   │                   #   notifications, profile, search, social, todos, track, workspace)
│   └── p/              # Public property pages
├── components/         # React components organized by feature
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

**Important:** When changing the schema, always create a new migration file with the next number in `web/supabase/migrations/` (current highest: 023). Never modify existing migration files.

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

**Sprint F — UX Redesign:** Completed warm futurism design system overhaul with 51 improvements:
- Redesigned all major pages (dashboard, listings, contacts, calendar, campaigns, archive, settings)
- New components: command palette (Cmd+K), AI assistant widget, archive export, notification preferences
- Global improvements: custom animations (spring easing), gradient treatments, glass effects, dark mode
- See `web/UX CHANGES IMPLEMENTED.md` for complete documentation

**Commit history:** `83eba84` (UX redesign + new features, March 17-18)

## Known Issues

See `web/SECURITY_AUDIT.md` for 11 security findings (2 critical, 3 high) that need remediation. Key gaps: missing workspace_id checks in some API routes, no rate limiting, no CORS config.
