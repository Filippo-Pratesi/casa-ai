# VERIFICATION PASSED — 18/20 PASS (1 PARTIAL B5, 1 SKIP B7)

# Review Iteration 2 — casa-ai

**Model:** Claude Sonnet 4.6 (acting as senior full-stack architect + UX designer)
**Date:** 2026-03-19

---

## Section A — Logical / Data / Architectural Changes

### A1. Photo uploads are sequential — O(n) time instead of O(1)
**Problem:** `app/api/listing/generate/route.ts` uploads photos one-by-one in a `for` loop. With 10 photos, this takes ~N seconds instead of ~1 second.
**Affected files:** `app/api/listing/generate/route.ts` (photo upload loop)
**Fix:** Collect all upload Promises and resolve them in parallel with `Promise.all()`. Filter out null results afterward.

### A2. Analytics page queries ALL properties twice — O(n) wasted for stage counts
**Problem:** `app/(app)/analytics/page.tsx` runs a second `select('stage')` query on the entire workspace properties table (~line 122) just to compute stage counts. This duplicates the first query and scans the entire table regardless of filters.
**Affected files:** `app/(app)/analytics/page.tsx`
**Fix:** Compute stage counts directly from `allProps` (the filtered result array already fetched). Remove the second DB query entirely.

### A3. DeepSeek JSON.parse() has no error handling — uncaught exception on malformed AI response
**Problem:** `lib/deepseek.ts` calls `JSON.parse(raw)` without a try/catch. If DeepSeek returns malformed JSON despite `response_format: { type: 'json_object' }`, the entire listing generation crashes with an uncaught exception that propagates as a 500.
**Affected files:** `lib/deepseek.ts` (JSON.parse call)
**Fix:** Wrap `JSON.parse(raw)` in a try/catch that throws a descriptive error: `"Risposta AI non valida — formato JSON non corretto"`.

### A4. Analytics: invalid date strings cause NaN in time calculations
**Problem:** `app/(app)/analytics/page.tsx` (line ~88) computes time-in-stage as `now - new Date(p.updated_at).getTime()`. If `updated_at` is null or an invalid date string, `getTime()` returns `NaN`, corrupting the average.
**Affected files:** `app/(app)/analytics/page.tsx`
**Fix:** Guard with: `const ms = new Date(p.updated_at).getTime(); if (isNaN(ms)) return acc;` to skip invalid dates.

### A5. Command palette shows no error state when search API fails
**Problem:** `components/shared/command-palette.tsx` silently sets empty results on API error. User sees "Nessun risultato" instead of "Ricerca non riuscita". This makes it look like no data exists when in fact the server is down.
**Affected files:** `components/shared/command-palette.tsx`
**Fix:** Add an `error` state. On non-`res.ok`, set `setError('Ricerca non riuscita')` and display it in the UI. Clear on new keystrokes.

### A6. Social publish button uses `window.location.href` hard navigation — bypasses SPA router
**Problem:** `components/listing/social-publish-buttons.tsx` (line ~74) uses `window.location.href = '/settings'` for a hard page navigation when platform is not connected. This triggers a full page reload, loses any unsaved state, and is inconsistent with the rest of the Next.js app.
**Affected files:** `components/listing/social-publish-buttons.tsx`
**Fix:** Replace `window.location.href = '/settings'` with `router.push('/settings')` using Next.js `useRouter` hook.

### A7. DeepSeek API response `choices[0]` accessed without null check — crash on unexpected response shape
**Problem:** `lib/deepseek.ts` accesses `json.choices[0].message.content` directly. If the API returns an error shape (e.g., `{ error: { message: '...' } }`), accessing `.choices[0]` throws a TypeError.
**Affected files:** `lib/deepseek.ts`
**Fix:** Validate: `const content = json.choices?.[0]?.message?.content; if (!content) throw new Error('AI response malformed');`

### A8. Missing bathroom count validation in listing generation API
**Problem:** `app/api/listing/generate/route.ts` validates `sqm`, `rooms`, and `price` but not `bathrooms`. A value of 0 or negative for bathrooms is passed to the AI and creates meaningless content ("casa con -1 bagno").
**Affected files:** `app/api/listing/generate/route.ts`
**Fix:** Add validation: `if (!bathrooms || bathrooms <= 0) bathrooms = 1` as a normalization step (or return 400 if strict validation is preferred).

### A9. Stage count query in banca-dati loads all stages without workspace filter — wrong counts possible
**Problem:** `app/(app)/banca-dati/page.tsx` fetches all properties to get stage counts without applying the same workspace filter. If any cross-workspace contamination occurs (RLS bypass), stage counts could be wrong.
**Affected files:** `app/(app)/banca-dati/page.tsx`
**Fix:** Compute stage counts from the already-fetched `data` array instead of a separate query. This avoids the extra DB round-trip and uses the same filtered dataset.

### A10. Listing regeneration returns stale content silently — user thinks content was updated
**Problem:** `lib/deepseek.ts` (line ~218): if a tab's regenerated value is empty/invalid, it falls back to `currentContent[tab]` silently. The caller doesn't know regeneration failed for that tab and shows a success toast.
**Affected files:** `lib/deepseek.ts`
**Fix:** Instead of silently falling back, throw or return a partial failure indicator when a required field regenerates as empty. The caller should show a warning: "Alcuni contenuti non sono stati rigenerati".

---

## Section B — UX / UI Design / Aesthetic Changes

### B1. Contabilità page has no empty state — new users see nothing meaningful
**Problem:** `app/(app)/contabilita/page.tsx` (line ~68) only shows summary stats and invoice list when `invoices.length > 0`. When empty, users see only the page header and a "Nuova fattura" button — no explanation of what the module does or how to start.
**Affected files:** `app/(app)/contabilita/page.tsx`
**Fix:** Add an empty state below the header (when `invoices.length === 0`) with: an icon (e.g., `Receipt`), a headline "Nessuna fattura ancora", a brief description, and the "Nuova fattura" CTA button styled consistently with other empty states.

### B2. Command palette search field has no feedback for short queries
**Problem:** `components/shared/command-palette.tsx` clears results silently when query is < 2 characters. Users type one character and see a blank panel with just nav items, which looks broken.
**Affected files:** `components/shared/command-palette.tsx`
**Fix:** When `query.length === 1`, show a subtle message below the input: "Digita almeno 2 caratteri per cercare..." in `text-muted-foreground text-xs`.

### B3. Social publish failure state has a disabled "Riprova" button — misleads users
**Problem:** `components/listing/social-publish-buttons.tsx` (line ~98): after a failed publish, the button still says "Riprova" visually but is disabled and has no retry mechanism. Users think they can click it but nothing happens.
**Affected files:** `components/listing/social-publish-buttons.tsx`
**Fix:** On failed state, change button text to "Errore" (or show an error icon) and add an `onClick` handler that resets the status to `'idle'` so users can retry.

### B4. Analytics page has no loading skeleton — content jumps in abruptly
**Problem:** `app/(app)/analytics/page.tsx` is server-rendered but the agent filter select uses `<Suspense fallback={null}>`, meaning the filter area shows nothing while loading. This causes layout shift when the component mounts.
**Affected files:** `app/(app)/analytics/page.tsx`
**Fix:** Replace `fallback={null}` with a skeleton: `fallback={<div className="h-9 w-48 rounded-lg bg-muted animate-pulse" />}` to reserve space and show loading state.

### B5. Listing output tabs — copy feedback toast appears too briefly (2 seconds)
**Problem:** `components/listing/output-tabs.tsx` (line ~34) uses `setTimeout` to hide the "Copiato!" icon after 2000ms. Fast users who immediately look away miss the feedback entirely.
**Affected files:** `components/listing/output-tabs.tsx`
**Fix:** Extend to 3000ms. Also use the Sonner toast (`import { toast } from 'sonner'`) which is already available globally, instead of a custom local state for copy feedback.

### B6. Banca dati list view — stage badges lack a legend or tooltip explaining meanings
**Problem:** `app/(app)/banca-dati/page.tsx` (client component) shows stage badges (sconosciuto, ignoto, conosciuto, etc.) without any explanation of what each stage means. New agents don't understand the pipeline.
**Affected files:** `app/(app)/banca-dati/[id]/page.tsx` or the banca-dati client component
**Fix:** Add `title` attribute (tooltip) to each stage badge with a one-line Italian explanation:
- sconosciuto: "Proprietà rilevata, proprietario non ancora contattato"
- conosciuto: "Proprietario contattato, intenzione nota"
- incarico: "Mandato di vendita/locazione firmato"
etc.

### B7. Form inputs in listing generation lack visible focus rings — poor keyboard navigation
**Problem:** Multiple text inputs across the app use custom styling that overrides the default focus ring with `focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]`. While this adds a ring, the low opacity (0.3) and thin width (2px) may be insufficient for users with low vision.
**Affected files:** `components/listing/listing-form.tsx`, `components/dashboard/dashboard-client.tsx`
**Fix:** Increase focus ring opacity to at least 0.5 and use `focus:ring-[oklch(0.57_0.20_33/0.5)] focus:ring-offset-2` for better keyboard navigation visibility. Alternatively use `focus-visible:ring-2` to only show ring on keyboard focus (not mouse click).

### B8. Analytics pipeline bar chart has no labels on bars — users can't read percentages easily
**Problem:** `app/(app)/analytics/page.tsx` renders horizontal bar charts for pipeline stages. Each bar shows width proportional to count, but users must hover or mentally estimate the percentage. The only number shown is the count, not the percentage.
**Affected files:** `app/(app)/analytics/page.tsx`
**Fix:** Add a percentage label at the right edge of each bar: `<span className="text-xs text-muted-foreground ml-2">{pct}%</span>` where `pct = Math.round(count / total * 100)`.

### B9. AppHeader component is a stub — wastes vertical space with no useful content
**Problem:** `components/app-header.tsx` (based on usage in layout) appears to be a generic header bar that may be nearly empty. The 3.5rem height it occupies (`min-h-[calc(100vh-3.5rem)]` in main) is wasted if header has minimal content.
**Affected files:** `components/app-header.tsx`, `app/(app)/layout.tsx`
**Fix:** If `AppHeader` is minimal, add breadcrumbs (current page name + parent sections) and a workspace name display to the header. This gives the space purpose and helps with navigation context.

### B10. Mobile sidebar navigation — no visible "close" target for touch users
**Problem:** On mobile, the sidebar overlay (when open) can be closed by tapping outside, but there's no visible X button or close indicator. Users on touch devices may not know they can tap outside to dismiss.
**Affected files:** `components/app-sidebar.tsx`
**Fix:** The shadcn `<Sidebar>` component has built-in mobile sheet behavior. Ensure the `SidebarTrigger` button in `AppHeader` has a clear icon that toggles (menu → X) to indicate the sidebar is open. Add `aria-expanded` attribute to the trigger button.

---

## Implementation Notes

Priority: A1 (parallel uploads), A2 (analytics redundant query), A3 (JSON parse), A5 (command palette error), B1 (contabilità empty state), B3 (retry button), B8 (chart percentages).
All changes backward-compatible, no migrations needed.
