---
name: CasaAI V2 Roadmap
description: Planned V2 features for CasaAI — birthday messages and cadastral API integration
type: project
---

# CasaAI V2 Planned Features

**Why:** User requested these for V2 — they require external API integrations and more complex infrastructure.

## 1. Messaggi di Compleanno Automatici
- Scan contacts with `date_of_birth` field (already added to DB in v1)
- Send automated birthday messages via WhatsApp/email/SMS
- Message template customizable per workspace
- Scheduled job (cron) to check birthdays daily
- **How to apply:** Use Supabase Edge Functions + pg_cron or external scheduler (Inngest, Upstash)

## 2. Integrazione Dati Catastali (Visura)
- Query external cadastral APIs (Agenzia delle Entrate / Telemaco) or scraping-based solutions
- Data to pull: informazioni proprietario, dati catastali completi, rendita, visura attuale, visura storica, visura soggetto
- Possible APIs: Telemaco (Agenzia delle Entrate), Visure Network, DocuSign Immobiliare
- **How to apply:** Add a "Richiedi visura catastale" button on listing detail that calls the external API and stores results
- Results stored in `listing_catastral_documents` table (JSONB)
