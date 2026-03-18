# Comprehensive Database Migration Review
## Sprint I — Banca Dati Immobiliare (Phase 1)
**Migrations Reviewed:** 031–037
**Review Date:** 2026-03-18
**Reviewer:** PostgreSQL Expert

---

## CRITICAL ISSUES (MIGRATION BLOCKERS)

### 1. [CRITICAL] Undefined Enum 'proposal_type' in Migration 037
**File:** `037_modify_proposals.sql`
**Line:** 2
**Severity:** CRITICAL — Migration will fail

**Issue:**
The migration references a non-existent `proposal_type` enum. Migration 031 defines `property_transaction_type`, not `proposal_type`.

```sql
-- Current (WRONG):
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type NOT NULL DEFAULT 'vendita';
-- Error: type "proposal_type" does not exist
```

**Fix:**
Create the enum first, then add the column:
```sql
-- Add before the ALTER TABLE:
CREATE TYPE proposal_type AS ENUM ('vendita', 'affitto');
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type NOT NULL DEFAULT 'vendita';
```

---

### 2. [CRITICAL] Unsafe NULL Backfill in Migration 035 — Silent Data Loss
**File:** `035_modify_contacts.sql`
**Line:** 7
**Severity:** CRITICAL — Data integrity loss

**Issue:**
The backfill query silently fails for contacts with `type = NULL`:

```sql
-- Current (UNSAFE):
UPDATE contacts SET roles = ARRAY[type::TEXT] WHERE roles = '{}' OR roles IS NULL;
-- If type is NULL, ARRAY[NULL::TEXT] fails, row is skipped, roles stays NULL or '{}'
```

**Problem:** Some contacts may end up with NULL roles when they should have a value, or vice versa. No error is raised; silent data loss.

**Fix:**
```sql
-- Use CASE to handle NULL values explicitly:
UPDATE contacts
SET roles = CASE
  WHEN type IS NOT NULL THEN ARRAY[type::TEXT]
  ELSE '{}'
END
WHERE roles = '{}' OR roles IS NULL;

-- Alternatively, validate first:
UPDATE contacts
SET roles = ARRAY[type::TEXT]
WHERE (roles = '{}' OR roles IS NULL) AND type IS NOT NULL;

-- Then handle remaining NULLs:
UPDATE contacts
SET roles = '{}'
WHERE roles IS NULL;
```

---

### 3. [CRITICAL] Missing UPDATE Policy WITH CHECK Clause — properties Table
**File:** `031_properties_core.sql`
**Lines:** 160–167
**Severity:** CRITICAL — RLS bypass

**Issue:**
The UPDATE policy has `USING` but no `WITH CHECK`. This allows updating a property to have `workspace_id` or `agent_id` values that violate constraints.

```sql
-- Current (INCOMPLETE):
CREATE POLICY "properties_update" ON properties
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (agent_id = auth.uid() OR ...)
  );
-- Missing WITH CHECK clause
```

**Risk:** User can update a property to transfer it to a different workspace or agent without permission checks on the new state.

**Fix:**
```sql
CREATE POLICY "properties_update" ON properties
  FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin')))
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND agent_id IN (SELECT id FROM users WHERE workspace_id = properties.workspace_id)
  );
```

---

### 4. [CRITICAL] Missing UPDATE Policy WITH CHECK — zones and sub_zones Tables
**File:** `033_zones.sql`
**Lines:** 64–68 (zones_update), 87–91 (sub_zones_update)
**Severity:** CRITICAL — RLS bypass

**Issue:**
Both UPDATE policies use `USING` without `WITH CHECK`, allowing updates that violate workspace scope.

```sql
-- Current (INCOMPLETE):
CREATE POLICY "zones_update" ON zones
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  );
-- Missing WITH CHECK clause
```

**Fix (for both zones and sub_zones):**
```sql
CREATE POLICY "zones_update" ON zones
  FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );

-- Same for sub_zones_update
CREATE POLICY "sub_zones_update" ON sub_zones
  FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin'))
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
  );
```

---

### 5. [CRITICAL] Circular Foreign Keys — properties ↔ listings
**File:** `031_properties_core.sql` (line 87) + `036_modify_listings.sql` (line 2)
**Severity:** CRITICAL — Potential data loss, cascade complexity

**Issue:**
Two-way foreign key relationship:
- `properties.listing_id` → `listings(id)` ON DELETE SET NULL
- `listings.property_id` → `properties(id)` ON DELETE SET NULL

While the ON DELETE behavior is currently safe (SET NULL), this bidirectional relationship creates referential integrity complexity. If one side changes to CASCADE, mutual deletion becomes possible.

```sql
-- From 031_properties_core.sql line 87:
listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

-- From 036_modify_listings.sql line 2:
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
```

**Issue:**
- Hard to maintain consistency (both sides must be updated together)
- Risk of accidental mutual cascade if either FK is changed
- Application must enforce invariant that both relationships are kept in sync

**Recommendation:**
Keep current ON DELETE SET NULL approach. Add database constraint to prevent both from being set simultaneously:

```sql
-- Add CHECK constraint to enforce business logic:
ALTER TABLE properties ADD CONSTRAINT property_listing_consistency
  CHECK (
    -- Both set or neither set, not partially set
    (listing_id IS NOT NULL AND property_id IS NOT NULL) OR
    (listing_id IS NULL AND property_id IS NULL)
  );
-- Wait, this constraint would need to be on listings table. Alternative:

-- Better: Add application-level validation + comments
ALTER TABLE properties ADD CONSTRAINT property_listing_consistency
  CHECK (listing_id IS NOT NULL); -- If property is 'incarico' stage, must have listing

ALTER TABLE listings ADD CONSTRAINT listing_property_consistency
  CHECK (property_id IS NOT NULL); -- If listing exists, should reference property
```

Actually, these are **not bidirectional requirements**. A property may exist without a listing (early stages). A listing may exist without a property (legacy). So circular is OK if SET NULL is used. **RECOMMENDATION: Add comments documenting this is intentional.**

---

## HIGH SEVERITY ISSUES

### 6. [HIGH] property_type as TEXT, Not Enum — No Type Safety
**File:** `031_properties_core.sql`
**Line:** 68
**Severity:** HIGH — Data quality, orphaned values

**Issue:**
`property_type` is stored as TEXT with no constraint. The migration comment says `'apartment', 'house', 'villa'` etc., but there's no CHECK constraint to enforce valid values.

```sql
-- Current (UNSAFE):
property_type TEXT DEFAULT 'apartment',
-- Can be anything: 'apt', 'APARTMENT', 'xyz123', NULL
```

**Risk:** Invalid property types leak into the database. Filters and aggregations break. UI displays garbage values.

**Fix:**
Either create an enum (better) or add a CHECK constraint:

```sql
-- Option A: Create enum (requires separate migration)
CREATE TYPE property_type_enum AS ENUM ('apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other');
ALTER TABLE properties ALTER COLUMN property_type TYPE property_type_enum USING property_type::property_type_enum;

-- Option B: Add CHECK constraint (simpler, no type change)
ALTER TABLE properties ADD CONSTRAINT property_type_valid CHECK (
  property_type IN ('apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other')
);
```

**Recommended:** Option B (less risky for existing data).

---

### 7. [HIGH] zone and sub_zone as TEXT, Not ForeignKey — Referential Integrity Loss
**File:** `031_properties_core.sql`
**Lines:** 52–53
**Severity:** HIGH — Orphaned zones, data integrity

**Issue:**
`properties.zone` and `properties.sub_zone` are TEXT strings, not UUID ForeignKeys to the zones/sub_zones tables created in migration 033.

```sql
-- Current (WRONG):
zone TEXT,
sub_zone TEXT,
-- Should be:
zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
sub_zone_id UUID REFERENCES sub_zones(id) ON DELETE SET NULL,
```

**Risk:**
- Zone can be deleted without updating properties
- Zone name changes aren't reflected in properties (stale data)
- No validation that zone_id exists before inserting
- Queries to find properties in a zone require text matching (slow, error-prone)

**Fix:**
This requires a data migration (Phase 2 priority):

```sql
-- 1. Add new FK columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sub_zone_id UUID REFERENCES sub_zones(id) ON DELETE SET NULL;

-- 2. Backfill by matching zone name (careful!)
UPDATE properties p
SET zone_id = (SELECT id FROM zones WHERE workspace_id = p.workspace_id AND city = p.city AND name = p.zone LIMIT 1)
WHERE zone IS NOT NULL AND zone_id IS NULL;

-- 3. After verifying backfill, drop TEXT columns
ALTER TABLE properties DROP COLUMN zone;
ALTER TABLE properties DROP COLUMN sub_zone;

-- 4. Add indexes
CREATE INDEX properties_zone_id_idx ON properties(zone_id);
CREATE INDEX properties_sub_zone_id_idx ON properties(sub_zone_id);
```

---

### 8. [HIGH] agent_id ON DELETE CASCADE — Loss of Property Portfolio
**File:** `031_properties_core.sql`
**Line:** 45
**Severity:** HIGH — Data loss, business continuity

**Issue:**
```sql
agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```

If an agent is deleted (or their user record is deleted), **all their properties are deleted automatically**. In a real estate business, this is catastrophic—properties should be reassigned, not deleted.

**Risk:** Agent quits → user record deleted → entire portfolio vanishes. No audit trail, no reassignment opportunity.

**Fix:**
Use `SET NULL` (requires nullable agent_id) and implement business logic for reassignment:

```sql
-- Option A: Soft deletes (add is_deleted flag to users)
ALTER TABLE properties ADD CONSTRAINT agent_must_exist CHECK (
  agent_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE id = agent_id AND NOT is_deleted)
);

-- Option B: Reassign to workspace admin (requires trigger)
ALTER TABLE properties ALTER COLUMN agent_id DROP NOT NULL; -- Make nullable
ALTER TABLE properties ALTER COLUMN agent_id SET DEFAULT NULL;
-- Then add trigger:
CREATE OR REPLACE FUNCTION reassign_properties_on_agent_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.agent_id IS NOT NULL THEN
    UPDATE properties
    SET agent_id = (
      SELECT id FROM users
      WHERE workspace_id = OLD.workspace_id AND role = 'admin'
      LIMIT 1
    )
    WHERE agent_id = OLD.id AND workspace_id = OLD.workspace_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- But this still requires user to exist. Better: keep reference but allow soft delete.
```

**Recommended:** Implement soft deletes on users table (add `is_deleted` column, filter in RLS policies).

---

### 9. [HIGH] Missing UPDATE Policy for property_events — Immutable or Forbidden?
**File:** `032_property_events.sql`
**Severity:** HIGH — Functionality unclear

**Issue:**
The table has INSERT and DELETE policies, but no UPDATE policy. By default, users cannot UPDATE events.

```sql
-- Missing:
CREATE POLICY "property_events_update" ON property_events ...
```

**Question:** Is this intentional (append-only audit log) or an oversight?

- **If append-only is intended:** Add a comment documenting this, and add a CHECK constraint preventing updates:
  ```sql
  -- Create immutable trigger
  CREATE TRIGGER property_events_immutable
    BEFORE UPDATE ON property_events
    FOR EACH ROW
    EXECUTE FUNCTION raise_immutable_error(); -- See immutable table pattern
  ```

- **If updates should be allowed:** Add UPDATE policy:
  ```sql
  CREATE POLICY "property_events_update" ON property_events
    FOR UPDATE
    USING (
      workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
      AND (agent_id = auth.uid() OR EXISTS (...admin check...))
    )
    WITH CHECK (
      workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    );
  ```

**Fix:** Add documentation or implement immutability.

---

### 10. [HIGH] property_contacts UPDATE Policy — Missing Referential Integrity Checks
**File:** `034_property_contacts.sql`
**Lines:** 58–61
**Severity:** HIGH — Orphaned relations

**Issue:**
The UPDATE policy doesn't validate that contact_id and property_id still exist (or are in the same workspace).

```sql
-- Current:
CREATE POLICY "property_contacts_update" ON property_contacts
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
-- Missing: validation that contact and property exist
```

**Risk:** UPDATE `property_contacts` to set `contact_id` to a deleted contact's ID (FK exists but contact is orphaned), or point to contact from different workspace.

**Fix:**
```sql
CREATE POLICY "property_contacts_update" ON property_contacts
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()))
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM properties WHERE id = property_id AND workspace_id = property_contacts.workspace_id)
    AND EXISTS (SELECT 1 FROM contacts WHERE id = contact_id AND workspace_id = property_contacts.workspace_id)
  );
```

---

### 11. [HIGH] No Agent Immutability in properties UPDATE Policy
**File:** `031_properties_core.sql`
**Lines:** 160–167
**Severity:** HIGH — Audit trail, business logic

**Issue:**
The UPDATE policy allows any non-owner agent (with admin role) to change `agent_id`, effectively reassigning a property without formal process.

```sql
-- Current allows this for admins:
UPDATE properties SET agent_id = different_agent_id WHERE id = ...
```

**Risk:** Properties can be silently reassigned. No audit trail. Agent loses commission (or gains undeserved commission). Multi-tenant security: admin from workspace A could reassign agent B's properties.

**Fix:**
Add WITH CHECK to prevent unauthorized agent_id changes:

```sql
CREATE POLICY "properties_update" ON properties
  FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin')))
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    -- Only allow agent_id change for admins, and only to valid agents in same workspace:
    AND (
      agent_id = (SELECT agent_id FROM properties WHERE id = properties.id) -- Preserve original unless admin
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role IN ('admin', 'group_admin')
        AND EXISTS (SELECT 1 FROM users WHERE id = properties.agent_id AND workspace_id = properties.workspace_id)
      )
    )
  );
```

---

## MEDIUM SEVERITY ISSUES

### 12. [MEDIUM] Inefficient RLS Policies — N+1 workspace_id Lookups
**File:** All migrations (031–034)
**Severity:** MEDIUM — Performance degradation

**Issue:**
Every RLS policy evaluates `SELECT workspace_id FROM users WHERE id = auth.uid()` separately. With many tables and users, this adds latency.

```sql
-- Pattern repeated 20+ times:
workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
```

**Impact:** Each query runs subquery per row evaluated. With 10k properties per workspace, this is expensive.

**Recommendation:**
Cache the workspace_id in a session variable set at login:

```sql
-- Add to login handler (API route):
CALL set_claim('workspace_id', auth.uid());
-- Then in policies:
workspace_id = current_setting('app.workspace_id')::uuid
```

Or use prepared statements:
```sql
-- Use helper function (which is already defined in 001_initial_schema.sql):
workspace_id = get_my_workspace_id()
```

**Fix:** Verify `get_my_workspace_id()` is being called, or use session variable pattern.

---

### 13. [MEDIUM] Incorrect DEFAULT for proposal_type — Misclassifies Existing Rentals
**File:** `037_modify_proposals.sql`
**Line:** 2
**Severity:** MEDIUM — Data quality, business logic

**Issue:**
When adding `proposal_type` column with DEFAULT 'vendita' to existing proposals, all existing rental proposals (those with `tipo_contratto_locazione IS NOT NULL`) are incorrectly marked as sales.

```sql
-- Current:
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type NOT NULL DEFAULT 'vendita';
-- All existing rows get 'vendita' even if they're rentals
```

**Fix:**
Add column without NOT NULL, backfill correctly, then add NOT NULL:

```sql
-- Step 1: Create enum (if not exists)
CREATE TYPE IF NOT EXISTS proposal_type AS ENUM ('vendita', 'affitto');

-- Step 2: Add column
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type proposal_type;

-- Step 3: Backfill intelligently
UPDATE proposals
SET proposal_type = CASE
  WHEN tipo_contratto_locazione IS NOT NULL THEN 'affitto'
  ELSE 'vendita'
END
WHERE proposal_type IS NULL;

-- Step 4: Add NOT NULL constraint
ALTER TABLE proposals ALTER COLUMN proposal_type SET NOT NULL;
```

---

### 14. [MEDIUM] Unsafe DEFAULT Application in contacts.roles — Inconsistent State
**File:** `035_modify_contacts.sql`
**Lines:** 2–7
**Severity:** MEDIUM — Data consistency

**Issue:**
Adding `DEFAULT '{}'` doesn't retroactively apply to existing NULL rows. Combined with unsafe UPDATE (issue #3), some contacts end up with inconsistent roles.

```sql
-- Current:
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';
UPDATE contacts SET roles = ARRAY[type::TEXT] WHERE roles = '{}' OR roles IS NULL;
-- If roles IS NULL and type IS NULL, the UPDATE doesn't execute, roles stays NULL
-- But column is NOT NULL, so this violates constraint
```

**Fix:**
Reorder to ensure all rows are populated before adding NOT NULL:

```sql
-- Step 1: Add nullable column
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Step 2: Backfill all rows safely
UPDATE contacts
SET roles = CASE
  WHEN type IS NOT NULL THEN ARRAY[type::TEXT]
  ELSE '{}'
END;

-- Step 3: Add NOT NULL + DEFAULT
ALTER TABLE contacts ALTER COLUMN roles SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN roles SET DEFAULT '{}';
```

---

### 15. [MEDIUM] agent_zones Missing UPDATE Policy
**File:** `033_zones.sql`
**Lines:** 99–115
**Severity:** MEDIUM — Functionality limitation

**Issue:**
`agent_zones` has SELECT, INSERT, and DELETE policies, but no UPDATE policy. If an admin needs to change a zone assignment for an agent (e.g., move agent from zone A to zone B), they must DELETE + INSERT. UPDATE is blocked.

```sql
-- Missing:
CREATE POLICY "agent_zones_update" ON agent_zones
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'group_admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
```

**Fix:** Add UPDATE policy above.

---

### 16. [MEDIUM] Haversine Function — No Performance Optimization
**File:** `031_properties_core.sql`
**Lines:** 119–130
**Severity:** MEDIUM — Performance risk at scale

**Issue:**
The Haversine function uses trigonometric calculations on every invocation. No spatial index support. For 10k+ properties, queries like "find properties near me" will be slow.

```sql
CREATE OR REPLACE FUNCTION haversine_distance(...)
RETURNS NUMERIC AS $$
  SELECT 6371000 * 2 * ASIN(SQRT(...))
$$ LANGUAGE SQL IMMUTABLE;
```

**Risk:** Nearby search endpoint (vicinanza) will be O(n) table scan.

**Recommendation:**
- **Option A:** Use PostGIS extension with GiST index (best for geographic data)
- **Option B:** Pre-compute and cache distance calculations for common searches
- **Option C:** Use bounding box filtering before Haversine to reduce candidate set

**Recommendation for now:** Document that this is not optimized. Add performance test before Phase 2 completion. Consider PostGIS in future.

---

### 17. [MEDIUM] property_events.agent_id ON DELETE SET NULL — Broken Audit Trail
**File:** `032_property_events.sql`
**Line:** 42
**Severity:** MEDIUM — Audit integrity, data quality

**Issue:**
When an agent is deleted, their events become orphaned (`agent_id = NULL`). This breaks audit trail: "who created this event?"

```sql
agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
```

**Risk:** Event logging loses context. Compliance/audit requirements fail.

**Recommendation:**
Either:
1. Use ON DELETE CASCADE (delete event when agent deleted) + document that events are agent-scoped
2. Implement soft deletes on users (add `is_deleted` column)
3. Create an immutable snapshot of agent name/id in event when created (denormalization)

**Fix (Option 2 — soft deletes):**
```sql
ALTER TABLE events ADD CONSTRAINT agent_exists_check CHECK (
  agent_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE id = agent_id AND is_deleted = false)
);
```

---

## LOW SEVERITY ISSUES

### 18. [LOW] No CHECK Constraint — lease_end_date >= lease_start_date
**File:** `031_properties_core.sql`
**Lines:** 91–92
**Severity:** LOW — Data quality, business logic

**Issue:**
Lease dates can be entered backwards (end before start).

```sql
lease_start_date DATE,
lease_end_date DATE,
-- No validation
```

**Fix:**
```sql
ALTER TABLE properties ADD CONSTRAINT lease_dates_valid
  CHECK (lease_end_date IS NULL OR lease_start_date IS NULL OR lease_end_date >= lease_start_date);
```

---

### 19. [LOW] No CHECK Constraint — estimated_value Can Be Negative
**File:** `031_properties_core.sql`
**Line:** 71
**Severity:** LOW — Data quality

**Fix:**
```sql
ALTER TABLE properties ADD CONSTRAINT estimated_value_positive
  CHECK (estimated_value IS NULL OR estimated_value >= 0);
```

---

### 20. [LOW] No CHECK Constraint — monthly_rent Can Be Negative
**File:** `031_properties_core.sql`
**Lines:** 93–94
**Severity:** LOW — Data quality

**Fix:**
```sql
ALTER TABLE properties
  ADD CONSTRAINT monthly_rent_positive CHECK (monthly_rent IS NULL OR monthly_rent >= 0),
  ADD CONSTRAINT monthly_rent_discounted_non_negative CHECK (monthly_rent_discounted IS NULL OR monthly_rent_discounted >= 0);
```

---

### 21. [LOW] is_primary Not Uniquely Enforced — Multiple Primaries Per Property
**File:** `034_property_contacts.sql`
**Line:** 27
**Severity:** LOW — Data quality, business logic

**Issue:**
`is_primary BOOLEAN` allows multiple `is_primary = true` rows for the same property.

```sql
-- Nothing prevents:
INSERT INTO property_contacts (..., is_primary = true, property_id = X, role = 'proprietario') ...
INSERT INTO property_contacts (..., is_primary = true, property_id = X, role = 'figlio') ...
```

**Fix:**
Add partial unique index:
```sql
CREATE UNIQUE INDEX property_contacts_one_primary_per_property
  ON property_contacts(property_id) WHERE is_primary = true;
```

---

### 22. [LOW] listings.property_id — No RLS or Validation
**File:** `036_modify_listings.sql`
**Line:** 2
**Severity:** LOW — Data consistency

**Issue:**
`listings.property_id` is added, but there's no validation that `listings.agent_id = properties.agent_id`. Inconsistency could arise if they're managed separately.

```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
```

**Risk:** Agent A creates a listing, Agent B links it to a different property (from a different agent). Confusion in UI.

**Recommendation:** Add application-level validation or database trigger.

---

### 23. [LOW] Enum Transitions Undocumented — Business Logic Unclear
**File:** All migrations
**Severity:** LOW — Maintainability, knowledge transfer

**Issue:**
`property_stage` enum has 7 values, but no documentation on valid state transitions or prerequisites.

Example: Can a property go from `conosciuto` directly to `venduto`? Or must it pass through `incarico` first?

**Fix:**
Add SQL comments documenting state machine:
```sql
COMMENT ON TYPE property_stage IS 'Property lifecycle stages. Valid transitions:
  - sconosciuto (only address known)
  - → ignoto (contacted, details gathered)
  - → conosciuto (owner identified, willing to discuss)
  - → incarico (mandate signed, listing created)
  - → venduto (sale completed)
  - → locato (rental contract active)
  - → disponibile (rental contract expired)

  Reverse transitions (back to earlier stages) handled by manual status change.
';
```

---

## SUMMARY TABLE

| Issue | Severity | File | Line | Category | Impact |
|-------|----------|------|------|----------|--------|
| #1 | CRITICAL | 037 | 2 | Enum definition | Migration fails |
| #2 | CRITICAL | 035 | 7 | Data integrity | Silent data loss |
| #3 | CRITICAL | 031 | 160 | RLS policy | Security bypass |
| #4 | CRITICAL | 033 | 64, 87 | RLS policy | Security bypass |
| #5 | CRITICAL | 031, 036 | 87, 2 | FK design | Data loss risk |
| #6 | HIGH | 031 | 68 | Type safety | Orphaned data |
| #7 | HIGH | 031 | 52 | FK design | Data integrity |
| #8 | HIGH | 031 | 45 | FK behavior | Portfolio loss |
| #9 | HIGH | 032 | — | RLS clarity | Undefined behavior |
| #10 | HIGH | 034 | 58 | RLS policy | Orphaned relations |
| #11 | HIGH | 031 | 160 | RLS policy | Audit trail |
| #12 | MEDIUM | All | — | Performance | Query latency |
| #13 | MEDIUM | 037 | 2 | Backfill logic | Data misclassification |
| #14 | MEDIUM | 035 | 2 | Constraint | Inconsistent state |
| #15 | MEDIUM | 033 | — | RLS policy | Workflow limitation |
| #16 | MEDIUM | 031 | 119 | Performance | Slow queries |
| #17 | MEDIUM | 032 | 42 | Audit | Broken trail |
| #18 | LOW | 031 | 91 | CHECK constraint | Data quality |
| #19 | LOW | 031 | 71 | CHECK constraint | Data quality |
| #20 | LOW | 031 | 93 | CHECK constraint | Data quality |
| #21 | LOW | 034 | 27 | Unique constraint | Data quality |
| #22 | LOW | 036 | 2 | Validation | Data consistency |
| #23 | LOW | All | — | Documentation | Maintainability |

---

## DEPLOYMENT READINESS

### ⛔ BLOCKERS (Fix before deploying Phase 1):
- **Issue #1:** Undefined enum (causes migration failure)
- **Issue #2:** Unsafe NULL backfill (data loss)
- **Issue #3:** Missing WITH CHECK in properties UPDATE
- **Issue #5:** Missing WITH CHECK in zones UPDATE

### ⚠️ PHASE 1+ ISSUES (Fix during Phase 2):
- **Issue #7:** zone/sub_zone should be FKs
- **Issue #6:** property_type should be constrained
- **Issue #8:** agent_id ON DELETE behavior (soft deletes)
- **Issue #13:** Rental proposal backfill
- **Issue #10:** property_contacts validation

### 📋 PHASE 3+ (After launch):
- **Issues #12, #16, #17:** Performance and audit improvements
- **Issues #18–22:** CHECK constraints and unique indexes
- **Issue #23:** Documentation

---

## RECOMMENDED FIXES (In order of priority)

1. **Create `proposal_type` enum** (before 037 runs)
2. **Fix backfill in 035** (use CASE statement)
3. **Add WITH CHECK to properties UPDATE** (031)
4. **Add WITH CHECK to zones/sub_zones UPDATE** (033)
5. **Add CHECK constraint to property_type** (031 or new migration)
6. **Plan FK migration for zone/sub_zone** (Phase 2)
7. **Implement soft deletes for users** (Phase 2)
8. **Add UPDATE policy for property_events** (clarify intent)

---

End of Review.
