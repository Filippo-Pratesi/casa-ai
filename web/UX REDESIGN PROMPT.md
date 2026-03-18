# CasaAI — UI/UX Redesign Brief for Claude Code

## The Problem

The current UI looks like a **default shadcn template** — functional but completely generic. There's no visual identity, no personality, no "wow" factor. For a product called "CasaAI" that sells itself as an intelligent, modern CRM, the interface feels stuck in 2020. We need it to feel like **2026**.

## Design Direction

### Brand Personality
- **Young & vibrant** — our clients are modern agencies, not old-school brokerages
- **AI-native** — intelligence should feel woven into the UI, not bolted on
- **Premium but approachable** — real estate agents aren't developers; everything should feel intuitive and inviting
- **Italian flair** — subtle warmth, elegance, and confidence (think Italian design sensibility, not American corporate)

### Visual Style: "Warm Futurism"
Not cold dark-mode tech. Not sterile corporate SaaS. Think **warm, luminous, alive**:

- **Dark mode as primary** with a warm undertone — deep navy/charcoal with hints of warm indigo, not pure cold black. Light mode should also exist and feel equally polished
- **Accent palette:** a signature warm coral/terracotta as primary accent, paired with luminous teal and soft gold. These should feel like the CasaAI brand, not generic blue
- **Glassmorphism, done tastefully:** frosted glass cards with `backdrop-blur`, soft luminous borders, subtle inner glows. NOT overdone — subtle and premium
- **Depth and atmosphere:** gradient mesh backgrounds on hero/empty states, subtle grain/noise texture on surfaces, layered shadows that create spatial hierarchy
- **Ambient glow effects:** key interactive elements (AI buttons, active states, focus rings) should emit a soft colored glow

### Typography

The project currently uses Geist (Vercel's font). **Replace it** with something more distinctive:

- **Display/headings:** Use a bold, geometric variable font with personality — options: `Clash Display`, `Satoshi`, `General Sans`, `Cabinet Grotesk`, `Plus Jakarta Sans` (load via `next/font/google` or `next/font/local` from Fontshare CDN)
- **Body text:** Pair with a clean, highly readable companion font — or use the same family at lighter weights if it reads well at 16px
- **Sizing hierarchy:** Large, confident headings (2xl-4xl), comfortable body (base-lg), elegant small text for labels/metadata
- **Details:** Vary letter-spacing (tight on headings, normal on body), use font-weight contrast intentionally

### Motion & Micro-interactions

We already have `tw-animate-css` installed. Layer on top of it:

- **Page-level:** Staggered fade-in on route changes — dashboard cards, list rows, and sections should cascade in (use CSS `animation-delay` increments)
- **Hover states:** Cards should lift with shadow + subtle scale (0.5-1%), buttons should have smooth color/glow transitions, interactive rows should highlight with a warm wash
- **AI moments:** Whenever the AI is generating content (listing descriptions, analysis), show a **shimmer/pulse animation** on the container — a gently moving gradient border or a breathing glow effect. Make the AI feel alive
- **Loading states:** Replace any spinners with skeleton shimmer loaders that match the content layout
- **Transitions:** Sidebar collapse, modal entrances, toast appearances — everything should have smooth 200-300ms transitions with proper easing (`cubic-bezier(0.4, 0, 0.2, 1)`)
- **Respect `prefers-reduced-motion`** — wrap all animations in a media query check

### Layout & Spatial Composition

- **Dashboard:** Transform from a plain list/grid into a **bento-grid command center**. Key metrics in prominent, varied-size cards. Use the full viewport width intelligently. The dashboard should feel like opening the cockpit of your real estate business
- **Sidebar navigation:** Make it a **collapsible glass panel** with icon-only mode. Active state should have a glowing indicator, not just a background highlight. Group navigation semantically (CRM, Marketing, Settings)
- **Data tables (contacts, listings, campaigns):** Add visual richness — avatar/thumbnail columns, color-coded status chips, inline sparkline trends where relevant, hover-reveal action buttons instead of always-visible icon clutter
- **Property/listing cards:** These are the crown jewels. Make them **image-forward** with a gradient overlay for text readability, floating price badges, status indicators, AI-generated-tag badges. They should look like premium real estate cards, not database rows
- **Empty states:** Beautiful, motivating illustrations or gradients with clear CTAs — not just "No data found" with a sad icon
- **Forms:** Inputs should feel premium — custom focus rings with glow, floating labels or clean labeled inputs, smooth validation feedback

### AI Identity in the UI

This is what makes CasaAI special. The AI should be **visible and characterful**:

- **AI action buttons:** Use a distinctive style — gradient fills, sparkle/wand icon (from Lucide: `Sparkles`, `Wand2`, `BrainCircuit`), subtle shimmer animation on hover
- **AI-generated content indicators:** When a listing description was AI-generated, show a small elegant badge ("AI Generated" with a sparkle icon and a soft glow)
- **AI loading/thinking state:** A signature animation — maybe a pulsing gradient ring or a breathing aurora effect — that's instantly recognizable as "CasaAI is working"
- **AI suggestion panels:** If the AI offers suggestions (e.g., re-generate description, smart contact insights), present them in a distinguished container — maybe a glass card with a gradient left-border accent

### Specific Pages to Focus On

1. **Dashboard (`/dashboard`)** — The first thing users see. Must be the most impressive page. Bento grid, key metrics with visual indicators, recent activity feed, quick actions
2. **Contacts list & detail** — Data-dense but not overwhelming. Smart avatar display, status chips, interaction timeline
3. **Listings list & detail** — Image-forward cards, property gallery, AI description section with generation UI
4. **Campaigns** — Email campaign builder, status tracking with visual progress, open-rate analytics with charts
5. **Appointments** — Calendar/schedule view, clean time blocks, Google Calendar sync indicator
6. **Settings/Profile** — Clean, organized, with avatar upload polish
7. **Billing** — Stripe plan cards, usage indicators, upgrade CTA that's compelling but not annoying

### Component-Level Polish

Since we use **shadcn/ui (base-nova)**, work WITH the component system:

- **Override shadcn theme tokens** in `app/globals.css` under `@theme` — update all CSS variables for colors, radii, shadows to match our new palette
- **Extend component variants** where needed using CVA (already installed) rather than fighting the defaults
- **Cards:** Add glass effect variant, glow border variant
- **Buttons:** Create an "AI action" variant with gradient + shimmer
- **Badges/Chips:** Color-coded status system (active=teal, pending=amber, closed=neutral, AI-generated=coral glow)
- **Inputs:** Custom focus ring with colored glow, smooth transition on focus
- **Dialogs/Modals:** Backdrop blur, smooth scale-in animation, glass header
- **Sidebar:** Glass panel effect, animated collapse, glowing active indicator

## Technical Constraints

- **Tailwind v4** uses `@theme` in CSS for design tokens, NOT `tailwind.config.js`. All custom colors, fonts, spacing, shadows go in `app/globals.css`
- **shadcn base-nova** already has a CSS variable system — extend it, don't replace it
- Fonts must be loaded via `next/font` (either from Google or local files) for performance
- All images go through `next/image` with domains configured in `next.config.ts`
- Supabase storage images are served from `clzegkiwnodhqhxemiud.supabase.co`
- Keep all existing functionality intact — this is a visual refactor, not a rewrite
- Maintain accessibility: WCAG AA contrast ratios, keyboard navigation, focus management, ARIA labels
- Responsive: desktop-first (primary), tablet (good), mobile (functional)

## Reference Inspiration (for visual quality bar, NOT to copy)

- **Linear.app** — dark mode mastery, subtle motion, command-bar navigation
- **Attio.com** — modern CRM that actually looks designed, bento dashboards
- **Raycast.com** — glass effects, vibrant gradients, energetic but controlled
- **Amie.so** — playful premium feel, delightful micro-interactions
- **Vercel.com** — typography confidence, spatial elegance
- **Immobiliare.it** (for real estate context) — property card design, search UI

## Execution Plan

Work in this order:

1. **Design tokens first** — Update `app/globals.css` with the complete new theme: colors, fonts, shadows, radii, custom utilities. This is the foundation
2. **Layout shell** — Sidebar navigation, top bar, page transition wrapper
3. **Dashboard** — The hero page. Get this looking incredible
4. **Shared components** — Cards, buttons, badges, inputs, tables, modals, empty states
5. **Feature pages** — Contacts, listings, campaigns, appointments, billing, settings
6. **AI identity elements** — Loading states, generation UI, AI badges, suggestion panels
7. **Final polish** — Animations, hover states, transitions, edge cases, empty states

## What Success Looks Like

When someone opens CasaAI for the first time, they should think: "This doesn't look like any CRM I've used before." It should feel warm, intelligent, and premium — like a product designed by people who care deeply about craft. Every pixel should feel intentional. The AI should feel like a living presence in the interface, not a hidden API call. The overall impression should be: **"This is the future of real estate software."**
