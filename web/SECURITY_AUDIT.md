# CasaAI — Security Audit Report

**Date:** 2026-03-17
**Scope:** All API routes in `web/app/api/`
**Auditor:** Automated analysis via Claude Code

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICA | 2 |
| 🟠 ALTA | 3 |
| 🟡 MEDIA | 4 |
| 🟢 BASSA | 2 |

---

## 🔴 CRITICHE

### C-01 — Nessun workspace_id check in PATCH/DELETE /api/appointments/[id]

**File:** `web/app/api/appointments/[id]/route.ts`
**Rischio:** Data leakage cross-workspace, unauthorized modification

**Problema:** Il PATCH e il DELETE usano `admin` client (bypassa RLS) e filtrano solo per `id`, senza verificare che l'appuntamento appartenga al workspace dell'utente autenticato. Qualsiasi utente autenticato che conosce un UUID di appointment può modificarlo o eliminarlo.

**Remediation:**
```ts
// Aggiungere .eq('workspace_id', profile.workspace_id) a tutte le query admin
await (admin as any)
  .from('appointments')
  .update(allowed)
  .eq('id', id)
  .eq('workspace_id', profile.workspace_id)  // ← mancante
```

---

### C-02 — DELETE /api/campaigns/[id]/attachment non verifica workspace

**File:** `web/app/api/campaigns/[id]/attachment/route.ts`
**Rischio:** Un admin autenticato può cancellare allegati di campagne di altri workspace

**Problema:** La DELETE rimuove `attachment_url` e `attachment_name` da qualsiasi campaign record senza filtrare per `workspace_id`.

**Remediation:** Aggiungere `.eq('workspace_id', profile.workspace_id)` alla query DELETE.

---

## 🟠 ALTE

### A-01 — Tracking pixel pubblico senza rate limiting

**File:** `web/app/api/track/open/[campaignId]/[contactId]/route.ts`
**Rischio:** Spoofing open rates, DOS sulle RPC calls

**Problema:** L'endpoint è intenzionalmente pubblico (no auth) per i pixel di tracking email. Tuttavia non c'è rate limiting — chiunque può inviare migliaia di richieste e gonfiare i contatori `opened_count`.

**Remediation:** Aggiungere un check sull'IP con un semplice in-memory rate limiter, oppure usare Vercel Edge Middleware con `@upstash/ratelimit`.

---

### A-02 — CORS non configurato esplicitamente

**File:** Tutti gli endpoint API
**Rischio:** Cross-origin request forgery da domini malevoli

**Problema:** Next.js di default non restringe le origini. Nessuna risposta API include header `Access-Control-Allow-Origin` limitati al dominio dell'app.

**Remediation:** Aggiungere middleware CORS o impostare `allowedOrigins` in `next.config.js`. Per le API con autenticazione Supabase cookie-based, il rischio è mitigato dai cookie SameSite, ma va documentato esplicitamente.

---

### A-03 — Nessuna validazione dimensione file negli upload

**File:** `web/app/api/campaigns/[id]/attachment/route.ts`, `web/app/api/listing/[id]/attachments/route.ts`, `web/app/api/profile/avatar/route.ts`
**Rischio:** Upload di file molto grandi → denial of service, costi storage

**Problema:** Il file upload non valida la dimensione prima di leggere l'intero buffer in memoria. Un file da 1GB verrebbe caricato interamente in RAM.

**Remediation:**
```ts
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File troppo grande (max 10MB)' }, { status: 413 })
```

---

## 🟡 MEDIE

### M-01 — Nessun rate limiting globale

**Rischio:** Brute force su login, spam di AI generation, abuso delle API

**Problema:** Nessun endpoint ha rate limiting. Gli endpoint di AI generation (`/api/listing/generate`, `/api/listing/[id]/regenerate`) sono particolarmente sensibili per costi API.

**Remediation:** Implementare `@upstash/ratelimit` con Vercel Edge Middleware, oppure aggiungere rate limiting per `user.id` in ogni endpoint critico.

---

### M-02 — Google refresh token salvato in chiaro nel DB

**File:** `web/lib/google-calendar.ts`, `web/supabase/migrations/020_google_calendar.sql`
**Rischio:** Se il DB viene compromesso, i token Google degli utenti sono esposti

**Problema:** `google_access_token` e `google_refresh_token` sono salvati come testo in chiaro nella tabella `users`.

**Remediation:** Cifrare i token a riposo usando `crypto.subtle` o una libreria come `jose`. In alternativa, usare Supabase Vault (extension `pgsodium`) per la cifratura a livello DB.

---

### M-03 — Input CSV import non sanificato per injection

**File:** `web/app/api/contacts/import/route.ts`
**Rischio:** CSV injection (formula injection in Excel/Sheets)

**Problema:** I valori del CSV vengono inseriti direttamente nel DB senza prefissare i valori che iniziano con `=`, `+`, `-`, `@` (formule Excel). Se un admin esporta poi il CSV e lo apre in Excel, formule malevole possono eseguirsi.

**Remediation:**
```ts
function sanitizeCsvFormula(val: string): string {
  if (/^[=+\-@]/.test(val)) return `'${val}` // prefisso apostrofo
  return val
}
```

---

### M-04 — Webhook Stripe: fallback a stringa vuota se secret non configurato

**File:** `web/app/api/billing/webhook/route.ts`
**Rischio:** Se `STRIPE_WEBHOOK_SECRET` non è configurato, l'endpoint accetta qualsiasi payload

**Problema:** `const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''` — se la variabile manca, `constructEvent` fallisce silenziosamente o accetta qualsiasi firma.

**Remediation:**
```ts
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
if (!WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET non configurato')
  return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
}
```

---

## 🟢 BASSE

### B-01 — Error messages verbosi in development

Alcuni endpoint restituiscono `error.message` diretto al client. In produzione Vercel questo è mitigato, ma va documentato.

### B-02 — Nessun Content-Security-Policy header

L'app non configura CSP headers. In Next.js si può aggiungere in `next.config.js` tramite `headers()`.

---

## Piano di Remediation (priorità)

| Task | Severity | Effort | Sprint |
|------|----------|--------|--------|
| Fix workspace_id check in appointments PATCH/DELETE | 🔴 CRITICA | S | **Security Sprint 1** |
| Fix workspace_id check in campaign attachment DELETE | 🔴 CRITICA | S | **Security Sprint 1** |
| Validazione dimensione file upload | 🟠 ALTA | S | **Security Sprint 1** |
| Rate limiting su AI generation endpoints | 🟠 ALTA | M | **Security Sprint 1** |
| CORS policy esplicita | 🟠 ALTA | S | **Security Sprint 1** |
| Stripe webhook secret guard | 🟡 MEDIA | S | **Security Sprint 2** |
| CSV formula injection sanitization | 🟡 MEDIA | S | **Security Sprint 2** |
| Cifratura token Google a riposo | 🟡 MEDIA | M | **Security Sprint 2** |
| Rate limiting globale (Upstash) | 🟡 MEDIA | M | **Security Sprint 2** |
| CSP Headers | 🟢 BASSA | S | Security Sprint 3 |

---

*Questo report è stato generato automaticamente. Eseguire una revisione manuale prima di andare in produzione con utenti reali.*
