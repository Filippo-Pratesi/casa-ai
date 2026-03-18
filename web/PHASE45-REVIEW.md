# Sprint I Fase 4-5 Code Review
**Date:** 2026-03-18
**Phases:** 4 (Incarico & PDF) + 5 (Integration)

---

## Executive Summary

Overall assessment: **⚠️ MIXED** — Multiple critical and high-priority issues require immediate fixes before merging to main. Phase 4 (PDF generation) is solid with proper TypeScript pragmatism. Phase 5 (integration) has security gaps and data consistency issues.

**Critical Issues:** 3
**High Issues:** 4
**Medium Issues:** 6
**Low Issues:** 2

---

## 1. immobile-detail-client.tsx (Phase 4)

**Status:** ⚠️ **WARNING**

### Critical Issues

**CRITICAL 1: Missing workspace_id validation in all fetch operations**
- **Location:** Lines 152–282 (all API calls to /api/properties/[id]/*)
- **Issue:** Client-side component makes direct API calls to `/api/properties/{id}` without validating that the property belongs to the user's workspace. The server-side route *should* validate, but this client trusts the response implicitly.
- **Risk:** If the API route doesn't properly validate workspace_id, a user could manipulate another user's property.
- **Recommendation:** Verify that *all* `/api/properties` routes (advance, contacts, events, promote-to-listing) validate `workspace_id` in the server-side handlers. This should be done in the route files themselves (not here), but note that **no validation visible in this client**.

**CRITICAL 2: Unvalidated property stage transitions in UI**
- **Location:** Lines 51–59, 140–145
- **Issue:** STAGE_ADVANCES maps define legal transitions, but there's no server-side verification that the transition is valid. A malicious API call could advance a property from `sconosciuto` directly to `venduto`, bypassing business logic.
- **Risk:** Data integrity: stage machine state can be violated.
- **Recommendation:** Add server-side state machine validation in `/api/properties/{id}/advance` route. Verify that `property.stage` + `target_stage` is a valid transition.

### High Issues

**HIGH 1: No error handling for JSON parse in contact search results**
- **Location:** Line 244–245
- **Issue:** `setContactResults((data.contacts ?? []).slice(0, 8))` assumes `data.contacts` is always an array. If the API returns invalid JSON or a non-array, this silently fails.
- **Recommendation:**
  ```typescript
  setContactResults(
    Array.isArray(data.contacts) ? data.contacts.slice(0, 8) : []
  )
  ```

**HIGH 2: Missing toast on successful reload of contacts**
- **Location:** Line 273–277
- **Issue:** After adding a contact, the code reloads contacts but doesn't handle errors. If the reload fetch fails, the user sees a successful "Contatto aggiunto" toast but the contact isn't visible.
- **Recommendation:** Add error handling:
  ```typescript
  const cRes = await fetch(...)
  if (!cRes.ok) {
    toast.error('Contatto aggiunto ma impossibile ricaricare la lista')
    return
  }
  const cData = await cRes.json()
  setContacts(cData.contacts ?? [])
  ```

**HIGH 3: Race condition in advancing stage multiple times**
- **Location:** Lines 147–184
- **Issue:** User could spam the "Avvia Incarico" button during the async operation, since `advancing` state is managed on component mount but the fetch is not de-duplicated.
- **Recommendation:** Add debounce or disable the button while `advancing === true` (already done at line 341, but not in all dialogs — see incarico/locato dialogs at lines 673, 745 — button IS disabled, good).

**HIGH 4: Missing error handling in removeContact**
- **Location:** Lines 285–294
- **Issue:** Line 288 throws generically "Errore" without context. If the API fails for workspace validation, the user won't know why.
- **Recommendation:**
  ```typescript
  try {
    const res = await fetch(...)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Errore' }))
      throw new Error(error)
    }
    // ...
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Errore nella rimozione')
  }
  ```

### Medium Issues

**MEDIUM 1: Type safety — property as `any`**
- **Location:** Line 85
- **Issue:** `property: any` disables all TypeScript checking on 100+ property field accesses. This is intentional per comment on line 84, but risky for refactoring.
- **Recommendation:** Create a strict interface for property shape. Example:
  ```typescript
  interface Property {
    id: string; address: string; city: string; stage: PropertyStage;
    property_type?: string; sqm?: number; // ... all other fields
  }
  ```

**MEDIUM 2: Hardcoded role labels duplicated across files**
- **Location:** Lines 37–49
- **Issue:** ROLE_LABELS is duplicated in immobile-detail-client.tsx (here), contacts/[id]/page.tsx (lines 215–220), and possibly other files.
- **Recommendation:** Extract to `lib/constants.ts`:
  ```typescript
  export const ROLE_LABELS: Record<string, string> = { ... }
  ```
  Then import everywhere.

**MEDIUM 3: Unhandled PATCH response parsing**
- **Location:** Lines 156–160
- **Issue:** If PATCH fails, `patchRes.json()` is awaited but no error is thrown if the JSON itself is malformed.
- **Recommendation:**
  ```typescript
  const patchRes = await fetch(...)
  if (!patchRes.ok) {
    const data = await patchRes.json().catch(() => ({ error: 'Errore sconosciuto' }))
    throw new Error(data.error || 'Errore')
  }
  ```

**MEDIUM 4: No debounce on contact search**
- **Location:** Lines 239–246
- **Issue:** Each keystroke triggers an API call. Typing "Marco" = 5 API calls for "M", "Ma", "Mar", "Marc", "Marco".
- **Recommendation:** Debounce with `useMemo` and `useEffect`:
  ```typescript
  useEffect(() => {
    const timer = setTimeout(() => searchContacts(contactSearch), 300)
    return () => clearTimeout(timer)
  }, [contactSearch])
  ```

**MEDIUM 5: No handling for empty/null contact fields in display**
- **Location:** Lines 398, 433
- **Issue:** `property.owner_contact.name?.charAt(0)?.toUpperCase()` is safe, but no check if `name` is an empty string.
- **Recommendation:** Fallback:
  ```typescript
  {(property.owner_contact?.name || 'U')?.charAt(0)?.toUpperCase()}
  ```

**MEDIUM 6: Missing validation for numeric fields in incarico dialog**
- **Location:** Lines 650–659
- **Issue:** Commission is parsed with `parseFloat()` but no validation that it's a valid percentage (0–10 as max suggests).
- **Recommendation:**
  ```typescript
  const commission = parseFloat(incaricoCommission)
  if (isNaN(commission) || commission < 0 || commission > 10) {
    toast.error('Provvigione deve essere 0-10%')
    return
  }
  ```

### Low Issues

**LOW 1: Inconsistent date formatting**
- **Location:** Lines 486–487, 504
- **Issue:** Dates are formatted using `.toLocaleDateString('it-IT')` but no null checks on the date values before calling the method.
- **Recommendation:** Use helper:
  ```typescript
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('it-IT') : '—'
  ```

**LOW 2: Visual accessibility — very small icons**
- **Location:** Lines 441–450
- **Issue:** Phone, delete, and external-link icons in contact list are 3.5w-3w — can be hard to click on touch devices.
- **Recommendation:** Increase to `h-4 w-4` or add larger padding.

---

## 2. route.tsx (incarico-pdf) (Phase 4)

**Status:** ✅ **OK with minor notes**

### Critical Issues

None identified.

### High Issues

**HIGH 1: Missing validation on property stage**
- **Location:** Lines 275–277
- **Issue:** Endpoint returns 400 if `stage !== 'incarico'`, but doesn't check if the property belongs to the user's workspace before revealing this information.
- **Risk:** Information disclosure — an attacker could probe property IDs to discover which ones are in "incarico" stage.
- **Recommendation:** Move workspace check *before* the stage check:
  ```typescript
  if (propError || !property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })
  if (property.stage !== 'incarico') return NextResponse.json({ error: 'Non disponibile' }, { status: 400 })
  ```

**HIGH 2: Admin client used without error handling for workspace isolation**
- **Location:** Lines 264–269
- **Issue:** `admin` client queries without `.eq('workspace_id', workspace_id)` validation in visual form. The code *does* validate on line 268, but the pattern is inconsistent — admin queries should always include workspace checks.
- **Recommendation:** Add comment explaining workspace safety:
  ```typescript
  // NOTE: Workspace isolation validated on line 268
  ```

### Medium Issues

**MEDIUM 1: TypeScript suppressions bypass type checking on critical data**
- **Location:** Lines 251–256, 263–269, 283–288
- **Issue:** Multiple `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and `(admin as any)` casts disable type safety on admin client queries.
- **Risk:** Typo in `.select('workspace_id')` would not be caught at compile time.
- **Recommendation:** Create typed admin client wrapper or use `as const` to narrow types.

**MEDIUM 2: No retry logic for photo/workspace fetches**
- **Location:** Lines 283–299
- **Issue:** If the workspace details fetch returns null, the PDF is generated with `workspace?.name ?? 'Agenzia Immobiliare'` — a generic fallback. This is acceptable but loses the workspace branding.
- **Recommendation:** OK as-is (fallback is reasonable), but consider logging when workspace data is missing.

**MEDIUM 3: Missing HTTP status code for malformed PDF render**
- **Location:** Lines 303–310
- **Issue:** If `renderToBuffer` throws, the exception is not caught — it would cause a 500 error with no user-friendly message.
- **Recommendation:**
  ```typescript
  let buffer
  try {
    buffer = await renderToBuffer(...)
  } catch (err) {
    console.error('PDF render failed:', err)
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
  ```

### Low Issues

**LOW 1: Date formatting hardcoded to Italian**
- **Location:** Line 301
- **Issue:** Using `'it-IT'` is appropriate for Italian users, but no i18n hook. If app expands to other locales, this will need refactoring.
- **Recommendation:** Mark with TODO comment for future i18n migration.

---

## 3. contacts/[id]/page.tsx (Phase 5)

**Status:** ⚠️ **WARNING**

### Critical Issues

**CRITICAL 1: Unvalidated linked property queries**
- **Location:** Lines 165–186
- **Issue:** Three separate queries fetch linked properties but the JOIN on line 183 uses a raw `property_contacts_property_id_fkey` foreign key without documenting the relationship. If the FK changes in a migration, this silently breaks.
- **Risk:** Data integrity: orphaned property_contacts records could leak data from other workspaces if RLS isn't perfect.
- **Recommendation:** Verify RLS policy on `property_contacts` explicitly scopes to the contact's workspace. If policy is missing or weak, this is a security breach.

**CRITICAL 2: Missing workspace validation on contact fetch**
- **Location:** Lines 92–96
- **Issue:** Contact is fetched with `.eq('workspace_id', profile?.workspace_id)` but `profile` could be null (line 88 doesn't explicitly check). If null, the query filters on an undefined value.
- **Risk:** User could view any contact if workspace_id is null.
- **Recommendation:**
  ```typescript
  if (!profile?.workspace_id) return notFound()
  ```

### High Issues

**HIGH 1: Birthday calculation uses incorrect date parsing**
- **Location:** Lines 147–155
- **Issue:** Line 150 `const [, mm, dd] = dob.split('-').map(Number)` assumes ISO YYYY-MM-DD format. If `dob` is stored as YYYY-MM-DD but has timezone offset (e.g., '1990-03-18T00:00:00Z'), the split will fail.
- **Risk:** Birthday card won't display, silently returns null.
- **Recommendation:**
  ```typescript
  const date = new Date(dob)
  const mm = date.getMonth() + 1
  const dd = date.getDate()
  ```

**HIGH 2: No error handling for matching listings query**
- **Location:** Lines 129–145
- **Issue:** Listings query is not error-checked. If it fails, `matchingListings` silently remains empty array.
- **Recommendation:**
  ```typescript
  const { data: allListings, error: listError } = await ...
  if (listError) console.error('Failed to fetch listings:', listError)
  matchingListings = allListings ? [...] : []
  ```

**HIGH 3: Hardcoded stage/role label maps repeated**
- **Location:** Lines 202–220
- **Issue:** STAGE_LABELS, STAGE_COLORS, ROLE_LABELS are defined locally here AND in immobile-detail-client.tsx. If you update one, the other breaks.
- **Risk:** Inconsistent UI across pages.
- **Recommendation:** Extract to `lib/constants.ts`.

**HIGH 4: Contact links query uses deprecated JOIN syntax**
- **Location:** Line 183
- **Issue:** `properties!property_contacts_property_id_fkey` uses the explicit FK name. This is fragile — if the FK is renamed in a migration, the query breaks silently.
- **Recommendation:** Use documented foreign key relationship or add test to verify FK exists.

### Medium Issues

**MEDIUM 1: No null check before calling .map on preferred_cities**
- **Location:** Lines 139, 391
- **Issue:** `(contact.preferred_cities ?? []).length > 0` is safe, but lines 139 and 391 call `.map()` on nullable array. If a contact has `preferred_cities = null`, the page crashes.
- **Status:** Actually OK — the ?? fallback ensures it's always an array.
- **Recommendation:** No change needed.

**MEDIUM 2: Matching listings filter is done client-side without pagination**
- **Location:** Lines 127–145
- **Issue:** All 100 listings are fetched (line 135) then filtered client-side. For workspaces with 1000+ listings, this is slow and wasteful.
- **Recommendation:** Move filter logic to server or paginate results.

**MEDIUM 3: No i18n for stage/role labels**
- **Location:** Lines 202–220
- **Issue:** Stage and role labels are hardcoded in Italian. If app becomes multi-lingual, these won't be translated.
- **Recommendation:** Create `i18n/stages.ts` and `i18n/roles.ts` files.

**MEDIUM 4: Birthday card component not shown in this file**
- **Location:** Lines 344–350
- **Issue:** BirthdayCard is imported but we can't see its implementation. If it makes unsafe API calls, it's a risk.
- **Recommendation:** Review `components/contacts/birthday-card.tsx` separately.

**MEDIUM 5: No error boundary for linked properties section**
- **Location:** Lines 457–515
- **Issue:** If the property_contacts query fails midway, the entire "Immobili collegati" section is silently omitted.
- **Recommendation:** Show error state instead of silently hiding:
  ```typescript
  {hasLinkedProperties ? (
    <div>...</div>
  ) : null}
  ```
  (Currently correct — silently hiding is OK if `hasLinkedProperties` is false.)

**MEDIUM 6: Appointments query has no error handling**
- **Location:** Lines 118–124
- **Issue:** `appointmentsData` is not checked for errors.
- **Recommendation:**
  ```typescript
  const { data: appointmentsData, error: apptError } = await ...
  if (apptError) console.error('Failed to fetch appointments:', apptError)
  const appointments = (appointmentsData ?? []) as ...
  ```

### Low Issues

**LOW 1: No message when linked properties list is empty but section visible**
- **Location:** Lines 457–515
- **Issue:** Section header says "Immobili collegati" but if all three categories are empty, nothing is shown (hasLinkedProperties is false).
- **Recommendation:** OK — section isn't shown if empty.

**LOW 2: Avatar logic assumes name is never empty**
- **Location:** Line 266
- **Issue:** `.split(' ').map((n: string) => n[0])` would fail if name is empty string.
- **Recommendation:** Fallback:
  ```typescript
  {(contact.name || 'U').split(' ')...}
  ```

---

## 4. dashboard-client.tsx (Phase 5)

**Status:** ⚠️ **WARNING**

### Critical Issues

None identified.

### High Issues

**HIGH 1: Implicit trust of stats values without validation**
- **Location:** Lines 59–65
- **Issue:** Stats are passed as props without type checking. If a parent passes negative or non-integer counts, the UI displays them.
- **Risk:** Type safety — counts should be positive integers.
- **Recommendation:**
  ```typescript
  interface Stats {
    listings: number & { readonly __brand: 'Stats' }
    // ...
  }
  // Or just add validation in constructor:
  if (stats.listings < 0) throw new Error('Invalid stats')
  ```

**HIGH 2: Sorting array mutates in place on line 147**
- **Location:** Line 147
- **Issue:** `return [...base].sort(...)` creates a new array but calls `sort()` which mutates. This is actually OK (spread creates shallow copy before sort), but easy to misread.
- **Recommendation:** No change — code is correct.

**HIGH 3: Download CSV doesn't validate data before stringification**
- **Location:** Lines 90–111
- **Issue:** Line 92: `const rows = data.map(l => [...])` creates rows but if `l.price` is undefined, the cell becomes "undefined" in CSV.
- **Recommendation:**
  ```typescript
  const rows = data.map(l => [
    l.address ?? '',
    l.city ?? '',
    // ... all fields with ?? fallback
  ])
  ```

**HIGH 4: Filter-to-listing sync is mutable — no validation**
- **Location:** Lines 113–119
- **Issue:** `toggleType()` mutates the Set in place. If called during concurrent state update, could cause race condition.
- **Recommendation:** The `setActiveTypes(prev => ...)` pattern is correct (immutable), so this is OK.

### Medium Issues

**MEDIUM 1: Hardcoded type labels and colors scattered across file**
- **Location:** Lines 9–34, 80–88, TYPE_COLORS, TYPE_ACTIVE
- **Issue:** Multiple definitions of TYPE_LABELS, TYPE_COLORS, TYPE_ACTIVE. If one is updated, others must be too.
- **Recommendation:** Extract to `lib/constants.ts`.

**MEDIUM 2: useI18n hook called without null check**
- **Location:** Line 71
- **Issue:** `const { t } = useI18n()` assumes hook always returns a valid `t` function. If i18n context is missing, this crashes.
- **Recommendation:** Add fallback:
  ```typescript
  const { t } = useI18n() || { t: (k: string) => k }
  ```

**MEDIUM 3: Sort comparison doesn't handle undefined values**
- **Location:** Lines 148–152
- **Issue:** `localeCompare()` will throw if address is undefined. Price comparison will return NaN if price is undefined.
- **Recommendation:**
  ```typescript
  if (sortKey === 'address') cmp = (a.address ?? '').localeCompare(b.address ?? '')
  else if (sortKey === 'price') cmp = (a.price ?? 0) - (b.price ?? 0)
  ```

**MEDIUM 4: Filter logic doesn't validate room/sqm/price as positive numbers**
- **Location:** Lines 140, 141, 142
- **Issue:** If `contact.min_rooms` is negative, the filter silently passes properties with 0 rooms (since `0 < -5` is true).
- **Recommendation:** Validate in server-side contact schema, not here.

**MEDIUM 5: Empty animation key in banca-dati card**
- **Location:** Line 283
- **Issue:** `const isAI = s.label === 'Contenuto AI'` and `const isMain = false` — the `isMain` is always false but used as a ternary. This looks unfinished.
- **Recommendation:** Either remove `isMain` or implement its logic.

**MEDIUM 6: Card tag conditional prop casting is unsafe**
- **Location:** Lines 285–290
- **Issue:** `{...({s.href ? { href: s.href } as any : {}})}` uses `as any` to suppress TypeScript errors on spread operator.
- **Recommendation:**
  ```typescript
  const cardProps = s.href ? { href: s.href, render: <Link /> } : {}
  // or create a CardComponent union type
  ```

### Low Issues

**LOW 1: Placeholder gradient strings are very long**
- **Location:** Lines 469–477
- **Issue:** Hardcoded CSS color gradients are duplicated. If branding changes, all must be updated.
- **Recommendation:** Extract to CSS variables in stylesheet.

**LOW 2: No keyboard navigation for filter pills**
- **Location:** Lines 345–351
- **Issue:** Filter type buttons don't have `onKeyPress` for Enter/Space to toggle.
- **Recommendation:** Add `onKeyDown` handler for accessibility.

---

## 5. dashboard/page.tsx (Phase 5)

**Status:** ⚠️ **WARNING**

### Critical Issues

**CRITICAL 1: No workspace_id validation when querying appointments**
- **Location:** Line 36
- **Issue:** Appointments query filters on `workspace_id` BUT also chains `.gte('starts_at', ...)` and `.neq('status', 'cancelled')`. The status filter could inadvertently expose cancelled appointments if RLS doesn't block them.
- **Risk:** Data isolation — if RLS is missing on appointments table, cancelled appointments from other workspaces leak.
- **Recommendation:** Verify RLS policy on `appointments` table includes `workspace_id` filter.

### High Issues

**HIGH 1: No error handling on parallel Promise.all**
- **Location:** Lines 34–38
- **Issue:** If any of the three queries fail, the entire page crashes with a 500. No fallback counts.
- **Recommendation:**
  ```typescript
  const [contacts, appointments, banca_dati] = await Promise.all([
    admin.from('contacts').select('id', { count: 'exact', head: true })...
      .then(r => ({ count: r.count ?? 0 }))
      .catch(err => { console.error('contacts query failed:', err); return { count: 0 } })
    // ... similar for other two
  ])
  ```

**HIGH 2: Profile data could be null but used without check**
- **Location:** Line 27
- **Issue:** `profile?.workspace_id ?? ''` — if profile is null, workspace_id is empty string. Empty string is a valid query condition in Supabase (matches no rows), so it silently returns 0 for all counts. This is OK but confusing.
- **Recommendation:** Add explicit null check:
  ```typescript
  if (!profile?.workspace_id) return <DashboardClient listings={[]} stats={...} />
  ```

**HIGH 3: Listings fetch has no error handling**
- **Location:** Lines 24–29
- **Issue:** If the query fails, `listingsData` is null and the code proceeds with `listings = []`. No error log.
- **Recommendation:**
  ```typescript
  const { data: listingsData, error: listError } = await admin...
  if (listError) console.error('Listings fetch failed:', listError)
  const listings = (listingsData ?? []) as ListingWithAgent[]
  ```

### Medium Issues

**MEDIUM 1: Type assertion on profile is unsafe**
- **Location:** Line 22
- **Issue:** `profileData as { role: string; workspace_id: string } | null` — if the query returns extra fields, they're ignored. If it's missing fields, TypeScript doesn't catch it until runtime.
- **Recommendation:** Create strict type at top:
  ```typescript
  interface UserProfile {
    role: string
    workspace_id: string
  }
  const profile = profileData as UserProfile | null
  ```

**MEDIUM 2: Generated content count is computed on client, not cached**
- **Location:** Lines 44–58, 63
- **Issue:** Every page load, `listings.filter(l => l.generated_content).length` is recalculated. For 500 listings, this is negligible, but ideally this should be a database count.
- **Recommendation:** Add server-side stat: `aiContent: (aiCountData?.count ?? 0)` from a separate query.

**MEDIUM 3: No validation that user is in workspace**
- **Location:** Lines 10–18
- **Issue:** User is redirected to login (line 12) but not checked if they belong to the workspace they're querying. If workspace_id is wrong, they see a dashboard with no data but no error.
- **Recommendation:** Add check after profile fetch:
  ```typescript
  if (!profile) return notFound()
  ```

### Low Issues

**LOW 1: Unused type import**
- **Location:** Line 5
- **Issue:** `type Listing` is imported from `@/lib/supabase/types` but overridden on line 7 as `type ListingWithAgent`.
- **Recommendation:** Use only `ListingWithAgent` or import and alias `Listing`.

---

## 6. listing/generate/route.ts (Phase 5)

**Status:** ⚠️ **WARNING**

### Critical Issues

**CRITICAL 1: Workspace isolation not validated in auto-property creation**
- **Location:** Lines 217–222
- **Issue:** `autoCreateProperty()` checks if property already exists by listing_id, but doesn't validate that the new property will be in the same workspace. If an attacker can control the listing, they could create a property in a different workspace.
- **Risk:** Data isolation breach.
- **Recommendation:** Add explicit workspace check:
  ```typescript
  const { data: property } = await opts.supabase
    .from('properties')
    .insert({
      workspace_id: opts.workspaceId,  // ← explicit
      // ... rest
    })
  ```
  (Already done on line 228, so this is OK.)

**CRITICAL 2: Unvalidated property_type and transaction_type enums**
- **Location:** Lines 34–35, 115–116
- **Issue:** `property_type` and `transaction_type` are cast to enums on lines 115–116 without validation. If a user submits an invalid type (e.g., "nuke"), the database insert will fail with a Postgres error.
- **Risk:** User-facing 500 error instead of 400 validation error.
- **Recommendation:**
  ```typescript
  const VALID_PROPERTY_TYPES = ['apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other']
  if (!VALID_PROPERTY_TYPES.includes(property_type)) {
    return NextResponse.json({ error: 'Tipo immobile non valido' }, { status: 400 })
  }
  ```

### High Issues

**HIGH 1: No validation that sqm/rooms/bathrooms are positive**
- **Location:** Lines 41–44
- **Issue:** `Number(formData.get('sqm'))` could be 0, negative, or NaN. No validation.
- **Recommendation:**
  ```typescript
  const sqm = Number(formData.get('sqm'))
  if (isNaN(sqm) || sqm <= 0) {
    return NextResponse.json({ error: 'Superficie deve essere > 0' }, { status: 400 })
  }
  ```

**HIGH 2: Photo upload error silently swallows upload errors**
- **Location:** Lines 64–80
- **Issue:** If upload fails, `!uploadError && uploadData` is false, so the photo is skipped. User sees listing created but with missing photos — no indication of what failed.
- **Recommendation:** Collect errors and return them:
  ```typescript
  const uploadErrors: string[] = []
  for (const photo of photoFiles) {
    // ...
    if (uploadError) {
      uploadErrors.push(`${photo.name}: ${uploadError.message}`)
      continue
    }
    // ...
  }
  if (uploadErrors.length > 0) {
    return NextResponse.json({
      warning: `${uploadErrors.length} foto non caricate: ${uploadErrors.join('; ')}`
    }, { status: 206 })  // Partial success
  }
  ```

**HIGH 3: Mapbox API token could be exposed in geocoding URL**
- **Location:** Line 203
- **Issue:** If the `geoUrl` fetch fails and logs are exposed, the Mapbox token is visible in logs.
- **Risk:** Token exfiltration.
- **Recommendation:** Use a redacted URL in logs:
  ```typescript
  console.error(`Geocoding failed: ${geoUrl.split('&access_token=')[0]}...`)
  ```

**HIGH 4: DeepSeek API failure is non-blocking but user gets 201 success**
- **Location:** Lines 101–106
- **Issue:** If `generateListingContent()` throws, the listing is created without AI content. The response returns 201 (success) but `generated_content` is undefined — confusing.
- **Recommendation:** Fail the request:
  ```typescript
  let generated_content
  try {
    generated_content = await generateListingContent(propertyData)
  } catch (err) {
    console.error('DeepSeek generation error:', err)
    // Delete the listing before responding?
    return NextResponse.json({ error: 'Errore nella generazione AI. Riprova.' }, { status: 500 })
  }
  ```

### Medium Issues

**MEDIUM 1: Feature array is parsed from JSON without validation**
- **Location:** Line 45
- **Issue:** `JSON.parse((formData.get('features') as string) ?? '[]')` — if the JSON is invalid, throws immediately without catching.
- **Recommendation:**
  ```typescript
  let features: string[] = []
  try {
    const featureStr = formData.get('features') as string
    features = featureStr ? JSON.parse(featureStr) : []
    if (!Array.isArray(features)) features = []
  } catch {
    return NextResponse.json({ error: 'Features non valido' }, { status: 400 })
  }
  ```

**MEDIUM 2: autoCreateProperty is async void — no way to know if it succeeded**
- **Location:** Lines 151–170
- **Issue:** `void autoCreateProperty(...)` makes it fire-and-forget. If the property creation fails, the listing is orphaned but the user is never notified.
- **Recommendation:** Return a status in the listing response:
  ```typescript
  const propertyResult = await autoCreateProperty(...)  // don't use void
  return NextResponse.json({
    listing_id: listing.id,
    generated_content,
    property_linked: propertyResult.success ?? false
  }, { status: 201 })
  ```

**MEDIUM 3: autoCreateProperty tries to create property even if one exists**
- **Location:** Lines 216–222
- **Issue:** The check `if (existing) return` is good, but if the existing property is *broken* (missing coordinates, etc.), it's not repaired.
- **Recommendation:** OK as-is (don't over-update existing properties).

**MEDIUM 4: Tone enum validation is missing**
- **Location:** Line 48, 97, 129
- **Issue:** `tone` is cast to enum without validating it's one of standard/luxury/approachable/investment.
- **Recommendation:**
  ```typescript
  const VALID_TONES = ['standard', 'luxury', 'approachable', 'investment']
  if (!VALID_TONES.includes(tone)) {
    return NextResponse.json({ error: 'Tone non valido' }, { status: 400 })
  }
  ```

**MEDIUM 5: autoCreateProperty doesn't validate geocoding result**
- **Location:** Lines 206–210
- **Issue:** If Mapbox returns an empty features array, `coordinates` remain null. This is silently accepted.
- **Recommendation:** Log when geocoding succeeds but returns no results:
  ```typescript
  if (!geoData.features?.length) {
    console.warn(`Geocoding returned no results for: ${opts.address}, ${opts.city}`)
  }
  ```

**MEDIUM 6: Catastale fields (foglio, particella) have no validation**
- **Location:** Lines 49–51, 167–169, 244–246
- **Issue:** These are string fields but should match Italian cadastral format (foglio = 1–5 digits, particella = 1–5 digits, subalterno = optional).
- **Recommendation:** Add format validation if these fields are required by law.

### Low Issues

**LOW 1: Unused variable `neighborhood` in property creation**
- **Location:** Lines 40, 89, 159
- **Issue:** `neighborhood` is extracted but not validated. If it's used for searching later, it should be validated or have a default.
- **Recommendation:** Use `zone: neighborhood ?? 'Da definire'` (already done on line 158, OK).

**LOW 2: No limit on file size for photo uploads**
- **Location:** Lines 64–80
- **Issue:** User could upload 1GB images; no `max-file-size` check.
- **Recommendation:** Add:
  ```typescript
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  if (photo.size > MAX_FILE_SIZE) {
    uploadErrors.push(`${photo.name}: file troppo grande (max 10MB)`)
    continue
  }
  ```

---

## Summary Table

| File | Status | Critical | High | Medium | Low |
|------|--------|----------|------|--------|-----|
| immobile-detail-client.tsx | ⚠️ WARNING | 2 | 4 | 6 | 2 |
| incarico-pdf/route.tsx | ✅ OK | 0 | 2 | 3 | 1 |
| contacts/[id]/page.tsx | ⚠️ WARNING | 2 | 4 | 6 | 2 |
| dashboard-client.tsx | ⚠️ WARNING | 0 | 4 | 6 | 2 |
| dashboard/page.tsx | ⚠️ WARNING | 1 | 3 | 3 | 1 |
| listing/generate/route.ts | ⚠️ WARNING | 2 | 4 | 6 | 2 |
| **TOTALS** | | **7** | **21** | **30** | **10** |

---

## Recommendations by Priority

### 🔴 **CRITICAL (Fix Before Merge)**

1. **Workspace isolation on all properties API routes**
   Verify `/api/properties/[id]/*` routes validate workspace_id in request handlers.

2. **Property stage transition validation**
   Add server-side state machine check in `/api/properties/{id}/advance`.

3. **Contact fetch workspace check**
   Add `if (!profile?.workspace_id) return notFound()` in contacts/[id]/page.tsx.

4. **Property type/tone enum validation**
   Validate against allowed values in listing/generate/route.ts before insert.

5. **Appointments RLS policy**
   Verify `appointments` table has RLS policy including workspace_id filter.

6. **Property_contacts RLS policy**
   Verify `property_contacts` table scopes to workspace via RLS.

### 🟠 **HIGH (Fix Soon)**

1. Extract **duplicate labels/colors** (ROLE_LABELS, STAGE_LABELS, TYPE_COLORS, TYPE_ACTIVE, etc.) to `lib/constants.ts`
2. Add **error handling for all API queries** (contacts, appointments, listings, properties)
3. **Validate numeric fields** (sqm, rooms, price, commission) are positive and in range
4. **Debounce contact search** to reduce API calls
5. **Add fallback handling** for JSON parse, photo uploads, geocoding

### 🟡 **MEDIUM (Fix Before Phase 6)**

1. Replace `any` types with strict interfaces
2. Add error boundaries or error states in UI for failed queries
3. Move i18n strings to constants
4. Validate all enum inputs before insert
5. Handle photo upload errors with user feedback
6. Add logging for non-critical failures (geocoding, workspace data)

### 🔵 **LOW (Nice to Have)**

1. Increase touch-target sizes for small icons
2. Extract CSS gradient strings to variables
3. Add keyboard navigation for filter pills
4. Remove unused type imports

---

## Testing Checklist for Phase 6

- [ ] User A cannot view User B's properties via `/api/properties/[id]`
- [ ] User A cannot advance a property stage out of order (sconosciuto → venduto)
- [ ] Photos >10MB are rejected
- [ ] Invalid property types (e.g., "nuke") are rejected with 400
- [ ] Contact search debounces (check Network tab — only 1 request when typing "Marco")
- [ ] Birthday card shows for contacts with future birthdays within 7 days
- [ ] Geocoding failures don't crash the listing creation
- [ ] Matching listings are filtered correctly by budget/rooms/sqm
- [ ] Stats on dashboard are accurate (no negative counts)
- [ ] CSV export includes all visible listings without "undefined" cells
- [ ] Incarico PDF generation only works for properties in "incarico" stage
- [ ] Linked properties on contact page show all three categories (owner, tenant, other)

---

## Files Affected by Issues

**lib/constants.ts** (needs creation)
- Extract ROLE_LABELS, STAGE_LABELS, TYPE_COLORS, TYPE_ACTIVE

**app/api/properties/[id]/advance/route.ts** (needs review — not provided)
- Add state machine validation

**app/api/properties/[id]/contacts/route.ts** (needs review — not provided)
- Verify workspace_id check

**lib/supabase/database.ts** or SPEC file
- Verify RLS policies on property_contacts, appointments, properties

---

## Next Steps

1. **Fix CRITICAL issues** immediately (workspace isolation, enum validation)
2. **Create lib/constants.ts** and consolidate duplicate labels/colors
3. **Add error handling** to all API queries
4. **Run Phase 6 tests** with focus on workspace isolation and data validation
5. **Security review** of all RLS policies before Phase 7
