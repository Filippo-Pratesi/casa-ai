# Code Review — casa-ai — Iteration 1

> Reviewer: Claude Opus 4.6
> Date: 2026-03-20
> Scope: lib/, hooks/, components/contacts/, components/shared/, components/dashboard/, components/banca-dati/, app/api/contacts/, app/api/properties/, app/api/banca-dati/, app/(app)/dashboard/, app/(app)/contacts/, app/(app)/banca-dati/

---

## A. Logical / Data / Architectural Issues

### A1. Plan tier enum mismatch between plan-limits.ts and types.ts

**Files:**
- `web/lib/plan-limits.ts` — defines plan tiers as `'trial' | 'starter' | 'agenzia' | 'network'`
- `web/lib/supabase/types.ts` (line 34) — defines workspace plan as `'trial' | 'starter' | 'growth' | 'network'`
- `web/lib/storage-limits.ts` — uses `'growth'`

**Issue:** The plan tier `'agenzia'` in plan-limits.ts does not exist in the database type definition, which uses `'growth'`. This means any workspace on the `'growth'` plan will never match in plan-limits.ts and will fall through to trial-level defaults. Conversely, storage-limits.ts uses `'growth'` correctly. This is a data integrity bug affecting feature gating and storage quotas.

**Fix:** Unify all plan tier references to match the database enum. Change `'agenzia'` to `'growth'` in `web/lib/plan-limits.ts`, or update the database enum to use `'agenzia'` and propagate everywhere. The database enum is the source of truth.

---

### A2. Contact import API does not set the `types` array column

**File:** `web/app/api/contacts/import/route.ts`

**Issue:** When importing contacts via CSV, only the legacy `type` (string) column is set. The `types` (text[]) column is never populated. Since the UI filters contacts using the `types` array, imported contacts will not appear when filtering by type. This was a known pattern already fixed in other contact-creation endpoints.

**Fix:** After setting `type`, also set `types: [mappedType]` in the insert payload. Example:
```ts
type: mappedType,
types: [mappedType],
```

---

### A3. Property contact creation API does not set the `types` array

**File:** `web/app/api/properties/[id]/contacts/route.ts` (line ~111)

**Issue:** When creating a new contact inline from the property detail page (the "create new contact" path in the POST handler), only the legacy `type` field is set, not the `types` array. This causes the same filtering issue as A2 for contacts created via Banca Dati.

**Fix:** Add `types: [type]` alongside the `type` field in the contact insert payload.

---

### A4. N+1 query in banca-dati alerts API

**File:** `web/app/api/banca-dati/alerts/route.ts` (lines 39-50)

**Issue:** The alerts endpoint loads all properties in stages `conosciuto` and `incarico`, then loops over each property individually to check for recent events — one query per property. For a workspace with hundreds of properties, this generates hundreds of sequential database queries.

**Fix:** Replace the loop with a single query using a subquery or CTE. For example:
```sql
SELECT property_id, MAX(event_date) as last_event_date
FROM property_events
WHERE property_id = ANY($1)
GROUP BY property_id
HAVING MAX(event_date) < NOW() - INTERVAL '14 days'
```
Or use the Supabase admin client with `.in('property_id', propertyIds)` and group in JS.

---

### A5. Attachment download lacks workspace_id ownership check — path traversal risk

**File:** `web/app/api/contacts/[id]/attachments/download/route.ts`

**Issue:** The download endpoint takes a `path` query parameter and downloads the file from Supabase Storage without verifying that the storage path belongs to the authenticated user's workspace. Any authenticated user who knows (or guesses) a storage path can download any file from any workspace's storage bucket. This is a CRITICAL security issue not covered in SECURITY_AUDIT.md.

**Fix:** Validate that the `path` parameter starts with the user's `workspace_id` prefix. Example:
```ts
if (!path.startsWith(`${profile.workspace_id}/`)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### A6. SQL injection vector in Banca Dati text search

**File:** `web/app/(app)/banca-dati/page.tsx` (lines 94-104)

**Issue:** The text search filter uses string interpolation directly into the ILIKE pattern without sanitizing the `q`, `street`, and `civic` parameters:
```ts
query = query.or(`address.ilike.%${q}%,city.ilike.%${q}%,zone.ilike.%${q}%`)
```
While Supabase's PostgREST layer provides some protection, special characters like `%`, `_`, `(`, and `)` in the search query can break the filter syntax or produce unexpected results. The `or()` method interprets the string as a PostgREST filter expression, so characters like commas and dots in user input can alter the filter logic.

**Fix:** Escape special PostgREST filter characters (`%`, `_`, `.`, `,`, `(`, `)`) in user input before interpolation, or use parameterized RPC calls instead.

---

### A7. `omi-valuation.ts` creates its own Supabase client instead of using shared `createAdminClient()`

**File:** `web/lib/omi-valuation.ts`

**Issue:** This module imports `createClient` directly from `@supabase/supabase-js` and creates its own admin client with raw `process.env` values, duplicating the pattern in `web/lib/supabase/admin.ts`. The function also returns `any` type, losing type safety. If the admin client initialization logic ever changes (e.g., adding custom headers or configuration), this module would be out of sync.

**Fix:** Replace the local client creation with `import { createAdminClient } from '@/lib/supabase/admin'` and add proper return types.

---

### A8. `gemini.ts` unsafe JSON.parse without try/catch

**File:** `web/lib/gemini.ts` (around line 122)

**Issue:** After cleaning the AI response string (stripping markdown fences), `JSON.parse(clean)` is called without a try/catch block. If Gemini returns malformed JSON (which happens occasionally with LLMs), this will throw an unhandled exception and crash the API route. In contrast, `web/lib/deepseek.ts` correctly wraps its JSON.parse in try/catch.

**Fix:** Wrap the JSON.parse call in a try/catch block and return a structured error:
```ts
try {
  const parsed = JSON.parse(clean)
  return parsed
} catch {
  return { error: 'Invalid JSON response from AI model' }
}
```

---

### A9. `facebook.ts` leaks raw API response in error messages

**File:** `web/lib/facebook.ts`

**Issue:** Error messages thrown from this module include `JSON.stringify(data)`, which exposes the full Meta Graph API response — including access tokens, page IDs, and internal error details — to the caller. If these errors surface in the UI (e.g., via toast notifications), sensitive data is exposed to the end user.

**Fix:** Extract only the user-safe error message from the API response:
```ts
throw new Error(`Errore pubblicazione Instagram: ${data?.error?.message ?? 'errore sconosciuto'}`)
```

---

### A10. `google-calendar.ts` uses unsafe `(admin as any)` cast and stores tokens in plaintext

**File:** `web/lib/google-calendar.ts` (line 53)

**Issue:** The module casts the admin client with `(admin as any)` to bypass TypeScript type checking. More critically, Google OAuth refresh tokens are stored in plaintext in the `google_calendar_tokens` table. If the database is compromised, all users' Google Calendar access tokens are immediately usable. This is documented in SECURITY_AUDIT.md but remains unfixed.

**Fix:** For the type cast, update `web/lib/supabase/types.ts` to include the `google_calendar_tokens` table definition. For token storage, encrypt tokens at rest using a server-side encryption key (e.g., AES-256-GCM with a key from environment variables).

---

### A11. Duplicate `ROLE_LABELS` constants across multiple files

**Files:**
- `web/components/banca-dati/immobile-detail-client.tsx` (lines 33-47)
- `web/components/banca-dati/add-contact-dialog.tsx` (lines 18-32)
- `web/app/(app)/contacts/[id]/page.tsx` (lines 231-236)

**Issue:** The `ROLE_LABELS` mapping (proprietario, venditore, acquirente, etc.) is defined independently in three files. The version in `contacts/[id]/page.tsx` is missing `venditore` and `acquirente` entries that exist in the other two. If a new role is added, it must be updated in all three locations, which is error-prone.

**Fix:** Extract `ROLE_LABELS` into a shared constants file (e.g., `web/lib/property-role-labels.ts`) and import it everywhere.

---

### A12. `use-mobile.ts` hook returns false during SSR, risking hydration mismatch

**File:** `web/hooks/use-mobile.ts`

**Issue:** The hook initializes `isMobile` as `undefined` and returns `!!isMobile` (which is `false`). During SSR, window is unavailable so it stays `false`. If the client renders with a mobile viewport, the first render will show the desktop layout, then snap to mobile after the `useEffect` runs. This causes a React hydration mismatch warning and a visual flash.

**Fix:** Initialize with `undefined` and handle the loading state explicitly, or use a CSS-only approach for the initial render:
```ts
const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)
// Return undefined during SSR, let consumers handle it
return isMobile
```

---

## B. UX / UI / Aesthetic Issues

### B1. Stage color inconsistency between Banca Dati and Contact detail page

**Files:**
- `web/components/banca-dati/property-stage-icon.tsx` — ignoto = `text-slate-500 / bg-slate-100`
- `web/app/(app)/contacts/[id]/page.tsx` (lines 223-230) — ignoto = `bg-orange-100 text-orange-700`

**Issue:** The same property stage `ignoto` ("Non contattato") renders with completely different colors depending on whether you view it from Banca Dati (slate/gray) or from the Contact detail page (orange). Similarly, `conosciuto` is blue in Banca Dati but green on the contact page. This inconsistency confuses users who learn to associate stages with specific colors.

**Fix:** Import and reuse the canonical `STAGE_CONFIG` from `web/components/banca-dati/property-stage-icon.tsx` on the contact detail page, or extract stage colors to a shared constant.

---

### B2. Contact type badge color inconsistency

**Files:**
- `web/components/contacts/contact-type-badges.tsx` — seller = `amber`
- `web/lib/contact-utils.ts` — seller = `green`

**Issue:** The `ContactTypeBadges` component uses amber for sellers, but `contact-utils.ts` (used in the contacts list and other places) uses green. A seller's badge changes color depending on which page you're viewing.

**Fix:** Align both files to use the same color mapping. Pick one as canonical and update the other.

---

### B3. Duplicate `WhatsAppIcon` component and `birthdayDaysLeft` function

**Files:**
- `web/components/contacts/contacts-client.tsx`
- `web/components/contacts/contacts-table.tsx`

**Issue:** Both files contain identical implementations of the `WhatsAppIcon` SVG component and the `birthdayDaysLeft` utility function. Additionally, `birthdayDaysLeft` is also defined a third time in `web/app/(app)/contacts/[id]/page.tsx` (lines 187-195). Code duplication increases maintenance burden and risk of divergence.

**Fix:** Extract `WhatsAppIcon` into `web/components/shared/whatsapp-icon.tsx` and `birthdayDaysLeft` into `web/lib/contact-utils.ts`, then import from both locations.

---

### B4. Hardcoded Italian strings not using the i18n system

**File:** `web/components/contacts/contacts-table.tsx` (lines 158-161)

**Issue:** The strings "Aggiunto" and "Da chi" are hardcoded in Italian directly in the component rather than using the i18n translation system at `web/lib/i18n/`. While the app is Italian-only today, this inconsistency makes future internationalization harder and creates a pattern that other developers might follow.

**Fix:** Add these strings to the Italian translation file in `web/lib/i18n/` and use the translation function. At minimum, extract them to a constants object at the top of the file for consistency.

---

### B5. Incarico dialog: commission max attribute contradicts validation

**File:** `web/components/banca-dati/incarico-dialog.tsx` (lines 50, 98)

**Issue:** The HTML input has `max="10"` (line 98), but the JavaScript validation accepts up to 20% (line 50: `commission > 20`). A user sees the input suggesting max 10% but can type 15% and it passes validation. This creates confusion about the actual limit.

**Fix:** Align both values. If the business rule is max 10%, change the validation to `commission > 10`. If it's truly 20%, change the HTML `max` attribute to `20`.

---

### B6. Property detail page: `h2` has duplicate `font-semibold` class

**File:** `web/components/banca-dati/immobile-detail-client.tsx` (line 475)

**Issue:** The cronistoria heading has `className="font-semibold text-xs font-semibold uppercase..."` — `font-semibold` appears twice. While Tailwind deduplicates this, it signals a copy-paste error and reduces code clarity.

**Fix:** Remove the duplicate `font-semibold`.

---

### B7. Contact detail page is an enormous server component (~587 lines)

**File:** `web/app/(app)/contacts/[id]/page.tsx`

**Issue:** This single server component file is 587 lines long, containing: 7 parallel database queries, data transformation logic, 3 inline constant maps (STAGE_LABELS, STAGE_COLORS, ROLE_LABELS), the `birthdayDaysLeft` utility function, and extensive JSX for linked properties, match results, preferences, and appointments. This makes the file difficult to navigate, test, and modify.

**Fix:** Extract sections into sub-components:
- `ContactHeroCard` — the gradient header and contact info
- `ContactPreferences` — buyer search preferences display
- `ContactMatchResults` — the matched properties list
- `ContactLinkedProperties` — the linked properties section
Move data fetching into a dedicated `getContactDetail(id, workspaceId)` function in `lib/` or a server action.

---

### B8. `ImmobileDetailClient` uses `any` for the property prop

**File:** `web/components/banca-dati/immobile-detail-client.tsx` (lines 85-86, 95-96)

**Issue:** The main property prop is typed as `any`, and the component has `eslint-disable` comments to suppress the warning. The `normalizeEvents` function also takes `any[]`. Throughout the 700+ line component, property fields are accessed without type safety — if a field is renamed in the database, TypeScript cannot catch the breakage.

**Fix:** Define a proper `Property` interface covering all accessed fields (address, city, zone, stage, owner_disposition, etc.) and use it as the prop type. This also enables better IDE autocompletion for developers.

---

### B9. Banca Dati page server component uses excessive `(admin as any)` casts

**File:** `web/app/(app)/banca-dati/page.tsx` — 8 occurrences of `(admin as any)`

**Issue:** Nearly every Supabase query in this file requires an `(admin as any)` cast because the `Database` type in `types.ts` does not include the `properties`, `property_events`, `zones`, or `agent_zones` tables. This disables all type checking on these queries, meaning column name typos, wrong filter values, and incorrect select shapes all pass the compiler silently.

**Fix:** Update `web/lib/supabase/types.ts` to include all tables used in the application (properties, property_events, property_contacts, zones, sub_zones, agent_zones, contact_events, match_results, omi_zones, google_calendar_tokens). This is a one-time effort that would eliminate most `as any` casts across the codebase.

---

## C. Major Feature Proposals

### C1. Centralize and complete the Database type definitions

The `Database` type in `web/lib/supabase/types.ts` only covers 4 tables (groups, workspaces, users, listings), but the application has 20+ tables. This forces every query on other tables to use `(admin as any)`, which disables TypeScript's compile-time safety. The Supabase CLI can auto-generate types from the live database schema:

```bash
npx supabase gen types typescript --project-id <project-id> > web/lib/supabase/types.ts
```

This would eliminate ~80% of `as any` casts, catch column name errors at compile time, and improve developer experience with autocompletion.

### C2. Extract shared constants and utility modules

Multiple files independently define the same constants: `ROLE_LABELS` (3 files), `PROPERTY_TYPE_IT` (2 files), `STAGE_LABELS`/`STAGE_COLORS` (2 files), `TYPE_LABELS`/`TYPE_COLORS` (2+ files), `WhatsAppIcon` (2 files), `birthdayDaysLeft` (3 files). Create a `web/lib/constants/` directory with:
- `property-roles.ts` — ROLE_LABELS
- `property-types.ts` — PROPERTY_TYPE_IT
- Move `WhatsAppIcon` to `web/components/shared/`
- Move `birthdayDaysLeft` to `web/lib/contact-utils.ts`

### C3. Add rate limiting and input sanitization middleware

The SECURITY_AUDIT.md identifies missing rate limiting as a high-priority issue. Implement a middleware-based approach:
- Use `next-rate-limit` or a Redis-backed token bucket for API routes
- Add PostgREST filter sanitization for all user-supplied search parameters
- Add CORS configuration in `next.config.ts`

This addresses 3 of the 11 findings in SECURITY_AUDIT.md in a single effort.
