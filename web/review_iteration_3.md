# Code Review — Iteration 3

**Date:** 2026-03-20
**Reviewer:** Claude Opus 4.6
**Scope:** API routes (banca-dati, contacts, appointments, todos, properties), calendar/todos/banca-dati components

---

## A. Logical / Data / Architectural Issues

### A1. Todos GET lacks workspace_id scoping — cross-workspace data leak

**Files:** `web/app/api/todos/route.ts` (lines 12-17), `web/app/api/todos/[id]/route.ts` (lines 26-30)

The `GET /api/todos` endpoint filters by `assigned_to` or `created_by` only, without any `workspace_id` constraint. If a user ID is reused or a user belongs to multiple workspaces, they may see todos from other workspaces. Similarly, `PATCH` and `DELETE` on `/api/todos/[id]` only check ownership by user IDs, not workspace membership.

**Fix:** After fetching the user profile (which already happens in POST), add `.eq('workspace_id', profile.workspace_id)` to the GET query. In PATCH/DELETE, verify that the todo's `workspace_id` matches the user's workspace.

---

### A2. Contacts search query is vulnerable to PostgREST operator injection

**File:** `web/app/api/contacts/route.ts` (lines 33-42)

The `search` parameter from the query string is interpolated directly into the `.or()` filter string without sanitizing PostgREST special characters (e.g., `.`, `%`, parentheses). Unlike the properties route (line 30) which strips `'"();\\`, the contacts route passes `search` raw into `.ilike.%${search}%`. A crafted search string could inject additional PostgREST filter operators.

**Fix:** Apply the same sanitization used in the properties route: `search.replace(/['"();\\]/g, '').trim().slice(0, 100)`. Alternatively, use parameterized filtering.

---

### A3. Contacts GET uses user-JWT client (RLS) while POST uses user-JWT for insert — inconsistency with CLAUDE.md mandate

**File:** `web/app/api/contacts/route.ts` (lines 26, 116)

Both GET and POST use `supabase` (user JWT client) for the actual database queries rather than `createAdminClient()`. The project's CLAUDE.md explicitly states: "Always use `createAdminClient()` in API routes for DB operations (RLS blocks user-JWT queries on cross-table lookups)." Meanwhile, the properties route correctly uses admin for inserts. This inconsistency may cause failures if RLS policies change.

**Fix:** Switch to `admin` client for the contacts queries, consistent with the rest of the codebase pattern.

---

### A4. Appointments POST accepts arbitrary `starts_at` / `ends_at` without date format validation

**File:** `web/app/api/appointments/route.ts` (lines 77, 85-97)

The route checks that `starts_at` is truthy but never validates it parses to a valid date. An invalid string (e.g., `"not-a-date"`) would be inserted into the database and then cause `new Date(...)` to produce `Invalid Date` on line 112, resulting in the notification body containing "Invalid Date". The `ends_at` field is even less validated — it is passed through as-is.

**Fix:** Add `if (isNaN(new Date(String(body.starts_at)).getTime())) return error(400)`. Apply the same check to `ends_at` when present.

---

### A5. Todos POST has priority value mismatch — validates Italian values, inserts English default

**File:** `web/app/api/todos/route.ts` (lines 55-56, 74)

The validation on line 55-56 checks `VALID_PRIORITIES = ['bassa', 'media', 'alta']`, but the default inserted on line 74 is `'medium'` (English). This means if the client sends `priority: 'media'`, it passes validation and gets inserted as `'media'`; but if no priority is sent, it defaults to `'medium'`. The database will contain a mix of Italian and English priority values, breaking filtering and sorting.

**Fix:** Decide on one convention (the UI uses `'low'/'medium'/'high'` internally per `PRIORITY_CONFIG` in `todo-types.ts`), update `VALID_PRIORITIES` to `['low', 'medium', 'high']`, and keep the default as `'medium'`.

---

### A6. Property owner_contact_id update lacks workspace_id guard when setting via proprietario link

**File:** `web/app/api/properties/[id]/contacts/route.ts` (lines 166-178)

When linking a `proprietario` contact, the code fetches the property to check if `owner_contact_id` is already set (line 167-172), then updates it without including `workspace_id` in the `.eq('id', id)` filter on line 177. This means if a UUID collision occurs or an attacker guesses a property ID from another workspace, the update could affect a different workspace's property.

**Fix:** Add `.eq('workspace_id', workspaceId)` to both the select (line 170) and update (line 177) calls.

---

### A7. Contacts DELETE archive flow has TOCTOU race condition with listing deletion

**File:** `web/app/api/contacts/[id]/route.ts` (lines 207-248)

When `bought && archiveListing && listingId`, the code fetches the listing, archives it, then deletes it, using the user-JWT client. Between the fetch (line 208) and the delete (line 242), another request could modify or delete the same listing. Also, if the archive insert fails silently, the listing delete still proceeds, causing data loss without an archived copy.

**Fix:** Wrap the archive+delete in a transaction (or use a Supabase RPC function). At minimum, check the archive insert result before proceeding with deletion.

---

### A8. Birthday message endpoint lacks date validation — generates messages for contacts without upcoming birthdays

**File:** `web/app/api/contacts/[id]/birthday-message/route.ts` (lines 49-109)

The endpoint generates a birthday message for any contact on demand, regardless of whether their birthday is actually upcoming. There is no check that `date_of_birth` is set or that the birthday falls within a reasonable window. This means any authenticated user can trigger unlimited DeepSeek API calls (cost) for any contact.

**Fix:** Add a check that `contact.date_of_birth` is set, and optionally verify the birthday is within the next 7 days. Consider rate limiting this endpoint per contact per day.

---

### A9. Appointments modal sends `agent_id` for new appointments but server ignores it when user is an agent

**File:** `web/components/calendar/appointment-modal.tsx` (line 66), `web/app/api/appointments/route.ts` (lines 80-83)

The modal always sends `agent_id: assignedAgentId` (line 66), but the server only honors it if `profile.role !== 'agent'` (line 81). For non-admin users, the `agent_id` field is silently ignored, which could confuse users who see the agent selector in the UI but whose selection has no effect. However, the UI already hides the agent selector for non-admins (line 156 of the modal), so this is a minor concern.

**Fix:** No server change needed, but document this behavior. Consider adding a warning or removing the agent_id from the request body when the user is not an admin.

---

## B. UX / UI / Aesthetic Issues

### B1. Calendar week view day columns clickthrough opens create modal instead of selecting day

**File:** `web/components/calendar/calendar-client.tsx` (lines 418-428)

Clicking anywhere in a week-view day column calls `handleDayClick`, which immediately opens the create modal. Users who just want to select a day to view its appointments in the sidebar must click the narrow day header strip instead. This is confusing — a single click should select the day; double-click or the "+" button should open the modal.

**Fix:** Change `handleDayClick` to only `setSelectedDay(day)`. Add a dedicated "+" button overlay for creating, or require a double-click to open the modal.

---

### B2. Contacts card uses `c.type` (primary) for border/avatar styling instead of `c.types[0]`

**File:** `web/components/contacts/contacts-client.tsx` (lines 263-264)

`ContactCard` uses `TYPE_BORDER_CLASS[c.type]` and `TYPE_AVATAR_GRADIENT[c.type]` to style the card. However, the `type` field is the legacy single-type column, while `types[]` is the source of truth. If a contact's `types` has been updated but `type` is stale (e.g., still `'buyer'` while `types` is `['seller', 'buyer']`), the card border color will be wrong.

**Fix:** Use `const primaryType = (c.types && c.types.length > 0) ? c.types[0] : c.type` and use that for both `TYPE_BORDER_CLASS` and `TYPE_AVATAR_GRADIENT`.

---

### B3. Pagination in contacts-client drops all existing query parameters when changing page

**File:** `web/components/contacts/contacts-client.tsx` (lines 69-73)

`goToPage` creates a brand-new `URLSearchParams()` and only sets `page`, losing any existing search query (`q`) or other URL params. If the user had searched for contacts and then clicks page 2, the search is lost.

**Fix:** Initialize `params` from the current URL: `const params = new URLSearchParams(window.location.search)`, then set the page.

---

### B4. Todo delete has no confirmation dialog — one-click destructive action

**File:** `web/components/todos/todos-client.tsx` (line 147-153), `web/components/todos/todo-row.tsx` (line 100)

Clicking the trash icon immediately deletes the todo with no undo and no confirmation. The delete is optimistic (line 147) and failures are silently caught. For a productivity feature, accidental deletions could be frustrating.

**Fix:** Either add a confirmation dialog or implement an undo-toast pattern (delay the actual DELETE call for 3-5 seconds and show a "Annulla" toast).

---

### B5. Calendar appointment modal uses native HTML selects for contacts/listings — no search capability

**File:** `web/components/calendar/appointment-modal.tsx` (lines 141-155)

The contacts and listings dropdowns are plain `<select>` elements. With 200 contacts loaded (the limit in the page query), finding the right one requires scrolling through a long unsearchable list. This is especially bad on mobile.

**Fix:** Replace with a searchable combobox component (e.g., shadcn `Combobox` or a filtered input dropdown similar to the one used in `nuovo-immobile-client.tsx` for contact search).

---

### B6. Immobile detail page header actions wrap poorly on medium-width screens

**File:** `web/components/banca-dati/immobile-detail-client.tsx` (lines 382-441)

The header packs multiple buttons (advance stage, delete, create listing, view listing, create campaign) in a `flex gap-2 shrink-0` container alongside the title/stage/disposition selectors. On tablet-width screens (~768-1024px), these items wrap awkwardly because there is no responsive breakpoint handling — the buttons stack vertically while the title area still tries to use most of the width.

**Fix:** Move secondary actions (create campaign, view listing) into a dropdown menu on smaller screens. Use `flex-wrap` and prioritize the primary advance-stage button.

---

### B7. Nuevo immobile form does not disable submit when latitude/longitude are missing despite API requiring them

**File:** `web/components/banca-dati/nuovo-immobile-client.tsx` (lines 183-249), `web/app/api/properties/route.ts` (lines 114-115)

The API requires `latitude` and `longitude` (returns 400 if null), but the form submits `latitude: latitude ?? null` (line 199). When coordinates are not resolved (e.g., geocoding failed), the form submits, hits the server, and shows a generic error toast. The user gets no proactive warning that coordinates are needed.

**Fix:** Either disable the submit button when `latitude === null` with a visible helper message, or make the API accept null coordinates (the "Coordinate non trovate" warning on line 326-329 suggests this was intended to be optional).

---

### B8. Calendar loading state shows skeleton only in day detail panel, not in the main calendar grid

**File:** `web/components/calendar/calendar-client.tsx` (lines 483-488)

When `loading` is true, only the day detail sidebar shows skeletons. The main calendar grid renders with stale/empty data during the fetch. On slow connections, this creates a jarring disconnect — the sidebar shows loading but the grid appears "done."

**Fix:** Add a subtle loading indicator over the calendar grid as well (e.g., an opacity overlay or a thin progress bar at the top of the grid).

---

### B9. Contacts card "Nessuna preferenza impostata" renders alongside the budget/location section when only budget_min is set

**File:** `web/components/contacts/contacts-client.tsx` (lines 330-358)

The "no preferences" message shows when `!c.budget_max && (!c.preferred_cities || c.preferred_cities.length === 0)` (line 330). But line 335 shows the budget section when `c.budget_min || c.budget_max || c.min_rooms || ...`. So if a contact has `budget_min` set but not `budget_max`, both the "no preferences" text AND the budget info section render simultaneously.

**Fix:** Include `c.budget_min` and `c.min_rooms` in the condition on line 330, or invert the logic to render the "no preferences" message only when the detailed section would be empty.

---

### B10. Todo form lacks keyboard shortcut hint for Escape to close

**File:** `web/components/todos/todos-client.tsx` (lines 196-295)

The form supports Escape to close (via `onKeyDown` handlers), but there is no visible hint. The "N" shortcut is prominently displayed in the header button (line 176), but the Escape shortcut is undiscoverable. Users must guess or accidentally find it.

**Fix:** Add a small `Esc` keyboard hint near the "Annulla" button, matching the style of the `N` hint.

---

## C. Major Feature Proposals

### C1. Unified Activity Feed / Dashboard Timeline

Currently, events are scattered across property cronistoria (`property_events`) and contact cronistoria (`contact_events`), each visible only on their respective detail pages. There is no unified view of "what happened today" across the entire workspace.

**Proposal:** Create a real-time activity feed on the dashboard that merges property_events, contact_events, appointments, and notifications into a single chronological timeline. Allow filtering by agent, event type, and date range. This would give admins a bird's-eye view of workspace activity and help agents quickly see what requires attention.

**Key files to modify:** `web/app/(app)/dashboard/`, new API route `/api/activity-feed`, new component `components/dashboard/activity-feed.tsx`.

---

### C2. Bulk Operations on Banca Dati Properties

The banca-dati list currently supports only individual property operations. Common real-estate workflows require bulk actions: reassigning multiple properties to a different agent, advancing multiple sconosciuto/ignoto properties that share the same owner, or exporting a filtered subset.

**Proposal:** Add multi-select checkboxes to the banca-dati table with a floating action bar. Support bulk operations: (1) change agent assignment, (2) change disposition, (3) add a batch note to all selected properties, (4) export selected as CSV. This would dramatically reduce repetitive work for agencies managing hundreds of properties.

**Key files to modify:** `web/components/banca-dati/banca-dati-table.tsx`, `web/components/banca-dati/banca-dati-client.tsx`, new API route `/api/properties/bulk`.

---

### C3. Offline-Capable Property Notes via Service Worker

Real estate agents frequently visit properties in areas with poor mobile connectivity (basements, rural locations). Currently, adding a note or event to a property requires an active network connection; if the fetch fails, data is lost.

**Proposal:** Implement a service worker with IndexedDB queue for offline note/event creation. When offline, the UI would save events locally and show a "pending sync" indicator. Upon reconnection, queued events would be flushed to the API. This is critical for the citofono/visita workflows where agents are physically at the property.

**Key files to create:** `web/public/sw.js`, `web/lib/offline-queue.ts`, modifications to `web/components/banca-dati/event-timeline.tsx` to support offline-first submission.
