# Review Iteration 5 — Listing, Banca Dati, Match Engine, Cross-Cutting Concerns

## Section A: Logical / Architectural Issues

### A1. Listing edit page has no auth/workspace check (CRITICAL)

**File:** `web/app/(app)/listing/[id]/edit/page.tsx`, lines 12-22

The edit page fetches the listing by `id` using `createAdminClient()` without first authenticating the user or verifying they belong to the same workspace. Any authenticated user who guesses a listing UUID can view and edit any workspace's listing. The listing detail page (`[id]/page.tsx`) correctly checks `user` and fetches profile/workspace_id -- the edit page skips this entirely.

**Fix:** Add `createClient()` auth check, fetch the user's `workspace_id`, and include `.eq('workspace_id', profile.workspace_id)` in the listing query, mirroring the pattern from the detail page.

---

### A2. Listing detail page fetches listing without workspace_id filter (HIGH)

**File:** `web/app/(app)/listing/[id]/page.tsx`, lines 77-83

The listing is fetched as `admin.from('listings').select('*').eq('id', id).single()` without any `workspace_id` filter. Although the page does an auth check, a logged-in user from workspace A can view the full detail page (including owner contact info, price history, and cronistoria) of a listing belonging to workspace B.

**Fix:** After resolving the user's `workspace_id`, add `.eq('workspace_id', profile.workspace_id)` to the listings query before `.single()`.

---

### A3. Match engine trigger endpoint lacks workspace_id validation on property_id

**File:** `web/app/api/match-engine/trigger/route.ts`, lines 28-34

The `property_id` from the request body is used to look up a listing, filtered by `workspace_id`. However, the property stage is fetched at line 42 with `admin.from('properties').select('stage').eq('id', property_id).single()` without a `workspace_id` filter. While the listing query acts as an indirect guard, if the listing has been deleted but the property still exists in another workspace, the stage query could read cross-workspace data.

**Fix:** Add `.eq('workspace_id', profile.workspace_id)` to the property stage query at line 42.

---

### A4. Duplicated `getAIAdjustments` function across two files (~70 lines each)

**Files:**
- `web/app/api/match-engine/compute/route.ts`, lines 163-226
- `web/app/api/match-engine/trigger/route.ts`, lines 119-182

These two implementations are nearly identical (same DeepSeek prompt, same timeout, same adjustment clamping). Any change to one must be manually replicated to the other, which is error-prone.

**Fix:** Extract `getAIAdjustments` into a shared module (e.g., `lib/match-ai.ts`) and import it from both routes.

---

### A5. PhotoUploader and ListingEditForm leak object URLs (memory leak)

**File:** `web/components/listing/photo-uploader.tsx`, line 36
**File:** `web/components/listing/listing-edit-form.tsx`, line 368

`URL.createObjectURL(f)` is called on every render (photo-uploader) or inside JSX (listing-edit-form) without a corresponding `URL.revokeObjectURL()`. Each call allocates a blob URL that persists until the page is unloaded. With 12 photos and re-renders, this accumulates quickly.

**Fix:** In `photo-uploader.tsx`, memoize the previews with `useMemo` and use a cleanup `useEffect` that calls `URL.revokeObjectURL()` on each URL when the component unmounts or when the photos array changes. In `listing-edit-form.tsx`, similarly memoize and revoke.

---

### A6. Listing PATCH endpoint accepts `tone` as a stat field, allowing content/tone mismatch

**File:** `web/app/api/listing/[id]/route.ts`, lines 29-43

The `statFields` allowlist includes `'tone'`, meaning any PATCH request that includes `tone` in the body is treated as a "stat update" and returns early without triggering price history logic or `match_stale` flagging. However, changing the tone without regenerating content creates a mismatch between the listing's stated tone and its generated text. The `ToneRegenerate` component (which correctly does PATCH + regenerate) works around this, but any direct API call can silently desync them.

**Fix:** Remove `'tone'` from `statFields` and handle tone changes in a dedicated branch that also sets a flag like `content_stale: true`, or at minimum validate that a regeneration follows.

---

### A7. `MarkAsSoldButton` fetches ALL contacts without pagination or workspace filter

**File:** `web/components/listing/mark-as-sold-button.tsx`, lines 41-48

When the user clicks "Venduto", the component fetches `/api/contacts` which returns all contacts for the workspace. For agencies with thousands of contacts, this fetch is slow and the resulting `<select>` dropdown with all contacts is unusable. Additionally, the component does not pass any filter (e.g., buyer type only), so sellers, landlords, and all other types appear in the buyer selection dropdown.

**Fix:** Add a `?type=buyer&limit=50&search=...` parameter to the contacts fetch, and implement a searchable combobox (similar to appointment-modal from iteration 2) instead of a plain `<select>`.

---

### A8. ListingStats `handleCopyLink` generates wrong public URL

**File:** `web/components/listing/listing-stats.tsx`, line 19
**File:** `web/components/listing/share-button.tsx`, line 11

`ListingStats` builds the share URL as `/listing/${listingId}` (the internal authenticated route), while `ShareButton` correctly uses `/p/${listingId}` (the public route). A user copying the link from the stats panel shares an authenticated-only URL that external recipients cannot access.

**Fix:** Change line 19 of `listing-stats.tsx` to use `/p/${listingId}` to match `share-button.tsx`.

---

### A9. Alerts endpoint mutates `today` via `setHours` during iteration

**File:** `web/app/api/banca-dati/alerts/route.ts`, line 78

The expression `today.setHours(0, 0, 0, 0)` mutates the `today` Date object in place. Since `today` is declared at line 71 and reused in the loop at line 76-79 and again at line 123, the first call to `setHours` changes the reference value for all subsequent iterations. This can cause off-by-one errors in the birthday diff calculation when processing multiple contacts.

**Fix:** Use `new Date(today)` or `new Date(today.getFullYear(), today.getMonth(), today.getDate())` to create an immutable copy for the zero-hours comparison.

---

## Section B: UX / UI Improvements

### B1. Photo gallery lightbox navigation wraps around, but keyboard navigation does not

**File:** `web/components/listing/photo-gallery.tsx`

The `prev()`/`next()` functions (lines 18-23) use modulo arithmetic to wrap from last to first and vice versa. However, the keyboard handler (lines 31-32) uses `Math.max(0, i-1)` and `Math.min(length-1, i+1)`, which stops at the boundaries. This inconsistency means clicking the arrow buttons wraps around, but pressing arrow keys does not.

**Improvement:** Unify the behavior -- either both wrap or both clamp. Wrapping (matching the button behavior) is the more common UX pattern for lightboxes.

---

### B2. Listing detail page is a 685-line server component with no loading skeleton

**File:** `web/app/(app)/listing/[id]/page.tsx`

The page makes 8+ sequential database queries (listing, property, social connections, comparables, workspace members, price history, proposte/visite/campagne counts, contact events) before rendering anything. On slow connections or cold starts, the user sees a blank page for several seconds.

**Improvement:** Add a `loading.tsx` file in `app/(app)/listing/[id]/` with a skeleton layout matching the page structure (photo placeholder, title placeholder, stat cards placeholder). Also consider using `Suspense` boundaries to stream sections progressively.

---

### B3. Delete and MarkAsSold confirmation panels push layout content around

**Files:** `web/components/listing/delete-listing-button.tsx`, `web/components/listing/mark-as-sold-button.tsx`

Both components replace a small button with an inline confirmation panel that is significantly larger, causing the entire header toolbar to reflow. On mobile, this can push other buttons off-screen.

**Improvement:** Use a Dialog/AlertDialog (from shadcn/ui) for the confirmation step instead of an inline expansion. This keeps the toolbar stable and provides a better mobile experience.

---

### B4. Floor plan uploader drop zone shows no visual feedback on drag-over

**File:** `web/components/listing/floor-plan-uploader.tsx`, lines 106-110

The `onDragOver` handler only calls `e.preventDefault()` but does not add any visual indicator (like a highlight border or background change) to signal that the user can drop the file.

**Improvement:** Add a `dragOver` state that toggles on `onDragEnter`/`onDragLeave` and applies a visual class like `border-primary bg-primary/5` to the drop zone.

---

### B5. Price history items use hardcoded light-mode colors (`bg-red-50`, `bg-green-50`)

**File:** `web/components/listing/price-history.tsx`, line 92

The price change entries use `bg-red-50` and `bg-green-50` without dark mode variants. In dark mode, these produce jarring light backgrounds that break the UI theme.

**Improvement:** Add dark mode variants: `bg-red-50 dark:bg-red-950/30` and `bg-green-50 dark:bg-green-950/30`. Similarly for the text colors (`text-red-700 dark:text-red-300`, etc.).

---

### B6. Valuation widget hardcodes "above average = red" which may confuse agents

**File:** `web/components/listing/valuation-widget.tsx`, lines 45-49

A price above the area average is shown in red (`bg-red-50`, `text-red-600`), implying something negative. But from a seller's perspective, a higher-than-average price is not inherently bad. The color coding could mislead agents into thinking the price is a problem.

**Improvement:** Use neutral colors (e.g., blue for above, green for below) or allow the agent to interpret the data without color-based judgment. Alternatively, label the section more explicitly: "Sopra la media zona (+X%)" in a neutral badge rather than a red warning card.

---

### B7. Banca Dati edit-details-dialog does not reset form state when reopened for a different property

**File:** `web/components/banca-dati/edit-details-dialog.tsx`, lines 52-65

The `useState` initial values are set from `property` at mount time. If the parent component reuses the same dialog instance for different properties (e.g., in a list view), the form retains stale values from the previous property because React does not reinitialize `useState` on prop changes.

**Improvement:** Add a `useEffect` that resets the form state when `property.id` changes, or use the `key={property.id}` pattern on the dialog to force remounting.

---

### B8. Listing map popup position is absolute pixel-based and does not update on map pan/zoom

**File:** `web/components/listing/listing-map-view.tsx`, lines 158-167

The popup is positioned using `{ left: selected.x, top: selected.y }` which are pixel coordinates computed at click time via `map.project()`. When the user pans or zooms the map after clicking a marker, the popup stays at its original pixel position while the marker moves, creating a disconnect.

**Improvement:** Listen to the map's `move` event and update the popup position by re-projecting the marker's coordinates on each frame, or use Mapbox's built-in Popup API which handles repositioning automatically.

---

## Section C: Major Feature Proposals

### C1. Listing Activity Feed with Agent Collaboration

Currently the listing detail page shows a read-only cronistoria compiled from property_events and contact_events. There is no way for agents to add notes, comments, or internal annotations directly to a listing's timeline. Implement an agent activity feed on the listing detail page that allows:
- Posting internal notes visible only to workspace members (not tied to a contact or property event)
- Attaching files/screenshots to timeline entries (e.g., photos from a site visit)
- @-mentioning other workspace agents to notify them
- Filtering the cronistoria by event source (property / contact / agent note)

This would transform the cronistoria from a passive log into an active collaboration tool, reducing reliance on external chat apps for listing-specific communication.

---

### C2. Automated Listing Performance Alerts and Recommendations

The listing detail page shows static performance metrics (views, shares, days on market, proposte, visite). Build an automated alert system that:
- Triggers a notification when a listing has been on market for >30 days with zero visite
- Suggests a price reduction when a listing has >20 views but zero proposte (high interest, no conversion)
- Recommends tone changes based on listing type and market segment (e.g., "Luxury listings in your zone get 2x more engagement -- consider switching tone")
- Sends weekly performance digest emails to the assigned agent summarizing all their listings' KPIs
- Stores alert history in a `listing_alerts` table for analytics

This leverages existing data (listing_stats, contact_events, price_history) to provide actionable intelligence rather than raw numbers.

---

### C3. Comparative Market Analysis (CMA) Report Generator

The ValuationWidget currently shows a simple bar chart comparing the listing price against a few sold comparables. Extend this into a full CMA report generator that:
- Allows agents to select specific comparables (not just the automatic +-1 room filter)
- Generates a branded PDF report (using @react-pdf/renderer, already in the stack) with:
  - Subject property details and photos
  - Selected comparables with photos, prices, and sale dates
  - Price-per-sqm analysis with adjustments for condition, floor, features
  - OMI valuation data integration (already available via CadastralPanel)
  - Suggested listing price range based on the analysis
- Supports email delivery via Resend (already integrated) to the property owner
- Stores generated CMAs in an `analysis_reports` table linked to the property

This would replace manual Excel-based CMAs that agents currently create, directly integrating with existing Banca Dati and OMI data.
