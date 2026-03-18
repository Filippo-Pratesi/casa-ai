# Sprint I Fase 7–8 — Sicurezza UX Finali

**Data:** 18 Marzo 2026
**Branch:** `sprint-i-banca-dati`
**Commit:** TBD

---

## Task 1 — Rinomina Tab Clienti → Contatti

Allineamento UI con nuova architettura property-centric:

**File modificato:**
- `web/lib/i18n/translations.ts`

**Cambiamenti:**
- `nav.contacts` → "Contatti" (IT), "Contacts" (EN)
- `contacts.title` → "Gestione Contatti" (IT), "Manage Contacts" (EN)
- `contacts.new` → "Nuovo Contatto" (IT), "New Contact" (EN)

---

## Task 2 — Mock Data Estesa (100+ Indirizzi)

Seed completo di banca dati per test e demo.

**Migrazione 040:** `web/supabase/migrations/040_seed_extended_banca_dati.sql`

**Dati inseriti:**
- **105 immobili** distribuiti in 8 città (Milano, Roma, Torino, Firenze, Napoli, Bologna, Venezia, Genova)
- **7 stage** rappresentati:
  - 40 `sconosciuto` (38%)
  - 25 `ignoto` (24%)
  - 20 `conosciuto` (19%)
  - 10 `incarico` (10%)
  - 3 `venduto` (3%)
  - 4 `locato` (4%)
  - 3 `disponibile` (3%)
- **20 contatti seed** con ruoli diversi (proprietario, moglie, avvocato, vicino, gestione)

**Marker idempotente:**
- Campo `building_notes = 'SEED_040'` impedisce reinserimenti ripetuti
- Esecuzione sicura anche se migrazione ripetuta

---

## Task 3 — Collega Annunci a Contatti

Connessione bidirezionale annunci ↔ proprietà.

**Migrazione 041:** `web/supabase/migrations/041_link_listings_to_contacts.sql`

**Logica:**
1. Per ogni listing esistente:
   - Se `property_id` assente: crea property con owner dati dal listing (address, type, price)
   - Se `property_id` presente: usa relazione esistente
2. Popola `owner_contact_id` cercando contatto con workspace + email seller
3. Crea `property_contact` con ruolo `'proprietario'` per ogni link
4. Registra evento `'annuncio_creato'` in cronistoria

**Handling edge cases:**
- Listings orfani (nessun seller): rimangono unmapped
- Seller duplicati: linea a primo match per email
- Proprietari multipli: gestiti via `property_contacts` table

---

## Fase 7 — Sicurezza Database

Hardening completo a livello infrastrutturale.

**Migrazione 042:** `web/supabase/migrations/042_security_hardening.sql`

**Trigger workspace isolation:**
- Automatici su `properties`, `property_events`, `property_contacts`
- Impediscono manipolazione diretta workspace_id da API
- RLS policy come secondo strato (defense in depth)

**Constraints numerici:**
- `estimated_value >= 0`
- `rent_monthly >= 0`, `deposit >= 0`
- `sold_price > 0` (solo quando stage = venduto)
- `commissione_percentage BETWEEN 0 AND 20`

**Verifiche completate:**
- ✅ RLS policies attive su tutte 6 tabelle Sprint I (properties, property_events, zones, sub_zones, agent_zones, property_contacts)
- ✅ API routes: workspace_id validation + auth middleware su ogni endpoint
- ✅ No hardcoded secrets; env vars gestiti
- ✅ Input validation su vicinanza search, geocoding proxy
- ✅ Rate limiting in place via API middleware

---

## Fase 8 — UX Banca Dati Finali

Completamento UI con search, sort, paginazione, visual polish.

**File modificati:**
- `web/app/(app)/banca-dati/page.tsx` — Server container
- `web/components/banca-dati/banca-dati-client.tsx` — Client logic
- `web/components/banca-dati/property-card.tsx` — Card component

**Funzionalità implementate:**

1. **Ricerca live debounced**
   - Query 400ms su address, city, owner_name
   - Results update senza page reload

2. **Sort dropdown (6 opzioni)**
   - Data creazione (desc)
   - Città (A-Z)
   - Valore stimato (alto→basso)
   - Stage
   - Ultimo evento
   - Proprietario (A-Z)

3. **Stage badges con tooltip**
   - Colori distintivi per ogni stage
   - Tooltip: "7/40 (17.5%) in questo stage"

4. **Paginazione numerica**
   - 5 pagine visibili alla volta
   - ← Prev / 1 2 3 4 5 / Next →
   - Info: "X–Y di N immobili"

5. **PropertyCard migliorato**
   - Mostra `estimated_value` accanto a stage
   - Owner name, città, ultimo evento
   - Click → detail page

6. **Contatore preciso**
   - Aggiorna dinamicamente con filtri
   - Format: "25–50 di 105 immobili"

---

## Statistiche

| Aspetto | Valore |
|---------|--------|
| Migrazioni DB | 3 (040, 041, 042) |
| File React modificati | 3 |
| Translazioni aggiunte | 3 |
| Properties seed | 105 |
| Contatti seed | 20 |
| UI features | 6 |

---

## Prossimi Passi

- **Fase 1–6 precedenti:** Database, API, UI base, PDF, integrations (completate in branch)
- **Ralph Loop (Fase 9):** 5 iterazioni di UX exploration e refinement
- **Merge:** Quando approvato per production merge a `master`

---

**Status:** ✅ Completo per release

