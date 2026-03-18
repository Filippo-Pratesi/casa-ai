# UX REDESIGN PROMPT - 3
## CasaAI — 20 Actionable Improvements (Round 2 Audit)
### Generated from Opus 4.6 Site Audit

---

## 1. Dashboard: Stat Cards Layout Fix
**Page/Component:** `/dashboard` — `DashboardClient` (`components/dashboard/dashboard-client.tsx`)
**Problem:** Three stat cards display on row 1, a fourth sits orphaned on row 2 at half width. Asymmetric and broken.
**Fix:** Change stat cards container to `grid grid-cols-2 lg:grid-cols-4 gap-4` so all 4 cards sit in a single row. Each card: `min-h-[120px]`.

---

## 2. Dashboard: Listing Placeholder Cards Look Cheap
**Page/Component:** `/dashboard` — listing card grid in `DashboardClient`
**Problem:** 7 of 10 listings show a large, pale house icon on a washed-out salmon background. Monotonous, low-quality.
**Fix:** Replace the large icon placeholder with a modern blurred gradient background (type-specific colors). Reduce icon size to `h-6 w-6` and position it as a small badge in the corner. Property type label should be a small `Badge` in top-left, not centered all-caps text.

---

## 3. Dashboard: "AI POWERED" Badge Looks Like a 2018 Feature Flag
**Page/Component:** `/dashboard` — page header
**Problem:** Green "AI POWERED" pill clashes with the coral/warm palette and looks generic.
**Fix:** Replace with an animated gradient badge using coral-to-gold gradient (`from-[oklch(0.57_0.20_33)] to-[oklch(0.76_0.14_75)]`). Add CSS shimmer animation. Use white text. Make it smaller (`text-[10px] tracking-widest uppercase`).

---

## 4. Listing Detail: Price Banner is an Overwhelming Red Block
**Page/Component:** `/listing/[id]` — price section (~line 210 in `app/(app)/listing/[id]/page.tsx`)
**Problem:** Full-width heavy coral-to-dark-red gradient block. Most visually dominant element on the page. Aggressive and dated.
**Fix:** Reduce visual weight. Change from full solid gradient to a bordered card with coral-colored price text. Replace `bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)] px-6 py-5 text-white` with `border-2 border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33/0.06)] px-6 py-4`. Price text: `text-[oklch(0.57_0.20_33)] text-3xl font-bold`. "PREZZO" label: `text-muted-foreground text-xs uppercase tracking-wider`.

---

## 5. Listing Detail: Action Bar Lacks Visual Grouping
**Page/Component:** `/listing/[id]` — top action bar (lines ~168-185)
**Problem:** All action buttons (Brochure, XML, Condividi, Modifica, Venduto, Elimina) share the same visual weight. Destructive action too close to primary actions.
**Fix:** Group into clusters with `Separator orientation="vertical" className="h-6"` between groups:
- Navigation: back arrow
- Export: Brochure PDF + Export XML (`variant="outline" size="sm"`)
- Primary: Condividi + Modifica (`variant="outline"`)
- Status: Venduto (`variant="default"` green)
- Danger: Elimina (`variant="ghost" className="text-destructive"`) — right-aligned, separated by a divider

---

## 6. Calendar: Weekly View Vertically Compressed
**Page/Component:** `/calendar` — `CalendarClient` (`components/calendar/calendar-client.tsx`)
**Problem:** Calendar grid only uses ~40% of viewport height. Events show truncated text ("Visita immobi...").
**Fix:** Set calendar grid to `min-h-[calc(100vh-220px)]`. Each day column: `min-h-[300px]`. Event chips: `whitespace-normal`, `line-clamp-2`, `min-h-[40px] p-2`. Add tooltip on hover showing full event details.

---

## 7. Calendar: Right Sidebar is Underutilized
**Page/Component:** `/calendar` — right sidebar detail panel
**Problem:** Daily detail panel takes significant space but shows sparse content.
**Fix:** On `xl+` screens, show full appointment list in sidebar with time, client name, property address, and quick-action row (call, WhatsApp, reschedule). Add "Aggiungi appuntamento" button at bottom. Use `grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6` for layout.

---

## 8. Contacts: Cards Lack Visual Type Hierarchy
**Page/Component:** `/contacts` — `ContactsClient` (`components/contacts/contacts-client.tsx`)
**Problem:** All contact cards have identical white backgrounds. Hard to scan buyer vs. seller vs. renter at a glance.
**Fix:** Add a 4px left border color-coded by type:
- Acquirente: `border-l-4 border-l-blue-500`
- Venditore: `border-l-4 border-l-green-500`
- Affittuario: `border-l-4 border-l-amber-500`
- Proprietario: `border-l-4 border-l-purple-500`

---

## 9. Contacts: WhatsApp/Email Icons Are Tiny and Look Like Status Indicators
**Page/Component:** `/contacts` — contact card action buttons
**Problem:** ~20x20px colored circles look like status dots, not action buttons. Easy to miss.
**Fix:** Replace with `Button variant="ghost" size="sm"` with icon + text label. Green `bg-green-50` hover for WhatsApp, muted hover for email. Stack vertically in card footer area.

---

## 10. Contact Detail: Missing Hero Card / Visual Profile
**Page/Component:** `/contacts/[id]`
**Problem:** Page immediately dumps into phone/email/address as plain text lines. Feels like a database record.
**Fix:** Create a hero card at top: large avatar (64px, gradient by contact type), name in `text-2xl font-bold`, type badge, added date. Phone/email/address in a bordered card with inline action buttons (call, WhatsApp, email, copy). `flex items-center gap-6` with avatar left, info right.

---

## 11. Campaigns: Empty State Needs Guidance
**Page/Component:** `/campaigns` — `app/(app)/campaigns/page.tsx`
**Problem:** Near-empty page with one draft campaign. No explanation of what campaigns do. Feels incomplete.
**Fix:** Add header stats bar: Total campaigns, Sent, Draft, Open rate. When campaigns list is empty or very small: centered illustration (Lucide `Mail` icon at 48px with dotted circle background), headline "Raggiungi i tuoi clienti", subheading, CTA button. Existing campaign cards should show: subject, recipient count, status badge, date, open/click metrics.

---

## 12. Notifications: No Read/Unread Distinction, No Actions
**Page/Component:** `/notifications`
**Problem:** No visual distinction between read/unread notifications. No "Mark all read" button. No clickable links to relevant entities.
**Fix:** For unread: `bg-[oklch(0.57_0.20_33/0.05)] border-l-4 border-l-[oklch(0.57_0.20_33)]`. For read: `bg-transparent opacity-70`. Add "Segna tutto come letto" button in header. Each notification links to relevant entity. Relative timestamps ("2 ore fa"). Type icon on left (todo, listing, calendar).

---

## 13. Settings: Long Single-Column, No Section Navigation
**Page/Component:** `/settings` — `app/(app)/settings/page.tsx`
**Problem:** All settings stacked in one long scrolling page. Users must scroll extensively to find sections.
**Fix:** Add horizontal tab bar using shadcn `Tabs`:
- "Generale" tab: Agency name + default tone
- "Team" tab: Team management + invite
- "Integrazioni" tab: Social accounts + Google Calendar + import/export
- "Fatturazione" tab: Usage meters + plan link

---

## 14. Plans/Billing: No Visual Differentiation of Active Plan
**Page/Component:** `/plans` — `app/(app)/plans/page.tsx`
**Problem:** All plan cards look identical. Active plan ("Piano attuale" button) not clearly distinguished. Features all show identical green checkmarks.
**Fix:** Active plan: `ring-2 ring-[oklch(0.57_0.20_33)] ring-offset-2`. Add "Piano attuale" badge at top (`Badge` with coral background). Higher-tier exclusive features: brighter checkmark + `font-medium` text. Features unavailable in lower tiers: `text-muted-foreground line-through` + lock icon. Annual toggle: show "Risparmi 2 mesi".

---

## 15. 404 Page: Raw Next.js Default, Completely Unbranded
**Page/Component:** `app/not-found.tsx` — needs creating
**Problem:** Invalid routes show the default Next.js black 404 page. Jarring against the warm coral theme.
**Fix:** Create `app/not-found.tsx` with app sidebar layout, centered Lucide `Home` icon with question mark overlay, "Pagina non trovata" heading, subtitle, and `Button` linking back to `/dashboard`. Use app warm background and coral accents.

---

## 16. To Do: Task Priority Has No Visual Urgency
**Page/Component:** `/todos` — `TodosClient` (`components/todos/todos-client.tsx`)
**Problem:** High-priority tasks look identical to low-priority ones. The red checkbox circle and red priority badge use the same color, causing confusion.
**Fix:**
- High priority: `border-l-4 border-l-red-500 bg-red-50/30` on task card
- Overdue: pulsing red dot animation
- Completion checkbox: use shadcn `Checkbox` component instead of red circle
- "Alta" badge: `bg-red-500 text-white` (filled, not light)
- Due date within 24h: `text-red-600 font-medium`

---

## 17. Listing Detail: Photo Gallery Has No Lightbox
**Page/Component:** `/listing/[id]` — `PhotoGallery` (`components/listing/photo-gallery.tsx`)
**Problem:** No full-screen expand for photos. No photo count indicator. No navigation between multiple photos. Critical for real estate.
**Fix:** Add photo count badge bottom-right of main image ("1/5 foto"). Click opens full-screen `Dialog` lightbox with left/right arrow navigation + close button. Add `cursor-pointer` + hover overlay with `Maximize2` icon. Show up to 4 thumbnails in `grid grid-rows-2 gap-2` with "+N" overlay for extras.

---

## 18. Dashboard: Listing Cards Not Fully Clickable
**Page/Component:** `/dashboard` — listing card grid
**Problem:** Cards have a `Link` wrapper but no hover state on the full card. No cursor change. Cards feel static.
**Fix:** Wrap entire card in `Link` component. Add `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:border-[oklch(0.57_0.20_33/0.3)]`. Full card surface should be clickable.

---

## 19. Sidebar: No Dark Mode Toggle, Language Switcher Disconnected
**Page/Component:** Sidebar — `components/app-sidebar.tsx`
**Problem:** No dark mode toggle despite full dark theme existing. Language switcher is disconnected at the very bottom.
**Fix:** Add dark mode toggle (sun/moon icon) in sidebar footer. Use `useTheme` from `next-themes`. Group dark mode toggle and language switcher in `flex items-center gap-2` row above user profile. Replace flag icon with text "IT / EN" `Button variant="ghost" size="sm"`.

---

## 20. Archive: Flat List with No Summary Stats or Grouping
**Page/Component:** `/archive` — `app/(app)/archive/page.tsx`
**Problem:** All archived listings in a flat unsorted list. No summary stats. No monthly grouping. "Venduto da" links look like error links (red text).
**Fix:** Add summary stats bar: "X immobili venduti / Valore totale: € X.XXX.XXX / Prezzo medio: € XXX.XXX". Group by month with sticky month headers. Change "venduto da" from red text to `Badge variant="outline"` with agent's avatar initials. Add `even:bg-muted/30` for scanability. Add a mini bar chart showing monthly sales trend.

---

## Implementation Notes

- All files are in `C:\Users\User\Desktop\Claude\Claude Code\casa-ai\web\`
- Use Tailwind CSS v4 with existing `oklch` color tokens
- Do NOT add new npm packages
- Read each file before editing it
- The design system uses coral `oklch(0.57_0.20_33)` as primary brand color
- Existing animation classes: `animate-in-1` through `animate-in-8` in `app/globals.css`
- Use shadcn/ui components where available (Button, Badge, Dialog, Tabs, Checkbox, Separator, Tooltip)
- All changes must compile without TypeScript errors
