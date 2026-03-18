# Sprint I — Banca Dati Immobiliare: Completato

**Data completamento:** 18 marzo 2026
**Branch:** `sprint-i-banca-dati`

---

## Cosa è stato costruito

### Fase 0 — Specifiche tecniche

8 file di specifiche create prima di scrivere codice:

- `SPEC-DATABASE.md` — Schema: 6 nuove tabelle, 6 enum, RLS policies, indici, funzione Haversine
- `SPEC-API.md` — 15+ endpoint API con request/response spec, validazione, logica avanzamento stage
- `SPEC-UI.md` — 3 nuove pagine, restructura sidebar, form progressivo, componente timeline
- `SPEC-AFFITTI.md` — Ciclo di vita affitti (incarico→locato→disponibile), 4 notifiche automatiche
- `SPEC-PDF-TEMPLATES.md` — 2 template contratto (vendita, locazione), 20+ placeholder, invio email+WhatsApp
- `SPEC-SICUREZZA.md` — Checklist sicurezza: RLS, workspace isolation, validazione input, rate limiting
- `SPEC-TESTING.md` — 70+ casi di test con dati mock (30+ proprietà, 5+ zone, 15+ contatti, 50+ eventi)
- `REQUISITI-STRUMENTI.md` — Setup Mapbox (token gratuito: 100k richieste/mese), template PDF, API future

---

### Fase 1 — Database (15 migrazioni, 028–042)

**6 nuove tabelle:**
- `properties` — immobile con stage, coordinate GPS, dati proprietario, disposizione, valori finanziari
- `property_events` — cronistoria append-only (ogni interazione registrata permanentemente)
- `zones` — zone geografiche per workspace
- `sub_zones` — sotto-zone con associazione alla zona padre
- `agent_zones` — assegnazione zone/sotto-zone agli agenti
- `property_contacts` — contatti multi-ruolo per ogni immobile

**6+ nuovi enum:**
- `property_stage` — sconosciuto, ignoto, conosciuto, incarico, locato, venduto, disponibile
- `owner_disposition` — neutral, vuole_vendere, vuole_locare, non_vuole_vendere, incarico_firmato, appena_acquistato
- `property_transaction_type` — vendita, locazione
- `lease_type` — 4+4, 3+2, transitorio, cedolare_secca, studenti
- `property_event_type` — 15+ tipi di evento (visita, telefonata, email, incarico_firmato, ecc.)
- `property_contact_role` — proprietario, moglie, marito, avvocato, vicino, ecc.

**Tabelle modificate:**
- `contacts` — aggiunto `roles[]`, `codice_fiscale`, `partita_iva`
- `listings` — aggiunto `property_id` (FK → properties), `transaction_type`
- `proposals` — aggiunto `proposal_type`, campi affitto (canone mensile, deposito, durata, cedolare)
- `appointments` — aggiunto tipi italiani per appuntamenti immobiliari
- `campaigns` — aggiunto campo `channel`

**Infrastruttura DB:**
- RLS policies su tutte le nuove tabelle (workspace isolation)
- Funzione Haversine per ricerca GPS entro 100m
- Trigger di sicurezza per workspace isolation a livello DB
- Check constraints finanziari (rent, deposit, sold_price, commission)
- Indici ottimizzati per query performance (stage, zona, agente, coordinate)

---

### Fase 2 — API Backend

- `GET/POST /api/properties` — lista con filtri (stage, zona, tipo, agente, ricerca) + creazione
- `GET/PATCH/DELETE /api/properties/[id]` — dettaglio, aggiornamento, eliminazione
- `POST /api/properties/[id]/advance-stage` — avanzamento stage con validazione transizioni permesse
- `GET/POST /api/properties/[id]/events` — cronistoria append-only
- `GET/POST /api/properties/[id]/contacts` — contatti multi-ruolo per immobile
- `GET /api/properties/nearby` — ricerca GPS Haversine entro raggio configurabile
- `GET /api/geocode` — proxy Mapbox geocoding (protegge la chiave API)
- `GET/POST /api/zones` — gestione zone e sotto-zone per workspace

---

### Fase 3 — UI Banca Dati

**Sidebar ristrutturata:**
- Icone Lucide stilizzate per ogni voce
- Nuova sezione "Banca Dati" con link alla lista immobili
- Ordinamento logico delle sezioni

**Pagine:**
- `/banca-dati` — lista immobili con:
  - Filtri per stage, zona, tipo transazione, agente assegnato
  - Sort per data, valore, indirizzo
  - Paginazione numerica (50 immobili per pagina)
  - Ricerca live debounced (400ms)
  - Stage badges con colori distinti e icone
  - Disposition icons per lo stato del proprietario
- `/banca-dati/nuovo` — form creazione con:
  - Autocomplete indirizzo via Mapbox
  - Validazione coordinate GPS
  - Selezione stage iniziale e tipo transazione
- `/banca-dati/[id]` — dettaglio immobile con:
  - Cronistoria completa con timeline verticale
  - Contatti collegati con ruoli
  - Azioni rapide (avanza stage, aggiungi evento, genera incarico)
  - Informazioni finanziarie e note

---

### Fase 4 — Incarico e PDF

- Form incarico **vendita** con campi specifici (prezzo richiesto, commissione, durata incarico)
- Form incarico **locazione** con campi specifici (canone, deposito, tipo contratto)
- PDF contratto di intermediazione generato con `@react-pdf/renderer`
- Invio contratto via **email** (Resend) con allegato PDF
- Invio contratto via **WhatsApp** (wa.me link con messaggio precompilato)
- Pulsante "Genera Incarico" direttamente dalla pagina immobile
- Pulsante "Proponi Incarico" dalla pagina contatto

---

### Fase 5 — Integrazioni

- Sezione "Immobili collegati" nella pagina dettaglio contatto
- Supporto **controproposta** (counter-offer) nelle proposte d'acquisto
- Auto-collegamento annunci esistenti alle proprietà corrispondenti (via `property_id`)
- Tab "Clienti" rinominata in "Contatti" per coerenza con la nuova architettura

---

### Fase 6 — Dati Mock e Seed

Database popolato con dati realistici:

| Stage | Quantità |
|-------|----------|
| Sconosciuto | 45 |
| Ignoto | 30 |
| Conosciuto | 26 |
| Incarico | 43 |
| Locato | 8 |
| Venduto | 7 |
| Disponibile | 5 |
| **Totale** | **164 proprietà** |

- **246** property events nella cronistoria
- **35+** contatti seed con ruoli variati
- **5** zone con **10** sotto-zone
- **25** annunci collegati a proprietà

---

### Fase 7 — Sicurezza

- Trigger DB-level per workspace isolation (impedisce cross-workspace data leaks)
- Check constraints finanziari su tutte le colonne numeriche critiche
- Indici ottimizzati per le query più frequenti
- RLS enforcement verificato su tutte le tabelle Sprint I
- Proxy geocoding per proteggere la chiave Mapbox

---

## Correzioni Bug Applicate

- **Fix `asChild` prop** su Base UI Button — causava blank page nella banca dati
- **Fix valori `owner_disposition` invalidi** nelle migration seed (enum mismatch)
- **Fix `first_name`/`last_name` → `name`** nei seed contacts (schema diverso da atteso)
- **Fix cast espliciti enum PostgreSQL** nelle stored procedures e query
- **Fix `buttonVariants` import** per Link buttons in più componenti
- **Fix TypeScript errors** in `immobile-detail-client.tsx` e componenti correlati
- **Fix API route errors** risolti in review round Haiku (5 critici + 2 warning)
- **Fix migration errors** risolti in review round Haiku (10 critici/alti in Fase 1)

---

## Database Live

- **Progetto Supabase:** `clzegkiwnodhqhxemiud`
- **Migrazioni applicate:** 028–042 (15 migrazioni Sprint I, più seed 026–027)
- **Stato:** Tutte le migrazioni applicate correttamente, dati seed presenti

---

## Tecnologie Usate

| Tecnologia | Utilizzo |
|------------|----------|
| Next.js 16 App Router | Pagine e API routes |
| Supabase PostgreSQL | Database con RLS |
| `@react-pdf/renderer` | Generazione PDF contratti |
| Resend | Invio email con allegati |
| Mapbox Geocoding API | Autocomplete indirizzo + coordinate |
| Lucide React | Icone stage e disposition |
| `date-fns` (locale `it`) | Formattazione date in italiano |
| Tailwind CSS 4 | Stili e layout |
| shadcn/ui | Componenti UI |

---

## File Modificati / Creati (Sprint I)

### Nuovi file principali
- `web/app/(app)/banca-dati/page.tsx`
- `web/app/(app)/banca-dati/nuovo/page.tsx`
- `web/app/(app)/banca-dati/[id]/page.tsx`
- `web/app/api/properties/route.ts`
- `web/app/api/properties/[id]/route.ts`
- `web/app/api/properties/[id]/events/route.ts`
- `web/app/api/properties/[id]/contacts/route.ts`
- `web/app/api/properties/[id]/incarico-pdf/route.ts`
- `web/app/api/properties/nearby/route.ts`
- `web/app/api/geocode/route.ts`
- `web/app/api/zones/route.ts`
- `web/components/banca-dati/immobile-detail-client.tsx`
- `web/supabase/migrations/028_*.sql` → `042_*.sql` (15 file)
- `web/supabase/migrations/026_seed_demo_data.sql`
- `web/supabase/migrations/027_seed_mock_data.sql`

### File modificati
- `web/components/dashboard/dashboard-client.tsx`
- `web/app/(app)/contacts/[id]/page.tsx`
- `web/app/(app)/dashboard/page.tsx`
- `web/app/api/listing/generate/route.ts`
