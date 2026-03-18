-- Seed demo data for casa-ai
-- This migration inserts mock data for demo/testing purposes

-- Disable RLS temporarily to insert data
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Create a demo workspace
INSERT INTO workspaces (id, name, tone_default, plan) VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Agenzia Demo', 'standard', 'network')
ON CONFLICT DO NOTHING;

-- Create demo users (we'll use fake UUIDs for now)
-- Admin agent
INSERT INTO users (id, workspace_id, name, email, role) VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Marco Rossi', 'marco@casaai.local', 'admin')
ON CONFLICT DO NOTHING;

-- Regular agents
INSERT INTO users (id, workspace_id, name, email, role) VALUES
  ('20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Giulia Bianchi', 'giulia@casaai.local', 'agent'),
  ('20000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Luca Ferrari', 'luca@casaai.local', 'agent'),
  ('20000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Francesca Romano', 'francesca@casaai.local', 'agent')
ON CONFLICT DO NOTHING;

-- Insert 15 demo listings with nice Italian addresses and images from Unsplash
INSERT INTO listings (id, workspace_id, agent_id, property_type, floor, total_floors, address, city, neighborhood, price, sqm, rooms, bathrooms, features, notes, tone, photos_urls, status) VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'apartment', 3, 6, 'Via Roma 45', 'Milano', 'Centro Storico', 450000, 120, 3, 2, '{"balcone","ascensore","riscaldamento_centralizzato"}', 'Luminoso appartamento con vista sul naviglio', 'luxury', '{"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'house', 0, 2, 'Via Garibaldi 12', 'Torino', 'San Salvario', 380000, 150, 4, 2, '{"giardino","garage","terrazza"}', 'Villetta con spazi verdi', 'standard', '{"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'apartment', 1, 4, 'Via Dante 78', 'Firenze', 'Santo Spirito', 320000, 95, 2, 1, '{"ascensore","arredato","climatizzatore"}', 'Grazioso trilocale in centro', 'luxury', '{"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'villa', 0, 2, 'Via Nazionale 34', 'Venezia', 'Lido di Venezia', 850000, 250, 5, 3, '{"piscina","giardino_privato","cantina","garage_doppio"}', 'Splendida villa con vista sul mare', 'luxury', '{"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'apartment', 2, 5, 'Via Verdi 56', 'Roma', 'Trastevere', 550000, 130, 3, 2, '{"balcone","ascensore","riscaldamento_centralizzato"}', 'Elegante appartamento storico', 'luxury', '{"https://images.unsplash.com/photo-1493857671505-72967e0e4541?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'house', 0, 1, 'Via Cavour 89', 'Bologna', 'Santo Stefano', 290000, 110, 3, 1, '{"giardino","garage","terrazza"}', 'Casa indipendente con orto', 'approachable', '{"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'apartment', 4, 7, 'Via Paolo Sarpi 23', 'Milano', 'Brera', 520000, 140, 3, 2, '{"ascensore","aria_condizionata","cantina"}', 'Raffinato appartamento in zona prestigiosa', 'luxury', '{"https://images.unsplash.com/photo-1512917774080-9264f475eabf?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'apartment', 1, 3, 'Via Cesare Battisti 15', 'Napoli', 'Chiaia', 280000, 85, 2, 1, '{"balcone","climatizzatore","ascensore"}', 'Panoramico con vista golfo', 'standard', '{"https://images.unsplash.com/photo-1580932221553-8eae4515f92c?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'villa', 0, 3, 'Via Monte Bianco 5', 'Aosta', 'Centro', 750000, 200, 4, 2, '{"piscina","giardino_privato","garage","terrazza"}', 'Meravigliosa villa con vista montagne', 'luxury', '{"https://images.unsplash.com/photo-1570129477492-45a003537e1f?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'apartment', 2, 4, 'Via Mazzini 41', 'Genova', 'Porto Antico', 310000, 105, 2, 2, '{"ascensore","arredato","climatizzatore"}', 'Moderno loft vista porto', 'standard', '{"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000011'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'house', 0, 2, 'Via Puccini 67', 'Padova', 'Centro', 265000, 125, 3, 2, '{"giardino","garage","terrazza_grande"}', 'Accogliente casa con spazi verdi', 'approachable', '{"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000012'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'apartment', 5, 8, 'Via della Spiga 18', 'Milano', 'Quadrilatero', 680000, 155, 4, 2, '{"ascensore","riscaldamento_centralizzato","cantina","aria_condizionata"}', 'Lussuoso appartamento in zona shopping', 'luxury', '{"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000013'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'apartment', 3, 5, 'Via Tornabuoni 12', 'Firenze', 'Centro', 440000, 118, 3, 2, '{"balcone","ascensore","riscaldamento_centralizzato"}', 'Elegante in zona commerciale', 'luxury', '{"https://images.unsplash.com/photo-1493857671505-72967e0e4541?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000014'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'apartment', 2, 3, 'Via Nazionale 72', 'Roma', 'Monti', 360000, 92, 2, 1, '{"ascensore","arredato","climatizzatore"}', 'Romantico monolocale arredato', 'standard', '{"https://images.unsplash.com/photo-1512917774080-9264f475eabf?w=800"}', 'published'),
  ('30000000-0000-0000-0000-000000000015'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'house', 0, 2, 'Via Leopardi 33', 'Modena', 'Centro', 295000, 135, 3, 2, '{"giardino","garage","terrazza"}', 'Casa con rifiniture recenti', 'standard', '{"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800"}', 'published')
ON CONFLICT DO NOTHING;

-- Insert 20 demo contacts (clienti)
INSERT INTO contacts (id, workspace_id, agent_id, name, email, phone, type, city_of_residence, budget_min, budget_max, preferred_cities, min_rooms) VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Alessandro Moretti', 'alessandro.moretti@email.com', '3391234567', 'buyer', 'Milano', 300000, 600000, '{"Milano","Como"}', 3),
  ('40000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Bianca Ferrari', 'bianca.ferrari@email.com', '3392345678', 'buyer', 'Torino', 200000, 400000, '{"Torino","Asti"}', 2),
  ('40000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Carlo Russo', 'carlo.russo@email.com', '3393456789', 'seller', 'Firenze', NULL, NULL, '{}', NULL),
  ('40000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Daniela Conti', 'daniela.conti@email.com', '3394567890', 'buyer', 'Roma', 400000, 800000, '{"Roma","Frascati"}', 3),
  ('40000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Enrico Baldi', 'enrico.baldi@email.com', '3395678901', 'renter', 'Milano', 1000, 2000, '{"Milano"}', 2),
  ('40000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Francesca Marini', 'francesca.marini@email.com', '3396789012', 'buyer', 'Venezia', 250000, 500000, '{"Venezia","Treviso"}', 2),
  ('40000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Giorgio Neri', 'giorgio.neri@email.com', '3397890123', 'seller', 'Napoli', NULL, NULL, '{}', NULL),
  ('40000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Ilaria Gallo', 'ilaria.gallo@email.com', '3398901234', 'buyer', 'Bologna', 220000, 380000, '{"Bologna","Modena"}', 2),
  ('40000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Jacopo Rizzo', 'jacopo.rizzo@email.com', '3399012345', 'buyer', 'Genova', 180000, 350000, '{"Genova","Savona"}', 2),
  ('40000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Katia Lombardi', 'katia.lombardi@email.com', '3400123456', 'landlord', 'Milano', NULL, NULL, '{}', NULL),
  ('40000000-0000-0000-0000-000000000011'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Lorenzo Barbieri', 'lorenzo.barbieri@email.com', '3401234567', 'buyer', 'Roma', 350000, 700000, '{"Roma","Civitavecchia"}', 3),
  ('40000000-0000-0000-0000-000000000012'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Margherita Sanna', 'margherita.sanna@email.com', '3402345678', 'buyer', 'Milano', 280000, 520000, '{"Milano","Monza"}', 3),
  ('40000000-0000-0000-0000-000000000013'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Niccolò Costa', 'niccolo.costa@email.com', '3403456789', 'seller', 'Torino', NULL, NULL, '{}', NULL),
  ('40000000-0000-0000-0000-000000000014'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Olga Ferretti', 'olga.ferretti@email.com', '3404567890', 'renter', 'Firenze', 1200, 1800, '{"Firenze"}', 2),
  ('40000000-0000-0000-0000-000000000015'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Paolo Vitali', 'paolo.vitali@email.com', '3405678901', 'buyer', 'Venezia', 300000, 600000, '{"Venezia","Padova"}', 3),
  ('40000000-0000-0000-0000-000000000016'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Querina Mazzini', 'querina.mazzini@email.com', '3406789012', 'seller', 'Napoli', NULL, NULL, '{}', NULL),
  ('40000000-0000-0000-0000-000000000017'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Roberto Spinelli', 'roberto.spinelli@email.com', '3407890123', 'buyer', 'Milano', 500000, 1000000, '{"Milano"}', 4),
  ('40000000-0000-0000-0000-000000000018'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Silvia Donati', 'silvia.donati@email.com', '3408901234', 'buyer', 'Roma', 280000, 480000, '{"Roma"}', 2),
  ('40000000-0000-0000-0000-000000000019'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Tommaso Ricci', 'tommaso.ricci@email.com', '3409012345', 'seller', 'Bologna', NULL, NULL, '{}', NULL),
  ('40000000-0000-0000-0000-000000000020'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Valentina Morino', 'valentina.morino@email.com', '3410123456', 'buyer', 'Milano', 450000, 850000, '{"Milano","Como"}', 3)
ON CONFLICT DO NOTHING;

-- Insert 5 demo campaigns
INSERT INTO campaigns (id, workspace_id, created_by, subject, body_html, body_text, template, recipient_filter, status, sent_count, opened_count, sent_at) VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Nuove proprietà a Milano - Aprile 2026', '<h2>Caro Cliente,</h2><p>Abbiamo nuove proposte esclusive a Milano! Scopri le migliori opportunità immobiliari della città.</p><p>Contattaci oggi per una visita privata.</p>', 'Nuove proprietà a Milano - Aprile 2026. Contattaci per una visita privata.', 'luxury', '{"type":"buyer","city":"Milano"}', 'sent', 12, 8, NOW() - INTERVAL '5 days'),
  ('50000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Affitti Brevi Milano - Opportunità Limitata', '<h2>Proprietari Milano</h2><p>Scopri come guadagnare con gli affitti brevi. Gestione professionale, massimi guadagni.</p>', 'Affitti Brevi Milano - Gestione professionale. Scopri i guadagni massimi.', 'standard', '{"type":"landlord"}', 'sent', 8, 5, NOW() - INTERVAL '3 days'),
  ('50000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Cerchiamo Proprietari - Tuo Immobile Venduto in 60 Giorni', '<h2>Vuoi vendere?</h2><p>Garantiamo vendita entro 60 giorni o rimborso totale della commissione. Contattaci per una valutazione gratuita.</p>', 'Cerchiamo Proprietari - Vendita garantita in 60 giorni. Valutazione gratuita.', 'approachable', '{"type":"seller"}', 'draft', 0, 0, NULL),
  ('50000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Casali di Lusso in Toscana - Esclusiva', '<h2>Esclusiva Toscana</h2><p>Scopri i casali più affascinanti della Toscana con piscina e vigneti. Proprietà straordinarie per investitori sofisticati.</p>', 'Casali di Lusso in Toscana - Proprietà esclusiva con piscina e vigneti.', 'luxury', '{"type":"buyer"}', 'sent', 15, 10, NOW() - INTERVAL '1 day'),
  ('50000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Affitti Studenti Roma - Camere Singole da Subito', '<h2>Cerchi una Camera?</h2><p>Camere singole arredate in posizioni privilegiate di Roma. Subito disponibili, prezzi studenti.</p>', 'Affitti Studenti Roma - Camere singole arredate, prezzi speciali.', 'standard', '{"type":"renter"}', 'sending', 3, 1, NOW())
ON CONFLICT DO NOTHING;

-- Insert 10 demo invoices
INSERT INTO invoices (id, workspace_id, agent_id, numero_fattura, anno, progressivo, cliente_nome, cliente_indirizzo, cliente_citta, emittente_nome, regime, imponibile, aliquota_iva, importo_iva, totale_documento, netto_a_pagare, status, data_emissione, data_scadenza, iban) VALUES
  ('60000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '001', 2026, 1, 'Alessandro Moretti', 'Via Roma 45, Milano', 'Milano', 'Agenzia Demo', 'ordinario', 500000, 22, 110000, 610000, 610000, 'pagata', '2026-02-01', '2026-03-01', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '002', 2026, 2, 'Bianca Ferrari', 'Via Garibaldi 12, Torino', 'Torino', 'Agenzia Demo', 'ordinario', 380000, 22, 83600, 463600, 463600, 'pagata', '2026-02-15', '2026-03-15', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '003', 2026, 3, 'Carlo Russo', 'Via Dante 78, Firenze', 'Firenze', 'Agenzia Demo', 'ordinario', 320000, 22, 70400, 390400, 390400, 'inviata', '2026-03-01', '2026-04-01', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '004', 2026, 4, 'Daniela Conti', 'Via Nazionale 34, Venezia', 'Venezia', 'Agenzia Demo', 'ordinario', 850000, 22, 187000, 1037000, 1037000, 'pagata', '2026-02-10', '2026-03-10', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '005', 2026, 5, 'Enrico Baldi', 'Via Mazzini 41, Genova', 'Genova', 'Agenzia Demo', 'ordinario', 310000, 22, 68200, 378200, 378200, 'bozza', '2026-03-05', '2026-04-05', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '006', 2026, 6, 'Francesca Marini', 'Via Puccini 67, Padova', 'Padova', 'Agenzia Demo', 'ordinario', 265000, 22, 58300, 323300, 323300, 'pagata', '2026-01-20', '2026-02-20', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '007', 2026, 7, 'Giorgio Neri', 'Via della Spiga 18, Milano', 'Milano', 'Agenzia Demo', 'ordinario', 680000, 22, 149600, 829600, 829600, 'inviata', '2026-03-08', '2026-04-08', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '008', 2026, 8, 'Ilaria Gallo', 'Via Tornabuoni 12, Firenze', 'Firenze', 'Agenzia Demo', 'ordinario', 440000, 22, 96800, 536800, 536800, 'pagata', '2026-02-25', '2026-03-25', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '009', 2026, 9, 'Jacopo Rizzo', 'Via Nazionale 72, Roma', 'Roma', 'Agenzia Demo', 'ordinario', 360000, 22, 79200, 439200, 439200, 'scaduta', '2026-01-10', '2026-02-10', 'IT60X0542811101000000123456'),
  ('60000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '010', 2026, 10, 'Katia Lombardi', 'Via Leopardi 33, Modena', 'Modena', 'Agenzia Demo', 'ordinario', 295000, 22, 64900, 359900, 359900, 'pagata', '2026-03-02', '2026-04-02', 'IT60X0542811101000000123456')
ON CONFLICT DO NOTHING;

-- Insert 5 demo proposals
INSERT INTO proposals (id, workspace_id, agent_id, listing_id, buyer_contact_id, immobile_indirizzo, immobile_citta, immobile_tipo, prezzo_richiesto, proponente_nome, agente_nome, agente_agenzia, prezzo_offerto, caparra_confirmatoria, numero_proposta, anno, progressivo, status, data_proposta, validita_proposta) VALUES
  ('70000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, 'Via Roma 45', 'Milano', 'apartment', 450000, 'Alessandro Moretti', 'Marco Rossi', 'Agenzia Demo', 430000, 50000, '001', 2026, 1, 'inviata', '2026-03-01', '2026-03-31'),
  ('70000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, 'Via Garibaldi 12', 'Torino', 'house', 380000, 'Bianca Ferrari', 'Giulia Bianchi', 'Agenzia Demo', 365000, 40000, '002', 2026, 2, 'accettata', '2026-02-15', '2026-03-15'),
  ('70000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000005'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 'Via Verdi 56', 'Roma', 'apartment', 550000, 'Daniela Conti', 'Luca Ferrari', 'Agenzia Demo', 520000, 60000, '003', 2026, 3, 'bozza', '2026-03-10', '2026-04-10'),
  ('70000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000009'::uuid, '40000000-0000-0000-0000-000000000006'::uuid, 'Via Monte Bianco 5', 'Aosta', 'villa', 750000, 'Francesca Marini', 'Marco Rossi', 'Agenzia Demo', 710000, 100000, '004', 2026, 4, 'controproposta', '2026-02-20', '2026-03-20'),
  ('70000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000004'::uuid, '40000000-0000-0000-0000-000000000011'::uuid, 'Via Nazionale 34', 'Venezia', 'villa', 850000, 'Lorenzo Barbieri', 'Giulia Bianchi', 'Agenzia Demo', 800000, 120000, '005', 2026, 5, 'rifiutata', '2026-03-05', '2026-03-25')
ON CONFLICT DO NOTHING;

-- Insert 10 demo todos
INSERT INTO todos (id, workspace_id, created_by, assigned_to, title, notes, priority, due_date, completed) VALUES
  ('80000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Preparare presentazione villa Via Monte Bianco', 'Raccogliere foto, misurazioni, storia immobile', 'high', '2026-03-20', false),
  ('80000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Follow-up Alessandro Moretti', 'Contattare per feedback su Via Roma', 'medium', '2026-03-17', false),
  ('80000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Caricamento foto Torino', 'Scattare foto alla villa di Via Garibaldi', 'high', '2026-03-19', false),
  ('80000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Verifica documenti proposta Moretti', 'Controllare visure, catastale, e ipoteche', 'medium', '2026-03-18', true),
  ('80000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Contatto nuovo cliente Roma', 'Bianca Ferrari ha referenziato interessato lusso', 'high', '2026-03-16', false),
  ('80000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Riunione con notaio proposta Ferrari', 'Discussione timeline e documenti necessari', 'medium', '2026-03-21', false),
  ('80000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Generare brochure PDF per campagna Milano', 'Usare AI per descrizioni updated', 'medium', '2026-03-18', false),
  ('80000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Revisione listini prezzi zona', 'Aggiornare dati comps per Firenze', 'low', '2026-03-22', false),
  ('80000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Training CasaAI per nuovo agente', 'Onboard Francesca su sistema AI', 'high', '2026-03-20', false),
  ('80000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Feedback cliente Conti su controproposta', 'Attendere risposta su modifica prezzo', 'low', '2026-03-25', false)
ON CONFLICT DO NOTHING;

-- Insert 10 demo notifications
INSERT INTO notifications (id, workspace_id, agent_id, type, title, body, contact_id, read) VALUES
  ('90000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'birthday_message', 'Compleanno - Alessandro Moretti', 'Alessandro Moretti compie gli anni oggi. Hai un messaggio personalizzato pronto da inviare.', '40000000-0000-0000-0000-000000000001'::uuid, false),
  ('90000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'appointment_assigned', 'Appuntamento assegnato', 'Ti è stato assegnato un appuntamento con Bianca Ferrari per la visita di Via Garibaldi 12.', '40000000-0000-0000-0000-000000000002'::uuid, true),
  ('90000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'buyer_matched', 'Nuovo match - Buyer interessato', 'Daniela Conti ha un match con Via Verdi 56 - Roma. Prezzo: €550.000', '40000000-0000-0000-0000-000000000004'::uuid, false),
  ('90000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'campaign_sent', 'Campagna inviata con successo', 'La campagna "Nuove proprietà Milano" è stata inviata a 12 clienti con 8 aperture.', NULL, true),
  ('90000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'proposal_response', 'Risposta ricevuta su proposta', 'Carlo Russo ha risposto alla proposta di Via Dante 78 - controfferta in arrivo.', '40000000-0000-0000-0000-000000000003'::uuid, false),
  ('90000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'invoice_sent', 'Fattura inviata via email', 'Fattura #007 inviata a Giorgio Neri (€829.600). Scadenza: 08/04/2026.', NULL, true),
  ('90000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'birthday_message', 'Compleanno - Enrico Baldi', 'Enrico Baldi compie gli anni domani. Ricordati di mandargli gli auguri!', '40000000-0000-0000-0000-000000000005'::uuid, false),
  ('90000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'task_assigned', 'Nuovo task assegnato', 'Luca Ferrari ti ha assegnato: "Follow-up Alessandro Moretti" - Scadenza: 17/03/2026', NULL, false),
  ('90000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'listing_published', 'Proprietà pubblicata', 'Via Leopardi 33 (Modena) è stata pubblicata e visibile a tutti gli agenti.', NULL, true),
  ('90000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'appointment_reminder', 'Promemoria appuntamento', 'Tra 2 ore appuntamento con Margherita Sanna per visita Via Nazionale 72 (Roma).', NULL, false)
ON CONFLICT DO NOTHING;

-- Re-enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
