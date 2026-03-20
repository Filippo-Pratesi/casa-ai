# SPEC-SICUREZZA — Checklist Sicurezza Sprint I

## RLS (Row Level Security)

- [ ] `properties` — policy workspace_id con get_user_workspace_id()
- [ ] `property_events` — policy workspace_id
- [ ] `property_contacts` — policy workspace_id
- [ ] `zones` — policy workspace_id
- [ ] `sub_zones` — policy via zone_id → workspace_id
- [ ] `agent_zones` — policy workspace_id
- [ ] Verificare che RLS e' ENABLED su tutte le tabelle

## Workspace Isolation

- [ ] Ogni API verifica workspace_id dall'utente autenticato
- [ ] Nessuna query accetta workspace_id come parametro esterno
- [ ] Property di un workspace non visibili da un altro workspace
- [ ] Zone di un workspace non visibili da un altro workspace
- [ ] Contatti immobile isolati per workspace

## Validazione Input

- [ ] Indirizzo: sanitizzato, max 500 caratteri
- [ ] Note/descrizioni: sanitizzati per XSS, max 10000 caratteri
- [ ] Zone/sotto-zone: max 100 caratteri, trimmed
- [ ] Coordinate GPS: validazione range (-90/90 lat, -180/180 lng)
- [ ] Stage transitions: validazione server-side (non fidarsi del client)
- [ ] Property_type, stage, disposition: validazione enum server-side
- [ ] UUID parametri: validazione formato

## Rate Limiting

- [ ] `/api/geocode` — max 100 richieste/minuto per workspace (Mapbox costa)
- [ ] `/api/properties/nearby` — max 60 richieste/minuto
- [ ] `/api/properties` POST — max 30 creazioni/minuto

## Dati Sensibili

- [ ] Coordinate GPS non esposte in endpoint pubblici
- [ ] Codice fiscale e P.IVA: solo per utenti autenticati del workspace
- [ ] MAPBOX_ACCESS_TOKEN: solo server-side, mai esposto al client
- [ ] PDF generati: URL temporanei con scadenza 24h

## Autorizzazione

- [ ] Solo admin puo' gestire zone (creare, rinominare, sostituire, eliminare)
- [ ] Solo admin puo' assegnare zone ad agenti
- [ ] Agenti possono creare zone nuove (con conferma) ma non eliminarle
- [ ] Agenti vedono solo i propri immobili (tranne admin che vede tutto)
- [ ] Eliminazione property solo per stage sconosciuto/ignoto

## PDF e File

- [ ] PDF generati salvati su Supabase Storage con policy workspace
- [ ] URL temporanei per condivisione WhatsApp (expiry 24h)
- [ ] Nessun dato sensibile nel nome file
- [ ] Sanitizzazione contenuto PDF (no injection)
