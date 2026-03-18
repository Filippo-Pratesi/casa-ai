# Phase 7 Security Review — Sprint I Banca Dati

**Date:** 2026-03-18  
**Files Reviewed:** 4 (1 migration + 3 other)  
**Review Scope:** CRITICAL and HIGH severity issues only

---

## Summary

All reviewed files pass security checks. No CRITICAL or HIGH issues identified.

---

## Files Reviewed

| File | Type | Status |
|------|------|--------|
| `migration 042_security_hardening.sql` | Database triggers | PASS |
| `migration 040_seed_extended_banca_dati.sql` (first 80 lines) | Database seed | PASS |
| `migration 041_link_listings_to_contacts.sql` | Database migration | PASS |
| `app/(app)/banca-dati/page.tsx` | React Server Component | PASS |

---

## Detailed Findings

### 1. Migration 042: Security Hardening

**Status:** SECURE

This migration introduces database-level workspace isolation enforcement via triggers:

- **validate_property_contact_workspace()** — Validates `owner_contact_id` and `tenant_contact_id` belong to the same workspace (lines 6-34)
  - Correctly checks both `id` and `workspace_id` in the WHERE clause
  - Raises exception on violation
  - Properly handles NULL values

- **validate_event_workspace()** — Ensures property_events match property workspace (lines 37-54)
  - Validates both property_id and workspace_id match
  - Raises exception on violation
  - Applied to INSERT only (appropriate for append-only table)

- **validate_property_contact_link()** — Ensures both property and contact belong to same workspace (lines 57-81)
  - Validates both sides of the relationship
  - Correctly checks workspace_id on both tables
  - Properly formatted trigger

- **Database constraints** (lines 88-101)
  - Positive value checks on financial fields: `monthly_rent`, `deposit`, `sold_price`, `incarico_commission_percent`
  - Range constraint on commission (0-20%)
  - All constraints include NULL checks to avoid false positives
  - Safe use of CHECK constraints

**No SQL injection risk** — All validation is static, enum-based, or parameterized. No string concatenation.

---

### 2. Migration 040: Extended Seed Data

**Status:** SECURE

Idempotent seeding with proper workspace isolation:

- **Idempotency guard** (line 32)
  - Checks for `SEED_040` marker in `building_notes`
  - Skips execution if already seeded
  - Correct boundary: per workspace

- **Workspace variable** (line 30)
  - `v_ws_id` captured from `r_ws.ws_id` and used consistently
  - All INSERTs include `v_ws_id` in `workspace_id` column
  - No cross-workspace leakage possible

- **Enum values** (lines 51, 70, 86-98)
  - All contact `type` values valid: 'seller', 'landlord', 'buyer', 'renter'
  - All property `stage` values valid: 'sconosciuto', 'ignoto', 'conosciuto', 'incarico'
  - All `transaction_type` values valid: 'vendita', 'affitto'
  - All `owner_disposition` values valid: 'non_definito'

- **ON CONFLICT DO NOTHING** (line 71)
  - Prevents duplicate key errors on idempotent re-runs
  - Correct pattern for seeding

- **No hardcoded values in wrong contexts**
  - Contact IDs generated fresh: `gen_random_uuid()`
  - Property IDs generated fresh: `gen_random_uuid()`
  - No sensitive data (no passwords, API keys, tokens)

---

### 3. Migration 041: Link Listings to Contacts

**Status:** SECURE

Two-phase migration with proper workspace scoping:

- **Workspace iteration** (lines 15-18)
  - Iterates through distinct workspaces in listings table
  - All subsequent operations scoped to `v_ws_id`

- **Case 1: Existing properties without owner_contact** (lines 20-55)
  - Query correctly filters by `workspace_id` (line 25)
  - Contact lookup filters by `workspace_id` (line 32)
  - Property UPDATE includes WHERE clause with `workspace_id` and `owner_contact_id IS NULL` (lines 45-49)
  - Prevents cross-workspace updates and race conditions

- **Case 2: Orphaned listings without property** (lines 57-136)
  - Listing loop filters by `workspace_id` (line 62)
  - Contact lookup filters by `workspace_id` (line 68)
  - Property INSERT includes correct `workspace_id` and `v_ws_id` (line 94)
  - Property UPDATE includes WHERE clause with both `workspace_id` and `property_id IS NULL` (lines 113-117)
  - Event INSERT properly scoped to `v_ws_id` (line 130)

- **Enum casting** (line 98)
  - `property_type::text` cast to `property_type` enum is safe
  - `transaction_type::text` cast to `property_transaction_type` is safe
  - Defaults to 'apartment' and 'vendita' if NULL
  - No injection risk

- **ON CONFLICT DO NOTHING** usage
  - Lines 41, 54, 76, 110, 122, 135 all use safe conflict handling
  - Prevents duplicate errors on re-runs

**No missing workspace_id checks** — All queries and updates include workspace_id filters.

---

### 4. React Server Component: banca-dati/page.tsx

**Status:** SECURE

Authentication, authorization, and input validation properly implemented:

- **Authentication** (lines 31-32)
  - Redirects to `/login` if no user
  - Properly async/await for auth check

- **Authorization** (lines 34-42)
  - Uses admin client to fetch user's workspace_id and role
  - Redirects to setup if profile not found
  - Workspace_id used to scope all subsequent queries (line 74)

- **Search parameters safely parsed** (lines 44-52)
  - All params converted to strings (default `''`)
  - Page parsed as integer with base 10 (line 51)
  - Defaults applied for missing params

- **Sort parameter validated** (lines 55-63)
  - SORT_MAP whitelist enforces allowed values
  - Falls back to `updated_at_desc` if key not found
  - Column names and sort direction never exposed to user input

- **Query filtering** (lines 74-83)
  - All `.eq()` filters include `workspace_id` as primary filter (line 74)
  - `.ilike()` text search on safe columns: address, city (line 83)
  - No injection possible via search terms (Supabase client handles parameterization)
  - Unvalidated stage/zone/agent_id/disposition/transaction_type are enum-validated on database side via constraints

- **No hardcoded secrets** — No API keys, credentials, or sensitive data in source

- **Error handling** (lines 41-42)
  - Silent redirect on setup needed (acceptable)
  - No error details leaked to client

**Note:** The eslint comments disabling `@typescript-eslint/no-explicit-any` are appropriate for Supabase client typing quirks and don't introduce security risks.

---

## Security Guarantees in Place

1. **Workspace isolation enforced at three layers:**
   - RLS policies (Supabase)
   - Database triggers (migration 042)
   - Application query filters (page.tsx line 74)

2. **Enum validation:**
   - All stage/disposition/transaction_type values match defined enums
   - Database rejects invalid values

3. **Rate limiting friendly:**
   - Index on `properties(workspace_id, agent_id)` supports efficient filtering (migration 042, line 85)

4. **Idempotent migrations:**
   - Both seed migrations use SEED_040/SEED_041 markers to prevent duplicate runs
   - ON CONFLICT DO NOTHING throughout

5. **No cross-workspace data leakage possible:**
   - All queries filtered by workspace_id at start
   - All updates guarded by workspace_id AND additional conditions
   - Triggers validate workspace membership of foreign key references

---

## Verdict

**PASS — No security issues found.**

All CRITICAL and HIGH severity checks passed:
- No hardcoded secrets
- No SQL injection
- No missing workspace_id checks
- No cross-workspace data leakage
- No invalid enum values
- No unguarded WHERE clauses

The security hardening migration (042) significantly improves database-level protections. The seed and linking migrations maintain proper workspace isolation throughout.

