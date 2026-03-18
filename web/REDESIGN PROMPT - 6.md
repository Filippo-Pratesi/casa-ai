# REDESIGN PROMPT - Sprint H (Round 6)

> 10 new improvements identified from a second deep-dive code review. None of these overlap with the 13 items fixed in Round 5.

---

## 1. No loading.tsx files anywhere — every route blocks on data fetch with no visual feedback

**File(s):** `web/app/(app)/` (all route segments)

**Problem:** There are zero `loading.tsx` files in the entire `(app)` route group. Every page (dashboard, contabilita, proposte, archive, campaigns, settings, todos, contacts, listing) performs multiple Supabase queries in its server component before rendering anything. Users see a blank white screen (or stale content from the previous route) while queries run. This is especially bad on settings (5+ sequential queries), archive (3 parallel queries + agent map), and dashboard (3 queries including a 500-row fetch). Next.js App Router uses `loading.tsx` to show instant feedback via React Suspense boundaries.

**Fix:** Create `loading.tsx` files for the heaviest routes. A shared skeleton component can be reused. At minimum create them for:
1. `web/app/(app)/loading.tsx` — catches all sub-routes with a generic centered spinner
2. `web/app/(app)/dashboard/loading.tsx` — skeleton with stat card placeholders + grid
3. `web/app/(app)/contabilita/loading.tsx` — skeleton with summary cards + list rows
4. `web/app/(app)/proposte/loading.tsx` — same pattern
5. `web/app/(app)/settings/loading.tsx` — skeleton with tab bar + card placeholders

Example shared skeleton:
```tsx
// app/(app)/loading.tsx
export default function Loading() {
  return (
    <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted" />)}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  )
}
```

---

## 2. Duplicate `fmtDate` / `fmtEur` / `fmt` utility functions scattered across 6+ files

**File(s):** `web/app/(app)/proposte/[id]/page.tsx`, `web/app/(app)/contabilita/[id]/page.tsx`, `web/app/(app)/archive/[id]/page.tsx`, `web/components/todos/todos-client.tsx`, `web/app/api/invoices/[id]/pdf/route.tsx`, `web/app/api/proposals/[id]/pdf/route.tsx`

**Problem:** The same date and currency formatting logic is copy-pasted into at least 6 different files with slightly different signatures and names (`fmtDate`, `fmt`, `fmtEur`, `formatEuro`, `formatCurrency`). The proposte detail page defines both `fmtEur` and `fmtDate` inline. The contabilita detail page defines `fmtDate` with the same body. The todos client defines `fmtDate` with a different format (`day: '2-digit', month: 'short'`). The archive detail page defines `fmt`. The invoice-totals-calculator exports `formatCurrency` which works in cents. This makes behavior inconsistent (some show "2-digit" month, others "long") and violates DRY.

**Fix:** Create a shared `lib/format.ts` utility:
```tsx
// lib/format.ts
export function formatDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('it-IT', opts ?? { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export function formatEuro(n: number | null | undefined) {
  if (!n) return '\u20AC 0'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
```
Then replace all inline `fmtDate`/`fmtEur`/`fmt` with imports from `@/lib/format`.

---

## 3. Campaigns and archive badge colors have no dark mode variants

**File(s):** `web/app/(app)/campaigns/page.tsx` (lines 46-49), `web/app/(app)/archive/page.tsx` (lines 265-288, 344-349)

**Problem:** The campaigns page `statusConfig` uses light-mode-only colors: `bg-blue-100 text-blue-700` (sending), `bg-green-100 text-green-700` (sent), `bg-red-100 text-red-700` (failed). In dark mode, `bg-blue-100` renders as a bright near-white box with dark text — extremely jarring. The same issue exists in the archive page where sold badges use `bg-green-50 border-green-200 text-green-700` and bought badges use `bg-blue-50 border-blue-200 text-blue-700` without dark mode variants. The campaigns empty state gradient also uses light-mode-only oklch values (`oklch(0.97 ...)` background) that will appear washed out in dark mode.

**Fix:** Add dark mode variants to all hardcoded badge colors:
```tsx
// campaigns statusConfig
sending: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
sent:    { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
failed:  { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
```
For archive badges, add `dark:bg-green-900/30 dark:border-green-800 dark:text-green-300` to sold badges, and `dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300` to bought badges. For the empty state gradient, wrap it in a `dark:` variant or use CSS custom properties.

---

## 4. Todos priority badge colors are broken in dark mode

**File(s):** `web/components/todos/todos-client.tsx` (lines 36-39, 530, 557, 571-573)

**Problem:** The `PRIORITY_CONFIG` object at line 36 uses light-mode-only bg classes: `bg-red-50 border-red-200`, `bg-amber-50 border-amber-200`, `bg-green-50 border-green-200`. These are used for priority badges, overdue indicators, and the high-priority left-border highlight (line 530: `bg-red-50/30 hover:bg-red-50/50`). In dark mode, `bg-red-50` produces a bright pink-white background that clashes with the dark theme. The `ring-red-200` class also renders as a light ring on dark backgrounds.

**Fix:** Update `PRIORITY_CONFIG` with dark mode variants:
```tsx
const PRIORITY_CONFIG = {
  high:   { ..., ring: 'ring-red-200 dark:ring-red-800',   bg: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' },
  medium: { ..., ring: 'ring-amber-200 dark:ring-amber-800', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800' },
  low:    { ..., ring: 'ring-green-200 dark:ring-green-800', bg: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' },
}
```
Also fix line 530 to: `'border-l-4 border-l-red-500 bg-red-50/30 hover:bg-red-50/50 dark:bg-red-950/30 dark:hover:bg-red-950/50'`.

---

## 5. Settings page still uses `user!.id` without null guard (was only partially fixed in Round 5)

**File(s):** `web/app/(app)/settings/page.tsx` (lines 32, 50, 180), `web/app/(app)/notifications/page.tsx` (line 90), `web/app/(app)/contacts/[id]/page.tsx` (line 84), `web/app/(app)/contacts/[id]/edit/page.tsx` (line 22), `web/app/(app)/contacts/page.tsx` (line 27), `web/app/(app)/listing/[id]/page.tsx` (lines 97, 132)

**Problem:** Round 5 item #12 identified `user!.id` in listing/page.tsx and contacts/page.tsx but the fix was not applied to all files. There are still 9 instances of `user!.id` across 7 files. The settings page is the worst offender with 3 uses and no `if (!user) redirect('/login')` guard at all — it fetches `user` but immediately uses `user!.id` on line 32 without checking for null first.

**Fix:** Add `if (!user) redirect('/login')` after `getUser()` in every file that uses `user!.id`, then replace all `user!.id` with `user.id`. Files to fix: settings/page.tsx, notifications/page.tsx, contacts/[id]/page.tsx, contacts/[id]/edit/page.tsx, contacts/page.tsx, listing/[id]/page.tsx.

---

## 6. Proposal and invoice forms have no step indicator despite being 7-8 sections long

**File(s):** `web/components/proposals/proposal-form.tsx`, `web/components/contabilita/invoice-form.tsx`

**Problem:** The proposal form has 7 sections (Immobile, Proponente, Venditore, Offerta economica, Date e termini, Vincoli, Altre informazioni) spanning ~490 lines. The invoice form has 6 sections (Intestazione, Dati cliente, Immobile collegato, Voci fattura, Regime fiscale, Dati di pagamento) spanning ~575 lines. On mobile, users must scroll through a very long single-column form with no indication of progress or how many sections remain. There is no visual indicator of which section they are currently filling out, and no way to jump between sections.

**Fix:** Add a sticky step indicator at the top of the form that shows the sections as a horizontal progress bar or numbered steps. Example:
```tsx
const SECTIONS = ['Immobile', 'Acquirente', 'Venditore', 'Offerta', 'Date', 'Vincoli', 'Note']

<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 mb-2">
  <div className="flex gap-1">
    {SECTIONS.map((s, i) => (
      <button key={s} onClick={() => sectionRefs[i].current?.scrollIntoView({ behavior: 'smooth' })}
        className="flex-1 text-[10px] font-medium text-center py-1 rounded-md transition-colors
          bg-muted/50 text-muted-foreground hover:bg-muted">
        {s}
      </button>
    ))}
  </div>
</div>
```
Use `useRef` for each section and `IntersectionObserver` to highlight the active section.

---

## 7. Archive page uses `max-w-4xl` while most other pages use `flex-1 px-4 py-6 sm:px-6 lg:px-8`

**File(s):** `web/app/(app)/archive/page.tsx`, `web/app/(app)/campaigns/page.tsx`

**Problem:** The archive page wraps content in `max-w-4xl mx-auto px-4 py-8` (line 154) and the campaigns page uses `max-w-3xl mx-auto` (line 62). Meanwhile, the newer contabilita and proposte pages (and the invoice/proposal detail pages) use `flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8` — the standard "warm futurism" layout pattern. The settings page uses `max-w-2xl mx-auto`. This creates three different max-width containers across the app: `max-w-2xl`, `max-w-3xl`, and `max-w-4xl`, plus the full-width pattern. Content feels narrower or wider depending on which page you visit.

**Fix:** Standardize on one layout approach. The `flex-1 px-4 py-6 sm:px-6 lg:px-8` pattern (used by contabilita/proposte) is the most flexible because it adapts to the sidebar width. Update archive and campaigns to use this pattern. If a max-width is desired for readability, use a consistent value like `max-w-5xl` with the standard padding pattern.

---

## 8. No accessibility attributes on interactive elements in proposal/invoice forms

**File(s):** `web/components/proposals/proposal-form.tsx`, `web/components/contabilita/invoice-form.tsx`, `web/components/todos/todos-client.tsx`

**Problem:** Neither the proposal form nor the invoice form has any `aria-label`, `aria-describedby`, or `role` attributes. Specific issues:
- All native `<select>` elements lack `aria-label` (there are 6 in invoice-form and 3 in proposal-form)
- The native `<input type="checkbox">` elements (ritenuta d'acconto, contributo cassa, caparra in agenzia) have no `aria-label`
- The delete buttons for line items and vincoli use icon-only `<button>` elements with no accessible text — screen readers announce them as empty buttons
- The `<ChevronDown>` icon overlay on custom selects is decorative but not marked with `aria-hidden="true"`
- The todos `QuickDatePicker` preset buttons have no accessible labels beyond their visual text

**Fix:** Add accessibility attributes to all interactive elements:
```tsx
// Delete button
<button type="button" onClick={() => removeVoce(idx)} aria-label="Rimuovi voce">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</button>

// Select with label
<select aria-label="Seleziona regime fiscale" value={regime} ...>

// Decorative icon
<ChevronDown className="..." aria-hidden="true" />

// Checkbox
<input type="checkbox" aria-label="Abilita ritenuta d'acconto" .../>
```

---

## 9. Settings page header inconsistent with rest of app (no icon, uses `font-extrabold`, narrow `max-w-2xl`)

**File(s):** `web/app/(app)/settings/page.tsx` (lines 102-106)

**Problem:** The settings page header uses the old pattern: plain `<h1>` with `text-2xl font-extrabold`, no gradient icon box, wrapped in `max-w-2xl mx-auto`. Compare this to the proposte, contabilita, and archive pages which all have the "warm futurism" header pattern with a gradient icon box, `text-xl font-bold`, and a subtitle. The campaigns page header also uses the older `text-3xl font-extrabold` style without an icon box. This makes settings and campaigns feel like they belong to a different app.

**Fix:** Update the settings header to match the warm futurism pattern:
```tsx
<div className="flex items-center gap-3 animate-in-1">
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
    <Settings className="h-4 w-4 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
  </div>
  <div>
    <h1 className="text-xl font-bold tracking-tight">{t('settings.title')}</h1>
    <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
  </div>
</div>
```
Apply the same fix to the campaigns page header.

---

## 10. `window.confirm()` used for all destructive actions instead of a proper confirmation dialog

**File(s):** `web/components/contabilita/invoice-list-client.tsx`, `web/components/contabilita/invoice-detail-actions.tsx`, `web/components/proposals/proposal-list.tsx`, `web/components/proposals/proposal-detail-actions.tsx`, `web/components/settings/team-management.tsx`

**Problem:** Every destructive action in the app (deleting invoices, deleting proposal drafts, accepting/rejecting proposals, marking invoices as paid, removing team members) uses the browser's native `window.confirm()` dialog. This dialog is unstyled, cannot be themed, looks different across browsers, breaks the app's design language, and is jarring compared to the polished shadcn/ui components used everywhere else. On mobile browsers, the native confirm dialog is especially ugly and can cause layout shifts.

**Fix:** Replace all `confirm()` calls with a shadcn/ui `AlertDialog` component. Create a reusable `ConfirmDialog` component:
```tsx
// components/shared/confirm-dialog.tsx
'use client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = 'Conferma', variant = 'default', onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```
Then replace each `confirm()` call with this component. For imperative usage (where the confirm is inside an async function), create a hook-based variant using state.

---

## Priority Order

| Priority | Item | Severity | Effort |
|----------|------|----------|--------|
| P0 | #5 - Remaining `user!.id` null assertion bugs (7 files) | Bug | Tiny |
| P1 | #1 - No loading.tsx files — blank screen on navigation | UX | Small |
| P1 | #3 - Campaign/archive badge colors broken in dark mode | Visual bug | Small |
| P1 | #4 - Todo priority colors broken in dark mode | Visual bug | Small |
| P2 | #2 - Duplicate formatting functions across 6+ files | Maintainability | Small |
| P2 | #8 - No accessibility attributes on form elements | Accessibility | Medium |
| P2 | #10 - Native confirm() dialogs instead of styled AlertDialog | UX/Polish | Medium |
| P2 | #9 - Settings/campaigns headers inconsistent with warm futurism | Visual | Small |
| P3 | #7 - Inconsistent max-width containers across pages | Visual | Small |
| P3 | #6 - Long forms with no step/progress indicator | UX | Medium |
