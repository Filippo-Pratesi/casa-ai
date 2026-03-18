-- Migration 042: Security hardening for Sprint I tables
-- Adds additional database-level protections beyond existing RLS

-- ── 1. Validate owner_contact_id belongs to same workspace ──────────────────
-- Ensures properties can't reference contacts from another workspace
CREATE OR REPLACE FUNCTION validate_property_contact_workspace()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_contact_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts
      WHERE id = NEW.owner_contact_id
        AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'owner_contact_id must belong to the same workspace';
    END IF;
  END IF;
  IF NEW.tenant_contact_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts
      WHERE id = NEW.tenant_contact_id
        AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'tenant_contact_id must belong to the same workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_property_contacts ON properties;
CREATE TRIGGER trg_validate_property_contacts
  BEFORE INSERT OR UPDATE OF owner_contact_id, tenant_contact_id ON properties
  FOR EACH ROW EXECUTE FUNCTION validate_property_contact_workspace();

-- ── 2. Validate property_events workspace matches property workspace ─────────
CREATE OR REPLACE FUNCTION validate_event_workspace()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
      AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'property_events.workspace_id must match properties.workspace_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_event_workspace ON property_events;
CREATE TRIGGER trg_validate_event_workspace
  BEFORE INSERT ON property_events
  FOR EACH ROW EXECUTE FUNCTION validate_event_workspace();

-- ── 3. Validate property_contacts workspace isolation ────────────────────────
CREATE OR REPLACE FUNCTION validate_property_contact_link()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Verify property belongs to workspace
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'property_contacts: property must belong to the same workspace';
  END IF;
  -- Verify contact belongs to workspace
  IF NOT EXISTS (
    SELECT 1 FROM contacts
    WHERE id = NEW.contact_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'property_contacts: contact must belong to the same workspace';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_property_contact_link ON property_contacts;
CREATE TRIGGER trg_validate_property_contact_link
  BEFORE INSERT OR UPDATE ON property_contacts
  FOR EACH ROW EXECUTE FUNCTION validate_property_contact_link();

-- ── 4. Rate-limit-friendly index: agent_id + workspace_id on properties ──────
CREATE INDEX IF NOT EXISTS idx_properties_agent_workspace
  ON properties(workspace_id, agent_id);

-- ── 5. Prevent negative financial values at DB level ────────────────────────
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS chk_positive_rent,
  DROP CONSTRAINT IF EXISTS chk_positive_deposit,
  DROP CONSTRAINT IF EXISTS chk_positive_sold_price,
  DROP CONSTRAINT IF EXISTS chk_commission_range;

ALTER TABLE properties
  ADD CONSTRAINT chk_positive_rent CHECK (monthly_rent IS NULL OR monthly_rent >= 0),
  ADD CONSTRAINT chk_positive_deposit CHECK (deposit IS NULL OR deposit >= 0),
  ADD CONSTRAINT chk_positive_sold_price CHECK (sold_price IS NULL OR sold_price > 0),
  ADD CONSTRAINT chk_commission_range CHECK (
    incarico_commission_percent IS NULL OR
    (incarico_commission_percent > 0 AND incarico_commission_percent <= 20)
  );

-- ── 6. Comment documenting security guarantees ───────────────────────────────
COMMENT ON TABLE properties IS
  'Banca dati immobiliare. Workspace-scoped (RLS). Cross-workspace isolation enforced via triggers.';
COMMENT ON TABLE property_events IS
  'Append-only audit trail. No UPDATE policy. Workspace isolation enforced via trigger.';
COMMENT ON TABLE property_contacts IS
  'Multi-role contacts per property. Workspace isolation enforced via trigger.';
