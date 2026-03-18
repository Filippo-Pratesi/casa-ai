# PHASE 6 REVIEW: Database Migrations 038 & 039

**Review Date:** 2026-03-18
**Reviewer:** Haiku 4.5 Agent (Phase 6 Verification)
**Status:** ⚠️ **WARNINGS FOUND** — 2 issues require fixes before applying

---

## 1. Migration 038: properties_add_columns.sql

**Status:** ✅ **OK (with notes)**

### Syntax & Structure
- ✅ Correct ALTER TABLE syntax with `IF NOT EXISTS`
- ✅ Appropriate column types (INTEGER, TEXT, TEXT[])
- ✅ Valid CHECK constraint for `condition` enum values
- ✅ Proper index creation with `IF NOT EXISTS`
- ✅ No risk of data loss (all columns nullable or have defaults)

### Issues Found
**None.** Migration 038 is syntactically correct and compatible with migration 031.

### Columns Added
```sql
bathrooms INTEGER DEFAULT 1
floor INTEGER
total_floors INTEGER
condition TEXT (enum: nuovo, ottimo, buono, discreto, ristrutturato, da_ristrutturare)
features TEXT[] DEFAULT '{}'
incarico_notes TEXT
```

---

## 2. Migration 039: seed_banca_dati.sql

**Status:** ⚠️ **WARNINGS** — 2 CRITICAL issues + 1 inconsistency

### Issues Found

#### CRITICAL ISSUE #1: Missing `description` column in `zones` table
**Severity:** ❌ CRITICAL
**Location:** Line 50-56 (zones INSERT)
**Problem:**
```sql
insert into zones (id, workspace_id, name, description) values
  (v_zone_centro, v_ws_id, 'Centro Storico', 'Area del centro storico, alta densità abitativa'),
  ...
```

The `zones` table created in migration 033 does NOT have a `description` column:
```sql
-- From 033_zones.sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  city TEXT NOT NULL,           -- ← NOTE: city column exists
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, city, name)
);
```

**Root Cause:** Migration 033 defines `city` as NOT NULL but NOT unique per workspace. Migration 039 tries to insert zones WITHOUT the required `city` column AND adds non-existent `description` column.

**Fix Required:** Modify 039 zones INSERT to include `city` column and remove `description`:
```sql
insert into zones (id, workspace_id, city, name) values
  (v_zone_centro, v_ws_id, 'Milano', 'Centro Storico'),
  (v_zone_mare, v_ws_id, 'Milano', 'Zona Mare'),
  (v_zone_collina, v_ws_id, 'Milano', 'Collina'),
  (v_zone_periferia, v_ws_id, 'Milano', 'Periferia Nord'),
  (v_zone_nuova, v_ws_id, 'Milano', 'Zona Nuova')
on conflict do nothing;
```

---

#### CRITICAL ISSUE #2: Invalid `property_event_type` enum value
**Severity:** ❌ CRITICAL
**Location:** Line 141 (sconosciuto stage events) and line 173 (ignoto stage events)
**Problem:**
```sql
insert into property_events (..., event_type, ...) values
  (v_ws_id, v_pid, v_agent1, 'primo_contatto', ...)  -- Line 141
  (v_ws_id, v_pid, v_agent2, 'primo_contatto', ...)  -- Line 173
```

The enum value `primo_contatto` does NOT exist in migration 032's `property_event_type` enum.

**Valid enum values from 032:**
```
'nota', 'telefonata', 'visita', 'citofono', 'email_inviata', 'whatsapp_inviato',
'riunione', 'documento_caricato', 'incarico_firmato', 'proposta_ricevuta',
'proposta_accettata', 'proposta_rifiutata', 'proprietario_identificato',
'proprietario_cambiato', 'cambio_stage', 'annuncio_creato', 'annuncio_pubblicato',
'venduto', 'locato', 'contratto_scaduto', 'archiviato', 'ritorno', 'valutazione_ai',
'insight_ai', 'altro'
```

**Fix Required:** Replace `primo_contatto` with `proprietario_identificato` (semantically closest match for "owner identified"):
```sql
-- Line 141 fix:
insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
values (v_ws_id, v_pid, v_agent1, 'proprietario_identificato', 'Immobile identificato',
        'Avvistato durante giro di zona.', 'sconosciuto', now() - ((30 - i) * interval '1 day'))
on conflict do nothing;

-- Line 173 fix:
(v_ws_id, v_pid, v_agent2, 'proprietario_identificato', 'Sopralluogo esterno', 'Immobile osservato dall''esterno.', null, now() - ((25 - i) * interval '1 day')),
```

---

#### ⚠️ INCONSISTENCY: Event `new_stage` parameter usage (non-blocking)
**Severity:** ⚠️ WARNING (not breaking, but inconsistent)
**Location:** Various locations in property_events INSERTs
**Observation:**
- Lines 141-142: `new_stage` not provided (NULL) ✓ Correct
- Lines 173-174: `new_stage` provided only in second event
- Lines 211-215: All events provided with `new_stage`
- Some events with NULL `new_stage` when it should be NULL (correct)

**Status:** ✅ Not breaking — NULL is valid. Just inconsistent style. Safe to keep as-is.

---

### Record Count Verification

✅ All record counts match specification:

| Entity | Expected | Actual | Status |
|--------|----------|--------|--------|
| **Zones** | 5 | 5 (genrated UUIDs) | ✅ OK |
| **Sub-zones** | 10 | 10 (generated UUIDs) | ✅ OK |
| **Agent-zone assignments** | 4 | 4 inserted | ✅ OK |
| **Contacts** | 15 | 15 loop iterations | ✅ OK |
| **Properties - sconosciuto** | 5 | 5 (1..5) | ✅ OK |
| **Properties - ignoto** | 5 | 5 (1..5) | ✅ OK |
| **Properties - conosciuto** | 6 | 6 (1..6) | ✅ OK |
| **Properties - incarico** | 8 | 8 (1..8) | ✅ OK |
| **Properties - venduto** | 4 | 4 (1..4) | ✅ OK |
| **Properties - locato** | 4 | 4 (1..4) | ✅ OK |
| **Properties - disponibile** | 2 | 2 (1..2) | ✅ OK |
| **Total Properties** | 34 | 34 | ✅ OK |
| **Property Events - sconosciuto** | 5 | 5 (1×5) | ✅ OK |
| **Property Events - ignoto** | 10 | 10 (2×5) | ✅ OK |
| **Property Events - conosciuto** | 18 | 18 (3×6) | ✅ OK |
| **Property Events - incarico** | 32 | 32 (4×8) | ✅ OK |
| **Property Events - venduto** | 12 | 12 (3×4) | ✅ OK |
| **Property Events - locato** | 8 | 8 (2×4) | ✅ OK |
| **Property Events - disponibile** | 2 | 2 (1×2) | ✅ OK |
| **Total Events** | 87 | 87 | ✅ OK |

---

### Enum Values Verification

#### ✅ property_stage (all used values exist)
- sconosciuto ✓
- ignoto ✓
- conosciuto ✓
- incarico ✓
- venduto ✓
- locato ✓
- disponibile ✓

#### ✅ owner_disposition (all used values exist)
- sconosciuto ✓
- trattabile ✓
- disponibile ✓
- incarico_firmato ✓
- venduto ✓
- locato ✓

#### ❌ property_event_type (INVALID VALUES FOUND)
- proprietario_identificato ✓ (used as fix for primo_contatto)
- cambio_stage ✓
- telefonata ✓
- nota ✓
- visita ✓
- sentiment: positive, neutral, negative ✓ (all valid)

#### ✅ lease_type (all used values exist)
- 4_plus_4 ✓
- 3_plus_2 ✓
- transitorio ✓

#### ✅ property_contact_role (all used values exist)
- proprietario ✓

---

## Summary

| Migration | Status | Blockers | Notes |
|-----------|--------|----------|-------|
| **038** | ✅ OK | None | Syntactically correct, no data loss risk |
| **039** | ⚠️ NEEDS FIXES | 2 CRITICAL | Must fix zones INSERT (missing city, invalid description) and primo_contatto enum |

---

## Required Fixes

### Fix #1: Update zones INSERT in 039 (Line 50-56)

**BEFORE:**
```sql
insert into zones (id, workspace_id, name, description) values
  (v_zone_centro,    v_ws_id, 'Centro Storico',  'Area del centro storico, alta densità abitativa'),
  (v_zone_mare,      v_ws_id, 'Zona Mare',        'Lungomare e vicinanze, immobili con vista mare'),
  (v_zone_collina,   v_ws_id, 'Collina',          'Area collinare, villette e abitazioni di pregio'),
  (v_zone_periferia, v_ws_id, 'Periferia Nord',   'Zona residenziale periferica, prezzi accessibili'),
  (v_zone_nuova,     v_ws_id, 'Zona Nuova',       'Nuovo sviluppo urbano con edifici recenti')
on conflict do nothing;
```

**AFTER:**
```sql
insert into zones (id, workspace_id, city, name) values
  (v_zone_centro,    v_ws_id, 'Milano', 'Centro Storico'),
  (v_zone_mare,      v_ws_id, 'Milano', 'Zona Mare'),
  (v_zone_collina,   v_ws_id, 'Milano', 'Collina'),
  (v_zone_periferia, v_ws_id, 'Milano', 'Periferia Nord'),
  (v_zone_nuova,     v_ws_id, 'Milano', 'Zona Nuova')
on conflict do nothing;
```

### Fix #2: Replace `primo_contatto` with valid enum value (Lines 141 & 173)

**Option A: Use `proprietario_identificato`** (Best semantic match)
```sql
-- Line 141
insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
values (v_ws_id, v_pid, v_agent1, 'proprietario_identificato', 'Immobile identificato',
        'Avvistato durante giro di zona.', 'sconosciuto', now() - ((30 - i) * interval '1 day'))
on conflict do nothing;

-- Line 173 (in VALUES clause)
(v_ws_id, v_pid, v_agent2, 'proprietario_identificato', 'Sopralluogo esterno', 'Immobile osservato dall''esterno.', null, now() - ((25 - i) * interval '1 day')),
```

**Option B: Use `nota`** (Generic fallback, less semantic)
```sql
insert into property_events (..., event_type, ...) values
  (v_ws_id, v_pid, v_agent1, 'nota', 'Immobile identificato', ...)
  ...
```

**Recommendation:** Use Option A (`proprietario_identificato`). It's semantically correct for the first identification of a property owner/address.

---

## Conclusion

✅ **Migration 038** is ready to apply.

⚠️ **Migration 039** requires **2 critical fixes** before application:
1. Fix zones INSERT (add missing `city` column, remove non-existent `description`)
2. Replace `primo_contatto` with `proprietario_identificato` (valid enum value)

Once these fixes are applied, migration 039 will insert:
- **5 zones** with Milano city
- **10 sub-zones** across 5 zones
- **15 contacts** (sellers/owners)
- **4 agent-zone assignments**
- **34 properties** across all 7 stages
- **87 property_events** with valid enum values

All record counts and enum values will be consistent with specification.
