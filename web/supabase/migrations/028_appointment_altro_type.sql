-- Migration 028: Add Italian appointment types + 'altro' to appointments check constraint
-- Previously only English types were allowed. The frontend now sends Italian types directly.

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_type_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_type_check
  CHECK (type IN ('viewing', 'meeting', 'signing', 'call', 'other', 'visita', 'riunione', 'atto', 'acquisizione', 'altro'));
