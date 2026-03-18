# REDESIGN PROMPT - Sprint G (Round 5)

> 13 concrete, actionable improvements identified from a full code review of the CasaAI app.
> Each item targets a real bug, UX gap, or inconsistency found in the current codebase.

---

## 1. Proposal detail page action buttons are non-functional (dead links)

**File(s):** `web/app/(app)/proposte/[id]/page.tsx`

**Problem:** The "Segna come accettata" and "Segna come rifiutata" buttons on the proposal detail page (lines 217-230) are broken. They render as `<Link href="#">` elements wrapped in a `<form>` with a POST action, but the links point to `#` and have `data-action` attributes that nothing reads. There is no JavaScript handler, no form submission logic, and no `name`/`value` on the buttons. Clicking them does nothing. The `<form>` wraps only one button but not the other. The working implementation already exists in `ProposalList` (the `handleRespond` function) but was not ported to the detail page.

**Fix:** Convert the detail page's "Azioni" section into a client component (or extract a `<ProposalDetailActions>` client component). Wire the buttons to call `fetch('/api/proposals/${id}/respond', { method: 'POST', body: JSON.stringify({ action }) })` and then use `router.refresh()` to update the page. Remove the dead `<form>` and `<Link href="#">` pattern entirely. Example:

```tsx
// components/proposals/proposal-detail-actions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProposalDetailActions({ proposalId }: { proposalId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRespond(action: 'accettata' | 'rifiutata') {
    if (!confirm(`Vuoi segnare questa proposta come "${action}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Errore')
      toast.success(action === 'accettata' ? 'Proposta accettata!' : 'Proposta rifiutata')
      router.refresh()
    } catch {
      toast.error("Errore nell'aggiornamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Azioni</h2>
      <Button variant="outline" size="sm" className="w-full justify-start text-green-600" onClick={() => handleRespond('accettata')} disabled={loading}>
        <CheckCircle className="h-4 w-4 mr-2" /> Segna come accettata
      </Button>
      <Button variant="outline" size="sm" className="w-full justify-start text-red-600" onClick={() => handleRespond('rifiutata')} disabled={loading}>
        <XCircle className="h-4 w-4 mr-2" /> Segna come rifiutata
      </Button>
    </div>
  )
}
```

---

## 2. Missing invoice detail page (contabilita/[id])

**File(s):** `web/app/(app)/contabilita/[id]/page.tsx` (does not exist)

**Problem:** The invoice list has a `<Link href={/contabilita/${inv.id}}>` on every row (the `<ChevronRight>` button), but no `contabilita/[id]/page.tsx` exists. Clicking any invoice row navigates to a 404. The proposal module has a proper detail page (`proposte/[id]/page.tsx`) but contabilita was never given one.

**Fix:** Create `web/app/(app)/contabilita/[id]/page.tsx` mirroring the structure of the proposal detail page. It should:
- Fetch the invoice by id + workspace_id
- Display all invoice fields in a read-only layout: intestazione, dati cliente, voci, totali, regime fiscale info, metodo di pagamento
- Include action buttons: Download PDF, Segna come pagata, Invia via email, Modifica (link to an edit page)
- Add a back link to `/contabilita`
- Reuse `InvoiceStatusBadge` and `formatCurrency` from existing components

---

## 3. Contabilita and Proposte pages missing header icon consistency with sidebar

**File(s):** `web/app/(app)/contabilita/page.tsx`, `web/app/(app)/proposte/page.tsx`, `web/app/(app)/listing/page.tsx`

**Problem:** The contabilita and proposte pages use the new "warm futurism" header pattern (gradient icon box + title + subtitle), but the listing history page (`listing/page.tsx`) uses an older, simpler pattern with no icon, no gradient, and different spacing (`max-w-5xl mx-auto` vs `flex-1 px-4 py-6 sm:px-6 lg:px-8`). The listing page header uses `font-extrabold` while contabilita/proposte use `font-bold`. These inconsistencies make the app feel unfinished.

**Fix:** Update `listing/page.tsx` to use the same header pattern as contabilita/proposte:
- Wrap in `<div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">` instead of `max-w-5xl mx-auto`
- Add the gradient icon box with `<FileText>` icon
- Change `font-extrabold` to `font-bold` for consistency
- Add a subtitle like "Tutti gli annunci del workspace"

---

## 4. Proposal and invoice list action buttons invisible on mobile (hover-only)

**File(s):** `web/components/proposals/proposal-list.tsx`, `web/components/contabilita/invoice-list-client.tsx`

**Problem:** Both list components hide action buttons behind `opacity-0 group-hover:opacity-100` (lines 181 and 192 respectively). On mobile/touch devices there is no hover state, so users can never access PDF download, accept/reject, delete, or the detail page link. The `<ChevronRight>` link to the detail page is also hidden behind hover, meaning mobile users have no way to navigate to individual items at all.

**Fix:** Two changes needed:
1. Make the entire row clickable as a link to the detail page (wrap in `<Link>` or add `onClick` with `router.push`)
2. Change the action button visibility to always-visible on mobile:
```tsx
// Replace:
className="... opacity-0 group-hover:opacity-100 transition-opacity"
// With:
className="... opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
```
This ensures actions are always visible on mobile but appear on hover on desktop.

---

## 5. Proposte summary stats hidden when there are zero proposals

**File(s):** `web/app/(app)/proposte/page.tsx`

**Problem:** The summary stats (Totali / In corso / Accettate) are wrapped in `{total > 0 && (...)}` (line 70). When a user has proposals but they are all in a terminal state (e.g., all rifiutata/scaduta), the stats still show. But when the user has zero proposals, they see no stats at all -- jumping straight to the empty state. This is fine. However, the contabilita page always shows `InvoiceSummaryCards` even with zeros, creating an inconsistency between the two sibling features.

**Fix:** Make both pages consistent. Either:
- (A) Always show summary stats (even with zeros) on both pages, so the page layout is predictable, OR
- (B) Hide stats on both pages when empty.

Recommendation: option (A) -- always show the stats. They provide context even at zero, and the empty state below gives the CTA. Update proposte to remove the `{total > 0 &&` guard.

---

## 6. Native `<select>` elements instead of shadcn Select in forms

**File(s):** `web/components/proposals/proposal-form.tsx`, `web/components/contabilita/invoice-form.tsx`

**Problem:** Both forms use raw `<select>` HTML elements with custom styling (e.g., lines 201-211 in proposal-form.tsx). These native selects look different across browsers, don't match the shadcn/ui design system, have no search/filter capability, and look especially bad on mobile Safari. The app already imports and uses shadcn/ui components (`Button`, `Input`, `Label`) but skips `Select` for dropdowns.

**Fix:** Replace all native `<select>` elements with the shadcn/ui `<Select>` component (or `<Combobox>` from Base UI for searchable dropdowns like the contact/listing pickers). For the contact and listing selects in particular, a searchable combobox would greatly improve UX since users may have 200+ contacts:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select value={selectedListingId} onValueChange={handleListingChange}>
  <SelectTrigger>
    <SelectValue placeholder="Seleziona immobile" />
  </SelectTrigger>
  <SelectContent>
    {listings.map(l => (
      <SelectItem key={l.id} value={l.id}>
        {l.address}, {l.city}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 7. Dashboard page fetches up to 500 listings as a client prop

**File(s):** `web/app/(app)/dashboard/page.tsx`, `web/components/dashboard/dashboard-client.tsx`

**Problem:** The dashboard server component fetches up to 500 listings (line 29: `.limit(500)`) and passes them all as serialized props to `DashboardClient`. For agencies with hundreds of listings, this means a large JSON payload is embedded in the server-rendered HTML and then hydrated on the client. This hurts initial page load, time-to-interactive, and memory usage. The listing history page sensibly uses `.limit(50)`.

**Fix:**
1. Reduce the dashboard limit to a reasonable number (e.g., 50 most recent listings for the grid view)
2. Add server-side pagination or "load more" functionality for the full listing view
3. Compute the stats (`listings.length`, `aiContent` count) via a database count query instead of fetching all rows and counting in JS:
```tsx
const [{ count: listingsCount }, { count: aiContentCount }] = await Promise.all([
  admin.from('listings').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
  admin.from('listings').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).not('generated_content', 'is', null),
])
```

---

## 8. Settings page tab navigation uses full page reload via `<Link>`

**File(s):** `web/app/(app)/settings/page.tsx`

**Problem:** The settings page tabs are implemented as `<Link href="/settings?tab=team">` elements (lines 111-123). Each tab click triggers a full server-side page load because these are Next.js `<Link>` components that navigate to a new URL. This causes a visible flash/reload when switching between Generale/Team/Integrazioni/Fatturazione. The settings page fetches a lot of data (profile, connections, group, members, usage) on every tab switch, even though most of that data is only needed for one tab.

**Fix:** Convert the settings page to use client-side tabs:
1. Extract the tab content into a `<SettingsClient>` component that uses `useState` for tab switching
2. Pass all needed data from the server component once
3. Use a tab component (e.g., shadcn `<Tabs>`) for instant switching without page reload
4. Alternatively, if you want to keep URL-based tabs, at minimum add `prefetch` and use `useSearchParams` on the client to avoid full re-renders

---

## 9. Contabilita empty state shows inside `InvoiceListClient` but summary cards still render with zeros

**File(s):** `web/app/(app)/contabilita/page.tsx`, `web/components/contabilita/invoice-list-client.tsx`

**Problem:** When there are no invoices, the page shows `InvoiceSummaryCards` with all-zero values (fatturato=0, inAttesa=0, scadute=0) above the empty state illustration in `InvoiceListClient`. The zero-value summary cards add visual noise and push the empty state further down the page. The listing page handles this better by having a single, centered empty state.

**Fix:** Conditionally render the summary cards only when invoices exist:
```tsx
{invoices.length > 0 && (
  <InvoiceSummaryCards fatturato={fatturato} inAttesa={inAttesa} scadute={scadute} />
)}
```
This matches the proposte page pattern and gives new users a cleaner first-run experience.

---

## 10. No "Edit" action for proposals or invoices from the list view

**File(s):** `web/components/proposals/proposal-list.tsx`, `web/components/contabilita/invoice-list-client.tsx`

**Problem:** Draft proposals and invoices can only be deleted from the list view, not edited. There is no edit button or link. The proposal form supports `mode: 'edit'` and the invoice form supports `mode: 'edit'`, but there is no `proposte/[id]/edit/page.tsx` or `contabilita/[id]/edit/page.tsx` to navigate to. Users must delete a draft and recreate it from scratch if they want to change anything.

**Fix:**
1. Create `web/app/(app)/proposte/[id]/modifica/page.tsx` that fetches the proposal data and renders `<ProposalForm mode="edit" initialData={...} proposalId={id} />`
2. Create `web/app/(app)/contabilita/[id]/modifica/page.tsx` similarly for invoices
3. Add an edit button to draft items in both list views:
```tsx
{p.status === 'bozza' && (
  <Link
    href={`/proposte/${p.id}/modifica`}
    title="Modifica bozza"
    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
  >
    <Pencil className="h-4 w-4" />
  </Link>
)}
```

---

## 11. Dark mode: listing page type badge colors hardcoded for light mode only

**File(s):** `web/components/dashboard/dashboard-client.tsx`

**Problem:** The `TYPE_COLORS` map (lines 16-24) uses light-mode-only colors like `bg-blue-50 text-blue-700 border-blue-100`. In dark mode, `bg-blue-50` renders as a bright near-white background with dark blue text, creating poor contrast and a jarring appearance. The same issue exists for `TYPE_ACTIVE` (lines 26-34) which at least uses solid colors. The proposal status badge and invoice status badge components likely handle dark mode correctly, but the property type badges do not.

**Fix:** Add dark mode variants to every color in `TYPE_COLORS`:
```tsx
const TYPE_COLORS: Record<string, string> = {
  apartment: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  house: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  villa: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  commercial: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  land: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  garage: 'bg-muted text-muted-foreground border-border',
  other: 'bg-muted text-muted-foreground border-border',
}
```

---

## 12. Listing history page uses `user!.id` without null guard (will crash if auth fails)

**File(s):** `web/app/(app)/listing/page.tsx`, `web/app/(app)/contacts/page.tsx`

**Problem:** The listing page (line 43) and contacts page (line 28) use `user!.id` with the non-null assertion operator instead of checking for null and redirecting. The dashboard page and calendar page correctly check `if (!user) redirect('/login')` before using `user.id`. If the session expires or auth fails, the listing and contacts pages will throw a runtime error instead of redirecting to login.

**Fix:** Add the null guard before using `user`:
```tsx
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```
Then use `user.id` without the `!` operator. Apply this consistently to all pages that currently use `user!.id`.

---

## 13. Sidebar CasaAI logo gradient text invisible in dark mode

**File(s):** `web/components/app-sidebar.tsx`

**Problem:** The "CasaAI" text in the sidebar header (lines 114-118) uses an inline `background` style with `linear-gradient(135deg, oklch(0.30 0.12 33), oklch(0.57 0.20 33), oklch(0.45 0.15 20))`. These are all relatively dark OKLCH values designed for light backgrounds. On a dark sidebar background, the gradient text becomes nearly invisible because the darkest value `oklch(0.30 ...)` is close to black. The `-webkit-background-clip: text` technique requires the gradient colors to contrast with the background.

**Fix:** Use CSS custom properties or a conditional class for the gradient:
```tsx
<p
  className="text-sm font-extrabold leading-tight tracking-tight bg-clip-text text-transparent"
  style={{
    backgroundImage: theme === 'dark'
      ? 'linear-gradient(135deg, oklch(0.80 0.12 33), oklch(0.73 0.18 36), oklch(0.85 0.10 55))'
      : 'linear-gradient(135deg, oklch(0.30 0.12 33), oklch(0.57 0.20 33), oklch(0.45 0.15 20))',
  }}
>
  CasaAI
</p>
```
Alternatively, define these as CSS custom properties in `:root` / `.dark` in `globals.css` so the gradient adapts automatically.

---

## Priority Order

| Priority | Item | Severity | Effort |
|----------|------|----------|--------|
| P0 | #1 - Broken proposal detail action buttons | Bug | Small |
| P0 | #12 - Missing auth null guards | Bug | Tiny |
| P0 | #2 - Missing invoice detail page (404) | Feature gap | Medium |
| P1 | #4 - Actions invisible on mobile (hover-only) | UX | Small |
| P1 | #10 - No edit flow for draft proposals/invoices | Feature gap | Medium |
| P1 | #11 - Dark mode broken for property type badges | Visual bug | Small |
| P1 | #13 - Dark mode logo gradient invisible | Visual bug | Small |
| P2 | #3 - Inconsistent page header patterns | Visual | Small |
| P2 | #7 - Dashboard over-fetching 500 listings | Performance | Medium |
| P2 | #6 - Native selects instead of shadcn Select | UX/Polish | Medium |
| P2 | #8 - Settings tabs cause full page reload | UX | Medium |
| P3 | #5 - Inconsistent empty-state stats display | Polish | Tiny |
| P3 | #9 - Zero-value summary cards above empty state | Polish | Tiny |
