-- Migration 027: Seed mock data for all existing workspaces
-- Pattern: dynamic PL/pgSQL loop over existing workspaces/users (same as 018_seed_appointments)
-- Inserts: 20 contacts, 15 listings (with Unsplash photos), 5 campaigns,
--          10 invoices, 5 proposals, 10 todos, 10 notifications per workspace

do $$
declare
  r_ws        record;
  v_agent1    uuid;
  v_agent2    uuid;
  v_agent3    uuid;
  v_ws_name   text;

  -- Listing IDs (stored after insert for proposals)
  v_listing_ids   uuid[] := '{}';
  v_contact_ids   uuid[] := '{}';
  v_buyer_ids     uuid[] := '{}';

  v_lid   uuid;
  v_cid   uuid;
  v_iid   uuid;
  v_pid   uuid;

  -- For invoice/proposal numbering (pick a high start to avoid conflicts)
  v_inv_prog  int;
  v_prop_prog int;

  -- Unsplash photo sets (multiple photos per listing)
  photos_apt1   text[] := ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900','https://images.unsplash.com/photo-1484154218962-a197022b6b4e?w=900'];
  photos_apt2   text[] := ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900','https://images.unsplash.com/photo-1493857671505-72967e0e4541?w=900'];
  photos_apt3   text[] := ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900','https://images.unsplash.com/photo-1484154218962-a197022b6b4e?w=900'];
  photos_apt4   text[] := ARRAY['https://images.unsplash.com/photo-1580932221553-8eae4515f92c?w=900','https://images.unsplash.com/photo-1512917774080-9264f475eabf?w=900'];
  photos_apt5   text[] := ARRAY['https://images.unsplash.com/photo-1600047508788-786f3865b694?w=900','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900'];
  photos_house1 text[] := ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900','https://images.unsplash.com/photo-1530018352490-c6eef07fd7e0?w=900'];
  photos_house2 text[] := ARRAY['https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900','https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=900'];
  photos_house3 text[] := ARRAY['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900'];
  photos_villa1 text[] := ARRAY['https://images.unsplash.com/photo-1570129477492-45a003537e1f?w=900','https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=900','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900'];
  photos_villa2 text[] := ARRAY['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900','https://images.unsplash.com/photo-1512917774080-9264f475eabf?w=900','https://images.unsplash.com/photo-1570129477492-45a003537e1f?w=900'];
  photos_villa3 text[] := ARRAY['https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=900','https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900'];
  photos_comm   text[] := ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=900','https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900'];
  photos_loft   text[] := ARRAY['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=900','https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900'];
  photos_lux    text[] := ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900','https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900','https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=900'];

begin

  for r_ws in select id, name from workspaces loop

    v_ws_name := r_ws.name;

    -- Pick up to 3 agents from this workspace (fall back to same if fewer)
    v_agent1 := (select id from users where workspace_id = r_ws.id order by created_at limit 1);
    v_agent2 := coalesce(
                  (select id from users where workspace_id = r_ws.id order by created_at limit 1 offset 1),
                  v_agent1);
    v_agent3 := coalesce(
                  (select id from users where workspace_id = r_ws.id order by created_at limit 1 offset 2),
                  v_agent1);

    if v_agent1 is null then
      continue;  -- skip workspaces with no users
    end if;

    -- ─── CONTACTS (20 total: mix buyer/seller/renter/landlord) ───────────────
    -- Only add if we have fewer than 15 contacts already
    if (select count(*) from contacts where workspace_id = r_ws.id) < 15 then

      v_contact_ids := '{}';
      v_buyer_ids   := '{}';

      -- Buyers (12)
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent1, 'Alessandro Moretti',  'a.moretti@email.it',   '+39 339 123 4567', 'buyer', 'Milano',  350000, 650000, ARRAY['Milano','Como'],          3) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent1, 'Bianca Ferrari',      'b.ferrari@email.it',   '+39 339 234 5678', 'buyer', 'Torino',  200000, 420000, ARRAY['Torino','Asti'],           2) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent2, 'Daniela Conti',       'd.conti@email.it',     '+39 339 345 6789', 'buyer', 'Roma',    420000, 800000, ARRAY['Roma','Frascati'],         3) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent2, 'Francesco Mancini',   'f.mancini@email.it',   '+39 339 456 7890', 'buyer', 'Venezia', 300000, 600000, ARRAY['Venezia','Padova'],        2) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent3, 'Ilaria Gallo',        'i.gallo@email.it',     '+39 339 567 8901', 'buyer', 'Bologna', 240000, 400000, ARRAY['Bologna','Modena'],        2) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent3, 'Lorenzo Barbieri',    'l.barbieri@email.it',  '+39 339 678 9012', 'buyer', 'Roma',    380000, 720000, ARRAY['Roma','Civitavecchia'],    3) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent1, 'Margherita Sanna',    'm.sanna@email.it',     '+39 339 789 0123', 'buyer', 'Milano',  290000, 540000, ARRAY['Milano','Monza'],          3) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent2, 'Paolo Vitali',        'p.vitali@email.it',    '+39 339 890 1234', 'buyer', 'Venezia', 310000, 580000, ARRAY['Venezia','Treviso'],       2) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent3, 'Roberto Spinelli',    'r.spinelli@email.it',  '+39 339 901 2345', 'buyer', 'Milano',  520000, 1100000, ARRAY['Milano'],                 4) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent1, 'Silvia Donati',       's.donati@email.it',    '+39 340 012 3456', 'buyer', 'Roma',    260000, 490000, ARRAY['Roma'],                    2) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent2, 'Valentina Morino',    'v.morino@email.it',    '+39 340 123 4567', 'buyer', 'Milano',  460000, 860000, ARRAY['Milano','Como'],           3) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms)
        values (r_ws.id, v_agent3, 'Jacopo Rizzo',        'j.rizzo@email.it',     '+39 340 234 5678', 'buyer', 'Genova',  190000, 370000, ARRAY['Genova','Savona'],         2) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid; v_buyer_ids := v_buyer_ids || v_cid;

      -- Sellers (5)
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent1, 'Carlo Russo',         'c.russo@email.it',     '+39 340 345 6789', 'seller', 'Firenze') returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent2, 'Giorgio Neri',        'g.neri@email.it',      '+39 340 456 7890', 'seller', 'Napoli')  returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent3, 'Niccolò Costa',       'n.costa@email.it',     '+39 340 567 8901', 'seller', 'Torino')  returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent1, 'Querina Mazzini',     'q.mazzini@email.it',   '+39 340 678 9012', 'seller', 'Napoli')  returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent2, 'Tommaso Ricci',       't.ricci@email.it',     '+39 340 789 0123', 'seller', 'Bologna') returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;

      -- Renters (2) + Landlord (1)
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities)
        values (r_ws.id, v_agent3, 'Enrico Baldi',        'e.baldi@email.it',     '+39 340 890 1234', 'renter',   'Milano',  900,  2200, ARRAY['Milano'])  returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities)
        values (r_ws.id, v_agent1, 'Olga Ferretti',       'o.ferretti@email.it',  '+39 340 901 2345', 'renter',   'Firenze', 1100, 1900, ARRAY['Firenze']) returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent2, 'Katia Lombardi',      'k.lombardi@email.it',  '+39 341 012 3456', 'landlord', 'Milano') returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;
      insert into contacts (workspace_id, agent_id, name, email, phone, type, city_of_residence)
        values (r_ws.id, v_agent3, 'Fabrizio Esposito',   'f.esposito@email.it',  '+39 341 123 4567', 'other',    'Napoli') returning id into v_cid; v_contact_ids := v_contact_ids || v_cid;

    else
      -- Workspace already has contacts — collect buyer IDs for proposals
      select array_agg(id) into v_buyer_ids from (
        select id from contacts where workspace_id = r_ws.id and type = 'buyer' limit 5
      ) sub;
    end if;

    -- ─── LISTINGS (15 with Unsplash photos) ──────────────────────────────────
    if (select count(*) from listings where workspace_id = r_ws.id) < 15 then

      v_listing_ids := '{}';

      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent1, 'apartment', 3, 6, 'Via Roma 45',             'Milano',  'Centro Storico',    450000, 120, 3, 2, ARRAY['balcone','ascensore','riscaldamento_centralizzato'],       'Luminoso appartamento con vista sul naviglio. Ottima distribuzione degli spazi.', 'luxury',      photos_apt1, 'published', 312, 47, 89) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent2, 'house',     0, 2, 'Via Garibaldi 12',        'Torino',  'San Salvario',      380000, 150, 4, 2, ARRAY['giardino','garage','terrazza'],                           'Villetta indipendente con giardino privato 200 mq.',                          'standard',    photos_house1,'published', 198, 31, 54) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent3, 'apartment', 1, 4, 'Via Dante 78',            'Firenze', 'Santo Spirito',     320000, 95,  2, 1, ARRAY['ascensore','arredato','climatizzatore'],                  'Grazioso bilocale nel cuore di Firenze. Parquet originale.',                  'luxury',      photos_apt2, 'published', 441, 62, 103) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent1, 'villa',     0, 2, 'Via Nazionale 34',        'Venezia', 'Lido di Venezia',   850000, 250, 5, 3, ARRAY['piscina','giardino_privato','cantina','garage'],           'Villa esclusiva con accesso privato alla spiaggia e piscina.',               'luxury',      photos_villa1,'published', 893, 141, 278) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent2, 'apartment', 2, 5, 'Via Verdi 56',            'Roma',    'Trastevere',        550000, 130, 3, 2, ARRAY['balcone','ascensore','riscaldamento_centralizzato'],       'Elegante appartamento in palazzo storico. Soffitti alti 3,5 m.',             'luxury',      photos_lux,  'published', 527, 83, 167) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent3, 'house',     0, 1, 'Via Cavour 89',           'Bologna', 'Santo Stefano',     290000, 110, 3, 1, ARRAY['giardino','garage','terrazza'],                           'Casa indipendente con orto. Zona residenziale tranquilla.',                  'approachable',photos_house2,'published', 167, 24, 41) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent1, 'apartment', 4, 7, 'Via Paolo Sarpi 23',      'Milano',  'Brera',             520000, 140, 3, 2, ARRAY['ascensore','aria_condizionata','cantina'],                 'Raffinato appartamento in zona Brera, a 5 min da Castello Sforzesco.',       'luxury',      photos_apt3, 'published', 634, 98, 201) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent2, 'apartment', 1, 3, 'Via C. Battisti 15',      'Napoli',  'Chiaia',            280000, 85,  2, 1, ARRAY['balcone','climatizzatore','ascensore'],                   'Panoramico con vista golfo. Piano alto, luminosissimo.',                     'standard',    photos_apt4, 'published', 223, 38, 72) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent3, 'villa',     0, 3, 'Via Monte Bianco 5',      'Aosta',   'Centro',            750000, 200, 4, 2, ARRAY['piscina','giardino_privato','garage','terrazza'],          'Villa con vista sulle Alpi. Posizione unica, a 10 min dalle piste da sci.',   'luxury',      photos_villa2,'published', 712, 115, 234) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent1, 'apartment', 2, 4, 'Via Mazzini 41',          'Genova',  'Porto Antico',      310000, 105, 2, 2, ARRAY['ascensore','arredato','climatizzatore'],                  'Loft moderno con vista porto. Ristrutturato nel 2024.',                      'standard',    photos_loft, 'published', 289, 44, 88) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent2, 'house',     0, 2, 'Via Puccini 67',          'Padova',  'Centro',            265000, 125, 3, 2, ARRAY['giardino','garage','terrazza'],                           'Casa accogliente con giardino recintato. A 5 min dal centro.',               'approachable',photos_house3,'published', 156, 22, 47) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent3, 'apartment', 5, 8, 'Via della Spiga 18',      'Milano',  'Quadrilatero',      680000, 155, 4, 2, ARRAY['ascensore','riscaldamento_centralizzato','cantina','aria_condizionata'], 'Lussuoso appartamento nella zona shopping più esclusiva di Milano.', 'luxury',      photos_lux,  'published', 1021,162, 389) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent1, 'apartment', 3, 5, 'Via Tornabuoni 12',       'Firenze', 'Centro',            440000, 118, 3, 2, ARRAY['balcone','ascensore','riscaldamento_centralizzato'],       'Elegante appartamento nella via più famosa di Firenze.',                     'luxury',      photos_apt5, 'published', 387, 61, 124) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent2, 'villa',     0, 2, 'Via delle Rose 7',        'Capri',   'Centro',           1200000, 280, 5, 3, ARRAY['piscina','giardino_privato','terrazza_panoramica','domotica'], 'Villa esclusiva a Capri con terrazza e vista panoramica sul mare.',       'luxury',      photos_villa3,'published', 1543,248, 512) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;
      insert into listings (workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status, view_count, share_count, portal_click_count)
        values (r_ws.id, v_agent3, 'commercial',0, 1, 'Via Montenapoleone 9',    'Milano',  'Centro',            920000, 200, 0, 2, ARRAY['vetrina','aria_condizionata','impianto_allarme'],           'Negozio/ufficio in posizione strategica. Adatto retail o showroom.',         'investment',  photos_comm, 'published', 445, 68, 142) returning id into v_lid; v_listing_ids := v_listing_ids || v_lid;

    else
      -- Workspace already has listings — collect IDs for proposals
      select array_agg(id) into v_listing_ids from (
        select id from listings where workspace_id = r_ws.id and status = 'published' limit 5
      ) sub;
    end if;

    -- ─── CAMPAIGNS (5 per workspace) ─────────────────────────────────────────
    if (select count(*) from campaigns where workspace_id = r_ws.id) < 3 then
      insert into campaigns (workspace_id, created_by, subject, body_html, body_text, template, recipient_filter, status, sent_count, opened_count, sent_at) values
        (r_ws.id, v_agent1, 'Nuove proprietà esclusiva — Aprile 2026',
         '<h2>Caro Cliente,</h2><p>Abbiamo selezionato per te le migliori proposte immobiliari del mese. Appartamenti di lusso a Milano, ville sul mare e casali in Toscana. <strong>Contattaci per una visita privata.</strong></p>',
         'Nuove proprietà esclusive. Appartamenti lusso Milano, ville, casali Toscana. Contattaci per visita.',
         'luxury', '{"type":"buyer"}', 'sent', 23, 14, now() - interval '5 days'),
        (r_ws.id, v_agent2, 'Vuoi vendere? Valutiamo gratis il tuo immobile',
         '<h2>Valutazione Gratuita</h2><p>Siamo alla ricerca di immobili da vendere nella tua zona. <strong>Offriamo valutazione gratuita e vendita garantita entro 90 giorni.</strong> Contattaci subito.</p>',
         'Cerchiamo immobili. Valutazione gratuita. Vendita garantita 90 giorni.',
         'approachable', '{"type":"seller"}', 'sent', 18, 11, now() - interval '3 days'),
        (r_ws.id, v_agent3, 'Opportunità investimento — rendita 5–7% garantita',
         '<h2>Investimento Immobiliare</h2><p>Selezione esclusiva di immobili ad alto rendimento. Gestione affitti inclusa. <strong>ROI stimato 5–7% annuo.</strong> Scopri la nostra selezione.</p>',
         'Immobili investimento ad alto rendimento. ROI 5-7%. Gestione affitti inclusa.',
         'investment', '{"type":"buyer"}', 'sent', 31, 19, now() - interval '1 day'),
        (r_ws.id, v_agent1, 'Affitti brevi — massimizza il tuo immobile',
         '<h2>Affitti Brevi</h2><p>Gestione professionale del tuo immobile su Airbnb e Booking. <strong>Aumenta i guadagni fino al 40% rispetto all''affitto tradizionale.</strong></p>',
         'Affitti brevi. Gestione Airbnb e Booking. +40% vs affitto tradizionale.',
         'standard', '{"type":"landlord"}', 'draft', 0, 0, null),
        (r_ws.id, v_agent2, 'Case e appartamenti per famiglie — zona scuole',
         '<h2>Per la Tua Famiglia</h2><p>Ampia selezione di abitazioni vicino a parchi, scuole e servizi. Prezzi accessibili e condizioni vantaggiose per acquisto prima casa.</p>',
         'Case per famiglie vicino a scuole e parchi. Prima casa, prezzi accessibili.',
         'approachable', '{"type":"buyer"}', 'sending', 7, 3, now());
    end if;

    -- ─── INVOICES (10 per workspace) ─────────────────────────────────────────
    -- Pick a safe starting progressivo to avoid UNIQUE violations
    v_inv_prog := coalesce((select max(progressivo) from invoices where workspace_id = r_ws.id and anno = 2026), 0) + 1;

    if (select count(*) from invoices where workspace_id = r_ws.id) < 5 then
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent1, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Alessandro Moretti', 'Milano',  v_ws_name, 'ordinario', 720000,22,158400,878400,878400,'pagata',  current_date-45, current_date-15, 'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent2, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Bianca Ferrari',     'Torino',  v_ws_name, 'ordinario', 456000,22,100320,556320,556320,'pagata',  current_date-30, current_date-1,  'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent3, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Daniela Conti',      'Roma',    v_ws_name, 'ordinario', 990000,22,217800,1207800,1207800,'inviata', current_date-7,  current_date+23, 'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent1, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Francesco Mancini',  'Venezia', v_ws_name, 'ordinario', 360000,22,79200,439200,439200,'pagata',   current_date-60, current_date-30, 'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent2, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Ilaria Gallo',       'Bologna', v_ws_name, 'ordinario', 288000,22,63360,351360,351360,'bozza',    current_date,    current_date+30, 'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent3, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Lorenzo Barbieri',   'Roma',    v_ws_name, 'ordinario', 816000,22,179520,995520,995520,'pagata',   current_date-50, current_date-20, 'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent1, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Margherita Sanna',   'Milano',  v_ws_name, 'ordinario', 528000,22,116160,644160,644160,'inviata',  current_date-3,  current_date+27, 'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent2, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Paolo Vitali',       'Venezia', v_ws_name, 'ordinario', 372000,22,81840,453840,453840,'pagata',    current_date-22, current_date+8,  'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent3, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Roberto Spinelli',   'Milano',  v_ws_name, 'ordinario',1320000,22,290400,1610400,1610400,'pagata',  current_date-35, current_date-5,  'IT60X0542811101000000123456'); v_inv_prog := v_inv_prog+1;
      insert into invoices (workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban)
        values (r_ws.id, v_agent1, lpad(v_inv_prog::text,3,'0'), 2026, v_inv_prog, 'Valentina Morino',   'Milano',  v_ws_name, 'ordinario', 612000,22,134640,746640,746640,'scaduta',   current_date-75, current_date-45, 'IT60X0542811101000000123456');
    end if;

    -- ─── PROPOSALS (5 per workspace) ─────────────────────────────────────────
    -- Need at least 2 listings and 2 buyer contacts
    if array_length(v_listing_ids, 1) >= 2 and array_length(v_buyer_ids, 1) >= 2
       and (select count(*) from proposals where workspace_id = r_ws.id) < 3 then

      v_prop_prog := coalesce((select max(progressivo) from proposals where workspace_id = r_ws.id and anno = 2026), 0) + 1;

      insert into proposals (workspace_id, agent_id, listing_id, buyer_contact_id, immobile_indirizzo, immobile_citta, immobile_tipo, prezzo_richiesto, proponente_nome, agente_nome, agente_agenzia, prezzo_offerto, caparra_confirmatoria, numero_proposta, anno, progressivo, status, data_proposta, validita_proposta, vincoli)
        values (r_ws.id, v_agent1, v_listing_ids[1], v_buyer_ids[1],
          (select address from listings where id = v_listing_ids[1]),
          (select city from listings where id = v_listing_ids[1]),
          (select property_type::text from listings where id = v_listing_ids[1]),
          (select price from listings where id = v_listing_ids[1]),
          (select name from contacts where id = v_buyer_ids[1]),
          (select name from users where id = v_agent1),
          v_ws_name,
          (select price from listings where id = v_listing_ids[1]) - 20000,
          50000,
          lpad(v_prop_prog::text,3,'0'), 2026, v_prop_prog,
          'inviata', current_date-15, current_date+15,
          '[{"tipo":"mutuo","importo_mutuo":250000,"nome_banca":"UniCredit"}]'::jsonb);
      v_prop_prog := v_prop_prog + 1;

      insert into proposals (workspace_id, agent_id, listing_id, buyer_contact_id, immobile_indirizzo, immobile_citta, immobile_tipo, prezzo_richiesto, proponente_nome, agente_nome, agente_agenzia, prezzo_offerto, caparra_confirmatoria, numero_proposta, anno, progressivo, status, data_proposta, validita_proposta, vincoli)
        values (r_ws.id, v_agent2, v_listing_ids[2], v_buyer_ids[2],
          (select address from listings where id = v_listing_ids[2]),
          (select city from listings where id = v_listing_ids[2]),
          (select property_type::text from listings where id = v_listing_ids[2]),
          (select price from listings where id = v_listing_ids[2]),
          (select name from contacts where id = v_buyer_ids[2]),
          (select name from users where id = v_agent2),
          v_ws_name,
          (select price from listings where id = v_listing_ids[2]) - 15000,
          40000,
          lpad(v_prop_prog::text,3,'0'), 2026, v_prop_prog,
          'accettata', current_date-30, current_date-1,
          '[]'::jsonb);
      v_prop_prog := v_prop_prog + 1;

      if array_length(v_listing_ids, 1) >= 3 and array_length(v_buyer_ids, 1) >= 3 then
        insert into proposals (workspace_id, agent_id, listing_id, buyer_contact_id, immobile_indirizzo, immobile_citta, immobile_tipo, prezzo_richiesto, proponente_nome, agente_nome, agente_agenzia, prezzo_offerto, caparra_confirmatoria, numero_proposta, anno, progressivo, status, data_proposta, validita_proposta, vincoli)
          values (r_ws.id, v_agent3, v_listing_ids[3], v_buyer_ids[3],
            (select address from listings where id = v_listing_ids[3]),
            (select city from listings where id = v_listing_ids[3]),
            (select property_type::text from listings where id = v_listing_ids[3]),
            (select price from listings where id = v_listing_ids[3]),
            (select name from contacts where id = v_buyer_ids[3]),
            (select name from users where id = v_agent3),
            v_ws_name,
            (select price from listings where id = v_listing_ids[3]) - 30000,
            60000,
            lpad(v_prop_prog::text,3,'0'), 2026, v_prop_prog,
            'bozza', current_date, current_date+30,
            '[{"tipo":"vendita_immobile","indirizzo_immobile_vendita":"Via Garibaldi 3"}]'::jsonb);
        v_prop_prog := v_prop_prog + 1;
      end if;

      if array_length(v_listing_ids, 1) >= 4 and array_length(v_buyer_ids, 1) >= 4 then
        insert into proposals (workspace_id, agent_id, listing_id, buyer_contact_id, immobile_indirizzo, immobile_citta, immobile_tipo, prezzo_richiesto, proponente_nome, agente_nome, agente_agenzia, prezzo_offerto, caparra_confirmatoria, numero_proposta, anno, progressivo, status, data_proposta, validita_proposta, vincoli)
          values (r_ws.id, v_agent1, v_listing_ids[4], v_buyer_ids[4],
            (select address from listings where id = v_listing_ids[4]),
            (select city from listings where id = v_listing_ids[4]),
            (select property_type::text from listings where id = v_listing_ids[4]),
            (select price from listings where id = v_listing_ids[4]),
            (select name from contacts where id = v_buyer_ids[4]),
            (select name from users where id = v_agent1),
            v_ws_name,
            (select price from listings where id = v_listing_ids[4]) - 50000,
            100000,
            lpad(v_prop_prog::text,3,'0'), 2026, v_prop_prog,
            'controproposta', current_date-20, current_date+10,
            '[{"tipo":"mutuo","importo_mutuo":400000,"nome_banca":"Intesa Sanpaolo"}]'::jsonb);
        v_prop_prog := v_prop_prog + 1;
      end if;

      if array_length(v_listing_ids, 1) >= 5 and array_length(v_buyer_ids, 1) >= 5 then
        insert into proposals (workspace_id, agent_id, listing_id, buyer_contact_id, immobile_indirizzo, immobile_citta, immobile_tipo, prezzo_richiesto, proponente_nome, agente_nome, agente_agenzia, prezzo_offerto, caparra_confirmatoria, numero_proposta, anno, progressivo, status, data_proposta, validita_proposta, vincoli)
          values (r_ws.id, v_agent2, v_listing_ids[5], v_buyer_ids[5],
            (select address from listings where id = v_listing_ids[5]),
            (select city from listings where id = v_listing_ids[5]),
            (select property_type::text from listings where id = v_listing_ids[5]),
            (select price from listings where id = v_listing_ids[5]),
            (select name from contacts where id = v_buyer_ids[5]),
            (select name from users where id = v_agent2),
            v_ws_name,
            (select price from listings where id = v_listing_ids[5]) - 25000,
            70000,
            lpad(v_prop_prog::text,3,'0'), 2026, v_prop_prog,
            'rifiutata', current_date-10, current_date+20,
            '[]'::jsonb);
      end if;

    end if;

    -- ─── TODOS (10 per workspace) ─────────────────────────────────────────────
    if (select count(*) from todos where workspace_id = r_ws.id) < 5 then
      insert into todos (workspace_id, created_by, assigned_to, title, notes, priority, due_date, completed) values
        (r_ws.id, v_agent1, v_agent1, 'Preparare brochure PDF immobili luxury',   'Usare template AI per ogni tono disponibile', 'high',   current_date+2,  false),
        (r_ws.id, v_agent1, v_agent2, 'Follow-up acquirenti in attesa risposta',  'Chiamare i clienti con proposta pending',      'high',   current_date+1,  false),
        (r_ws.id, v_agent2, v_agent3, 'Fotografare nuovi immobili Firenze',        'Servizio fotografico professionale',           'high',   current_date+3,  false),
        (r_ws.id, v_agent2, v_agent1, 'Verifica documentazione catastale',         'Controllare visure e ipoteche pendenti',       'medium', current_date+5,  false),
        (r_ws.id, v_agent3, v_agent2, 'Riunione settimanale del team',             'Review pipeline e nuovi mandati',              'medium', current_date+7,  false),
        (r_ws.id, v_agent3, v_agent3, 'Aggiornare listino prezzi zona centro',     'Analisi comparativi recenti',                  'medium', current_date+4,  false),
        (r_ws.id, v_agent1, v_agent1, 'Inviare email campagna acquirenti Milano',  'Usare template luxury approvato',              'medium', current_date+6,  false),
        (r_ws.id, v_agent2, v_agent2, 'Appuntamento notaio proposta Ferrari',      'Preparare documenti compromesso',              'high',   current_date+10, false),
        (r_ws.id, v_agent3, v_agent1, 'Revisione contratti in scadenza',           'Verificare rinnovi mensile prossimo',          'low',    current_date+14, false),
        (r_ws.id, v_agent1, v_agent3, 'Onboarding nuovo agente',                  'Introduzione al sistema CasaAI',               'low',    current_date+12, false);
    end if;

    -- ─── NOTIFICATIONS (10 per agent in workspace) ────────────────────────────
    if (select count(*) from notifications where workspace_id = r_ws.id) < 5 then
      insert into notifications (workspace_id, agent_id, type, title, body, read) values
        (r_ws.id, v_agent1, 'birthday_message',    'Compleanno — Alessandro Moretti',       'Alessandro Moretti compie gli anni oggi. Invia un messaggio personalizzato!',                   false),
        (r_ws.id, v_agent1, 'campaign_sent',        'Campagna inviata',                       'La campagna "Nuove proprietà luxury" è stata inviata a 23 clienti con 14 aperture.',            true),
        (r_ws.id, v_agent1, 'appointment_reminder', 'Appuntamento tra 2 ore',                'Visita immobile via Roma 45 con Daniela Conti. Non dimenticare la planimetria.',                 false),
        (r_ws.id, v_agent2, 'buyer_matched',        'Nuovo match acquirente',                 'Lorenzo Barbieri corrisponde al profilo ricercato per Via della Spiga 18 (Milano). Contattalo!',false),
        (r_ws.id, v_agent2, 'appointment_assigned', 'Appuntamento assegnato',                 'Marco ti ha assegnato un appuntamento con Margherita Sanna per venerdì alle 15:00.',             true),
        (r_ws.id, v_agent2, 'proposal_response',    'Risposta proposta ricevuta',             'Il venditore ha risposto alla proposta di Bianca Ferrari — controfferta disponibile.',            false),
        (r_ws.id, v_agent3, 'invoice_sent',         'Fattura inviata con successo',           'Fattura #009 inviata a Roberto Spinelli. Totale: €1.610.400. Scadenza tra 30 giorni.',           true),
        (r_ws.id, v_agent3, 'listing_published',    'Annuncio pubblicato',                    'Villa Via delle Rose 7 (Capri) è ora pubblicata e visibile agli acquirenti.',                    true),
        (r_ws.id, v_agent3, 'birthday_message',     'Compleanno — Valentina Morino',          'Valentina Morino compie gli anni domani. Ricordati di mandarle gli auguri!',                     false),
        (r_ws.id, v_agent1, 'task_assigned',        'Nuovo task assegnato',                   'Luca Ferrari ti ha assegnato: "Fotografare nuovi immobili Firenze" — scadenza giovedì.',         false);
    end if;

  end loop;

end $$;
