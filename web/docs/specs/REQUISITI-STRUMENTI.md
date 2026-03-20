# REQUISITI-STRUMENTI — API Keys e Strumenti Necessari

## 1. Mapbox Access Token

**Scopo**: Geocoding indirizzi italiani + autocomplete indirizzo nel form

**Come ottenerlo**:
1. Vai su https://account.mapbox.com/auth/signup/
2. Crea un account gratuito (email + password)
3. Dopo il login, vai su https://account.mapbox.com/access-tokens/
4. Troverai un "Default public token" che inizia con `pk.eyJ1...`
5. Copia questo token

**Configurazione**:
Aggiungi al file `web/.env.local`:
```
MAPBOX_ACCESS_TOKEN=pk.eyJ1...il_tuo_token...
```

**Costi**:
- Gratuito fino a **100.000 richieste/mese** di geocoding
- Oltre: $5 per 1.000 richieste
- Per un'agenzia media (5 agenti, ~50 immobili/settimana) si resta ampiamente nel tier gratuito

**API utilizzate**:
- Geocoding Forward: `api.mapbox.com/geocoding/v5/mapbox.places/{query}.json`
  - Converte indirizzo testuale → coordinate GPS
  - Usato per autocomplete nel form
- Geocoding Reverse: non necessario per ora

**Note**:
- Il token viene usato SOLO server-side (via `/api/geocode`)
- Non viene mai esposto al browser
- In futuro verra' sostituito con Google Maps API per maggiore precisione in produzione

---

## 2. Template Contratti (da fornire dall'utente)

**Cosa serve**:
1. **Template contratto intermediazione vendita**
   - Formato: PDF o Word (.docx)
   - Deve contenere segnaposto testuali dove il sistema inserira' i dati
   - Esempio segnaposto: `{PROPRIETARIO_NOME}`, `{IMMOBILE_INDIRIZZO}`, etc.
   - Vedi `SPEC-PDF-TEMPLATES.md` per la lista completa dei segnaposto

2. **Template contratto intermediazione locazione**
   - Stessa struttura del template vendita
   - Con campi aggiuntivi per canone, tipo contratto, deposito
   - Vedi `SPEC-PDF-TEMPLATES.md` per i segnaposto specifici

**Come fornirli**:
- Inviare i file nella chat o salvarli in `web/templates/`
- Il sistema li convertira' in componenti React-PDF

---

## 3. Strumenti Futuri (NON necessari ora)

### Google Maps API Key (Futuro — Produzione)
- **Quando**: quando si passa dalla beta alla produzione
- **Scopo**: geocoding piu' preciso sui civici italiani
- **Come**: Google Cloud Console → APIs & Services → Credentials → Create API Key
- **Costo**: ~$5 per 1.000 richieste, $200 credito gratuito mensile
- **API da abilitare**: Geocoding API, Places API

### API Valutazione Immobili (Futuro)
- **Quando**: documentazione in attesa
- **Scopo**: stima automatica prezzo immobile basata su comparabili
- **Dettagli**: da definire quando la documentazione sara' disponibile

---

## Riepilogo Variabili d'Ambiente

### Da aggiungere a `web/.env.local`:
```
# Sprint I — Banca Dati
MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

### Gia' presenti (non modificare):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
# ... etc
```

---

## Checklist Pre-Implementazione

- [ ] Account Mapbox creato
- [ ] Token Mapbox copiato in `.env.local`
- [ ] Template contratto vendita fornito
- [ ] Template contratto locazione fornito
- [ ] Branch `sprint-i-banca-dati` creato ← FATTO
