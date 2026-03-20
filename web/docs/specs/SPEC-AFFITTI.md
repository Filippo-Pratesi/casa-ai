# SPEC-AFFITTI — Ciclo Vita Locazioni

## Stage Specifici Locazione

### Locato (🟣)
L'immobile ha un contratto di locazione attivo. Dati salvati su properties:
- `lease_type`: tipo contratto (4+4, 3+2, transitorio, foresteria, altro)
- `lease_start_date`: data inizio
- `lease_end_date`: data scadenza
- `monthly_rent`: canone mensile in euro
- `monthly_rent_discounted`: canone agevolato (opzionale)
- `discount_notes`: note sul canone agevolato (motivo, durata, condizioni)
- `deposit`: deposito cauzionale
- `tenant_contact_id`: link al contatto inquilino
- `lease_notes`: note aggiuntive

### Disponibile (🟡)
Il contratto e' scaduto/terminato. L'immobile torna disponibile per un nuovo affitto o vendita.
Lo stage cambia automaticamente quando `lease_end_date` viene superata (via cron o manualmente).

---

## Proposta di Locazione

### Nuovi Campi su proposals
- `proposal_type`: 'vendita' (default) o 'locazione'
- `canone_mensile`: canone proposto
- `canone_agevolato`: canone agevolato proposto (opzionale)
- `durata_contratto_mesi`: durata proposta
- `tipo_contratto_locazione`: lease_type enum
- `deposito_cauzionale`: deposito proposto
- `spese_condominiali_incluse`: boolean

### Form Proposta Locazione
Quando tipo = "locazione", il form mostra:
- Canone mensile proposto (euro)
- Canone agevolato (opzionale)
- Durata contratto (mesi)
- Tipo contratto (dropdown 4+4, 3+2, transitorio, foresteria)
- Data inizio proposta
- Deposito cauzionale
- Spese condominiali incluse/escluse
- Note

---

## Notifiche Automatiche Scadenza

### Logica
Un processo scheduled (cron o API chiamata periodica) controlla ogni giorno:
1. Query: properties con stage='locato' e lease_end_date imminente
2. Per ogni match, crea notifica nel sistema notifiche esistente

### Notifiche

| Giorni prima scadenza | Tipo notifica | Destinatario |
|-----------------------|---------------|-------------|
| 90 | `lease_expiry_90` | Agente assegnato |
| 60 | `lease_expiry_60` | Agente + admin |
| 30 | `lease_expiry_30` | Agente + admin |
| 0 (giorno scadenza) | `lease_expiry_today` | Agente + admin |
| -1 (dopo scadenza) | `lease_expired` | Sistema — cambia stage a 'disponibile' |

### Implementazione
- Nuovo endpoint `/api/cron/lease-check` invocato giornalmente
- Oppure Supabase Edge Function con cron schedule
- Crea record in tabella `notifications` con tipo specifico
- Evita notifiche duplicate (check se gia' inviata per quella scadenza)

### Template Notifica
```
Titolo: "Contratto Via Roma 12 scade tra {N} giorni"
Body: "Il contratto di locazione per l'immobile in Via Roma 12, Pisa
       (inquilino: Mario Rossi) scade il {data}. Azione richiesta."
```

---

## Transizioni Locazione

| Da | A | Trigger | Azioni |
|----|---|---------|--------|
| Incarico → Locato | Proposta locazione accettata o manuale | Salva dati locazione, crea evento "locato", attiva notifiche |
| Locato → Disponibile | Scadenza contratto o manuale | Crea evento "contratto_scaduto", rimuove dati inquilino |
| Disponibile → Incarico | Nuovo incarico per ri-affitto | Come Conosciuto → Incarico |
| Locato → Incarico | Rinnovo con nuovo contratto | Aggiorna dati locazione, crea evento |
