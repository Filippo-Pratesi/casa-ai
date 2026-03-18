# Sprint I — Banca Dati Immobiliare

**Data:** 18 marzo 2026
**Branch:** `sprint-i-banca-dati`
**Status:** Fasi 0–3 completate; Fasi 4–8 pendenti

---

## Riepilogo Esecutivo

Sprint I rappresenta un **cambio architetturale massivo** di CasaAI: introduce la **banca dati immobiliare** che traccia ogni proprietà dal momento della scoperta attraverso l'intero ciclo di vita (vendita o locazione). Ogni immobile entra in un sistema gestito centralmente con cronistoria append-only, multi-contatti, zone di competenza, e notifiche automatiche. Il sistema supporta sia il flusso tradizionale (scoperta graduale) sia la creazione diretta di annunci con auto-registrazione nella banca dati.

---

## Fasi Completate

### Fase 0 — Specifiche Tecniche

8 file di specifica dettagliata creati e committati:

| File | Contenuto |
|------|-----------|
| `SPEC-DATABASE.md` | Schema: 6 tabelle nuove, 6 enum, RLS, indici, funzione Haversine |
| `SPEC-API.md` | 15+ endpoint con request/response, validazione, stage advancement |
| `SPEC-UI.md` | 3 pagine nuove, sidebar ristrutturata, componenti progressive |
| `SPEC-AFFITTI.md` | Ciclo locazioni, 4 notifiche automatiche, campi canone agevolato |
| `SPEC-PDF-TEMPLATES.md` | 2 template contratti (vendita/locazione), 20+ placeholder, email/WhatsApp |
| `SPEC-SICUREZZA.md` | Checklist RLS, isolamento workspace, validazione, rate limiting |
| `SPEC-TESTING.md` | 70+ test case, mock data (30+ proprietà, 5+ zone, 50+ eventi) |
| `REQUISITI-STRUMENTI.md` | Mapbox (100k req/mese gratis), template PDF, futuri Google Maps + valutazione |

**Commit:** `docs: Sprint I — specifiche tecniche Banca Dati Immobiliare`

---

### Fase 1 — Database (7 Migrazioni 031–037)

| Migrazione | Creazioni | Modifiche |
|-----------|-----------|-----------|
| **031_properties_core** | Enum: property_stage, owner_disposition, property_transaction_type, lease_type; Tabella properties (50+ campi); Funzione haversine_distance; Indici GPS | — |
| **032_property_events** | Enum: property_event_type, sentiment; Tabella property_events (cronistoria append-only) | — |
| **033_zones** | Tabelle: zones, sub_zones, agent_zones; Associazione agenti a zone con default preselezionate | — |
| **034_property_contacts** | Enum: property_contact_role; Tabella property_contacts (multi-ruoli per proprietà) | — |
| **035_modify_contacts** | — | +roles[], +codice_fiscale, +partita_iva; backfill type→roles |
| **036_modify_listings** | — | +property_id FK verso properties |
| **037_modify_proposals** | — | +proposal_type (vendita/locazione); +campi locazione (lease_type, start, end, rent, deposit) |

**RLS:** Tutte le tabelle nuove scoped a workspace_id; policies separate per SELECT/INSERT/UPDATE/DELETE

**Commit:** `feat: Sprint I Fase 1 — schema proprietà, eventi, zone, contatti`

---

### Fase 2 — API Backend (12 Endpoint Group)

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/properties` | GET/POST | CRUD proprietà con filtri (stage, zona, via, agente, stato, tipo) |
| `/api/properties/[id]` | GET/PUT/DELETE | Dettaglio, aggiornamento, eliminazione |
| `/api/properties/[id]/events` | GET/POST | Lista cronistoria + aggiungi evento |
| `/api/properties/[id]/advance` | POST | Transizione stage con validazione automatica owner_disposition |
| `/api/properties/[id]/contacts` | GET/POST/DELETE | CRUD contatti immobile con ruoli |
| `/api/properties/nearby` | POST | Ricerca vicinanza (Haversine, raggio 100m) |
| `/api/zones` | GET/POST/PUT/DELETE | CRUD zone + sostituzione (merge) |
| `/api/zones/[id]/sub-zones` | GET/POST | Sotto-zone per zona |
| `/api/agent-zones` | GET/POST | Assegnazione zone default ad agenti |
| `/api/geocode` | POST | Proxy Mapbox per autocomplete + coordinate |
| `/api/properties/[id]/promote-to-listing` | POST | Promozione property → listing |
| Notifiche scadenza locazioni | Cron | Task schedulato per notifiche 90/60/30/0 giorni |

**Commit:** `feat: Sprint I Fase 2 — API CRUD, geocoding, vicinanza, zone`

---

### Fase 3 — UI Banca Dati

**Pagine create:**

| Pagina | Percorso | Descrizione |
|--------|----------|-------------|
| Lista Banca Dati | `/banca-dati` | Tabella con filtri (stage, zona, via, agente, stato, tipo operazione), paginazione, stats |
| Nuovo Immobile | `/banca-dati/nuovo` | Form progressivo con Mapbox autocomplete, suggerimenti vicinanza, conferma zona |
| Dettaglio Immobile | `/banca-dati/[id]` | Timeline cronistoria, contatti multi-ruolo, vicinanza, quick actions |

**Componenti:**

- `banca-dati-client.tsx` — Lista + filtri interattivi + stage badges colorati
- `nuovo-immobile-client.tsx` — Form con Mapbox, vicinanza dinamica, popup zone
- `immobile-detail-client.tsx` — Detail + timeline + contatti + stats
- `event-timeline.tsx` — Timeline cronistoria con quick actions (aggiungi nota/telefono/visita)
- `property-card.tsx` — Card immobile riutilizzabile
- `property-stage-icon.tsx` — Badge stage colorato (🔴🟠🟢🔵🟣⚫🟡)
- `disposition-icon.tsx` — Simbolo stato proprietario (❌✅🤔🔍⏳📞📰📝➖)
- `address-autocomplete.tsx` — Input con autocomplete Mapbox
- `zone-selector.tsx` — Dropdown zone con creazione inline

**Sidebar ristrutturata** con 3 gruppi:
- GESTIONE: Dashboard, Banca Dati (NUOVO), Annunci, Contatti
- OPERATIVITÀ: Calendario, Campagne, Proposte, To Do
- AMMINISTRAZIONE: Contabilità, Impostazioni

**i18n:** +30 chiavi IT/EN per banca dati, sidebar, stage, disposition

**Commit:** `feat: Sprint I Fase 3 — UI banca dati, sidebar, timeline, zone`

---

## Issues Risolti (Post-Review Database)

Il file `MIGRATION-REVIEW.md` ha identificato **7 critical issues** dalla revisione delle migrazioni 031–037. Durante la fase di implementazione successiva, i seguenti sono stati affrontati:

1. **GiST Index con `ll_to_earth()`** — Sostituito con BTREE index su (latitude, longitude) per compatibilità Supabase (no earthdistance extension)

2. **Funzione Haversine mismatch** — Allineato a spec: SQL puro invece di PL/pgSQL, parametri NUMERIC, nomi coerenti (lat/lng)

3. **RLS Subquery N+1** — Creata funzione helper `get_user_workspace_id()` e consolidate all RLS policies su pattern "FOR ALL USING/WITH CHECK"

4. **property_contacts UPDATE RLS** — Aggiunto `WITH CHECK` clause per consistency (USING e WITH CHECK ora identici)

Ulteriori miglioramenti:
- **properties.zone → zone_id** come FK verso zones(id) per referential integrity
- **property_contacts UNIQUE** esteso a (workspace_id, property_id, contact_id, role)
- Documentazione query pattern per vicinanza + Haversine

---

## Ciclo di Vita: Stadi e Transizioni

### Stage Immobili

| Stage | Colore | Vendita | Locazione |
|-------|--------|---------|-----------|
| **Sconosciuto** | 🔴 | Solo indirizzo | Identico |
| **Ignoto** | 🟠 | Info ma NO contatto | Identico |
| **Conosciuto** | 🟢 | Contatto attivato | Identico |
| **Incarico** | 🔵 | Mandato + annuncio | Mandato + annuncio |
| **Venduto** | ⚫ | Rogito completato | — |
| **Locato** | 🟣 | — | Contratto attivo |
| **Disponibile** | 🟡 | — | Contratto scaduto |

### Stato Proprietario

Traccia intent del proprietario:
- **❌ Non vende/affitta** — Manuale, proprietario non interessato
- **✅ Vende/affitta sicuramente** — Manuale, deciso
- **🤔 Sta pensando** — Manuale, indeciso
- **🔍 Sta esplorando** — Manuale, valuta opzioni
- **⏳ In attesa** — Manuale, attende evento (eredità, trasloco)
- **📞 Da ricontattare** — Manuale, serve nuovo contatto
- **📰 Notizia ricevuta** — Manuale, agente riceve segnalazione
- **📝 Incarico firmato** — **AUTO** su stage→incarico (o manuale)
- **🏠 Appena acquistato** — **AUTO** su vendita nuovo proprietario (reset dopo 3 mesi)
- **➖ Non definito** — Default iniziale

---

## Fasi Pendenti

### Fase 4 — Incarico & PDF
- Form generazione incarico vendita/locazione
- Template PDF contratto intermediazione (forniti da cliente)
- Download + invio email (Resend) + WhatsApp (wa.me link)
- "Genera Incarico" dalla pagina immobile
- "Proponi Incarico" dalla pagina contatto

### Fase 5 — Integrazione
- "Immobili collegati" nella pagina contatto
- Ruoli multipli contatti (UI)
- Auto-creazione property + obbligo contatto su annuncio diretto
- Zona obbligatoria nel form annuncio
- Registrazione automatica eventi da appuntamenti/proposte

### Fase 6 — Testing & Mock Data
- 70+ test case funzionali
- Seed SQL dati realistici

### Fase 7 — Controllo Sicurezza
- RLS enforcement workspace
- Input validation
- Protezione XSS
- Rate limiting geocoding
- Isolamento cross-workspace

### Fase 8 — Ralph Loop (5 iterazioni)
- Esplorazione UX complete
- Proposte miglioramenti pagine nuove/modificate
- Fix responsive + dark mode

---

## Note Tecniche

### Ambiente

Richiede variabile d'ambiente:
```bash
MAPBOX_ACCESS_TOKEN=pk.eyJ1...  # Token Mapbox per geocoding (100k req/mese gratis)
```

### Database

- **Haversine function:** SQL puro, calcola distanza tra coordinate GPS (per vicinanza)
- **Zone come TEXT** (non FK per flessibilità), ma referential integrity consigliato in Fase 5+
- **property_contacts:** Multiple roles per property via righe separate (UNIQUE workspace_id + property_id + contact_id + role)
- **Circular FK (property↔listing):** Entrambi ON DELETE SET NULL, sicuri ma da monitorare

### Locazioni Automatiche

Il sistema genera notifiche automatiche a:
- 90 giorni prima scadenza contratto
- 60 giorni prima
- 30 giorni prima
- Giorno della scadenza
- Scadenza → stage cambia automaticamente a "disponibile"

---

## Files Modificati

**Sidebar:** `/web/components/app-sidebar.tsx`
**Contatti page:** `/web/app/(app)/contacts/[id]/page.tsx` (in Fase 5)
**Dashboard:** `/web/app/(app)/dashboard/page.tsx` (card banca dati in Fase 5)
**i18n:** `/web/lib/i18n/translations.ts`
**CLAUDE.md, PLAN.md:** Aggiornamenti progressivi per fase

---

## Prossimi Step

1. **Fornire Mapbox token** (`MAPBOX_ACCESS_TOKEN`) in `.env.local`
2. **Fornire template PDF** (contratti vendita + locazione) per Fase 4
3. Applicare migrazioni 031–037 a progetto Supabase (test env prima)
4. Proseguire Fase 4–8 per completare sprint

---

**Commit Initial:** `docs: Sprint I — specifiche tecniche Banca Dati Immobiliare` (18/03/2026)
