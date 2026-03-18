-- Migration 040: Extended seed — 100+ properties across Italian cities
-- Idempotent: skips if SEED_040 marker already present for the workspace

DO $$
DECLARE
  r_ws      record;
  v_ws_id   uuid;
  v_agent1  uuid;
  v_agent2  uuid;

  -- contact IDs for linked stages
  v_c1  uuid; v_c2  uuid; v_c3  uuid; v_c4  uuid; v_c5  uuid;
  v_c6  uuid; v_c7  uuid; v_c8  uuid; v_c9  uuid; v_c10 uuid;
  v_c11 uuid; v_c12 uuid; v_c13 uuid; v_c14 uuid; v_c15 uuid;
  v_c16 uuid; v_c17 uuid; v_c18 uuid; v_c19 uuid; v_c20 uuid;

  -- property IDs (incarico/locato/venduto stage)
  v_p1  uuid; v_p2  uuid; v_p3  uuid; v_p4  uuid;
  v_p5  uuid; v_p6  uuid; v_p7  uuid; v_p8  uuid;
  v_p9  uuid; v_p10 uuid;

  -- generic pid
  v_pid uuid;
BEGIN
  FOR r_ws IN
    SELECT w.id AS ws_id
    FROM workspaces w
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.workspace_id = w.id LIMIT 1)
  LOOP
    v_ws_id := r_ws.ws_id;

    IF EXISTS (SELECT 1 FROM properties WHERE workspace_id = v_ws_id AND building_notes = 'SEED_040' LIMIT 1) THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_agent1 FROM users WHERE workspace_id = v_ws_id ORDER BY created_at LIMIT 1;
    SELECT id INTO v_agent2 FROM users WHERE workspace_id = v_ws_id ORDER BY created_at OFFSET 1 LIMIT 1;
    IF v_agent2 IS NULL THEN v_agent2 := v_agent1; END IF;

    -- ── Contacts (20 owners/tenants) ────────────────────────────────────────
    v_c1  := gen_random_uuid(); v_c2  := gen_random_uuid(); v_c3  := gen_random_uuid();
    v_c4  := gen_random_uuid(); v_c5  := gen_random_uuid(); v_c6  := gen_random_uuid();
    v_c7  := gen_random_uuid(); v_c8  := gen_random_uuid(); v_c9  := gen_random_uuid();
    v_c10 := gen_random_uuid(); v_c11 := gen_random_uuid(); v_c12 := gen_random_uuid();
    v_c13 := gen_random_uuid(); v_c14 := gen_random_uuid(); v_c15 := gen_random_uuid();
    v_c16 := gen_random_uuid(); v_c17 := gen_random_uuid(); v_c18 := gen_random_uuid();
    v_c19 := gen_random_uuid(); v_c20 := gen_random_uuid();

    INSERT INTO contacts (id, workspace_id, first_name, last_name, email, phone, type)
    VALUES
      (v_c1,  v_ws_id, 'Marco',      'Ferretti',   'marco.ferretti@email.it',   '+39 02 1234567',  'seller'),
      (v_c2,  v_ws_id, 'Giulia',     'Rossini',    'giulia.rossini@email.it',   '+39 02 2345678',  'seller'),
      (v_c3,  v_ws_id, 'Luca',       'Bianchi',    'luca.bianchi@email.it',     '+39 06 3456789',  'seller'),
      (v_c4,  v_ws_id, 'Francesca',  'Marini',     'francesca.marini@email.it', '+39 06 4567890',  'seller'),
      (v_c5,  v_ws_id, 'Antonio',    'Conti',      'antonio.conti@email.it',    '+39 055 567890',  'seller'),
      (v_c6,  v_ws_id, 'Elena',      'Ricci',      'elena.ricci@email.it',      '+39 055 678901',  'seller'),
      (v_c7,  v_ws_id, 'Roberto',    'Lombardi',   'roberto.lombardi@email.it', '+39 081 789012',  'landlord'),
      (v_c8,  v_ws_id, 'Valentina',  'Greco',      'valentina.greco@email.it',  '+39 081 890123',  'landlord'),
      (v_c9,  v_ws_id, 'Stefano',    'Esposito',   'stefano.esposito@email.it', '+39 051 901234',  'seller'),
      (v_c10, v_ws_id, 'Chiara',     'Romano',     'chiara.romano@email.it',    '+39 051 012345',  'seller'),
      (v_c11, v_ws_id, 'Paolo',      'Colombo',    'paolo.colombo@email.it',    '+39 011 123456',  'seller'),
      (v_c12, v_ws_id, 'Silvia',     'De Luca',    'silvia.deluca@email.it',    '+39 011 234567',  'landlord'),
      (v_c13, v_ws_id, 'Giovanni',   'Moretti',    'giovanni.moretti@email.it', '+39 050 345678',  'seller'),
      (v_c14, v_ws_id, 'Laura',      'Barbieri',   'laura.barbieri@email.it',   '+39 050 456789',  'seller'),
      (v_c15, v_ws_id, 'Andrea',     'Fontana',    'andrea.fontana@email.it',   '+39 0583 567890', 'seller'),
      (v_c16, v_ws_id, 'Sara',       'Gallo',      'sara.gallo@email.it',       '+39 0583 678901', 'landlord'),
      (v_c17, v_ws_id, 'Matteo',     'Costa',      'matteo.costa@email.it',     '+39 02 789012',   'buyer'),
      (v_c18, v_ws_id, 'Alessia',    'Bruno',      'alessia.bruno@email.it',    '+39 06 890123',   'buyer'),
      (v_c19, v_ws_id, 'Davide',     'Serra',      'davide.serra@email.it',     '+39 055 901234',  'renter'),
      (v_c20, v_ws_id, 'Paola',      'Vitale',     'paola.vitale@email.it',     '+39 081 012345',  'renter')
    ON CONFLICT DO NOTHING;

    -- ── Property IDs for linked stages ──────────────────────────────────────
    v_p1  := gen_random_uuid(); v_p2  := gen_random_uuid(); v_p3  := gen_random_uuid();
    v_p4  := gen_random_uuid(); v_p5  := gen_random_uuid(); v_p6  := gen_random_uuid();
    v_p7  := gen_random_uuid(); v_p8  := gen_random_uuid(); v_p9  := gen_random_uuid();
    v_p10 := gen_random_uuid();

    -- ════════════════════════════════════════════════════════════════════════
    -- SCONOSCIUTO (40 properties) — address only, no owner
    -- ════════════════════════════════════════════════════════════════════════

    -- Milano (12)
    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, transaction_type, stage, owner_disposition, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Torino 14', 'Milano', 45.46366, 9.18663, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Torino 28', 'Milano', 45.46340, 9.18710, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Corso Buenos Aires 42', 'Milano', 45.47812, 9.21044, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Corso Buenos Aires 67', 'Milano', 45.47850, 9.21120, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Montenapoleone 8', 'Milano', 45.46870, 9.19620, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Montenapoleone 21', 'Milano', 45.46910, 9.19680, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Naviglio Grande 5', 'Milano', 45.45222, 9.17340, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Naviglio Grande 19', 'Milano', 45.45190, 9.17390, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Porta Romana 31', 'Milano', 45.45503, 9.19810, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Porta Romana 55', 'Milano', 45.45460, 9.19870, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Piazza Duomo 3 int. 4', 'Milano', 45.46427, 9.18951, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Brera 12', 'Milano', 45.47243, 9.18680, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- Roma (8)
    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, transaction_type, stage, owner_disposition, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via del Corso 88', 'Roma', 41.90388, 12.48061, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via del Corso 120', 'Roma', 41.90410, 12.48100, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Parioli 14', 'Roma', 41.92400, 12.47780, 'house', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Trastevere 7', 'Roma', 41.88670, 12.46930, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Viale Europa 44 (EUR)', 'Roma', 41.83200, 12.47310, 'commercial', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Cola di Rienzo 78 (Prati)', 'Roma', 41.90580, 12.46260, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Viale Flaminio 29', 'Roma', 41.92890, 12.47570, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Appia Nuova 112', 'Roma', 41.87100, 12.51230, 'garage', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- Firenze (6)
    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, transaction_type, stage, owner_disposition, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via dei Calzaiuoli 3', 'Firenze', 43.77170, 11.25450, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via dei Calzaiuoli 17', 'Firenze', 43.77200, 11.25480, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Borgo San Frediano 22 (Oltrarno)', 'Firenze', 43.76740, 11.24510, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Campo di Marte 9', 'Firenze', 43.78460, 11.27120, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via di Novoli 60', 'Firenze', 43.79130, 11.22960, 'commercial', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Lungarno delle Grazie 4', 'Firenze', 43.76800, 11.26810, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- Napoli, Bologna, Torino, Pisa, Lucca (14)
    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, transaction_type, stage, owner_disposition, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Posillipo 18', 'Napoli', 40.82330, 14.20660, 'villa', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Chiaia 45', 'Napoli', 40.83430, 14.23530, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Scarlatti 33 (Vomero)', 'Napoli', 40.85060, 14.23710, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Mergellina 7', 'Napoli', 40.82870, 14.21770, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Indipendenza 14', 'Bologna', 44.49580, 11.34430, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Colli 28', 'Bologna', 44.48770, 11.36180, 'house', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via San Vitale 51', 'Bologna', 44.49810, 11.35340, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Crocetta 8', 'Torino', 45.05670, 7.66440, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via San Salvario 22', 'Torino', 45.05140, 7.68620, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Vanchiglia 10', 'Torino', 45.07180, 7.70250, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Santa Maria 16 (Pisa Centro)', 'Pisa', 43.71510, 10.39660, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Porta a Lucca 33', 'Pisa', 43.72300, 10.39380, 'apartment', 'affitto', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Fillungo 48 (Lucca Centro)', 'Lucca', 43.84340, 10.50680, 'apartment', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via San Marco 19', 'Lucca', 43.84610, 10.51140, 'house', 'vendita', 'sconosciuto', 'non_definito', 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- IGNOTO (25 properties) — basic details, no owner
    -- ════════════════════════════════════════════════════════════════════════

    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, sqm, rooms, bathrooms, estimated_value, transaction_type, stage, owner_disposition, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Torino 52', 'Milano', 45.46320, 9.18740, 'apartment', 75, 3, 1, 420000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Corso Buenos Aires 90', 'Milano', 45.47880, 9.21200, 'apartment', 60, 2, 1, 350000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Montenapoleone 33', 'Milano', 45.46950, 9.19750, 'apartment', 130, 4, 2, 1200000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Naviglio Grande 38', 'Milano', 45.45160, 9.17440, 'apartment', 55, 2, 1, 310000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Porta Romana 77', 'Milano', 45.45420, 9.19930, 'apartment', 90, 3, 2, 550000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via del Corso 145', 'Roma', 41.90430, 12.48140, 'apartment', 85, 3, 1, 680000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Parioli 28', 'Roma', 41.92450, 12.47830, 'house', 180, 5, 3, 1500000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Trastevere 34', 'Roma', 41.88700, 12.46980, 'apartment', 65, 2, 1, 490000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Cola di Rienzo 105 (Prati)', 'Roma', 41.90620, 12.46310, 'apartment', 95, 3, 2, 720000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via dei Calzaiuoli 29', 'Firenze', 43.77220, 11.25510, 'apartment', 70, 2, 1, 520000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Borgo San Frediano 45 (Oltrarno)', 'Firenze', 43.76760, 11.24550, 'apartment', 80, 3, 1, 460000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Posillipo 33', 'Napoli', 40.82360, 14.20700, 'villa', 220, 6, 3, 980000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Chiaia 72', 'Napoli', 40.83460, 14.23580, 'apartment', 110, 4, 2, 620000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Scarlatti 58 (Vomero)', 'Napoli', 40.85090, 14.23760, 'apartment', 75, 3, 1, 340000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Indipendenza 27', 'Bologna', 44.49610, 11.34480, 'apartment', 65, 2, 1, 290000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Colli 44', 'Bologna', 44.48800, 11.36220, 'house', 150, 4, 2, 580000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via San Vitale 79', 'Bologna', 44.49840, 11.35380, 'apartment', 55, 2, 1, 230000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Crocetta 21', 'Torino', 45.05700, 7.66490, 'apartment', 85, 3, 1, 320000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via San Salvario 37', 'Torino', 45.05170, 7.68670, 'apartment', 60, 2, 1, 190000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Vanchiglia 28', 'Torino', 45.07210, 7.70290, 'apartment', 75, 3, 1, 250000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Santa Maria 31 (Pisa Centro)', 'Pisa', 43.71540, 10.39700, 'apartment', 70, 2, 1, 260000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Porta a Lucca 58', 'Pisa', 43.72330, 10.39420, 'apartment', 50, 2, 1, 185000, 'affitto', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Cisanello 12', 'Pisa', 43.71890, 10.41750, 'house', 120, 4, 2, 380000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Fillungo 72 (Lucca Centro)', 'Lucca', 43.84360, 10.50720, 'apartment', 80, 3, 1, 310000, 'vendita', 'ignoto', 'non_definito', 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Viale Flaminio 54', 'Roma', 41.92920, 12.47610, 'apartment', 90, 3, 2, 690000, 'vendita', 'ignoto', 'non_definito', 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- CONOSCIUTO (20 properties) — owner identified
    -- ════════════════════════════════════════════════════════════════════════

    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, sqm, rooms, bathrooms, estimated_value, transaction_type, stage, owner_disposition, owner_contact_id, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Torino 81', 'Milano', 45.46300, 9.18790, 'apartment', 80, 3, 1, 470000, 'vendita', 'conosciuto', 'sta_pensando', v_c1, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Brera 30', 'Milano', 45.47270, 9.18710, 'apartment', 110, 4, 2, 850000, 'vendita', 'conosciuto', 'vende_sicuramente', v_c2, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Corso Buenos Aires 115', 'Milano', 45.47910, 9.21270, 'apartment', 65, 2, 1, 380000, 'affitto', 'conosciuto', 'sta_esplorando', v_c1, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via del Corso 178', 'Roma', 41.90460, 12.48180, 'apartment', 100, 3, 2, 890000, 'vendita', 'conosciuto', 'in_attesa', v_c3, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Parioli 45', 'Roma', 41.92480, 12.47870, 'house', 200, 5, 3, 1800000, 'vendita', 'conosciuto', 'sta_pensando', v_c4, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Trastevere 62', 'Roma', 41.88730, 12.47030, 'apartment', 70, 2, 1, 530000, 'affitto', 'conosciuto', 'da_ricontattare', v_c3, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via dei Calzaiuoli 41', 'Firenze', 43.77250, 11.25540, 'apartment', 95, 3, 2, 680000, 'vendita', 'conosciuto', 'vende_sicuramente', v_c5, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Lungarno Corsini 8 (Oltrarno)', 'Firenze', 43.76870, 11.25020, 'apartment', 140, 4, 2, 920000, 'vendita', 'conosciuto', 'sta_esplorando', v_c6, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Campo di Marte 28', 'Firenze', 43.78490, 11.27160, 'apartment', 75, 3, 1, 390000, 'affitto', 'conosciuto', 'in_attesa', v_c5, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Posillipo 55', 'Napoli', 40.82390, 14.20740, 'villa', 280, 6, 4, 1400000, 'vendita', 'conosciuto', 'sta_pensando', v_c7, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Chiaia 99', 'Napoli', 40.83490, 14.23630, 'apartment', 120, 4, 2, 750000, 'vendita', 'conosciuto', 'notizia_ricevuta', v_c8, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Mergellina 29', 'Napoli', 40.82900, 14.21820, 'apartment', 85, 3, 1, 460000, 'affitto', 'conosciuto', 'da_ricontattare', v_c7, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Indipendenza 44', 'Bologna', 44.49640, 11.34530, 'apartment', 90, 3, 2, 380000, 'vendita', 'conosciuto', 'vende_sicuramente', v_c9, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Colli 67', 'Bologna', 44.48830, 11.36260, 'house', 170, 5, 2, 680000, 'vendita', 'conosciuto', 'sta_esplorando', v_c10, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Crocetta 38', 'Torino', 45.05730, 7.66540, 'apartment', 95, 3, 2, 380000, 'vendita', 'conosciuto', 'sta_pensando', v_c11, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Vanchiglia 45', 'Torino', 45.07240, 7.70330, 'apartment', 80, 3, 1, 270000, 'affitto', 'conosciuto', 'in_attesa', v_c12, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Santa Maria 49 (Pisa Centro)', 'Pisa', 43.71570, 10.39730, 'apartment', 85, 3, 1, 310000, 'vendita', 'conosciuto', 'da_ricontattare', v_c13, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Cisanello 35', 'Pisa', 43.71920, 10.41790, 'house', 135, 4, 2, 420000, 'vendita', 'conosciuto', 'sta_esplorando', v_c14, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Fillungo 95 (Lucca Centro)', 'Lucca', 43.84380, 10.50760, 'apartment', 90, 3, 2, 370000, 'vendita', 'conosciuto', 'vende_sicuramente', v_c15, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via San Marco 44', 'Lucca', 43.84640, 10.51180, 'house', 160, 4, 2, 580000, 'vendita', 'conosciuto', 'notizia_ricevuta', v_c15, 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- INCARICO (10 properties) — mandate signed
    -- ════════════════════════════════════════════════════════════════════════

    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, sqm, rooms, bathrooms, estimated_value, transaction_type, stage, owner_disposition, owner_contact_id, incarico_type, incarico_date, incarico_expiry, incarico_commission_percent, building_notes)
    VALUES
      (v_p1, v_ws_id, v_agent1, 'Via Torino 103', 'Milano', 45.46285, 9.18820, 'apartment', 95, 3, 2, 530000, 'vendita', 'incarico', 'incarico_firmato', v_c1, 'esclusivo', CURRENT_DATE - 30, CURRENT_DATE + 150, 3.00, 'SEED_040'),
      (v_p2, v_ws_id, v_agent2, 'Via Brera 48', 'Milano', 45.47300, 9.18740, 'apartment', 120, 4, 2, 950000, 'vendita', 'incarico', 'incarico_firmato', v_c2, 'esclusivo', CURRENT_DATE - 45, CURRENT_DATE + 135, 3.50, 'SEED_040'),
      (v_p3, v_ws_id, v_agent1, 'Via del Corso 200', 'Roma', 41.90480, 12.48220, 'apartment', 105, 3, 2, 920000, 'vendita', 'incarico', 'incarico_firmato', v_c3, 'non_esclusivo', CURRENT_DATE - 20, CURRENT_DATE + 160, 2.50, 'SEED_040'),
      (v_p4, v_ws_id, v_agent2, 'Via Parioli 61', 'Roma', 41.92510, 12.47910, 'house', 210, 5, 3, 1950000, 'vendita', 'incarico', 'incarico_firmato', v_c4, 'esclusivo', CURRENT_DATE - 60, CURRENT_DATE + 120, 3.00, 'SEED_040'),
      (v_p5, v_ws_id, v_agent1, 'Via dei Calzaiuoli 58', 'Firenze', 43.77280, 11.25570, 'apartment', 100, 3, 2, 730000, 'vendita', 'incarico', 'incarico_firmato', v_c5, 'esclusivo', CURRENT_DATE - 15, CURRENT_DATE + 165, 3.00, 'SEED_040'),
      (v_p6, v_ws_id, v_agent2, 'Via Posillipo 72', 'Napoli', 40.82420, 14.20780, 'villa', 300, 6, 4, 1600000, 'vendita', 'incarico', 'incarico_firmato', v_c7, 'esclusivo', CURRENT_DATE - 90, CURRENT_DATE + 90, 3.50, 'SEED_040'),
      (v_p7, v_ws_id, v_agent1, 'Via Indipendenza 62', 'Bologna', 44.49670, 11.34580, 'apartment', 100, 3, 2, 420000, 'vendita', 'incarico', 'incarico_firmato', v_c9, 'non_esclusivo', CURRENT_DATE - 10, CURRENT_DATE + 170, 2.00, 'SEED_040'),
      (v_p8, v_ws_id, v_agent2, 'Via Crocetta 55', 'Torino', 45.05760, 7.66590, 'apartment', 105, 4, 2, 430000, 'vendita', 'incarico', 'incarico_firmato', v_c11, 'esclusivo', CURRENT_DATE - 35, CURRENT_DATE + 145, 3.00, 'SEED_040'),
      (v_p9, v_ws_id, v_agent1, 'Via Fillungo 118 (Lucca Centro)', 'Lucca', 43.84400, 10.50800, 'apartment', 95, 3, 2, 395000, 'vendita', 'incarico', 'incarico_firmato', v_c15, 'esclusivo', CURRENT_DATE - 25, CURRENT_DATE + 155, 3.00, 'SEED_040'),
      (v_p10,v_ws_id, v_agent2, 'Via Santa Maria 66 (Pisa Centro)', 'Pisa', 43.71600, 10.39760, 'apartment', 88, 3, 1, 330000, 'vendita', 'incarico', 'incarico_firmato', v_c13, 'non_esclusivo', CURRENT_DATE - 50, CURRENT_DATE + 130, 2.50, 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- VENDUTO (3 properties)
    -- ════════════════════════════════════════════════════════════════════════

    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, sqm, rooms, bathrooms, transaction_type, stage, owner_disposition, owner_contact_id, sold_at, sold_to_contact_id, sold_price, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Naviglio Grande 58', 'Milano', 45.45140, 9.17480, 'apartment', 70, 2, 1, 'vendita', 'venduto', 'appena_acquistato', v_c2, NOW() - INTERVAL '30 days', v_c17, 385000, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Chiaia 125', 'Napoli', 40.83520, 14.23680, 'apartment', 130, 4, 2, 'vendita', 'venduto', 'appena_acquistato', v_c8, NOW() - INTERVAL '45 days', v_c18, 710000, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via San Vitale 102', 'Bologna', 44.49870, 11.35420, 'apartment', 60, 2, 1, 'vendita', 'venduto', 'appena_acquistato', v_c10, NOW() - INTERVAL '15 days', v_c17, 245000, 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- LOCATO (4 properties) — rental active
    -- ════════════════════════════════════════════════════════════════════════

    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, sqm, rooms, bathrooms, transaction_type, stage, owner_disposition, owner_contact_id, lease_type, lease_start_date, lease_end_date, monthly_rent, deposit, tenant_contact_id, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Trastevere 88', 'Roma', 41.88760, 12.47080, 'apartment', 70, 2, 1, 'affitto', 'locato', 'non_definito', v_c4, '4_plus_4', CURRENT_DATE - 180, CURRENT_DATE + 1280, 1200, 3600, v_c19, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Scarlatti 80 (Vomero)', 'Napoli', 40.85120, 14.23810, 'apartment', 80, 3, 1, 'affitto', 'locato', 'non_definito', v_c8, '3_plus_2', CURRENT_DATE - 90, CURRENT_DATE + 1005, 900, 2700, v_c20, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via San Salvario 60', 'Torino', 45.05200, 7.68720, 'apartment', 65, 2, 1, 'affitto', 'locato', 'non_definito', v_c12, '4_plus_4', CURRENT_DATE - 365, CURRENT_DATE + 1095, 750, 2250, v_c19, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Porta a Lucca 82', 'Pisa', 43.72360, 10.39460, 'apartment', 55, 2, 1, 'affitto', 'locato', 'non_definito', v_c16, 'transitorio', CURRENT_DATE - 60, CURRENT_DATE + 120, 680, 1360, v_c20, 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- DISPONIBILE (3 properties) — lease expired, back on market
    -- ════════════════════════════════════════════════════════════════════════

    INSERT INTO properties (id, workspace_id, agent_id, address, city, latitude, longitude, property_type, sqm, rooms, bathrooms, estimated_value, transaction_type, stage, owner_disposition, owner_contact_id, building_notes)
    VALUES
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via San Marco 67', 'Lucca', 43.84670, 10.51220, 'apartment', 75, 3, 1, 285000, 'affitto', 'disponibile', 'sta_pensando', v_c16, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent2, 'Via Colli 88', 'Bologna', 44.48860, 11.36300, 'house', 160, 4, 2, 610000, 'affitto', 'disponibile', 'da_ricontattare', v_c12, 'SEED_040'),
      (gen_random_uuid(), v_ws_id, v_agent1, 'Via Mergellina 48', 'Napoli', 40.82930, 14.21870, 'apartment', 90, 3, 2, 490000, 'affitto', 'disponibile', 'in_attesa', v_c7, 'SEED_040')
    ON CONFLICT DO NOTHING;

    -- ════════════════════════════════════════════════════════════════════════
    -- PROPERTY EVENTS — at least 1 per property (batch inserts by type)
    -- ════════════════════════════════════════════════════════════════════════

    -- Discovery notes for sconosciuto properties
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent1, 'nota',
           'Immobile rilevato sul territorio', 'Rilevato durante passaggio in zona. Nessuna informazione sul proprietario.',
           'neutral', NOW() - (RANDOM() * INTERVAL '90 days')
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'sconosciuto' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

    -- Ignoto events — citofono or telefonata
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent2, 'citofono',
           'Tentativo citofono senza risposta', 'Citofono effettuato, nessuna risposta. Lasciato biglietto da visita nella cassetta delle lettere.',
           'neutral', NOW() - (RANDOM() * INTERVAL '60 days')
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'ignoto' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

    -- Cambio stage sconosciuto→ignoto for ignoto properties
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, old_stage, new_stage, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent1, 'cambio_stage',
           'Avanzamento a Ignoto', 'sconosciuto', 'ignoto', NOW() - (RANDOM() * INTERVAL '50 days')
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'ignoto' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

    -- Conosciuto events — proprietario identificato
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent1, 'proprietario_identificato',
           'Proprietario identificato', 'Contatto con il proprietario stabilito tramite visura catastale e colloquio diretto.',
           'positive', NOW() - (RANDOM() * INTERVAL '40 days')
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'conosciuto' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

    -- Incarico events — incarico firmato
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, old_stage, new_stage, event_date)
    VALUES
      (gen_random_uuid(), v_ws_id, v_p1,  v_agent1, 'incarico_firmato', 'Incarico esclusivo firmato', 'Incarico di vendita esclusivo firmato. Commissione 3%. Validità 180 giorni.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '30 days'),
      (gen_random_uuid(), v_ws_id, v_p2,  v_agent2, 'incarico_firmato', 'Incarico esclusivo firmato', 'Incarico di vendita esclusivo firmato. Commissione 3,5%. Validità 180 giorni.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '45 days'),
      (gen_random_uuid(), v_ws_id, v_p3,  v_agent1, 'incarico_firmato', 'Incarico non esclusivo firmato', 'Mandato non esclusivo concordato. Commissione 2,5%.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '20 days'),
      (gen_random_uuid(), v_ws_id, v_p4,  v_agent2, 'incarico_firmato', 'Incarico esclusivo firmato', 'Villa Parioli — incarico esclusivo. Prezzo richiesto 1.950.000€.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '60 days'),
      (gen_random_uuid(), v_ws_id, v_p5,  v_agent1, 'incarico_firmato', 'Incarico esclusivo firmato', 'Centro storico Firenze — incarico esclusivo. Proprietaria entusiasta.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '15 days'),
      (gen_random_uuid(), v_ws_id, v_p6,  v_agent2, 'incarico_firmato', 'Incarico esclusivo firmato', 'Villa Posillipo — mandato esclusivo. Richiesta 1.600.000€.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '90 days'),
      (gen_random_uuid(), v_ws_id, v_p7,  v_agent1, 'incarico_firmato', 'Incarico non esclusivo firmato', 'Appartamento Bologna — accordo raggiunto. Commissione 2%.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '10 days'),
      (gen_random_uuid(), v_ws_id, v_p8,  v_agent2, 'incarico_firmato', 'Incarico esclusivo firmato', 'Crocetta Torino — incarico esclusivo. Zona richiesta, ottimo prezzo.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '35 days'),
      (gen_random_uuid(), v_ws_id, v_p9,  v_agent1, 'incarico_firmato', 'Incarico esclusivo firmato', 'Lucca centro — appartamento storico. Incarico firmato.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '25 days'),
      (gen_random_uuid(), v_ws_id, v_p10, v_agent2, 'incarico_firmato', 'Incarico non esclusivo firmato', 'Pisa centro — accordo con proprietario. Commissione 2,5%.', 'positive', 'conosciuto', 'incarico', NOW() - INTERVAL '50 days')
    ON CONFLICT DO NOTHING;

    -- Follow-up calls for incarico properties
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, event_date)
    VALUES
      (gen_random_uuid(), v_ws_id, v_p1,  v_agent1, 'telefonata', 'Aggiornamento al proprietario', 'Chiamata di aggiornamento: 3 visite effettuate, feedback positivi. Prossima apertura sabato.', 'positive', NOW() - INTERVAL '10 days'),
      (gen_random_uuid(), v_ws_id, v_p3,  v_agent1, 'visita',     'Prima visita con acquirente', 'Coppia interessata, chiedono se disponibili a scendere di prezzo. Proprietario da consultare.', 'neutral',  NOW() - INTERVAL '5 days'),
      (gen_random_uuid(), v_ws_id, v_p6,  v_agent2, 'proposta_ricevuta', 'Proposta d''acquisto ricevuta', 'Proposta di 1.480.000€, trattabili fino a 1.520.000€ secondo proprietario.', 'positive', NOW() - INTERVAL '7 days'),
      (gen_random_uuid(), v_ws_id, v_p4,  v_agent2, 'visita', 'Visita con acquirente facoltoso', 'Ottimo riscontro. Acquirente vuole fare un''offerta entro fine settimana.', 'positive', NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    -- Venduto events
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, old_stage, new_stage, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent1, 'venduto',
           'Immobile venduto', 'Rogito notarile completato. Affare concluso con successo.',
           'positive', 'incarico', 'venduto', p.sold_at
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'venduto' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

    -- Locato events
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, old_stage, new_stage, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent2, 'locato',
           'Contratto di locazione firmato', 'Contratto registrato. Affittuario ha consegnato deposito cauzionale.',
           'positive', 'incarico', 'locato', NOW() - (RANDOM() * INTERVAL '180 days')
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'locato' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

    -- Disponibile events — contratto scaduto
    INSERT INTO property_events (id, workspace_id, property_id, agent_id, event_type, title, description, sentiment, old_stage, new_stage, event_date)
    SELECT gen_random_uuid(), p.workspace_id, p.id, v_agent1, 'contratto_scaduto',
           'Contratto scaduto — immobile disponibile', 'Il contratto di locazione è scaduto. L''immobile è di nuovo disponibile per un nuovo affitto.',
           'neutral', 'locato', 'disponibile', NOW() - (RANDOM() * INTERVAL '30 days')
    FROM properties p
    WHERE p.workspace_id = v_ws_id AND p.stage = 'disponibile' AND p.building_notes = 'SEED_040'
    ON CONFLICT DO NOTHING;

  END LOOP;
END;
$$;
