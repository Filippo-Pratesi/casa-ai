# SPEC-UI — Interfaccia Utente Sprint I

## Struttura Pagine

### `/banca-dati` — Lista Principale
- Header con titolo e bottone "+ Nuovo Immobile"
- Barra filtri con dropdown: Stage, Zona, Sotto-zona, Agente, Stato, Tipo operazione, Ultimo contatto
- Campo ricerca testuale (via, indirizzo, proprietario)
- Riepilogo conteggi per stage (badge colorati)
- Tabella con colonne: Stage (icona), Stato (simbolo), Indirizzo, Zona, Sotto-zona, Proprietario, Agente, Ultimo evento
- Paginazione
- Legenda stage e stato in fondo alla tabella

### `/banca-dati/nuovo` — Form Creazione
- Campo citta (dropdown o testo)
- Campo indirizzo con autocomplete Mapbox (obbligatorio)
- Campo zona con dropdown zone esistenti + "Nuova zona" (obbligatorio, preselezionata da zone default agente)
- Campo sotto-zona (opzionale, dropdown + "Nuova sotto-zona")
- Campo campanello (opzionale)
- Textarea note palazzo (opzionale)
- Textarea prima nota (opzionale)
- Sezione "Immobili gia' noti nelle vicinanze" (appare dopo selezione indirizzo)
  - Gruppo "Stesso edificio" con lista card
  - Gruppo "Entro 100 metri" con lista card
- Dialog conferma nuova zona (se zona non esiste, mostra zone simili)

### `/banca-dati/[id]` — Dettaglio Immobile
Layout a 2 colonne:

**Colonna sinistra — Dati:**
- Header: indirizzo, citta, stage badge, stato badge, bottone azione principale
- Form progressivo (campi si sbloccano per stage)
- Sezione proprietario (link a scheda contatto)
- Sezione contatti immobile (lista con ruoli, bottone aggiunta)
- Sezione immobili stesso edificio/vicinanza
- Sezione incarico (tipo, date, commissione, catastali)
- Sezione locazione (se affitto: tipo contratto, canone, deposito, scadenza)

**Colonna destra — Cronistoria:**
- Timeline verticale con eventi in ordine cronologico inverso
- Ogni evento: icona tipo, titolo, descrizione, agente, data/ora
- Bottoni rapidi in fondo: "+ Nota", "+ Telefonata", "+ Visita", "+ Citofono"
- Dialog per aggiunta evento con campi: tipo, titolo, descrizione, sentiment

---

## Sidebar Ristrutturata

Tre gruppi con icone Lucide:

**GESTIONE:**
- LayoutDashboard → Dashboard
- Building2 → Banca Dati
- Megaphone → Annunci
- Users → Contatti

**OPERATIVITA':**
- Calendar → Calendario
- Mail → Campagne
- FileText → Proposte
- CheckSquare → To Do

**AMMINISTRAZIONE:**
- Euro → Contabilita
- Settings → Impostazioni

---

## Impostazioni — Nuove Sezioni

### Gestione Zone
- Lista zone raggruppate per citta
- Per ogni zona: nome, conteggio immobili, bottoni Rinomina/Sostituisci/Elimina
- Dialog sostituzione: dropdown zona destinazione, conferma con conteggio
- Dialog conferma eliminazione con conteggio immobili

### Zone Agenti
- Lista agenti con le zone assegnate come tag rimovibili
- Bottone "+" per aggiungere zona (dropdown zone disponibili)

---

## Pagina Contatto — Sezione Immobili

Nuova sezione "Immobili Collegati" nella pagina dettaglio contatto:
- Raggruppata per ruolo: "Come proprietario", "Come altro contatto", "Come acquirente", "Come inquilino"
- Ogni card: indirizzo, stage badge, stato badge, dettagli essenziali
- Bottoni: "Vai all'immobile", "Proponi Incarico" (se non ha gia' incarico)

---

## Form Annuncio — Modifiche

Aggiunta al form esistente di creazione annuncio:
- Campo "Proprietario/Locatore" (dropdown contatti o "Crea nuovo") — obbligatorio
- Campo "Zona" (dropdown zone) — obbligatorio
- Entrambi i campi appaiono prima dei campi esistenti

---

## Componenti Riutilizzabili

| Componente | Uso |
|------------|-----|
| `PropertyStageIcon` | Badge colorato con icona per lo stage |
| `DispositionIcon` | Simbolo stato proprietario |
| `PropertyCard` | Card immobile per lista e vicinanza |
| `EventTimeline` | Timeline cronistoria con eventi |
| `EventDialog` | Dialog aggiunta evento |
| `ZoneSelector` | Dropdown zona con "Nuova zona" e conferma |
| `AddressAutocomplete` | Input con autocomplete Mapbox |
| `NearbyProperties` | Sezione immobili vicinanza |
| `PropertyContactsList` | Lista contatti per immobile |
| `StageLegend` | Legenda stage con icone |
| `DispositionLegend` | Legenda stati con simboli |
