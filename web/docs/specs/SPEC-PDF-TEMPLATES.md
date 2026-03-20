# SPEC-PDF-TEMPLATES — Template PDF Contratti

## Template 1: Contratto Intermediazione Vendita

Template fornito dall'utente. Il sistema popola i seguenti campi:

### Campi Variabili Automatici

| Segnaposto | Fonte | Campo DB |
|------------|-------|----------|
| {AGENZIA_NOME} | Workspace | workspace.name |
| {AGENZIA_INDIRIZZO} | Profilo agente/workspace | user.address |
| {AGENZIA_PIVA} | Profilo agente | user.partita_iva |
| {AGENTE_NOME} | Profilo agente | user.name |
| {PROPRIETARIO_NOME} | Contatto proprietario | contact.name |
| {PROPRIETARIO_CF} | Contatto | contact.codice_fiscale |
| {PROPRIETARIO_PIVA} | Contatto | contact.partita_iva |
| {PROPRIETARIO_INDIRIZZO} | Contatto | contact.address_of_residence |
| {PROPRIETARIO_CITTA} | Contatto | contact.city_of_residence |
| {PROPRIETARIO_TELEFONO} | Contatto | contact.phone |
| {PROPRIETARIO_EMAIL} | Contatto | contact.email |
| {IMMOBILE_INDIRIZZO} | Property | property.address |
| {IMMOBILE_CITTA} | Property | property.city |
| {IMMOBILE_TIPO} | Property | property.property_type |
| {IMMOBILE_MQ} | Property | property.sqm |
| {IMMOBILE_VANI} | Property | property.rooms |
| {CATASTALE_FOGLIO} | Property | property.foglio |
| {CATASTALE_PARTICELLA} | Property | property.particella |
| {CATASTALE_SUBALTERNO} | Property | property.subalterno |
| {CATASTALE_CATEGORIA} | Property | property.categoria_catastale |
| {CATASTALE_RENDITA} | Property | property.rendita_catastale |
| {INCARICO_TIPO} | Property | property.incarico_type |
| {INCARICO_DATA} | Property | property.incarico_date |
| {INCARICO_SCADENZA} | Property | property.incarico_expiry |
| {COMMISSIONE_PERCENT} | Property | property.incarico_commission_percent |
| {PREZZO_RICHIESTO} | Property | property.estimated_value |
| {DATA_ODIERNA} | Sistema | now() |

### Compilazione da Dropdown
Quando l'agente seleziona un contatto dal dropdown "Proprietario", tutti i campi PROPRIETARIO_* vengono precompilati.
Quando seleziona un immobile, tutti i campi IMMOBILE_* e CATASTALE_* vengono precompilati.

---

## Template 2: Contratto Intermediazione Locazione

Stessa struttura del template vendita con campi aggiuntivi:

| Segnaposto Aggiuntivo | Fonte | Campo DB |
|----------------------|-------|----------|
| {CANONE_MENSILE} | Property | property.monthly_rent |
| {CANONE_AGEVOLATO} | Property | property.monthly_rent_discounted |
| {NOTE_AGEVOLAZIONE} | Property | property.discount_notes |
| {TIPO_CONTRATTO} | Property | property.lease_type |
| {DURATA_MESI} | Calcolato | differenza mesi start/end |
| {DEPOSITO} | Property | property.deposit |
| {DATA_INIZIO} | Property | property.lease_start_date |
| {DATA_FINE} | Property | property.lease_end_date |

---

## Invio

### Email (Resend)
Come fatture e proposte esistenti. PDF allegato, template email standard.

### WhatsApp
Link `wa.me/{phone}?text={messaggio}` con:
- Messaggio precompilato: "Gentile {nome}, in allegato il contratto di intermediazione per l'immobile in {indirizzo}."
- PDF: link temporaneo pubblico su Supabase Storage (expiry 24h)

---

## Punti di Accesso

### Da Pagina Immobile (`/banca-dati/[id]`)
Bottone "Genera Incarico" → apre dialog con:
- Dati immobile precompilati
- Dropdown proprietario (preselezionato se owner_contact_id presente)
- Campi incarico (tipo, date, commissione) da compilare
- Tipo: vendita o locazione (basato su transaction_type)

### Da Pagina Contatto (`/contacts/[id]`)
Bottone "Proponi Incarico" → apre dialog con:
- Dati contatto precompilati
- Dropdown immobili del contatto (quelli dove e' proprietario)
- Campi incarico da compilare

---

## Implementazione Tecnica
- Usa `@react-pdf/renderer` come fatture e proposte esistenti
- Componente React: `IncaricoPdfTemplate.tsx` (vendita) e `IncaricoLocazionePdfTemplate.tsx` (locazione)
- API: POST `/api/properties/[id]/incarico-pdf` genera e salva PDF su Supabase Storage
- Invio email: riusa pattern di `/api/invoices/[id]/send`
- Invio WhatsApp: genera link wa.me con URL temporaneo del PDF
