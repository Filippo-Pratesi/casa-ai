# UX REDESIGN PROMPT - 4
## CasaAI — 20 Actionable Improvements (Round 3 Audit)
### Generated from Opus 4.6 Second-Round Site Audit

---

## 1. Plans Page: Billing Toggle Slider Fix
**File:** `components/plans/plan-checkout.tsx`
**Problem:** Hardcoded `left`/`width` pixel values (`sliderLeft = '138px'`, `sliderWidth = '150px'`) clip the "Annuale" label text.
**Fix:** Remove the absolute-positioned slider approach entirely. Replace with a simpler CSS-only implementation using two `<button>` elements where the active one gets `bg-white shadow-sm rounded-[calc(theme(borderRadius.lg)-2px)] text-foreground` via conditional class, and the container uses `bg-muted rounded-lg p-1 flex`. Animate with `transition-all duration-200`. Remove all hardcoded pixel values.

---

## 2. Calendar: Clickable Empty Day Cells to Create Events
**File:** `components/calendar/calendar-client.tsx`
**Problem:** Clicking empty day columns does nothing. Only "Nuovo" button creates events. Users expect click-to-create on calendar cells.
**Fix:** Add `onClick` handler to each day column empty space that opens the appointment modal pre-filled with that day's date. Add `group` class to day column. Empty space shows `hover:bg-muted/30 cursor-pointer`. Add a `+` icon: `<span className="opacity-0 group-hover:opacity-60 absolute inset-0 flex items-center justify-center text-muted-foreground text-2xl pointer-events-none">+</span>`.

---

## 3. Notifications: Add Date Grouping
**File:** `app/(app)/notifications/page.tsx`
**Problem:** All notifications in a flat list with no date grouping. Impossible to scan when many exist.
**Fix:** Before `.map()`, bucket notifications into groups: "Oggi", "Ieri", "Questa settimana", "Precedenti". Render a sticky `<h3>` header per group:
```
className="sticky top-0 bg-background/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 py-2 z-10"
```

---

## 4. Campaigns: Open Rate Progress Bar on Each Campaign
**File:** `app/(app)/campaigns/page.tsx`
**Problem:** Campaign list shows no per-campaign open rate visualization. The header stat "Tasso apertura" shows "---".
**Fix:** For each campaign row, add an inline mini progress bar next to open rate:
```jsx
<div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
  <div className="h-full bg-green-500 rounded-full" style={{ width: `${openRate ?? 0}%` }} />
</div>
```
When open rate is 0 or null, show "N/A" instead of "---". Add recipient count to each campaign card.

---

## 5. Dashboard: Trend Indicators on Stat Cards
**File:** `components/dashboard/dashboard-client.tsx`
**Problem:** Stat cards show static numbers with no trend context. Users can't tell if numbers are going up or down.
**Fix:** Add a small trend indicator below each number. Compute month-over-month delta (or mock with static positive indicators for now). Show:
```jsx
<span className="text-xs text-green-600 flex items-center gap-0.5 mt-1">
  <TrendingUp className="h-3 w-3" />+12%
</span>
```
Red/down for decreases. Import `TrendingUp`, `TrendingDown` from lucide-react.

---

## 6. Contact Detail: Activity Timeline
**File:** `app/(app)/contacts/[id]/page.tsx`
**Problem:** No history of interactions with this contact. Real estate CRM must show appointments, emails sent, notes added.
**Fix:** Add "Attività recente" section below documents. Query `appointments` table filtered by `contact_id`. Render as vertical timeline:
```jsx
<div className="border-l-2 border-border pl-4 space-y-4 relative">
  {appointments.map(appt => (
    <div key={appt.id} className="relative">
      <div className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-2 border-background bg-blue-500" />
      <p className="text-sm font-medium">{appt.title}</p>
      <p className="text-xs text-muted-foreground">{formatDate(appt.starts_at)}</p>
    </div>
  ))}
</div>
```

---

## 7. Listing Detail: Stale Price Warning in AI Content
**File:** `app/(app)/listing/[id]/page.tsx` and `components/listing/output-tabs.tsx`
**Problem:** AI-generated description may reference an old price after price updates. Users don't notice the stale data.
**Fix:** In the listing detail server component, check if `priceHistory.length > 0` (meaning the price was changed after content was generated). If so, show a warning banner above the output tabs:
```jsx
{priceHistory.length > 0 && listing.generated_content && (
  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
    <AlertTriangle className="h-4 w-4 shrink-0" />
    Il prezzo è cambiato dal momento della generazione. Considera di rigenerare il contenuto.
    <GenerateContentButton listingId={listing.id} variant="link" className="ml-auto text-amber-800 underline text-xs" />
  </div>
)}
```
Import `AlertTriangle` from lucide-react.

---

## 8. Todos: Filter and Sort Controls
**File:** `components/todos/todos-client.tsx`
**Problem:** No filter by priority, assignee, or due date. No sort options. Becomes unusable at scale.
**Fix:** Add a filter bar between the header and todo list:
```jsx
<div className="flex items-center gap-2 flex-wrap">
  {/* Priority filter */}
  {['Tutte', 'Alta', 'Media', 'Bassa'].map(p => (
    <button key={p} onClick={() => setPriorityFilter(p)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
        priorityFilter === p ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:bg-muted'
      }`}>{p}</button>
  ))}
  {/* Sort dropdown */}
  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
    className="ml-auto rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
    <option value="dueDate">Per scadenza</option>
    <option value="priority">Per priorità</option>
    <option value="createdAt">Per data creazione</option>
  </select>
</div>
```
Add `useState` for `priorityFilter` and `sortBy`. Apply filter/sort before rendering.

---

## 9. Dashboard List View: Add Agent Column + Hover Actions
**File:** `components/dashboard/dashboard-client.tsx`
**Problem:** List view table missing agent column. No quick-action buttons on row hover.
**Fix:**
1. Add "AGENTE" column header between "AI" and "DATA" columns
2. In each row, show agent name (fetched from listing data or workspace members map)
3. Add hover-revealed action bar at row end:
```jsx
<td className="w-0">
  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity pr-2">
    <button title="Modifica"><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
    <button title="Condividi"><Share2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
  </div>
</td>
```
Add `group` class to the `<tr>` element.

---

## 10. Contact Cards: Consistent Card Heights
**File:** `components/contacts/contacts-client.tsx`
**Problem:** Cards have varying heights because some contacts have location/budget data and others don't. Grid looks ragged.
**Fix:** Add `min-h-[220px] flex flex-col` to contact card container. Bottom metadata area: `mt-auto`. When location/budget missing, show placeholder:
```jsx
{!c.budget_max && !c.preferred_cities?.length && (
  <p className="text-xs text-muted-foreground/40 italic">Nessuna preferenza impostata</p>
)}
```

---

## 11. Settings Integrations: Visual Status Indicators
**File:** `components/settings/social-connections.tsx` (or wherever Instagram/Facebook connection UI lives)
**Problem:** Connected vs. disconnected integration cards look identical. No status dot.
**Fix:** For disconnected state: grey dot `<span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block mr-1.5" />` next to "Non connesso".
For connected state: pulsing green dot `<span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-1.5" />` next to page name. Change button from "Connetti" → "Disconnetti" (`variant="outline"` with `text-red-600 hover:bg-red-50`) when connected.

---

## 12. Archive: CSS-Only Bar Chart for Monthly Sales
**File:** `app/(app)/archive/page.tsx`
**Problem:** Stats are shown as numbers only. No visualization of sales trend over time.
**Fix:** After the 3 stat cards, add a monthly sales chart using pure CSS/SVG. Group archived listings by month, compute counts, render:
```jsx
<div className="rounded-xl border border-border bg-card p-4">
  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Vendite mensili</p>
  <div className="flex items-end gap-2 h-24">
    {monthlyData.map(({ month, count, maxCount }) => (
      <div key={month} className="flex flex-col items-center flex-1 gap-1">
        <span className="text-[10px] text-muted-foreground">{count}</span>
        <div className="w-full rounded-t-md bg-[oklch(0.57_0.20_33)]"
          style={{ height: `${(count / maxCount) * 80}px` }} />
        <span className="text-[10px] text-muted-foreground">{month}</span>
      </div>
    ))}
  </div>
</div>
```

---

## 13. Breadcrumb: Translate Raw Route Slugs to Italian Labels
**File:** `components/app-header.tsx`
**Problem:** Breadcrumb shows raw English route names ("calendar", "campaigns", "notifications", etc.) instead of translated Italian labels.
**Fix:** Add a `ROUTE_LABELS` map in the header component:
```typescript
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  listings: 'Annunci',
  contacts: 'Clienti',
  calendar: 'Calendario',
  campaigns: 'Campagne',
  notifications: 'Notifiche',
  plans: 'Piano',
  todos: 'To Do',
  archive: 'Archivio',
  mls: 'MLS',
  settings: 'Impostazioni',
  admin: 'Team',
  listing: 'Annuncio',
  edit: 'Modifica',
}
```
Apply this map when generating breadcrumb segment labels: `ROUTE_LABELS[segment] ?? segment`.

---

## 14. Contact Detail: Button Hierarchy Fix
**File:** `app/(app)/contacts/[id]/page.tsx`
**Problem:** "Modifica" and "Elimina" buttons have equal visual weight. Destructive action should be de-emphasized.
**Fix:**
- "Modifica" → primary style: `className="rounded-xl bg-[oklch(0.57_0.20_33)] text-white px-4 py-2 text-sm font-semibold hover:bg-[oklch(0.52_0.20_33)] transition-colors"`
- "Elimina" → ghost destructive: `className="rounded-xl text-sm font-medium text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 px-3 py-2 transition-colors inline-flex items-center gap-1.5"`

---

## 15. Dashboard: Fix "App. imminenti" Query to Only Count Future Appointments
**File:** `app/(app)/dashboard/page.tsx`
**Problem:** "App. imminenti" shows 40 which counts all appointments (past + future). Should only show upcoming.
**Fix:** In the dashboard server component, find the appointments count query and add a date filter:
```typescript
const { count: appointmentsCount } = await admin
  .from('appointments')
  .select('*', { count: 'exact', head: true })
  .eq('workspace_id', profile.workspace_id)
  .gte('starts_at', new Date().toISOString())  // ADD THIS LINE
  .neq('status', 'cancelled')
```
Also add subtitle to the stat card: `<p className="text-xs text-muted-foreground mt-0.5">Prossimi 30 giorni</p>`.

---

## 16. MLS Toggle: Proper Tooltip Component
**File:** `components/listing/mls-toggle.tsx`
**Problem:** The info `(i)` icon next to the MLS toggle has a `title` attribute that only works as a native browser tooltip. No custom styled tooltip exists.
**Fix:** Create a simple CSS tooltip wrapper component or use a Radix/shadcn `Tooltip`:
```jsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <p>Attiva per condividere questo annuncio con le altre agenzie del tuo gruppo nella rete MLS. L'annuncio sarà visibile nella sezione MLS delle altre filiali.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 17. Global: Add Command Palette (Cmd+K / Ctrl+K)
**File:** New file `components/shared/command-palette.tsx`, update `components/app-sidebar.tsx`
**Problem:** No keyboard shortcut system. 2026 premium SaaS must have a command palette for power users.
**Fix:** Create a command palette component:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { Search, LayoutDashboard, Users, Calendar, Mail, Archive, CheckSquare } from 'lucide-react'

const COMMANDS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clienti', href: '/contacts', icon: Users },
  { label: 'Calendario', href: '/calendar', icon: Calendar },
  { label: 'Campagne', href: '/campaigns', icon: Mail },
  { label: 'Archivio', href: '/archive', icon: Archive },
  { label: 'To Do', href: '/todos', icon: CheckSquare },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-md">
        <div className="flex items-center border-b border-border px-4 py-3 gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cerca pagine o azioni..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="py-2 max-h-[320px] overflow-y-auto">
          {filtered.map(cmd => (
            <button key={cmd.href} onClick={() => { router.push(cmd.href); setOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <cmd.icon className="h-4 w-4 text-muted-foreground" />
              {cmd.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```
Import and render `<CommandPalette />` in the root layout or sidebar. Add `⌘K` hint in sidebar: `<kbd className="ml-auto text-[10px] font-mono text-muted-foreground/40 border border-border/50 rounded px-1 py-0.5">⌘K</kbd>` next to a search icon.

---

## 18. Listing Detail: Photo Gallery Keyboard Navigation
**File:** `components/listing/photo-gallery.tsx`
**Problem:** Photo gallery has no keyboard navigation (ArrowLeft/ArrowRight/Escape) for the lightbox.
**Fix:** Add `useEffect` with keyboard event listener inside the lightbox open state:
```typescript
useEffect(() => {
  if (!lightboxOpen) return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(0, i - 1))
    if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(urls.length - 1, i + 1))
    if (e.key === 'Escape') setLightboxOpen(false)
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [lightboxOpen, urls.length])
```

---

## 19. Sidebar: Add Keyboard Shortcut Hints
**File:** `components/app-sidebar.tsx`
**Problem:** Sidebar nav items have no keyboard shortcut hints. Power users can't discover shortcuts.
**Fix:** Add `<kbd>` tags to primary nav items showing number shortcuts. Add a subtle hint next to main items:
```jsx
{/* After each main nav item label */}
<kbd className="ml-auto hidden lg:flex text-[10px] font-mono text-muted-foreground/30 border border-border/30 rounded px-1">
  {index + 1}
</kbd>
```
Also add a global `useEffect` in the sidebar or layout for number key navigation:
```typescript
// Press 1 → /dashboard, 2 → /contacts, 3 → /calendar, etc.
```

---

## 20. Archive: "Venduto da" Links Styled as Agent Badges
**File:** `app/(app)/archive/page.tsx`
**Problem:** "Venduto da [Agent Name]" appears as red-colored link text that looks like an error state. Agent attribution should be a styled badge.
**Fix:** Wrap agent name in a proper badge:
```jsx
<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs">
  <span className="h-4 w-4 rounded-full bg-[oklch(0.57_0.20_33)] text-white text-[9px] flex items-center justify-center font-bold">
    {agentName[0].toUpperCase()}
  </span>
  {agentName}
</span>
```
Remove the red `text-[oklch(0.57_0.20_33)]` link styling from agent attribution.

---

## Implementation Notes

- All files in `C:\Users\User\Desktop\Claude\Claude Code\casa-ai\web\`
- Tailwind CSS v4, shadcn/ui components already available
- Do NOT add new npm packages
- Read each file before editing
- Coral brand color: `oklch(0.57_0.20_33)`
- Existing animation classes: `animate-in-1` through `animate-in-8`
- The `Tooltip` component from shadcn: check `components/ui/tooltip.tsx` exists
- The `Dialog` component from shadcn: already used in `photo-gallery.tsx`
- For #17 (Command Palette): Create the new file, then import it in the app layout `app/(app)/layout.tsx`
