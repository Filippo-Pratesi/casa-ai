VERIFICATION PASSED (17/17 checks)

# Review Iteration 1 — casa-ai

**Model:** Claude Sonnet 4.6 (acting as senior full-stack architect + UX designer)
**Date:** 2026-03-19

---

## Section A — Logical / Data / Architectural Changes

### A1. Birthday calculation mutates `today` object — incorrect diff on first birthday match
**Problem:** In `app/(app)/layout.tsx` (line 98) and `components/contacts/contacts-client.tsx` (line 56), the birthday diff uses `today.setHours(0, 0, 0, 0)` as the subtrahend. `Date.prototype.setHours` mutates the object in place and returns a timestamp. So on the first loop iteration `today` is mutated to midnight, but on subsequent iterations `today` is already at midnight — causing no bug in practice, but the pattern is fragile and violates the immutability rule. Worse: if `today` is referenced elsewhere in the same render after the first `setHours` call, it will have been shifted.
**Affected files:** `app/(app)/layout.tsx:98`, `components/contacts/contacts-client.tsx:56`
**Fix:** Replace `today.setHours(0, 0, 0, 0)` with `new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()` to compute midnight without mutation.

### A2. Dashboard listing count is capped at 500 — stats are false for large agencies
**Problem:** `app/(app)/dashboard/page.tsx` fetches listings with `.limit(500)` (line 29), then `stats.listings` is set to `listings.length` (line 60). For a workspace with 600+ listings the stat card shows "500" instead of the real count.
**Affected files:** `app/(app)/dashboard/page.tsx:29,60`
**Fix:** Fetch the total count with a separate `select('id', { count: 'exact', head: true })` query (already done for contacts/appointments/bancaDati) and pass `totalListings` as the stat value, keeping the 500-limit fetch for the display grid.

### A3. CSV export row has 9 columns but header has 8 — misaligned CSV output
**Problem:** In `components/dashboard/dashboard-client.tsx`, `downloadCSV` defines `headers` with 8 entries (line 93) but `rows` maps 9 values (line 95-104): `address`, `city`, `TYPE_LABELS`, `price`, `sqm`, `rooms`, `agent.name`, `generated_content`, `formatDate`. The `city` field has no corresponding header, shifting all subsequent columns by one.
**Affected files:** `components/dashboard/dashboard-client.tsx:93-104`
**Fix:** Add `t('listings.col.city')` (or `'Città'`) as the second header entry to align with the `l.city` value in rows, or remove `l.city` from the row array if it's intentionally omitted.

### A4. AppLayout makes 5+ sequential DB calls on every navigation — waterfall latency
**Problem:** `app/(app)/layout.tsx` issues database calls in sequence: profile → group workspaces/group (conditionally) → notifications count → todos count → birthday contacts. The last three are independent and run sequentially, adding ~100-300ms per navigation for nothing.
**Affected files:** `app/(app)/layout.tsx:21-100`
**Fix:** Wrap the three independent badge queries in `Promise.all()`:
```ts
const [notifRes, todoRes, bdayRes] = await Promise.all([
  admin.from('notifications').select(...),
  admin.from('todos').select(...),
  admin.from('contacts').select(...),
])
```

### A5. Birthday contacts query loads full column data for O(n) filtering — should use DB-side date filter
**Problem:** `app/(app)/layout.tsx` (line 87-100) fetches ALL contacts' `date_of_birth` values and filters them in JS. For a workspace with 1,000+ contacts this transfers unnecessary data and wastes CPU.
**Affected files:** `app/(app)/layout.tsx:87-100`
**Fix:** Use a SQL filter to only fetch contacts whose birthday falls within the next 7 days. Since the year varies, use a Supabase RPC or a raw filter on `EXTRACT(MONTH)` and `EXTRACT(DAY)`. The simplest approach: fetch contacts where `date_of_birth IS NOT NULL` and do the 7-day window in JS, but reduce transfer by selecting only `date_of_birth` (already done) — the real fix is `Promise.all` (A4) to stop blocking and also add DB-side date range filter using two conditions covering year-wrap.

### A6. `profile?.workspace_id ?? ''` empty-string fallback — wrong data returned silently
**Problem:** Multiple server pages (dashboard, contacts, etc.) use `profile?.workspace_id ?? ''` as a Supabase query filter. If `profileData` is null (user profile not found), `workspace_id` is `''` — Supabase will run the query with `workspace_id = ''` and return 0 rows silently instead of redirecting to `/auth/setup`. The redirect happens for `profileData === null`, but if `profile` has a valid structure with an empty `workspace_id` string, data exposure could occur.
**Affected files:** `app/(app)/dashboard/page.tsx:27`, `app/(app)/contacts/page.tsx:41`
**Fix:** Add an early guard: if `!profile?.workspace_id` redirect to `/auth/setup`. This ensures the query only runs with a valid UUID.

### A7. No React error boundary — any component crash shows blank white screen
**Problem:** There is no `ErrorBoundary` wrapping the app or individual pages. A JavaScript error in any client component (e.g., malformed `generated_content` JSON, null property access) will show the Next.js default error overlay in dev and a blank page in production.
**Affected files:** `app/(app)/layout.tsx`, `app/layout.tsx`
**Fix:** Add an `ErrorBoundary` wrapper component in `components/shared/error-boundary.tsx` that catches errors and shows a user-friendly Italian error message with a retry button. Wrap `<SidebarInset>` children with it in the app layout.

### A8. `toneFilter` state initialization — "Tono" button doesn't show correct active state when filter is null
**Problem:** In `dashboard-client.tsx` (line 396-400), the tone filter renders a "Tono" button (val=`''`) that should be active when `toneFilter === null`. The logic `(val === '' && toneFilter === null)` is correct, BUT the button for "Tono" is not styled differently from unselected tone buttons — visually there's no obvious default-selected state for "Tono" to distinguish it from "Standard"/"Luxury"/etc.
**Affected files:** `components/dashboard/dashboard-client.tsx:392-405`
**Fix:** This is both a logic and UX issue. Add a visual indicator (e.g., slightly bolder font or a subtle underline) to the "Tono" button when no filter is active, so users understand the default state is "all tones."

### A9. `listing` stat card `ArrowUpRight` icon renders on the "Contenuto AI" card that has no href
**Problem:** In `dashboard-client.tsx` (line 320), `<ArrowUpRight>` is rendered on every stat card, including the "Contenuto AI" card whose `href` is `undefined`. The icon implies the card is clickable/navigable, misleading users.
**Affected files:** `components/dashboard/dashboard-client.tsx:319-320`
**Fix:** Only render `<ArrowUpRight>` when `s.href` is defined.

### A10. Missing workspace_id guard in contacts query allows data exposure
**Problem:** `app/(app)/contacts/page.tsx` calls the contacts query with `profile?.workspace_id` without checking if `profile` is null first (even though there's an earlier `if (!user)` check, if the admin fetch fails silently, `profile` could be null and the query runs without a workspace filter).
**Affected files:** `app/(app)/contacts/page.tsx:34,41`
**Fix:** After `const profile = profileData as ...`, add: `if (!profile) redirect('/auth/setup')`.

---

## Section B — UX / UI Design / Aesthetic Changes

### B1. Stat cards always show "TrendingUp · mese" — static decoration misleads users
**Problem:** All stat cards in `dashboard-client.tsx` (line 327-330) show a green `TrendingUp` icon and the text "mese" (month). This is hardcoded decoration, not real trend data. Users could mistake it for a "growing" indicator when business is actually declining. The "App. imminenti" card correctly shows "30 giorni" instead — but the other 4 use the fake trend.
**Affected files:** `components/dashboard/dashboard-client.tsx:324-332`
**Fix:** Remove the fake `TrendingUp` indicator entirely from all stat cards. Replace with the date of last item (e.g., "Aggiornato oggi") or simply omit the sub-label row. If trend data is added in a future sprint, restore with real delta values.

### B2. Logo in sidebar is 104px tall — too large, wastes vertical space
**Problem:** `components/app-sidebar.tsx` (line 104) sets `className="h-[104px] w-auto"` on the logo `<img>`. This is an enormous logo that pushes nav items down, especially on laptops. On 768px height screens, the entire nav group may not be visible without scrolling.
**Affected files:** `components/app-sidebar.tsx:104`
**Fix:** Reduce logo to `h-[52px]` or `h-[48px]`. This halves the wasted space while keeping the logo legible.

### B3. Dashboard header title says "Annunci" (via `t('listings.title')`) on the Dashboard page — wrong page context
**Problem:** The `DashboardClient` component (line 232) displays `{t('listings.title')}` as the main `<h1>`. The listings title is "Annunci" which is the nav item for `/listing`, not `/dashboard`. The Dashboard should say "Dashboard" or "Panoramica".
**Affected files:** `components/dashboard/dashboard-client.tsx:232`
**Fix:** Change the h1 to use a dedicated `t('dashboard.title')` key (or hardcode `"Dashboard"` / `"Panoramica"`) since the dashboard IS the listing management hub but labeling it "Annunci" conflicts with the separate `/listing` page in the nav.

### B4. List view table columns have fixed pixel widths — breaks at medium breakpoints
**Problem:** The list view in `dashboard-client.tsx` (line 473) uses `grid-cols-[1fr_100px_90px_90px_70px_90px_80px_50px]` — 8 fixed-width columns. On screens between 768px and 1024px (iPad landscape, small laptops), these columns overflow the container horizontally, causing a horizontal scroll on the main content area. There's no `overflow-x: auto` wrapper.
**Affected files:** `components/dashboard/dashboard-client.tsx:473,619`
**Fix:** Wrap the list view table in `<div className="overflow-x-auto">` and on smaller screens hide less-important columns (e.g., agent name, AI badge) using `hidden lg:block` on their cells.

### B5. Dark mode toggle has no accessible label — screen readers announce nothing
**Problem:** In `components/app-sidebar.tsx` (line 198-204), the dark mode toggle `<button>` contains only an icon (`<Sun>` or `<Moon>`), with a `title` attribute but no `aria-label`. Screen readers may announce "button" without context. The `title` attribute is not reliably announced by all screen readers.
**Affected files:** `components/app-sidebar.tsx:198-204`
**Fix:** Add `aria-label={theme === 'dark' ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}` to the toggle button. Also add `role="switch"` and `aria-checked={theme === 'dark'}`.

### B6. Type filter pills have no `aria-pressed` state — keyboard/screen reader users can't tell what's active
**Problem:** The property type filter pills (apartment/house/villa etc.) in `dashboard-client.tsx` and contact type filters in `contacts-client.tsx` are `<button>` elements styled as toggled pills, but have no `aria-pressed` attribute. Screen reader users cannot tell which filters are active.
**Affected files:** `components/dashboard/dashboard-client.tsx:346-354`, `components/contacts/contacts-client.tsx`
**Fix:** Add `aria-pressed={activeTypes.has(key)}` to each filter pill `<button>`.

### B7. Card view listing cards have no min-height — cards with short addresses look unbalanced
**Problem:** `ListingCard` in `dashboard-client.tsx` has a fixed `h-44` image area but the text content below varies wildly by address/city length. Cards without photos or with one-line addresses look dramatically shorter than cards with two-line addresses, making the grid look uneven.
**Affected files:** `components/dashboard/dashboard-client.tsx:521-612`
**Fix:** Add `min-h-[280px]` to the card outer container `<div>` and `flex flex-col` + `flex-1` to the content area to ensure uniform card height in the grid.

### B8. Empty state "no filter results" lacks animated icon and is visually sparse
**Problem:** When filters return no results (line 453-460 in `dashboard-client.tsx`), the empty state shows a plain `<Search>` icon with muted text and a text "clear" link. Compare this to the "no listings" empty state which has a full gradient icon, rich typography, and a CTA button. The filtered-empty state feels like an afterthought.
**Affected files:** `components/dashboard/dashboard-client.tsx:453-460`
**Fix:** Give the filtered-empty state a full-height rounded container with a subtle background pattern, a larger animated search icon, and a styled "Rimuovi filtri" button (same style as the "Aggiungi annuncio" CTA) instead of a plain underlined text link.

### B9. Sidebar Ctrl+K shortcut label — shows "Ctrl+K" on all platforms including macOS
**Problem:** `components/app-sidebar.tsx` (line 131) always shows `<kbd>Ctrl+K</kbd>`. On macOS the shortcut is `⌘K` and Ctrl+K does something different (line kill). The label is misleading for Mac users.
**Affected files:** `components/app-sidebar.tsx:130-131`
**Fix:** Detect platform via `navigator.platform` or `navigator.userAgent` and render `⌘K` on macOS, `Ctrl+K` on Windows/Linux. Since this is a client component, use a `useEffect` + `useState` to hydrate the correct label after mount.

### B10. Listing card hover effect applied at two levels — double transition causes jitter
**Problem:** `ListingCard` applies `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200` on the `<Link>` wrapper AND `card-lift` (which likely adds another shadow/transform) on the inner `<div>`. This double-layer transition causes visual jitter as both elements animate simultaneously.
**Affected files:** `components/dashboard/dashboard-client.tsx:521-522`
**Fix:** Remove the hover utilities from the `<Link>` wrapper and keep only `card-lift` on the inner card div, or vice versa. One source of truth for the hover effect.

---

## Implementation Notes

All changes should be backward-compatible and not require DB migrations.
Priority: A2 (false stats), A3 (broken CSV), A4 (waterfall), B1 (fake data), B2 (logo), B3 (wrong title), B4 (table overflow).
