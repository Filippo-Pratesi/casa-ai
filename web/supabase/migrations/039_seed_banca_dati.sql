-- Migration 039: Seed Banca Dati Immobiliare mock data
-- Requires: 031 (properties), 032 (events), 033 (zones), 034 (property_contacts), 038 (new columns)
-- Inserts per workspace: 5 zones, 10 sub-zones, 15 contacts, 34 properties (all stages), 60+ events

do $$
declare
  r_ws        record;
  v_agent1    uuid;
  v_agent2    uuid;
  v_ws_id     uuid;

  -- Zone IDs
  v_zone_centro    uuid;
  v_zone_mare      uuid;
  v_zone_collina   uuid;
  v_zone_periferia uuid;
  v_zone_nuova     uuid;

  -- Contact IDs (owner/tenant personas)
  v_contact_ids   uuid[] := '{}';
  v_cid           uuid;

  -- Property IDs
  v_pid           uuid;

begin
  for r_ws in
    select w.id as ws_id
    from workspaces w
    where exists (select 1 from users u where u.workspace_id = w.id limit 1)
  loop
    v_ws_id := r_ws.ws_id;

    select id into v_agent1 from users where workspace_id = v_ws_id order by created_at limit 1;
    select id into v_agent2 from users where workspace_id = v_ws_id order by created_at offset 1 limit 1;
    if v_agent2 is null then v_agent2 := v_agent1; end if;

    -- Skip if already seeded
    if exists (select 1 from properties where workspace_id = v_ws_id limit 1) then
      continue;
    end if;

    -- ─── Zones ─────────────────────────────────────────────────────────────
    v_zone_centro    := gen_random_uuid();
    v_zone_mare      := gen_random_uuid();
    v_zone_collina   := gen_random_uuid();
    v_zone_periferia := gen_random_uuid();
    v_zone_nuova     := gen_random_uuid();

    insert into zones (id, workspace_id, city, name) values
      (v_zone_centro,    v_ws_id, 'Milano', 'Centro Storico'),
      (v_zone_mare,      v_ws_id, 'Milano', 'Zona Mare'),
      (v_zone_collina,   v_ws_id, 'Milano', 'Collina'),
      (v_zone_periferia, v_ws_id, 'Milano', 'Periferia Nord'),
      (v_zone_nuova,     v_ws_id, 'Milano', 'Zona Nuova')
    on conflict do nothing;

    insert into sub_zones (id, zone_id, workspace_id, name) values
      (gen_random_uuid(), v_zone_centro,    v_ws_id, 'Piazza Centrale'),
      (gen_random_uuid(), v_zone_centro,    v_ws_id, 'Via Roma'),
      (gen_random_uuid(), v_zone_mare,      v_ws_id, 'Fronte Mare'),
      (gen_random_uuid(), v_zone_mare,      v_ws_id, 'Seconda Fila'),
      (gen_random_uuid(), v_zone_collina,   v_ws_id, 'Alto Colle'),
      (gen_random_uuid(), v_zone_collina,   v_ws_id, 'Mezza Collina'),
      (gen_random_uuid(), v_zone_periferia, v_ws_id, 'Quartiere Est'),
      (gen_random_uuid(), v_zone_periferia, v_ws_id, 'Quartiere Ovest'),
      (gen_random_uuid(), v_zone_nuova,     v_ws_id, 'Lotto A'),
      (gen_random_uuid(), v_zone_nuova,     v_ws_id, 'Lotto B')
    on conflict do nothing;

    insert into agent_zones (workspace_id, agent_id, zone_id) values
      (v_ws_id, v_agent1, v_zone_centro),
      (v_ws_id, v_agent1, v_zone_mare),
      (v_ws_id, v_agent2, v_zone_collina),
      (v_ws_id, v_agent2, v_zone_periferia)
    on conflict do nothing;

    -- ─── Contacts ──────────────────────────────────────────────────────────
    v_contact_ids := '{}';
    for i in 1..15 loop
      v_cid := gen_random_uuid();
      insert into contacts (id, workspace_id, agent_id, name, phone, email, type, roles)
      values (
        v_cid, v_ws_id, v_agent1,
        case i
          when 1  then 'Giovanni Marino'      when 2  then 'Carla Esposito'
          when 3  then 'Roberto De Luca'      when 4  then 'Simona Russo'
          when 5  then 'Antonio Ferretti'     when 6  then 'Laura Conti'
          when 7  then 'Massimo Riva'         when 8  then 'Elena Mancini'
          when 9  then 'Stefano Palazzo'      when 10 then 'Cristina Galli'
          when 11 then 'Davide Moretti'       when 12 then 'Valentina Serra'
          when 13 then 'Francesco Lombardi'   when 14 then 'Paola Ricci'
          else         'Giorgio Fabbri'
        end,
        '+39 33' || lpad((i * 7654321)::text, 7, '0'),
        lower(
          case i
            when 1 then 'g.marino' when 2 then 'c.esposito'
            when 3 then 'r.deluca' when 4 then 's.russo'
            when 5 then 'a.ferretti' when 6 then 'l.conti'
            when 7 then 'm.riva' when 8 then 'e.mancini'
            when 9 then 's.palazzo' when 10 then 'c.galli'
            when 11 then 'd.moretti' when 12 then 'v.serra'
            when 13 then 'f.lombardi' when 14 then 'p.ricci'
            else 'g.fabbri'
          end || '@example.it'
        ),
        'seller', ARRAY['seller']
      ) on conflict do nothing;
      v_contact_ids := array_append(v_contact_ids, v_cid);
    end loop;

    -- ─── Stage: sconosciuto (5) ─────────────────────────────────────────────
    for i in 1..5 loop
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone,
        latitude, longitude,
        property_type, transaction_type, sqm, rooms,
        stage, owner_disposition, building_notes, created_at
      ) values (
        v_pid, v_ws_id, v_agent1,
        case i
          when 1 then 'Via Garibaldi 12'  when 2 then 'Corso Umberto 45'
          when 3 then 'Via Mazzini 7'     when 4 then 'Piazza Vittoria 3'
          else        'Via Cavour 89'
        end,
        'Milano', 'Centro Storico',
        45.464 + (i * 0.001)::decimal, 9.191 + (i * 0.001)::decimal,
        case i % 2 when 0 then 'apartment' else 'house' end,
        'vendita',
        case i when 1 then 65 when 2 then 80 when 3 then 95 when 4 then 55 else 110 end,
        case i when 1 then 2  when 2 then 3  when 3 then 4  when 4 then 2  else 4 end,
        'sconosciuto', 'sconosciuto',
        'Identificato durante canvassing.',
        now() - ((30 - i) * interval '1 day')
      ) on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
      values (v_ws_id, v_pid, v_agent1, 'cambio_stage', 'Immobile identificato',
              'Avvistato durante giro di zona.', 'sconosciuto', now() - ((30 - i) * interval '1 day'))
      on conflict do nothing;
    end loop;

    -- ─── Stage: ignoto (5) ─────────────────────────────────────────────────
    for i in 1..5 loop
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone,
        latitude, longitude,
        property_type, transaction_type,
        sqm, rooms, bathrooms, floor, total_floors, condition, estimated_value,
        stage, owner_disposition, created_at
      ) values (
        v_pid, v_ws_id, v_agent2,
        'Via Venezia ' || (i * 10 + 5)::text,
        'Milano', 'Zona Mare',
        45.470 + (i * 0.001)::decimal, 9.195 + (i * 0.001)::decimal,
        case i % 2 when 0 then 'apartment' else 'villa' end,
        case i % 2 when 0 then 'affitto' else 'vendita' end,
        80 + i * 10, 2 + i % 3, 1 + i % 2,
        i % 4 + 1, 6,
        case i % 3 when 0 then 'nuovo' when 1 then 'buono' else 'da_ristrutturare' end,
        i * 50000 + 180000,
        'ignoto', 'non_definito',
        now() - ((25 - i) * interval '1 day')
      ) on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
      values
        (v_ws_id, v_pid, v_agent2, 'nota', 'Sopralluogo esterno', 'Immobile osservato dall''esterno.', null, now() - ((25 - i) * interval '1 day')),
        (v_ws_id, v_pid, v_agent2, 'cambio_stage', 'Avanzato a Ignoto', 'Dati di base raccolti.', 'ignoto', now() - ((24 - i) * interval '1 day'))
      on conflict do nothing;
    end loop;

    -- ─── Stage: conosciuto (6) ─────────────────────────────────────────────
    for i in 1..6 loop
      v_cid := v_contact_ids[(i % array_length(v_contact_ids, 1)) + 1];
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone, sub_zone,
        latitude, longitude,
        property_type, transaction_type,
        sqm, rooms, bathrooms, floor, total_floors, condition, estimated_value,
        owner_contact_id, foglio, particella,
        stage, owner_disposition, building_notes, created_at
      ) values (
        v_pid, v_ws_id, v_agent1,
        'Via Collina ' || (i * 3 + 10)::text,
        'Milano', 'Collina', 'Alto Colle',
        45.475 + (i * 0.001)::decimal, 9.188 + (i * 0.001)::decimal,
        case i % 3 when 0 then 'villa' when 1 then 'house' else 'apartment' end,
        'vendita',
        100 + i * 20, 3 + i % 3, 1 + i % 2,
        i % 4 + 1, 5,
        case i % 4 when 0 then 'nuovo' when 1 then 'ottimo' when 2 then 'buono' else 'discreto' end,
        i * 80000 + 250000,
        v_cid, (100 + i)::text, (i * 50 + 200)::text,
        'conosciuto', 'disponibile',
        'Proprietario disponibile, necessita di acquisto altra abitazione prima.',
        now() - ((20 - i) * interval '1 day')
      ) on conflict do nothing;

      insert into property_contacts (workspace_id, property_id, contact_id, role, is_primary)
      values (v_ws_id, v_pid, v_cid, 'proprietario', true)
      on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, sentiment, event_date)
      values
        (v_ws_id, v_pid, v_agent1, 'telefonata', 'Primo contatto telefonico', 'Il proprietario ha risposto, disponibile a parlare.', null, 'positive', now() - ((20 - i) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'cambio_stage', 'Avanzato a Conosciuto', 'Proprietario identificato.', 'conosciuto', 'neutral', now() - ((19 - i) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'nota', 'Sopralluogo interno', 'Visita dell''immobile effettuata con il proprietario.', null, 'positive', now() - ((15 - i) * interval '1 day'))
      on conflict do nothing;
    end loop;

    -- ─── Stage: incarico (8) ─────────────────────────────────────────────────
    for i in 1..8 loop
      v_cid := v_contact_ids[((i + 5) % array_length(v_contact_ids, 1)) + 1];
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone,
        latitude, longitude,
        property_type, transaction_type,
        sqm, rooms, bathrooms, floor, total_floors, condition, estimated_value,
        owner_contact_id, doorbell,
        incarico_type, incarico_date, incarico_expiry, incarico_commission_percent, incarico_notes,
        foglio, particella, subalterno, categoria_catastale,
        stage, owner_disposition, created_at
      ) values (
        v_pid, v_ws_id, v_agent1,
        'Via Centrale ' || (i * 7 + 5)::text,
        'Milano', 'Centro Storico',
        45.468 + (i * 0.0008)::decimal, 9.193 + (i * 0.0008)::decimal,
        case i % 4 when 0 then 'apartment' when 1 then 'house' when 2 then 'villa' else 'apartment' end,
        case i % 3 when 0 then 'affitto' else 'vendita' end,
        75 + i * 15, 2 + i % 4, 1 + i % 2,
        i % 8 + 1, 8,
        case i % 4 when 0 then 'nuovo' when 1 then 'ottimo' when 2 then 'buono' else 'ristrutturato' end,
        i * 60000 + 200000,
        v_cid,
        case i when 1 then 'Int. 3' when 2 then 'Scala A' when 3 then 'Piano T' else 'Int. ' || i::text end,
        case i % 2 when 0 then 'esclusivo' else 'non_esclusivo' end,
        current_date - ((90 - i * 10)::int * interval '1 day'),
        current_date + ((180 - i * 15)::int * interval '1 day'),
        case i % 3 when 0 then 3.0 when 1 then 2.5 else 3.5 end,
        'Incarico in esclusiva per 6 mesi con rinnovo automatico.',
        (200 + i)::text, (i * 100 + 500)::text, i::text,
        case i % 5 when 0 then 'A/2' when 1 then 'A/3' when 2 then 'A/4' when 3 then 'A/7' else 'A/2' end,
        'incarico', 'incarico_firmato',
        now() - ((60 - i * 7) * interval '1 day')
      ) on conflict do nothing;

      insert into property_contacts (workspace_id, property_id, contact_id, role, is_primary)
      values (v_ws_id, v_pid, v_cid, 'proprietario', true)
      on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, sentiment, event_date)
      values
        (v_ws_id, v_pid, v_agent1, 'visita',       'Sopralluogo pre-incarico',  'Visita dettagliata con foto.', null, 'positive', now() - ((60 - i * 7) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'cambio_stage', 'Incarico firmato',          'Contratto di mediazione firmato.', 'incarico', 'positive', now() - ((55 - i * 7) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'visita',       'Prima visita acquirente',   'Coppia molto interessata, richiederanno seconda visita.', null, 'positive', now() - ((40 - i * 4) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'telefonata',   'Aggiornamento proprietario', 'Proprietario aggiornato sulle visite effettuate.', null, 'neutral', now() - ((35 - i * 3) * interval '1 day'))
      on conflict do nothing;
    end loop;

    -- ─── Stage: venduto (4) ─────────────────────────────────────────────────
    for i in 1..4 loop
      v_cid := v_contact_ids[(i % array_length(v_contact_ids, 1)) + 1];
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone,
        latitude, longitude,
        property_type, transaction_type, sqm, rooms, bathrooms, floor, condition, estimated_value,
        owner_contact_id,
        incarico_type, incarico_date, incarico_commission_percent,
        sold_at,
        stage, owner_disposition, created_at
      ) values (
        v_pid, v_ws_id, v_agent1,
        'Via Venduta ' || (i * 4 + 20)::text,
        'Milano', 'Zona Nuova',
        45.472 + (i * 0.001)::decimal, 9.197 + (i * 0.001)::decimal,
        'apartment', 'vendita',
        80 + i * 10, 2 + i % 3, 1 + i % 2, i,
        'buono', i * 40000 + 180000,
        v_cid,
        'esclusivo', current_date - ((180 + i * 10) * interval '1 day'), 2.5,
        now() - (i * 20 * interval '1 day'),
        'venduto', 'venduto',
        now() - ((200 + i * 10) * interval '1 day')
      ) on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
      values
        (v_ws_id, v_pid, v_agent1, 'cambio_stage', 'Incarico firmato',  'Contratto di mediazione.',                'incarico', now() - ((200 + i * 10) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'visita',       'Visita decisiva',   'Seconda visita con acquirente finale.',    null,       now() - ((50 + i * 10) * interval '1 day')),
        (v_ws_id, v_pid, v_agent1, 'cambio_stage', 'Venduto',           'Rogito notarile completato con successo.', 'venduto',  now() - (i * 20 * interval '1 day'))
      on conflict do nothing;
    end loop;

    -- ─── Stage: locato (4) ─────────────────────────────────────────────────
    for i in 1..4 loop
      v_cid := v_contact_ids[((i + 8) % array_length(v_contact_ids, 1)) + 1];
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone,
        latitude, longitude,
        property_type, transaction_type, sqm, rooms, floor, estimated_value,
        monthly_rent, deposit,
        owner_contact_id,
        lease_type, lease_start_date, lease_end_date,
        incarico_type, incarico_date, incarico_commission_percent,
        stage, owner_disposition, created_at
      ) values (
        v_pid, v_ws_id, v_agent2,
        'Via Locata ' || (i * 5 + 10)::text,
        'Milano', 'Periferia Nord',
        45.480 + (i * 0.001)::decimal, 9.200 + (i * 0.001)::decimal,
        'apartment', 'affitto', 60 + i * 10, 1 + i % 3, i,
        i * 30000 + 120000,
        i * 100 + 600, (i * 100 + 600) * 2,
        v_cid,
        case i % 3 when 0 then '4_plus_4' when 1 then '3_plus_2' else 'transitorio' end,
        current_date - ((i * 90) * interval '1 day'),
        current_date + ((i * 90) * interval '1 day'),
        'esclusivo', current_date - ((i * 120) * interval '1 day'), 2.0,
        'locato', 'locato',
        now() - ((i * 120) * interval '1 day')
      ) on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
      values
        (v_ws_id, v_pid, v_agent2, 'cambio_stage', 'Locato',       'Contratto di locazione firmato.',            'locato', now() - ((i * 120) * interval '1 day')),
        (v_ws_id, v_pid, v_agent2, 'nota',         'Check-in',     'Consegna chiavi e inventario completato.',   null,     now() - ((i * 118) * interval '1 day'))
      on conflict do nothing;
    end loop;

    -- ─── Stage: disponibile (2) ─────────────────────────────────────────────
    for i in 1..2 loop
      v_cid := v_contact_ids[(i % array_length(v_contact_ids, 1)) + 1];
      v_pid := gen_random_uuid();
      insert into properties (
        id, workspace_id, agent_id,
        address, city, zone,
        latitude, longitude,
        property_type, transaction_type, sqm, rooms, floor, estimated_value,
        monthly_rent, owner_contact_id,
        lease_type, lease_start_date, lease_end_date,
        stage, owner_disposition, created_at
      ) values (
        v_pid, v_ws_id, v_agent1,
        'Via Disponibile ' || (i * 3 + 5)::text,
        'Milano', 'Periferia Nord',
        45.483 + (i * 0.001)::decimal, 9.202 + (i * 0.001)::decimal,
        'apartment', 'affitto', 55 + i * 15, 2 + i, i,
        i * 25000 + 100000, i * 80 + 550,
        v_cid,
        '4_plus_4',
        current_date - (5 * 365 * interval '1 day'),
        current_date - (10 * interval '1 day'),
        'disponibile', 'disponibile',
        now() - (5 * 365 * interval '1 day')
      ) on conflict do nothing;

      insert into property_events (workspace_id, property_id, agent_id, event_type, title, description, new_stage, event_date)
      values
        (v_ws_id, v_pid, v_agent1, 'cambio_stage', 'Contratto scaduto', 'L''inquilino ha rilasciato l''immobile.', 'disponibile', current_date - (10 * interval '1 day'))
      on conflict do nothing;
    end loop;

  end loop;
end $$;
