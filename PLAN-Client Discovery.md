# Sprint I — Banca Dati Immobiliare & Scoperta Clienti

## Contesto

CasaAI gestisce immobili solo dal momento in cui diventano annunci. Manca il comparto vendita e scoperta clienti: l'intero lavoro di zona che l'agente fa PRIMA di avere un incarico. Questo sprint rappresenta un **cambio strutturale massivo** della logica e visione di CasaAI.

**Obiettivo**: Ogni immobile scoperto dall'agente entra in una banca dati e viene tracciato per tutto il suo ciclo di vita — sia vendita che locazione. Ogni nota, contatto e interazione e' registrata per sempre.

---

## File di Specifiche Tecniche

> I seguenti file verranno creati come primo step dell'implementazione. Ogni file contiene le specifiche dettagliate per la relativa area.

| File | Contenuto |
|------|-----------|
| `SPEC-DATABASE.md` | Schema completo di tutte le tabelle, enum, RLS policies, indici |
| `SPEC-API.md` | Tutti gli endpoint API con request/response, validazioni, logica |
| `SPEC-UI.md` | Wireframe dettagliati di ogni pagina, componenti, flussi utente |
| `SPEC-AFFITTI.md` | Ciclo vita locazioni, scadenze, notifiche automatiche |
| `SPEC-PDF-TEMPLATES.md` | Template PDF incarico vendita e locazione, campi variabili |
| `SPEC-SICUREZZA.md` | Checklist sicurezza, RLS, validazione, rate limiting |
| `SPEC-TESTING.md` | Piano test, mock data, casi di test per ogni feature |
| `REQUISITI-STRUMENTI.md` | API keys e strumenti necessari con istruzioni per ottenerli |

Le specifiche dettagliate di ogni file sono incluse nelle sezioni sottostanti di questo piano.

---

## Ciclo di Vita dell'Immobile

### Ciclo Vendita

```
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO VENDITA                                 │
│                                                                  │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌────────┐  │
│  │SCONOSCIUTO│───>│  IGNOTO   │───>│CONOSCIUTO │───>│INCARICO│  │
│  │           │    │           │    │           │    │        │  │
│  │Solo       │    │Info senza │    │Contatto   │    │Mandato │  │
│  │indirizzo  │    │contatto   │    │attivato   │    │+ annun.│  │
│  └───────────┘    └─────┬─────┘    └─────┬─────┘    └───┬────┘  │
│                         ▲                ▲               │       │
│                         │                │               ▼       │
│                         │                │         ┌────────┐    │
│                         │                └─────────│VENDUTO │    │
│                         │                 ritorno  │        │    │
│                         │                          └────────┘    │
│                         └── contatto perso (da Conosciuto)       │
└──────────────────────────────────────────────────────────────────┘
```

### Ciclo Locazione

```
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO LOCAZIONE                               │
│                                                                  │
│  Stessi stage di scoperta fino a INCARICO, poi:                 │
│                                                                  │
│  ┌────────┐    ┌────────────┐    ┌──────────────┐               │
│  │INCARICO│───>│  LOCATO    │───>│  DISPONIBILE │──> INCARICO   │
│  │        │    │            │    │              │    (nuovo      │
│  │Mandato │    │Contratto   │    │Contratto     │     affitto)  │
│  │affitto │    │locazione   │    │scaduto/      │               │
│  │        │    │attivo      │    │terminato     │               │
│  └────────┘    └────────────┘    └──────────────┘               │
│                                                                  │
│  NOTIFICHE AUTOMATICHE:                                          │
│  • 90 giorni prima scadenza contratto                            │
│  • 60 giorni prima scadenza contratto                            │
│  • 30 giorni prima scadenza contratto                            │
│  • Giorno scadenza contratto                                     │
│  • Scadenza canone mensile (se non pagato)                       │
└──────────────────────────────────────────────────────────────────┘
```

### Stage

| Stage | Icona | Vendita | Locazione |
|-------|-------|---------|-----------|
| **Sconosciuto** | 🔴 | Solo indirizzo | Identico |
| **Ignoto** | 🟠 | Info ma NO contatto | Identico |
| **Conosciuto** | 🟢 | Contatto attivo | Identico |
| **Incarico** | 🔵 | Mandato vendita + annuncio | Mandato locazione + annuncio |
| **Venduto** | ⚫ | Rogito completato | — |
| **Locato** | 🟣 | — | Contratto locazione attivo |
| **Disponibile** | 🟡 | — | Contratto scaduto, immobile torna disponibile |

L'enum `property_stage` include quindi: `sconosciuto`, `ignoto`, `conosciuto`, `incarico`, `venduto`, `locato`, `disponibile`.

### Stato del Proprietario

| Simbolo | Stato | Quando cambia |
|---------|-------|---------------|
| ❌ | Non vende/affitta | Manuale — proprietario non interessato |
| ✅ | Vende/affitta sicuramente | Manuale — proprietario deciso |
| 🤔 | Sta pensando | Manuale — proprietario indeciso |
| 🔍 | Sta esplorando | Manuale — proprietario valuta opzioni |
| ⏳ | In attesa | Manuale — attesa evento (eredita', trasloco) |
| 📞 | Da ricontattare | Manuale — serve nuovo contatto |
| 📰 | Notizia ricevuta | Manuale — agente ha ricevuto info/segnalazione |
| 📝 | **Incarico firmato** | **AUTOMATICO** quando stage diventa "incarico", oppure **MANUALE** |
| 🏠 | **Appena acquistato** | **AUTOMATICO** sul nuovo proprietario dopo vendita — torna a "non definito" dopo 3 mesi |
| ➖ | Non definito | Default iniziale |

Lo stato **"Incarico firmato"** viene impostato **automaticamente** dal sistema quando il proprietario firma l'incarico (stage → incarico). Puo' anche essere impostato **manualmente** dall'agente in qualsiasi momento.

Lo stato **"Appena acquistato"** viene impostato **automaticamente** sul nuovo proprietario dopo una vendita. Dopo **3 mesi** dalla data di vendita, il sistema lo cambia automaticamente a "Non definito". Questo permette all'agente di sapere che il proprietario ha appena comprato e potrebbe non essere pronto per una nuova operazione.

---

## Locazioni — Dettagli

### Proposta di Locazione

Quando si crea una proposta, l'agente sceglie il tipo:

```
NUOVA PROPOSTA
──────────────
Tipo: [Vendita ▼ / Locazione ▼]

Se VENDITA → form proposta acquisto attuale
Se LOCAZIONE → form proposta locazione:
  • Canone mensile proposto (€)
  • Durata contratto (mesi)
  • Tipo contratto (4+4, 3+2, transitorio, uso foresteria)
  • Data inizio proposta
  • Deposito cauzionale
  • Spese condominiali incluse/escluse
  • Note
```

### Template PDF Locazione

Template separato dal contratto di vendita. Campi specifici:
- Canone mensile
- Tipo contratto (4+4, 3+2, transitorio, etc.)
- Durata
- Deposito cauzionale
- Clausole specifiche locazione
- Stato immobile alla consegna

### Notifiche Automatiche Locazioni

Il sistema genera notifiche automatiche per ogni immobile locato:

| Quando | Notifica | Destinatario |
|--------|----------|-------------|
| 90 giorni prima scadenza | "Contratto Via Roma 12 scade tra 90 giorni" | Agente assegnato |
| 60 giorni prima | "Contratto Via Roma 12 scade tra 60 giorni" | Agente + admin |
| 30 giorni prima | "Contratto Via Roma 12 scade tra 30 giorni — azione richiesta" | Agente + admin |
| Giorno scadenza | "Contratto Via Roma 12 scade OGGI" | Agente + admin |
| Dopo scadenza (no rinnovo) | Stage cambia automaticamente a "disponibile" | Sistema |

### Dati Locazione sulla Tabella Properties

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| lease_type | 4+4 / 3+2 / transitorio / foresteria | Tipo contratto locazione |
| lease_start_date | Data | Inizio contratto |
| lease_end_date | Data | Fine contratto |
| monthly_rent | Intero (euro) | Canone mensile |
| monthly_rent_discounted | Intero (euro) | Canone agevolato (se applicabile) |
| discount_notes | Testo | Note sul canone agevolato (motivo, durata, condizioni) |
| deposit | Intero (euro) | Deposito cauzionale |
| tenant_contact_id | UUID → contacts | Inquilino |
| lease_notes | Testo | Note contratto |

---

## Ristrutturazione Sidebar

La sidebar usa **piccole icone stilizzate moderne** (SVG custom o icone da libreria come Lucide/Phosphor):

```
SIDEBAR (nuova struttura)
─────────────────────────────

  GESTIONE
  ────────
  [icona grafico]    Dashboard
  [icona edificio]   Banca Dati         ← NUOVO
  [icona megafono]   Annunci
  [icona persone]    Contatti

  OPERATIVITA'
  ────────────
  [icona calendario] Calendario
  [icona busta]      Campagne
  [icona documento]  Proposte
  [icona check]      To Do

  AMMINISTRAZIONE
  ───────────────
  [icona euro]       Contabilita
  [icona ingranaggio]Impostazioni
```

Le icone saranno piccole immagini SVG stilizzate con stile moderno e coerente, non emoji. Usa icone dalla libreria Lucide (gia' nel progetto) o SVG custom dove necessario.

---

## Vista Principale — Banca Dati (`/banca-dati`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Banca Dati Immobiliare                              [+ Nuovo Immobile]│
│                                                                         │
│  Filtri:  Stage [Tutti ▼]  Zona [Tutte ▼]  Sotto-zona [Tutte ▼]       │
│           Via [___________]  Agente [Tutti ▼]  Stato [Tutti ▼]         │
│           Tipo op. [Tutti ▼]  Ultimo contatto [Qualsiasi ▼]            │
│           Ricerca [_______________🔍]                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Sconosciuti: 847  Ignoti: 234  Conosciuti: 89  Incarichi: 12  │   │
│  │ Locati: 8  Venduti (mese): 3  Disponibili: 2                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────┬──────┬──────────────────┬──────────┬──────┬──────────┬───┬──┐│
│  │Stage │Stato │ Indirizzo        │Zona      │Sotto │Propriet. │Ag.│Ul││
│  ├──────┼──────┼──────────────────┼──────────┼──────┼──────────┼───┼──┤│
│  │ 🔴   │ ➖   │Via Roma 12, Pisa │Centro St.│Lung. │ —        │MR │2h││
│  │ 🟠   │ 📰   │Via Verdi 8, Pisa │S.Martino │—     │ —        │LB │1g││
│  │ 🟢   │ ✅   │Via Dante 3, Lucca│Murata    │—     │M.Rossi  │MR │3g││
│  │ 🔵   │ 📝   │Vl Liberta 22    │Centro St.│—     │G.Neri   │SV │5g││
│  │ 🟣   │ 📝   │Via Mazzini 4    │Cisanello │—     │A.Verdi  │MR │10││
│  │ ⚫   │ —    │Via Garibaldi 5   │Arancio   │—     │F.Russo  │MR │30││
│  └──────┴──────┴──────────────────┴──────────┴──────┴──────────┴───┴──┘│
│                                                                         │
│  Legenda Stage: 🔴 Sconosciuto 🟠 Ignoto 🟢 Conosciuto 🔵 Incarico    │
│                 🟣 Locato 🟡 Disponibile ⚫ Venduto                     │
│  Legenda Stato: ❌ No ✅ Si 🤔 Pensa 🔍 Esplora ⏳ Attesa              │
│                 📞 Richiam. 📰 Notizia 📝 Incarico ➖ N/D              │
│                                                  Pagina 1 di 42  [< >] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Zone, Sotto-zone e Assegnazione Agenti

### Struttura

```
Citta: Pisa
├── Zona: Centro Storico        → assegnata a: Mario Rossi
│   ├── Sotto-zona: Lungarno
│   ├── Sotto-zona: Piazza Miracoli
│   └── Sotto-zona: Via Santa Maria
├── Zona: San Martino           → assegnata a: Luigi Bianchi
└── Zona: Cisanello             → assegnata a: Mario Rossi
```

### Assegnazione Default (Impostazioni)

L'admin assegna zone di default agli agenti. Quando un agente inserisce un immobile, la zona viene **preselezionata** ma l'agente puo' **sempre cambiarla**:

```
IMPOSTAZIONI → ZONE E AGENTI
─────────────────────────────
Mario Rossi:  [Centro Storico ✕] [Cisanello ✕] [+ Aggiungi]
Luigi Bianchi: [San Martino ✕] [Porta a Lucca ✕] [+ Aggiungi]
Sara Verdi:   [Marina di Pisa ✕] [+ Aggiungi]

ℹ️ La zona default viene preselezionata nel form ma l'agente
   puo' sempre scegliere una zona diversa.
```

### Gestione Zone (Impostazioni)

```
IMPOSTAZIONI → GESTIONE ZONE
──────────────────────────────
Pisa:
  • Centro Storico      [Rinomina] [Elimina]
  • San Martino         [Rinomina] [Elimina]
  • Centro ← ⚠️         [Sostituisci con → Centro Storico ▼] [Elimina]
    "3 immobili usano questa zona"
  • Cisanello           [Rinomina] [Elimina]

Quando si sostituisce "Centro" con "Centro Storico":
→ Tutti i 3 immobili di Pisa-Centro diventano Pisa-Centro Storico
→ La zona "Centro" viene eliminata
```

### Popup Conferma Nuova Zona

Quando un agente digita una zona che non esiste:

```
┌──────────────────────────────────────────┐
│  ⚠️ Nuova zona                          │
│                                          │
│  La zona "Centro" non esiste per Pisa.   │
│                                          │
│  Zone simili esistenti:                  │
│   • Centro Storico                       │
│                                          │
│  Vuoi creare "Centro" come nuova zona    │
│  o usare una zona esistente?             │
│                                          │
│  [Crea "Centro"]  [Usa "Centro Storico"] │
│  [Annulla]                               │
└──────────────────────────────────────────┘
```

---

## Inserimento Nuovo Immobile (`/banca-dati/nuovo`)

```
┌──────────────────────────────────────────────────────────────┐
│  Nuovo Immobile                                              │
│                                                              │
│  Citta *            [Pisa              ▼]                    │
│  Indirizzo *        [Via Roma 1_         ]  ← autocomplete  │
│                                              Mapbox          │
│  Zona *             [Centro Storico    ▼]  ← preselezionata │
│                     [+ Nuova zona]          da default agente│
│                                              (modificabile)  │
│  Sotto-zona         [Lungarno         ▼]  ← opzionale       │
│                     [+ Nuova sotto-zona]                     │
│                                                              │
│  Campanello         [Rossi / Int. 4      ]                   │
│                                                              │
│  Note palazzo                                                │
│  [Palazzo anni '60, 4 piani, no ascensore               ]   │
│                                                              │
│  Prima nota                                                  │
│  [Visto cartello vendesi al balcone 2° piano              ]  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ℹ️ Immobili gia' noti nelle vicinanze               │    │
│  │                                                      │    │
│  │  STESSO EDIFICIO (Via Roma 12):                      │    │
│  │   • Int. 7 — 🟢 Conosciuto — G. Bianchi ✅          │    │
│  │   • Int. 3 — 🔴 Sconosciuto — aggiunto 02/03        │    │
│  │                                                      │    │
│  │  ENTRO 100 METRI:                                    │    │
│  │   • Via Roma 8 — 🟠 Ignoto — 3 vani, ~80mq          │    │
│  │   • Via della Pace 2 — 🔴 Sconosciuto               │    │
│  │                                                      │    │
│  │  Totale: 2 stesso edificio, 2 entro 100m             │    │
│  └──────────────────────────────────────────────────────┘    │
│  ↑ Appare dopo selezione indirizzo — resta anche nella      │
│    scheda immobile                                           │
│                                                              │
│                                        [Salva Immobile]      │
└──────────────────────────────────────────────────────────────┘
```

Raggio vicinanza: **stesso edificio (stesso civico) + 100 metri** con formula Haversine sulle coordinate GPS.

---

## Annunci Creati Senza Banca Dati

Quando un agente crea un annuncio direttamente (flusso attuale), il sistema:

1. **Richiede di collegare o creare un contatto** (campo obbligatorio nel form annuncio)
   - Dropdown "Seleziona contatto esistente" OPPURE bottone "Crea nuovo contatto"
   - Il contatto diventa il proprietario/locatore dell'immobile

2. **Crea automaticamente un record** nella banca dati con:
   - stage = `incarico`
   - Tutti i dati copiati dall'annuncio
   - owner_contact_id = contatto selezionato/creato
   - Coordinate GPS (geocoding Mapbox dell'indirizzo)
   - Zona = campo obbligatorio aggiunto al form annuncio
   - owner_disposition = `incarico_firmato` (automatico)

3. L'immobile appare nella Banca Dati con tutti i dati compilati

---

## Contatti per Immobile

Ogni immobile puo' avere **piu' contatti associati** con ruoli diversi:

```
CONTATTI IMMOBILE (Via Roma 12)
────────────────────────────────
  👤 Giovanni Rossi — Proprietario (principale)
     Tel: 333-1234567 | ✅ Vende
     [Vedi scheda →]

  👤 Maria Rossi — Moglie proprietario
     Tel: 333-7654321
     Note: "Gestisce le questioni pratiche"
     [Vedi scheda →]

  👤 Franco Neri — Vicino / Int. 3
     Tel: 338-9876543
     Note: "Ha le chiavi per visite"
     [Vedi scheda →]

  [+ Aggiungi contatto]
```

Ruoli disponibili: proprietario, moglie/marito, figlio/figlia, vicino, portiere, amministratore, avvocato, commercialista, precedente_proprietario, inquilino, altro.

Ogni contatto aggiunto viene **automaticamente inserito nella lista contatti generale** con le connessioni ai vari immobili.

---

## Pagina Contatto — Integrazione Immobili

```
┌──────────────────────────────────────────────────────┐
│  Giovanni Rossi                                      │
│  Ruoli: Venditore, Acquirente                        │
│                                                      │
│  IMMOBILI COLLEGATI                                  │
│  ──────────────────                                  │
│                                                      │
│  Come proprietario:                                  │
│   📍 Via Roma 12, Pisa — 🟢 Conosciuto — ✅ Vende   │
│      3 vani, 85mq — Stima: €180.000                 │
│      Ultimo evento: Telefonata (18/03)               │
│      [Vai all'immobile →] [Proponi Incarico]         │
│                                                      │
│   📍 Via Dante 3, Firenze — 🔵 Incarico             │
│      4 vani, 120mq — €250.000                        │
│      Incarico esclusivo, scade: 15/04                │
│      [Vai all'immobile →]                            │
│                                                      │
│  Come altro contatto:                                │
│   📍 Via Garibaldi 5, Pisa — Vicino                  │
│      "Ha le chiavi per le visite"                    │
│      [Vai all'immobile →]                            │
│                                                      │
│  Come acquirente:                                    │
│   📍 Vl Liberta 22, Pisa — Proposta in corso        │
│      Offerta: €230.000 su richiesta €250.000         │
│      [Vai alla proposta →]                           │
│                                                      │
│  Come inquilino:                                     │
│   📍 Via Mazzini 4, Pisa — 🟣 Locato                │
│      Canone: €800/mese — Scade: 15/09/2027          │
│      [Vai all'immobile →]                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Contratto di Intermediazione (PDF)

### Due Template

1. **Template Vendita** — contratto intermediazione per vendita (fornito dall'utente)
2. **Template Locazione** — contratto intermediazione per locazione (fornito dall'utente)

### Compilazione Automatica

Quando l'agente seleziona il proprietario dal dropdown, i campi vengono precompilati dalla banca dati. Stessa cosa selezionando l'immobile.

### Punti di Accesso

| Da dove | Azione | Dati precompilati |
|---------|--------|-------------------|
| Pagina immobile | "Genera Incarico" | Immobile + proprietario (se presente) |
| Pagina contatto | "Proponi Incarico" → seleziona immobile da dropdown | Contatto + immobile selezionato |

### Invio

- **Email** tramite Resend
- **WhatsApp** tramite link wa.me/ con PDF allegato

---

## Struttura Dati — Specifiche Complete

> → Dettagli completi in `SPEC-DATABASE.md` (creato in Fase 0)

### Tabelle NUOVE

| Tabella | Descrizione |
|---------|-------------|
| `properties` | Banca dati immobili — ciclo di vita completo |
| `property_events` | Cronistoria append-only |
| `property_contacts` | Contatti multipli per immobile |
| `zones` | Zone per citta' |
| `sub_zones` | Sotto-zone per zona |
| `agent_zones` | Assegnazione zone default ad agenti |

### Tabelle MODIFICATE

| Tabella | Modifica |
|---------|----------|
| `contacts` | +roles[], +codice_fiscale, +partita_iva |
| `listings` | +property_id |
| `proposals` | +proposal_type (vendita/locazione) |
| `notifications` | nuovi tipi per scadenze locazione |

### Enum Nuovi

```
property_stage:
  sconosciuto, ignoto, conosciuto, incarico,
  venduto, locato, disponibile

owner_disposition:
  non_vende, vende_sicuramente, sta_pensando,
  sta_esplorando, in_attesa, da_ricontattare,
  notizia_ricevuta, incarico_firmato, appena_acquistato,
  non_definito

property_event_type:
  nota, telefonata, visita, citofono, email_inviata,
  whatsapp_inviato, riunione, documento_caricato,
  incarico_firmato, proposta_ricevuta, proposta_accettata,
  proposta_rifiutata, proprietario_identificato,
  proprietario_cambiato, cambio_stage, annuncio_creato,
  annuncio_pubblicato, venduto, locato, contratto_scaduto,
  archiviato, ritorno, valutazione_ai, insight_ai, altro

proposal_type:
  vendita, locazione

lease_type:
  4_plus_4, 3_plus_2, transitorio, foresteria, altro

property_contact_role:
  proprietario, moglie_marito, figlio_figlia, vicino,
  portiere, amministratore, avvocato, commercialista,
  precedente_proprietario, inquilino, altro
```

### Campi Principali `properties`

| Campo | Stage richiesto | Descrizione |
|-------|----------------|-------------|
| address, city, zone, latitude, longitude | Creazione | Indirizzo GPS validato |
| sub_zone | Opzionale | Sotto-zona |
| doorbell, building_notes | Opzionale | Note edificio |
| **owner_disposition** | Qualsiasi | Stato proprietario (auto su incarico) |
| **transaction_type** | Da Ignoto | vendita o affitto |
| property_type, sqm, rooms, etc. | Da Ignoto | Dettagli immobile |
| estimated_value | Da Ignoto | Valore stimato |
| owner_contact_id | Da Conosciuto | Proprietario principale |
| incarico_type, date, expiry, commission | Da Incarico | Mandato |
| foglio, particella, subalterno | Da Incarico | Catastali |
| listing_id | Da Incarico | Link annuncio |
| lease_type, start, end, rent, rent_discounted, deposit | Da Locato | Dati locazione + canone agevolato |
| tenant_contact_id | Da Locato | Inquilino |
| labels, ai_score, ai_notes | AI (futuro) | Dati AI-friendly |

---

## Transizioni di Stage

| Da | A | Requisiti | Azioni Automatiche |
|----|---|----------|-------------------|
| Sconosciuto → Ignoto | Almeno un dato immobile compilato | Evento "cambio_stage" |
| Sconosciuto → Conosciuto | owner_contact_id impostato | Evento "proprietario_identificato" |
| Ignoto → Conosciuto | owner_contact_id impostato | Evento "proprietario_identificato" |
| Conosciuto → Incarico | tipo + data + commissione | Evento "incarico_firmato", PDF generato, **owner_disposition → incarico_firmato** |
| Incarico → Venduto | Proposta vendita accettata | Evento "venduto" |
| Incarico → Locato | Proposta locazione accettata | Evento "locato", attivazione notifiche scadenza |
| Locato → Disponibile | Contratto scaduto | Evento "contratto_scaduto" (auto o manuale) |
| Disponibile → Incarico | Nuovo incarico | Come Conosciuto → Incarico |
| Venduto → Conosciuto | Ritorno post-vendita | Evento "ritorno", aggiornamento proprietario |
| Conosciuto → Ignoto | Contatto perso | Evento "cambio_stage" con motivo |
| Incarico → Conosciuto | Incarico scaduto | Evento "cambio_stage" con motivo |

---

## Struttura AI-Friendly

| Elemento | Uso futuro |
|----------|-----------|
| `labels[]` | Etichette auto-generate dall'AI |
| `ai_score` (0-100) | Prioritizzazione automatica |
| `ai_notes` (JSON) | Insight, valutazioni, suggerimenti |
| `sentiment` sugli eventi | Tracciamento emotivo relazione |
| `metadata` (JSON) sugli eventi | Dati strutturati queryabili |
| `owner_disposition` | AI suggerisce ri-contatto |
| Coordinate GPS | Analisi mercato per zona |
| Cronistoria completa | AI legge storia e suggerisce prossimi passi |

### Valutazione Automatica Immobili (FUTURO)
In attesa della documentazione API. Da sviluppare in fase successiva quando l'API sara' disponibile.

---

## Fasi di Sviluppo

**REGOLA**: Ogni fase completata viene committata su GitHub. Il piano (`PLAN.md`) e il `CLAUDE.md` vengono aggiornati ad ogni step.

### Fase 0 — Preparazione
- Creare branch `sprint-i-banca-dati`
- Creare file specifiche tecniche:
  - `SPEC-DATABASE.md` — schema completo tabelle, enum, indici, RLS
  - `SPEC-API.md` — tutti endpoint con request/response
  - `SPEC-UI.md` — wireframe e flussi pagine
  - `SPEC-AFFITTI.md` — ciclo locazioni e notifiche
  - `SPEC-PDF-TEMPLATES.md` — template PDF vendita e locazione
  - `SPEC-SICUREZZA.md` — checklist sicurezza
  - `SPEC-TESTING.md` — piano test e mock data
  - `REQUISITI-STRUMENTI.md` — API keys necessarie
- Commit iniziale con tutti i file spec

### Fase 1 — Database (Migrazioni)
- Migrazione 028: enum `property_stage`, `owner_disposition`, tabella `properties` con coordinate GPS e campi locazione
- Migrazione 029: enum `property_event_type`, tabella `property_events`
- Migrazione 030: tabelle `zones`, `sub_zones`, `agent_zones`
- Migrazione 031: enum `property_contact_role`, tabella `property_contacts`
- Migrazione 032: modifica `contacts` (+roles[], +codice_fiscale, +partita_iva, backfill)
- Migrazione 033: modifica `listings` (+property_id FK)
- Migrazione 034: modifica `proposals` (+proposal_type, +campi locazione)
- RLS policies per tutte le nuove tabelle
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 2 — API Backend
- CRUD properties con filtri (stage, zona, sotto-zona, via, agente, stato, tipo operazione)
- Cronistoria (lista eventi, aggiungi evento)
- Avanzamento stage con validazione + cambio automatico owner_disposition
- Promozione a listing
- Contatti immobile (CRUD, ruoli)
- Zone e sotto-zone (CRUD, sostituzione, assegnazione agenti)
- Vicinanza (ricerca GPS, raggio 100m)
- Geocoding (proxy Mapbox)
- Auto-creazione property da listing (hook)
- Notifiche scadenza locazioni (cron/scheduled)
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 3 — UI Banca Dati
- Ristrutturazione sidebar con icone stilizzate moderne (SVG da Lucide)
- Pagina lista banca dati con tutti i filtri (`/banca-dati`)
- Pagina dettaglio immobile con cronistoria, contatti, vicinanza (`/banca-dati/[id]`)
- Form nuovo immobile con Mapbox, suggerimenti vicinanza, conferma zona (`/banca-dati/nuovo`)
- Form progressivo per stage
- Colonna stato proprietario con simboli e legenda
- Gestione zone/sotto-zone nelle impostazioni
- Assegnazione zone ad agenti nelle impostazioni
- Card riepilogo nella dashboard
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 4 — Incarico, Proposte e PDF
- Form incarico vendita e locazione
- Template PDF contratto intermediazione vendita (template fornito)
- Template PDF contratto intermediazione locazione (template fornito)
- Download e invio via email + WhatsApp
- Compilazione automatica da dropdown contatto/immobile
- "Proponi Incarico" da pagina contatto
- "Genera Incarico" da pagina immobile
- Proposta locazione (nuovo tipo nel sistema proposte)
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 5 — Integrazione
- "Immobili collegati" nella pagina contatto (proprietario, inquilino, altro)
- Ruoli multipli contatti (UI aggiungere/togliere)
- Link cronistoria nella pagina annuncio
- Auto-creazione property + obbligo contatto su creazione annuncio diretto
- Zona obbligatoria nel form creazione annuncio
- Registrazione automatica eventi da appuntamenti e proposte
- Ricerca globale estesa
- Notifiche scadenza locazioni nella pagina notifiche
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 6 — Testing & Mock Data
- Seed SQL con dati realistici per tutte le tabelle
- Test funzionale completo (lista nella sezione Verifica sotto)
- Fix di tutti i bug trovati
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 7 — Controllo Sicurezza
- RLS policies su tutte le nuove tabelle
- workspace_id enforcement su tutte le API
- Validazione input su tutti gli endpoint
- Protezione XSS su campi testo libero
- Rate limiting su geocoding
- Coordinate GPS non esposte pubblicamente
- Isolamento cross-workspace
- Sanitizzazione PDF
- Commit + aggiornamento CLAUDE.md e PLAN.md

### Fase 8 — Esplorazione e Miglioramenti (Ralph Loop x5)
4-5 iterazioni di navigazione completa del sito:

1. Navigare pagine nuove → proporre miglioramenti UX
2. Navigare pagine modificate → proporre miglioramenti integrazione
3. Testare flussi end-to-end → proporre ottimizzazioni
4. Review dark mode e responsive → proporre fix
5. Review performance e accessibilita'

Ogni iterazione: navigo → propongo → utente approva → implemento → commit

### Fase 9 — Sviluppi Futuri (non in questo sprint)
- Valutazione automatica immobili (in attesa API)
- Etichettatura AI automatica
- Punteggio priorita' AI
- Reminder intelligenti
- Vista mappa (quando si passa a Google Maps)

---

## File da Creare/Modificare

### Nuovi File — Specifiche

| File | Posizione |
|------|-----------|
| `SPEC-DATABASE.md` | `casa-ai/web/` |
| `SPEC-API.md` | `casa-ai/web/` |
| `SPEC-UI.md` | `casa-ai/web/` |
| `SPEC-AFFITTI.md` | `casa-ai/web/` |
| `SPEC-PDF-TEMPLATES.md` | `casa-ai/web/` |
| `SPEC-SICUREZZA.md` | `casa-ai/web/` |
| `SPEC-TESTING.md` | `casa-ai/web/` |
| `REQUISITI-STRUMENTI.md` | `casa-ai/web/` |

### Nuovi File — Codice

| File | Descrizione |
|------|-------------|
| `web/supabase/migrations/028–034` | 7 migrazioni database |
| `web/app/(app)/banca-dati/page.tsx` | Lista principale |
| `web/app/(app)/banca-dati/[id]/page.tsx` | Dettaglio immobile |
| `web/app/(app)/banca-dati/nuovo/page.tsx` | Form creazione |
| `web/app/api/properties/route.ts` | API CRUD |
| `web/app/api/properties/[id]/route.ts` | API dettaglio |
| `web/app/api/properties/[id]/events/route.ts` | API cronistoria |
| `web/app/api/properties/[id]/advance/route.ts` | API avanzamento |
| `web/app/api/properties/[id]/contacts/route.ts` | API contatti immobile |
| `web/app/api/properties/[id]/promote-to-listing/route.ts` | API promozione |
| `web/app/api/properties/nearby/route.ts` | API vicinanza |
| `web/app/api/geocode/route.ts` | Proxy Mapbox |
| `web/app/api/zones/route.ts` | API zone |
| `web/app/api/agent-zones/route.ts` | API zone agente |
| `web/components/banca-dati/` | Cartella componenti |

### File Modificati

| File | Modifica |
|------|----------|
| `web/components/app-sidebar.tsx` | Nuova struttura + icone |
| `web/app/(app)/contacts/[id]/page.tsx` | Sezione immobili |
| `web/app/(app)/dashboard/page.tsx` | Card banca dati |
| `web/app/api/search/route.ts` | Estensione a properties |
| `web/app/api/listing/route.ts` | Auto-creazione property + obbligo contatto |
| `web/app/(app)/listing/new/page.tsx` | Campo zona + contatto obbligatorio |
| `web/app/api/proposals/route.ts` | Tipo vendita/locazione |
| `CLAUDE.md` | Aggiornamento progressi |
| `PLAN.md` | Aggiornamento stato fasi |

---

## Verifica Finale

1. Creare immobile sconosciuto con autocomplete Mapbox → coordinate salvate
2. Verificare suggerimenti vicinanza (stesso edificio + 100m)
3. Aggiungere note, telefonate, citofoni nella cronistoria
4. Verificare colonna stato proprietario con simboli
5. Verificare cambio automatico stato a "incarico_firmato" su avanzamento
6. Verificare cambio automatico stato a "notizia_ricevuta" manuale
7. Avanzare da Sconosciuto → Ignoto → Conosciuto → Incarico
8. Testare tutte le regressioni di stage
9. Aggiungere piu' contatti ad un immobile (proprietario, vicino, avvocato)
10. Verificare che ogni contatto appare nella lista contatti generale
11. Generare PDF incarico vendita con dati precompilati
12. Inviare PDF via email e via WhatsApp
13. Proporre incarico dalla pagina contatto (dropdown immobile)
14. Proporre incarico dalla pagina immobile
15. Creare proposta di locazione (nuovo tipo)
16. Verificare notifiche automatiche scadenza locazione
17. Creare annuncio diretto → verificare obbligo contatto + auto-creazione property
18. Gestire zone: creare, rinominare, sostituire, eliminare
19. Gestire sotto-zone
20. Verificare popup conferma nuova zona
21. Verificare zone default per agente (preselezionate ma modificabili)
22. Filtrare per zona, sotto-zona, via, stato, agente, tipo operazione
23. Verificare pagina contatto con immobili collegati (proprietario + inquilino + altro)
24. Verificare sidebar con icone stilizzate
25. Verificare dark mode su tutte le nuove pagine
26. Verificare sicurezza: RLS, workspace isolation, input validation
27. Verificare immobile con ciclo locazione completo (incarico → locato → disponibile)

---

## Avanzamento Sprint (aggiornato 18/03/2026)

| Fase | Stato | Data | Note |
|------|-------|------|------|
| Fase 0 — Specifiche | ✅ Completata | 18/03/2026 | 8 file SPEC creati, commit `docs: Sprint I` |
| Fase 1 — Database | ✅ Completata | 18/03/2026 | Migration 031–037: properties, events, zones, sub_zones, agent_zones, property_contacts + modify contacts/listings/proposals |
| Fase 2 — API Backend | ✅ Completata | 18/03/2026 | 12 endpoint: properties CRUD, events, contacts, advance, nearby, geocode, zones, sub-zones, replace, agent-zones |
| Fase 3 — UI | ✅ Completata | 18/03/2026 | Pagine /banca-dati, /banca-dati/nuovo, /banca-dati/[id]; sidebar ristrutturata (3 gruppi); componenti PropertyCard, EventTimeline, AddressAutocomplete, ZoneSelector, PropertyStageIcon, DispositionIcon |
| Fase 4 — Incarico & PDF | ⏳ In attesa | — | Richiede template PDF dal cliente + Mapbox token |
| Fase 5 — Integrazione | ⏳ Pendente | — | Contatti page, listing form, dashboard card |
| Fase 6 — Testing | ⏳ Pendente | — | |
| Fase 7 — Sicurezza | ⏳ Pendente | — | |
| Fase 8 — Ralph Loop | ⏳ Pendente | — | |

### Dettaglio Fase 1 — Migration files
- `031_properties_core.sql`: enums (property_stage, owner_disposition, property_transaction_type, lease_type) + tabella properties + funzione haversine_distance + RLS
- `032_property_events.sql`: enums (property_event_type, sentiment) + tabella property_events + RLS
- `033_zones.sql`: tabelle zones, sub_zones, agent_zones + RLS
- `034_property_contacts.sql`: enum property_contact_role + tabella property_contacts + RLS
- `035_modify_contacts.sql`: +roles[], +codice_fiscale, +partita_iva, backfill type→roles
- `036_modify_listings.sql`: +property_id FK verso properties
- `037_modify_proposals.sql`: +proposal_type (vendita/locazione) + campi locazione

### Dettaglio Fase 3 — File UI creati
- `web/app/(app)/banca-dati/page.tsx` — SSR list page con filtri e paginazione
- `web/app/(app)/banca-dati/nuovo/page.tsx` — SSR create form page
- `web/app/(app)/banca-dati/[id]/page.tsx` — SSR detail page
- `web/components/banca-dati/banca-dati-client.tsx` — client list + filtri + stage badges
- `web/components/banca-dati/nuovo-immobile-client.tsx` — client form + Mapbox autocomplete + vicinanza
- `web/components/banca-dati/immobile-detail-client.tsx` — client detail + cronistoria + contatti
- `web/components/banca-dati/event-timeline.tsx` — timeline con quick actions + dialog
- `web/components/banca-dati/property-card.tsx` — card immobile riutilizzabile
- `web/components/banca-dati/property-stage-icon.tsx` — badge stage colorato
- `web/components/banca-dati/disposition-icon.tsx` — simbolo disposizione proprietario
- `web/components/banca-dati/address-autocomplete.tsx` — input con autocomplete Mapbox
- `web/components/banca-dati/zone-selector.tsx` — dropdown zone con creazione inline
- `web/components/app-sidebar.tsx` — sidebar ristrutturata con 3 gruppi (GESTIONE/OPERATIVITÀ/AMMINISTRAZIONE)
- `web/lib/i18n/translations.ts` — +30 nuove chiavi IT/EN per banca dati e sidebar

### Prossimi step
1. **Fornire Mapbox token** (`MAPBOX_ACCESS_TOKEN` in `.env.local`) per attivare geocoding
2. **Fornire template PDF** (vendita + locazione) per Fase 4
3. Dopo token Mapbox: applicare le migration al progetto Supabase + testare
4. Proseguire con Fase 5 (Integrazione) per completare i flussi esistenti

---

## Strumenti e API Keys Necessari

> → Dettagli completi in `REQUISITI-STRUMENTI.md` (creato in Fase 0)

| Strumento | Scopo | Come Ottenere | Costo |
|-----------|-------|---------------|-------|
| **Mapbox Access Token** | Geocoding indirizzi + autocomplete | Registrazione su mapbox.com → Account → Tokens | Gratuito fino a 100k richieste/mese, poi $5/1000 |
| **Mapbox Geocoding API** | Conversione indirizzo → coordinate GPS | Incluso nel token, endpoint: `api.mapbox.com/geocoding/v5/` | Incluso nei 100k |
| **(Futuro) Google Maps API Key** | Geocoding produzione + Places | Google Cloud Console → APIs & Services → Credentials | ~$5/1000 richieste |
| **(Futuro) API Valutazione Immobili** | Stima automatica prezzo | Documentazione in attesa | Da definire |

### Variabili d'Ambiente da Aggiungere

```
MAPBOX_ACCESS_TOKEN=pk.eyJ1...        # Token Mapbox per geocoding
```

### Istruzioni Ottenimento Mapbox Token

1. Vai su https://account.mapbox.com/auth/signup/
2. Crea un account gratuito
3. Vai su https://account.mapbox.com/access-tokens/
4. Copia il "Default public token" (inizia con `pk.`)
5. Aggiungi a `web/.env.local` come `MAPBOX_ACCESS_TOKEN`
6. Il token gratuito include 100.000 richieste/mese di geocoding

### Template Contratti da Fornire

L'utente deve fornire:
1. **Template contratto intermediazione vendita** — formato PDF o Word, con segnaposto per i campi variabili
2. **Template contratto intermediazione locazione** — formato PDF o Word, con segnaposto per i campi variabili

Questi template verranno convertiti in componenti React-PDF con i campi dinamici.
