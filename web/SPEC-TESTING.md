# SPEC-TESTING — Piano Test e Mock Data

## Mock Data

### Immobili (30+ record)

Distribuiti su 3 citta' (Pisa, Lucca, Firenze) con:
- 10 sconosciuti (solo indirizzo)
- 8 ignoti (con dettagli ma senza contatto)
- 5 conosciuti (con proprietario collegato)
- 4 incarichi (con listing collegato)
- 2 locati (con inquilino e date contratto)
- 1 venduto
- 1 disponibile (post-locazione)

### Zone
- Pisa: Centro Storico, San Martino, Cisanello, Marina di Pisa, Porta a Lucca
- Lucca: Centro, San Concordio, Murata, Arancio
- Firenze: Centro, Rifredi, Campo di Marte

### Sotto-zone
- Pisa/Centro Storico: Lungarno, Piazza Miracoli, Via Santa Maria
- Lucca/Centro: Piazza Anfiteatro, Via Fillungo

### Contatti (15+ record)
- 5 proprietari (con immobili associati)
- 3 acquirenti
- 2 inquilini
- 5 altri ruoli (vicini, avvocati, portieri)

### Eventi (50+ record)
- Mix di tutti i tipi: note, telefonate, visite, citofoni, cambio stage
- Distribuiti su 2 settimane di cronistoria realistica
- Sentiment vario: positive, neutral, negative

---

## Casi di Test

### T01 — Creazione Immobile
- [T01.1] Creare immobile con solo indirizzo → stage sconosciuto
- [T01.2] Verificare coordinate GPS salvate da Mapbox
- [T01.3] Verificare prima nota salvata come evento
- [T01.4] Verificare zona obbligatoria
- [T01.5] Creare immobile con zona nuova → popup conferma
- [T01.6] Verificare suggerimento zone simili

### T02 — Vicinanza
- [T02.1] Inserire immobile stesso edificio → appare in "stesso edificio"
- [T02.2] Inserire immobile entro 100m → appare in "entro 100m"
- [T02.3] Inserire immobile oltre 100m → non appare
- [T02.4] Vicinanza visibile anche nella scheda immobile

### T03 — Avanzamento Stage
- [T03.1] Sconosciuto → Ignoto: compilare almeno un campo dettaglio
- [T03.2] Sconosciuto → Conosciuto: collegare proprietario
- [T03.3] Ignoto → Conosciuto: collegare proprietario
- [T03.4] Conosciuto → Incarico: compilare incarico → owner_disposition auto
- [T03.5] Incarico → Venduto: proposta accettata
- [T03.6] Incarico → Locato: dati locazione compilati
- [T03.7] Locato → Disponibile: contratto scaduto
- [T03.8] Venduto → Conosciuto: ritorno con nuovo proprietario

### T04 — Regressione Stage
- [T04.1] Conosciuto → Ignoto: contatto perso, richiede motivo
- [T04.2] Incarico → Conosciuto: incarico scaduto
- [T04.3] Evento cambio_stage creato con old/new stage

### T05 — Stato Proprietario
- [T05.1] Cambio manuale di tutti gli stati
- [T05.2] Auto-cambio a "incarico_firmato" su avanzamento incarico
- [T05.3] Auto-cambio a "appena_acquistato" su vendita
- [T05.4] Auto-reset "appena_acquistato" → "non_definito" dopo 3 mesi

### T06 — Cronistoria
- [T06.1] Aggiungere nota → appare in timeline
- [T06.2] Registrare telefonata con sentiment → appare
- [T06.3] Avanzamento stage → evento automatico
- [T06.4] Ordinamento cronologico inverso
- [T06.5] Filtraggio per tipo evento

### T07 — Contatti Immobile
- [T07.1] Aggiungere contatto esistente con ruolo
- [T07.2] Creare nuovo contatto inline
- [T07.3] Verificare contatto appare in lista contatti generale
- [T07.4] Rimuovere associazione senza eliminare contatto
- [T07.5] Impostare contatto come principale

### T08 — Zone
- [T08.1] Creare nuova zona
- [T08.2] Rinominare zona → immobili aggiornati
- [T08.3] Sostituire zona → immobili migrati, zona eliminata
- [T08.4] Eliminare zona senza immobili
- [T08.5] Tentare eliminazione zona con immobili → errore
- [T08.6] Assegnare zona ad agente → preselezionata nel form
- [T08.7] Sotto-zone CRUD

### T09 — Filtri Lista
- [T09.1] Filtrare per stage
- [T09.2] Filtrare per zona
- [T09.3] Filtrare per sotto-zona
- [T09.4] Filtrare per via (testo)
- [T09.5] Filtrare per agente
- [T09.6] Filtrare per stato proprietario
- [T09.7] Filtrare per tipo operazione
- [T09.8] Filtrare per ultimo contatto
- [T09.9] Ricerca testuale
- [T09.10] Combinazione multipla di filtri

### T10 — PDF Incarico
- [T10.1] Generare PDF vendita da pagina immobile
- [T10.2] Generare PDF locazione da pagina immobile
- [T10.3] Compilazione automatica da dropdown contatto
- [T10.4] Inviare via email
- [T10.5] Inviare via WhatsApp (link wa.me)
- [T10.6] Proporre incarico dalla pagina contatto

### T11 — Locazioni
- [T11.1] Creare proposta locazione
- [T11.2] Compilare canone agevolato
- [T11.3] Verificare notifica 90 giorni
- [T11.4] Verificare notifica 60 giorni
- [T11.5] Verificare notifica 30 giorni
- [T11.6] Verificare notifica giorno scadenza
- [T11.7] Verificare auto-cambio stage a "disponibile"

### T12 — Integrazione
- [T12.1] Pagina contatto mostra immobili collegati
- [T12.2] Creare annuncio diretto → property auto-creata
- [T12.3] Annuncio diretto richiede contatto obbligatorio
- [T12.4] Annuncio diretto richiede zona obbligatoria
- [T12.5] Ricerca globale trova properties
- [T12.6] Dashboard mostra card banca dati

### T13 — Sicurezza
- [T13.1] RLS: agente workspace A non vede properties workspace B
- [T13.2] API: workspace_id forzato, non accetta parametro esterno
- [T13.3] Input: indirizzo con XSS → sanitizzato
- [T13.4] Stage transition: tentativo avanzamento invalido → errore
- [T13.5] Eliminazione: tentativo eliminare incarico → errore
