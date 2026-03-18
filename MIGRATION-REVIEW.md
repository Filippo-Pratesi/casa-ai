# Database Migration Review — Migrations 031–037

**Date:** 2026-03-18
**Reviewed by:** Database Reviewer Agent
**Status:** 7 Critical Issues, 8 Warnings, 6 OK Items

---

## CRITICAL ISSUES — MUST FIX BEFORE DEPLOYMENT

### 1. ISSUE: GiST Index Uses `ll_to_earth()` Without earthdistance Extension (Migration 031, Line 150)

**File:** `031_properties_core.sql`
**Line:** 150
**Severity:** CRITICAL — Will fail on deployment

```sql
CREATE INDEX properties_gist_idx ON properties USING GIST (ll_to_earth(latitude, longitude))
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

**Problem:**
- `ll_to_earth()` function requires the `earthdistance` PostgreSQL extension
- Extension is **not enabled** in any migration file
- Index creation will fail: `ERROR: function ll_to_earth(numeric, numeric) does not exist`

**Fix:** Either:
1. Add `CREATE EXTENSION IF NOT EXISTS "earthdistance";` at the start of migration 031
2. OR replace GiST index with simpler BTREE index on (latitude, longitude) and use Haversine function for queries (recommended for Supabase compatibility)

**Recommendation:** Remove the GiST index. Use standard BTREE index instead:
```sql
CREATE INDEX properties_lat_lng_idx ON properties(latitude, longitude);
```

---

### 2. ISSUE: Haversine Function Uses PL/pgSQL but SQL Version Specified in Spec (Migration 031, Lines 118–138)

**File:** `031_properties_core.sql`
**Lines:** 118–138
**Severity:** CRITICAL — Inconsistent with spec

**Migration 031 definition:**
```sql
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE ...
BEGIN ...
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Spec requirement (SPEC-DATABASE.md lines 351–361):**
```sql
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC AS $$
  SELECT 6371000 * 2 * ASIN(SQRT(...));
$$ LANGUAGE SQL IMMUTABLE;
```

**Problems:**
- Implementation uses `DECIMAL` but spec uses `NUMERIC` (minor type mismatch)
- Implementation uses PL/pgSQL; spec uses pure SQL (performance + simplicity difference)
- Parameter names differ: `lon1` vs `lng1` (migration uses `lon`, spec uses `lng`)
- PL/pgSQL version has overhead; pure SQL is more efficient

**Fix:** Replace with spec's pure SQL version for consistency and performance.

---

### 3. ISSUE: RLS Policies Don't Match Spec — Using Subquery Instead of `get_user_workspace_id()` (Multiple Files)

**Files:** `031_properties_core.sql`, `032_property_events.sql`, `033_zones.sql`, `034_property_contacts.sql`
**Severity:** CRITICAL — Security + Performance

**Implementation (031, lines 156–159):**
```sql
CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );
```

**Spec requirement (SPEC-DATABASE.md, lines 167–169):**
```sql
CREATE POLICY "properties_workspace_access" ON properties
  FOR ALL USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());
```

**Problems:**
- Subquery `(SELECT workspace_id FROM users WHERE id = auth.uid())` executes **per row** in WHERE clause
- This causes **N+1 subquery pattern** for large result sets
- Spec requires `get_user_workspace_id()` helper function (likely cached or optimized)
- `get_user_workspace_id()` function **doesn't exist** in any prior migration
- Spec consolidates SELECT/INSERT/UPDATE/DELETE into single "FOR ALL" policy; implementation splits them

**Fix:**
1. Create `get_user_workspace_id()` function in an earlier migration or at the start of 031:
```sql
CREATE OR REPLACE FUNCTION get_user_workspace_id() RETURNS UUID AS $$
  SELECT workspace_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;
```
2. Replace all RLS policies to use `workspace_id = get_user_workspace_id()` pattern
3. Consolidate to "FOR ALL" policies where applicable

---

### 4. ISSUE: Migration 037 References Non-Existent Enums — `proposal_type` and `lease_type` Not Yet Created (Migration 037)

**File:** `037_modify_proposals.sql`
**Lines:** 2, 8
**Severity:** CRITICAL — Schema Creation Failure

```sql
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type NOT NULL DEFAULT 'vendita';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tipo_contratto_locazione lease_type;
```

**Problem:**
- `proposal_type` enum created in migration **031** (line 27)
- `lease_type` enum created in migration **031** (line 33)
- Migration **037** tries to reference them **without waiting for 031 to complete**
- Supabase runs migrations sequentially: 031 → 032 → ... → 037
- If 031 fails (GiST issue), then 037 fails with `ERROR: type "proposal_type" does not exist`

**Fix:** No action needed IF migration 031 succeeds. However, ensure migration 031 is fully fixed first (see issue #1).

---

### 5. ISSUE: Circular Reference — `listings.property_id → properties.id` but `properties.listing_id → listings.id` (Migrations 031 & 036)

**Files:**
- `031_properties_core.sql` line 87 (properties.listing_id)
- `036_modify_listings.sql` line 2 (listings.property_id)

**Severity:** CRITICAL — May cause FK constraint issues on delete/update

**Problem:**
```
properties → listings (via properties.listing_id)
listings → properties (via listings.property_id)
```

This creates a **circular dependency**:
- Delete property → tries to delete listing (via property_id)
- Delete listing → tries to delete property (via listing_id)
- Both have `ON DELETE CASCADE` — **potential for unintended cascading deletes**

**Actual behavior:**
- Both FKs set to `ON DELETE SET NULL`, so cascades won't occur
- However, a user must carefully manage which is created first
- Risk: If someone later changes `ON DELETE` behavior, data loss could occur

**Fix (Option A):**
- Remove bidirectional reference
- Properties can reference listings (many-to-one)
- Listings should NOT reference properties (keep one-way relationship)
- Recommendation: Keep only `properties.listing_id`, remove `listings.property_id`

**Fix (Option B):**
- Keep both but document the constraint clearly
- Add trigger to enforce ONE listing per property
- Add CHECK constraint

**Current Status:** Works because both use `SET NULL`, but is architecturally risky.

---

### 6. ISSUE: Missing RLS Policy for UPDATE in `property_contacts` (Migration 034)

**File:** `034_property_contacts.sql`
**Lines:** 58–61
**Severity:** CRITICAL — Authorization Bypass

```sql
CREATE POLICY "property_contacts_update" ON property_contacts
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );
```

**Problem:**
- RLS UPDATE policy has `USING` clause but **no `WITH CHECK` clause**
- `USING` controls which rows can be selected for update
- `WITH CHECK` controls which rows can be updated to
- Without `WITH CHECK`, user can UPDATE any row matching workspace_id to ANY values (including wrong workspace!)
- Violates principle: **USING and WITH CHECK should match for UPDATE policies**

**Fix:** Add `WITH CHECK`:
```sql
CREATE POLICY "property_contacts_update" ON property_contacts
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
```

---

### 7. ISSUE: `property_events` RLS Missing Agent-Level Access Control (Migration 032)

**File:** `032_property_events.sql`
**Lines:** 85–88
**Severity:** CRITICAL — Over-Permissive Access

```sql
CREATE POLICY "property_events_insert" ON property_events
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );
```

**Problem:**
- Insert policy allows ANY user in the workspace to insert events on ANY property
- Should restrict: only `agent_id = auth.uid()` (your own events) OR admin
- Current: Agent A can create fake events on Agent B's properties
- **Violates least privilege principle**

**Fix:**
```sql
CREATE POLICY "property_events_insert" ON property_events
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin')))
  );
```

---

## WARNINGS — SHOULD FIX

### W1: Missing Index on `property_events.agent_id` (Migration 032, Line 69)

**File:** `032_property_events.sql`
**Actual:** Line 71 creates `property_events_agent_id_idx`
**Status:** ✓ OK — Index exists

---

### W2: `property_contact_role` Allows Multiple Roles Per Person? (Migration 034)

**File:** `034_property_contacts.sql`
**Line:** 24
**Severity:** MEDIUM Warning

```sql
role property_contact_role NOT NULL,
```

**Design Question:**
- Column is single ENUM, not array
- But Spec allows property contacts to have multiple roles (e.g., proprietario + moglie_marito)
- Schema only allows one role per property_contacts row
- Workaround: Create multiple rows (one per role), use UNIQUE(property_id, contact_id, role)

**Status:** Design is valid (normalization via multiple rows), but not obvious. Document this.

---

### W3: Missing NOT NULL on `property_events.agent_id` (Migration 032, Line 42)

**File:** `032_property_events.sql`
**Line:** 42
**Severity:** LOW Warning

```sql
agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
```

**Problem:**
- Spec shows `agent_id` as NOT NULL (line 188)
- Implementation allows NULL
- When agent is deleted, events are orphaned

**Fix:** Change to:
```sql
agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```
Or accept NULL for system-generated events.

---

### W4: `old_stage` and `new_stage` in `property_events` Never Used? (Migration 032)

**File:** `032_property_events.sql`
**Lines:** 54–55
**Severity:** LOW Warning

```sql
old_stage property_stage,
new_stage property_stage,
```

**Question:**
- These columns are unused by application (no trigger populates them)
- Should be auto-populated by trigger when stage changes?
- Or are they optional manual notes?

**Recommendation:** Either:
1. Add trigger to auto-populate on property stage changes
2. Or remove columns and use event_type = 'cambio_stage' + metadata JSONB instead

---

### W5: `properties.zone` and `properties.sub_zone` Are TEXT Fields, Not FK (Migration 031)

**File:** `031_properties_core.sql`
**Lines:** 52–53
**Severity:** MEDIUM Warning

```sql
zone TEXT,
sub_zone TEXT,
```

**Problem:**
- Should be FK references to `zones(id)` and `sub_zones(id)`
- Current implementation allows invalid/stale zone names
- No referential integrity

**Spec expectation:** Likely intended to be FK or structured reference
**Fix:** Change to:
```sql
zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
sub_zone_id UUID REFERENCES sub_zones(id) ON DELETE SET NULL,
```

---

### W6: Haversine Function Missing Index Hint for Geo Queries (Migration 031)

**File:** `031_properties_core.sql`
**Lines:** 140–151
**Severity:** LOW Warning

**Problem:**
- Haversine function is defined but no example query pattern shown
- For vicinanza search (nearby properties), need to call:
```sql
SELECT * FROM properties
WHERE haversine_distance(latitude, longitude, $lat, $lng) < 100
ORDER BY haversine_distance(latitude, longitude, $lat, $lng);
```
- Without index on (latitude, longitude), this is slow

**Status:** Index exists (though GiST is problematic; BTREE is fine)
**Recommendation:** Document the recommended query pattern in a comment or API doc

---

### W7: Property Contact Unique Constraint Missing `workspace_id` (Migration 034)

**File:** `034_property_contacts.sql`
**Line:** 35
**Severity:** MEDIUM Warning

```sql
UNIQUE(property_id, contact_id, role)
```

**Problem:**
- Unique constraint doesn't include `workspace_id`
- Could theoretically violate workspace isolation if data is copied across workspaces
- Should be `UNIQUE(workspace_id, property_id, contact_id, role)`

**Fix:**
```sql
UNIQUE(workspace_id, property_id, contact_id, role)
```

---

### W8: Agent Zone UNIQUE Constraint Should Include Workspace (Migration 033)

**File:** `033_zones.sql`
**Line:** 36
**Severity:** MEDIUM Warning

```sql
UNIQUE(workspace_id, agent_id, zone_id)
```

**Status:** ✓ Actually correct! This one is fine.

---

## OK ITEMS — CORRECTLY IMPLEMENTED

### ✓ 1. Enum Creation Order (Migrations 031–032)

All enums created in migration 031 BEFORE tables that use them:
- `property_stage` (line 2) used by properties table (line 60)
- `owner_disposition` (line 13) used by properties (line 61)
- `property_transaction_type` (line 27) used by properties (line 62)
- `lease_type` (line 33) used by properties (line 90)
- `property_event_type` (line 2 of 032) used by property_events (line 45)
- `sentiment` (line 31 of 032) used by property_events (line 51)
- `property_contact_role` (line 2 of 034) used by property_contacts (line 24)

✓ Correct dependency order.

---

### ✓ 2. Foreign Key Indexes Exist

All FK columns have indexes:
- ✓ properties_workspace_id_idx (031:141)
- ✓ properties_agent_id_idx (031:142)
- ✓ properties_owner_contact_id_idx (031:146)
- ✓ properties_tenant_contact_id_idx (031:147)
- ✓ property_events_property_id_idx (032:70)
- ✓ property_events_agent_id_idx (032:71)
- ✓ property_events_contact_id_idx (032:73)
- ✓ property_contacts_property_id_idx (034:40)
- ✓ property_contacts_contact_id_idx (034:41)
- ✓ agent_zones_zone_id_idx (033:46)

---

### ✓ 3. Updated_at Triggers Exist

All tables have `updated_at` triggers pointing to existing `update_updated_at()` function (defined in migration 003):
- ✓ properties_updated_at (031:184)
- ✓ zones_updated_at (033:118)
- ✓ sub_zones_updated_at (033:122)
- ✓ property_contacts_updated_at (034:69)

---

### ✓ 4. Backfill Migration 035 Handles Data Correctly

Migration 035 (modify contacts):
```sql
UPDATE contacts SET roles = ARRAY[type::TEXT] WHERE roles = '{}' OR roles IS NULL;
```

✓ Correctly copies `type` field to new `roles[]` array for existing records.

---

### ✓ 5. IF NOT EXISTS Clauses Prevent Errors

Migrations 035–037 use `IF NOT EXISTS` for idempotency:
- `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS` (035:2-4)
- `ALTER TABLE listings ADD COLUMN IF NOT EXISTS` (036:2)
- `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS` (037:2-10)

✓ Safe for rerun.

---

### ✓ 6. Timestamps Are Properly TIMESTAMPTZ

All timestamps use `TIMESTAMPTZ` (not bare `TIMESTAMP`):
- ✓ properties created_at/updated_at (031:113-114)
- ✓ property_events event_date/created_at (032:64-65)
- ✓ zones created_at/updated_at (033:8-9)
- ✓ property_contacts created_at/updated_at (034:32-33)

✓ No timezone issues.

---

## MIGRATION EXECUTION ORDER & DEPENDENCY GRAPH

```
001 (initial) → 002 → 003 (contacts, update_updated_at) → ... → 030
    ↓
031 (properties + enums) ← WAIT, fix GiST issue first
    ↓
032 (property_events)
    ↓
033 (zones)
    ↓
034 (property_contacts)
    ↓
035 (modify contacts)
    ↓
036 (modify listings)
    ↓
037 (modify proposals)
```

---

## SUMMARY TABLE

| # | Type | Severity | Component | Status |
|---|------|----------|-----------|--------|
| 1 | GiST `ll_to_earth()` | CRITICAL | 031 | Must fix |
| 2 | Haversine func mismatch | CRITICAL | 031 | Must fix |
| 3 | RLS subquery N+1 | CRITICAL | 031,032,033,034 | Must fix |
| 4 | Missing enums in 037 | CRITICAL | 037 | Depends on 031 |
| 5 | Circular FK reference | CRITICAL | 031,036 | Design issue |
| 6 | Property_contacts UPDATE RLS missing WITH CHECK | CRITICAL | 034 | Must fix |
| 7 | property_events INSERT over-permissive | CRITICAL | 032 | Must fix |
| W1 | property_contact_role single vs multi | MEDIUM | 034 | Document |
| W2 | property_events.agent_id nullable | LOW | 032 | Optional |
| W3 | Unused old_stage/new_stage | LOW | 032 | Clarify design |
| W4 | properties.zone should be FK | MEDIUM | 031 | Optional |
| W5 | Missing index query patterns | LOW | 031 | Document |
| W6 | property_contacts UNIQUE missing workspace | MEDIUM | 034 | Should fix |

---

## RECOMMENDED ACTION PLAN

### Phase 1: Fix Before Deploying (CRITICAL)
1. Remove or replace GiST index with BTREE
2. Create `get_user_workspace_id()` function
3. Update all RLS policies to use it
4. Fix property_contacts UPDATE WITH CHECK
5. Fix property_events INSERT policy
6. Fix Haversine function to match spec

### Phase 2: Optional Improvements
1. Change properties.zone/sub_zone to FK references
2. Add workspace_id to property_contacts UNIQUE constraint
3. Clarify stage transition logic (old_stage/new_stage)
4. Add database-level comments for complex patterns

### Phase 3: Testing
- Run migrations in test environment first
- Verify RLS policies with test user data
- Load test vicinanza queries with sample geo data
- Validate circular FK cascades don't cause issues

---

## Spec Compliance Summary

| Item | Spec | Implementation | Status |
|------|------|-----------------|--------|
| Enum definitions | All 6 | ✓ Present | ✓ Match |
| properties table | Yes | ✓ Yes | ⚠ Minor differences |
| property_events | Yes | ✓ Yes | ⚠ Missing agent_id NOT NULL |
| zones/sub_zones | Yes | ✓ Yes | ✓ Match |
| agent_zones | Yes | ✓ Yes | ✓ Match |
| property_contacts | Yes | ✓ Yes | ⚠ UNIQUE constraint |
| RLS pattern | get_user_workspace_id() | Subquery IN | ✗ Not matching |
| Haversine function | SQL pure | PL/pgSQL | ✗ Not matching |
| GiST index | Not mentioned | ll_to_earth | ✗ Will fail |

