# SPEC-API — Endpoint API Sprint I

## Convenzioni

- Tutti gli endpoint richiedono autenticazione Supabase
- Tutti verificano workspace_id dall'utente autenticato
- Risposte in formato JSON
- Errori con status code HTTP standard + messaggio

---

## `/api/properties` — CRUD Immobili

### GET — Lista immobili con filtri
Query params:
- `stage` — filtra per stage (sconosciuto, ignoto, etc.)
- `zone` — filtra per zona
- `sub_zone` — filtra per sotto-zona
- `via` — ricerca testo su address
- `agent_id` — filtra per agente
- `disposition` — filtra per owner_disposition
- `transaction_type` — vendita o affitto
- `last_contact` — today, week, month, over_30, over_60
- `q` — ricerca libera (address, city, zone, contatto nome)
- `page`, `per_page` — paginazione (default 50)
- `sort` — campo ordinamento (default: updated_at DESC)

Risposta: `{ data: Property[], total: number, page: number }`

### POST — Crea nuovo immobile
Body:
```json
{
  "address": "Via Roma 12",
  "city": "Pisa",
  "zone": "Centro Storico",
  "sub_zone": "Lungarno",     // opzionale
  "latitude": 43.7168,
  "longitude": 10.3965,
  "doorbell": "Rossi",        // opzionale
  "building_notes": "...",     // opzionale
  "initial_note": "..."       // opzionale — crea primo evento
}
```
Azioni: crea property con stage=sconosciuto + opzionale primo evento di tipo "nota"

---

## `/api/properties/[id]` — Dettaglio/Modifica/Elimina

### GET — Dettaglio immobile
Include: ultimi 10 eventi, contatti associati, immobili vicini (100m)

### PATCH — Modifica immobile
Body: campi da aggiornare (parziale)
Nota: se si imposta owner_contact_id e stage e' sconosciuto/ignoto, il sistema suggerisce avanzamento

### DELETE — Elimina immobile
Solo per stage sconosciuto e ignoto. Incarichi e oltre non eliminabili.

---

## `/api/properties/[id]/advance` — Avanzamento Stage

### POST
Body:
```json
{
  "target_stage": "conosciuto",
  "reason": "..."              // obbligatorio per regressioni
}
```

Validazioni per stage:
- → ignoto: almeno un campo dettaglio compilato
- → conosciuto: owner_contact_id impostato
- → incarico: incarico_type + incarico_date + incarico_commission_percent
- → venduto: proposta accettata esistente
- → locato: dati locazione compilati
- → disponibile: contratto scaduto

Azioni automatiche:
- → incarico: owner_disposition = 'incarico_firmato'
- → venduto: sold_at = now(), owner_disposition nuovo proprietario = 'appena_acquistato'
- Tutte: crea evento "cambio_stage" con metadata {old_stage, new_stage, reason}

---

## `/api/properties/[id]/events` — Cronistoria

### GET — Lista eventi
Query: `page`, `per_page`, `event_type` (filtro opzionale)
Ordinamento: created_at DESC

### POST — Aggiungi evento
Body:
```json
{
  "event_type": "telefonata",
  "title": "Chiamata proprietario",
  "description": "Ha confermato interesse vendita...",
  "contact_id": "uuid",       // opzionale
  "sentiment": "positive"     // opzionale
}
```

---

## `/api/properties/[id]/contacts` — Contatti Immobile

### GET — Lista contatti associati
### POST — Aggiungi contatto
Body:
```json
{
  "contact_id": "uuid",          // contatto esistente
  "role": "vicino",
  "is_primary": false,
  "notes": "Ha le chiavi"
}
```
Oppure crea nuovo contatto inline:
```json
{
  "new_contact": {
    "name": "Franco Neri",
    "phone": "338-9876543",
    "type": "other"
  },
  "role": "vicino",
  "notes": "Ha le chiavi"
}
```

### DELETE — Rimuovi associazione (non elimina il contatto)

---

## `/api/properties/[id]/promote-to-listing` — Promozione ad Annuncio

### POST
Crea un nuovo listing con dati precompilati dalla property:
- address, city, property_type, sqm, rooms, bathrooms, floor, etc.
- Imposta listing.property_id = property.id
- Imposta property.listing_id = listing.id
- Crea evento "annuncio_creato"

Risposta: `{ listing_id: "uuid" }` — redirect al form annuncio per aggiungere foto

---

## `/api/properties/nearby` — Vicinanza

### GET
Query: `lat`, `lng`, `radius` (default 100), `exclude_id` (opzionale)
Usa funzione haversine_distance per trovare immobili entro il raggio.
Raggruppa: stesso_edificio (stesso address+city) e entro_raggio (distanza <= radius metri)

Risposta:
```json
{
  "same_building": [{ id, doorbell, stage, owner_name, disposition }],
  "nearby": [{ id, address, stage, distance_m, property_type, sqm }]
}
```

---

## `/api/geocode` — Proxy Mapbox

### GET
Query: `q` (testo indirizzo), `country` (default "it")
Proxy verso Mapbox Geocoding API v5.
Risposta: lista suggerimenti con address, city, latitude, longitude.

---

## `/api/zones` — Gestione Zone

### GET — Lista zone per citta'
Query: `city` (opzionale — tutte se omesso)
Include sotto-zone per ogni zona.

### POST — Crea zona
Body: `{ city, name }`
Verifica unicita' workspace+city+name.

### PATCH — Rinomina zona
Body: `{ id, new_name }`
Aggiorna anche tutte le properties con la vecchia zona.

### POST `/api/zones/replace` — Sostituisci zona
Body: `{ source_zone_id, target_zone_id }`
Sposta tutti gli immobili dalla zona sorgente alla destinazione, poi elimina la sorgente.

### DELETE — Elimina zona
Solo se nessun immobile la usa. Altrimenti errore con conteggio.

---

## `/api/zones/sub-zones` — Sotto-zone

### GET — Lista sotto-zone per zona
### POST — Crea sotto-zona
### PATCH — Rinomina sotto-zona
### DELETE — Elimina sotto-zona

---

## `/api/agent-zones` — Assegnazione Zone Agenti

### GET — Zone assegnate a un agente
### POST — Assegna zona ad agente
### DELETE — Rimuovi assegnazione

---

## Hook: Auto-creazione Property da Listing

Quando si crea un listing senza property_id (flusso diretto):
1. Geocode l'indirizzo via Mapbox
2. Crea property con stage=incarico, dati copiati dal listing
3. Imposta listing.property_id e property.listing_id
4. Imposta owner_disposition=incarico_firmato
5. Crea evento "annuncio_creato"

Questo avviene nel POST di `/api/listing/route.ts`.
