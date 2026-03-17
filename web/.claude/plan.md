Product Plan v4.0 (Updated 2026-03-17)

Context
Italian real estate agents lose 2-3 hours per listing on admin: writing descriptions, creating social posts, drafting WhatsApp broadcasts and emails. Lead follow-up is inconsistent — agents respond late or not at all to portal inquiries. Agencies spend almost nothing on software.
Opportunity: Build an AI back-office that handles content generation and lead nurturing, starting with a single friend's branch as a beachhead, with a clear path to the full 10-office network and beyond.
Entry point: Friend is branch manager of a 5-agent office, part of a ~10-office regional network. He becomes an internal advocate and de-facto sales partner.

Agreed Vision
What We're Building (current state — web app in active development)

Web App (desktop-first) — Full real estate back-office: listing management, AI content generation, contact CRM, team management, appointments, social publishing, archive
iOS App (React Native + Expo) — Planned for Sprint D


Tech Stack
LayerChoiceReasonWeb frontendNext.js 14 (App Router)Fast, SEO-ready, great DX, Vercel-nativeMobile appReact Native + ExpoShared TypeScript codebase, camera/gallery built-inBackendNext.js API routes + Supabase Edge FunctionsNo separate serverDatabaseSupabase (PostgreSQL)Auth + DB + storage in oneAuthSupabase AuthEmail/password + magic link, multi-tenant workspacesAI (text + vision)Gemini 2.0 Flash (Google)~$0.09/100 listingsAI (birthday messages)DeepSeek APICheaper for simple generation tasksFile StorageSupabase StoragePhotos, PDFs, documents, avatarsSocial PublishingInstagram Graph API + Facebook Pages APIDirect publishEmailResendTransactional emailPaymentsStripeSubscriptionsDeploymentVercel (web) + Expo EAS (mobile)StylingTailwind CSS + shadcn/ui

✅ Already Built
FeatureStatusAuth (login, register, invite)✅ DoneMulti-tenant workspaces✅ DoneGroup / multi-agency support✅ DoneRole-based access (group_admin / admin / agent)✅ DoneListing form + photo upload✅ DoneAI content generation (IT + EN + Instagram + Facebook + WhatsApp + Email)✅ DoneTone selector (Standard / Luxury / Accessibile / Investimento)✅ DoneOutput tabs with copy-to-clipboard✅ DoneRegenerate individual tabs✅ DoneSocial publishing (Instagram + Facebook)✅ DoneContact CRM (create, view, edit, delete)✅ DoneContact attachments + storage quota by plan✅ DoneListing attachments + storage quota✅ DoneProperty archive (sold / deleted) with filters✅ DoneArchive detail page (clickable agent/buyer links)✅ DoneInternal buyer linking in archive (sold_to_contact_id)✅ DoneTeam overview (admin view, leaderboard, rankings)✅ DoneTeam calendar (multi-agent, per-agent toggle)✅ DoneAgent profile page with individual calendar✅ DoneAppointments system (create/edit/delete/cancel, by type)✅ DoneWorkspace settings (name, default tone, logo)✅ DoneUser profile page (avatar, phone, address, P.IVA, bio)✅ DoneCatastral data fields on listings✅ DoneListing condition field✅ DoneDashboard (recent listings, contacts, stats)✅ DoneSidebar navigation✅ DoneSubscription system (Trial/Starter/Agenzia/Network, Stripe, plan gates)✅ DonePDF Brochure Generator (@react-pdf/renderer, download button)✅ DonePortal Export XML (per-listing + bulk workspace export)✅ DoneTrial banner in sidebar + Usage meters in settings✅ DoneEmail Campaigns (compose, send via Resend, open tracking pixel)✅ DoneBirthday reminder (contact card, AI message via DeepSeek, agent notification)✅ DoneWhatsApp direct link (wa.me/ on contact cards and listing output)✅ DonePrice history (listing_price_history table, timeline component)✅ DoneIn-app notifications (table, API, /notifications page, sidebar badge)✅ DoneProperty valuation widget (archived comps by city, avg price bar chart)✅ DoneFloor plan upload (drag-drop, Supabase storage, floor_plan_url on listings)✅ DoneCampaign email attachments (file picker, Supabase Storage upload)✅ DoneAgent notification on appointment assignment✅ Done

🌍 Competitor Landscape (Full Research — March 2026)
Key Competitors Identified
CompetitorUsersPricingAIUniqueGetrix16,000+ installsCustom✗Market leader by volumeGestim18,000+ users€3+/mo✗Franchise network adoptionAGIM3,000+ agenciesAnnual✗26-year track record, luxuryonOfficeEnterpriseCustom✓180+ portals, AI furnishing vizApimoInternationalTrial✓250+ portals, 15 languagesCometaEstablishedUnlimited✗Integrated accounting, 30yrRealgestGrowingFREE✗Zero cost, unlimited featuresGestionaleReMid-sizeCustom✗80+ portals, auction specialistGestiFIAIPFIAIP networkCustom✗2,000+ MLS networkGestionaleImmobiliare—Annual✗1,000+ portalsX-ImmobiliareSolo agents€49 one-time✗No subscription, perpetualKiwi Online700+ agenciesAnnual✗Mobile-first
Critical Competitive Insight
AI is the gap nobody has filled. Only onOffice (AI furnishing €0.30/image) and Apimo (AI matching) have any AI features. Every other competitor is a 2000s-era CRUD CRM. CasaAI's AI-native positioning is the core moat.
Realgest is a threat: completely free with no limitations. Our counter: AI features they'll never have + superior UX + mobile app + multi-agency management.
Features Every Competitor Has (we must match)

MLS / inter-agency collaboration
Auto matching (buyer preferences → listings)
Google Calendar sync
Portal sync (real-time for top 4: Immobiliare.it, Wikicasa, Idealista, Casa.it)
WhatsApp integration (direct messaging)
Agency website (static or dynamic)

Features Nobody Has (our differentiators)

AI content generation (descriptions, social, email, WhatsApp) — our core
AI lead scoring and prioritization
AI property valuation using comps
AI market reports (auto-generated PDF)
iOS mobile app (most have web-responsive only; some Android)
Modern UX (all competitors have 2005-era interfaces)


🔴 Full Feature Gap Analysis (v3 Updated)
Priority 1 — Sprint B ✅ COMPLETE
FeatureStatusEmail Campaigns✅ DoneAuto Matching display (buyer prefs → listings count on listing detail)🔄 Partial — display only, notify button pendingBirthday reminder + AI message✅ DoneWhatsApp direct link✅ DonePrice history✅ Done
Priority 2 — Sprint C ✅ COMPLETE
FeatureDescriptionEffortStatusAuto-matching buyers alertOn listing detail: show matched buyer count + "Notifica acquirenti" buttonM✅Compatible listings on contactOn buyer contact detail: show matching active listingsS✅Google Calendar syncOAuth2 read+write: push CasaAI appointments to Google Calendar, pull Google events to show alongsideM✅MLS (basic)Share listings across workspaces in same group. "Condividi con rete" toggle on listing. Shared listings visible read-only to other group workspacesL✅Listing stats (mocked)View count, shares, portal clicks — shown on listing detail. Mocked data, real tracking laterS✅
Priority 3 — Sprint D ✅ COMPLETE (UX & Features)
FeatureDescriptionEffortStatusModern UI redesignSidebar gradient logo, nav hover animations, dashboard stats bar, frosted headerM✅Calendar week view7-column week grid with appointments per day, month/week switcher persisted in localStorageM✅Calendar agent toggleColored pill per agent (admin), toggle show/hide events per agent, colors persistedM✅Calendar hover effectsBlue tint on cell hover, date circle highlight, native tooltip with event listS✅Export contacts CSVAdmin-only "Esporta CSV" button on contacts page, all fields, Content-Disposition downloadS✅Import contacts CSVSettings section with file picker, 5-row preview, batch insert, duplicate skip by emailM✅Security auditFull audit report (SECURITY_AUDIT.md) with 2 critical, 3 high, 4 medium fixes identifiedS✅Security fixesworkspace_id enforcement on appointments PATCH/DELETE, campaign attachment DELETES✅
Priority 3b — Sprint E ✅ MOSTLY COMPLETE (UX & Workflow improvements)
FeatureDescriptionEffortStatusContacts: filtri avanzatiFiltro lista clienti per tipo, budget, città, stanze. Toggle vista card/listaM✅ DoneContacts: icona WhatsAppIcona SVG ufficiale WhatsApp sul bottone nella scheda clienteS✅ DoneTeam: filtri dinamiciFiltri per agente, per periodo personalizzato (from/to month)M✅ DoneImport CSV: template scaricabileBottone "Scarica template CSV" in Impostazioni → Importa contattiS✅ DoneThank you email automaticaQuando venduto, AI genera bozza email ringraziamento via Gemini, salvata in CampagneM✅ Donei18n (IT/EN)Traduzione completa IT/EN con language switcher in sidebar; tutte le pagine tradotteM✅ DoneTo Do systemTab To Do con priorità, scadenze, assegnazione colleghi, badge sidebarM✅ DoneFix AI generation bugProfilo non trovato su genera/rigenera — ora usa admin clientS✅ DoneLead nurturing sequencesTimed follow-up email/WhatsApp sequences per contactXL❌ Not started
Priority 3c — Sprint F (Mobile App)
FeatureDescriptionEffortStatusReact Native + Expo appCamera, photo upload, listing form, AI generation, social publish, push notificationsL❌
Postponed to v3
FeatureDescriptionNotesAgency website (basic)Static site from DB listings. Custom domain. €20/mo add-on.Postponed — bassa priorità rispetto a mobile e UX improvements
Security Sprint (from SECURITY_AUDIT.md)
TaskSeverityEffortRate limiting on AI generation endpoints (Upstash)🟠 ALTAMCORS policy explicit configuration🟠 ALTASFile upload size validation (10MB cap)🟠 ALTASStripe webhook secret guard (fail if not set)🟡 MEDIASCSV formula injection sanitization🟡 MEDIASGoogle tokens encryption at rest (pgsodium)🟡 MEDIAMGlobal rate limiting middleware🟡 MEDIAMContent-Security-Policy headers🟢 BASSAS
Priority 4 — v3 (Scale Phase)
FeatureDescriptionEffortDirect portal API syncReal-time push to Immobiliare.it, Idealista, Casa.it APIsLContract templates + digital signaturePre-filled forms, Namirial/InfoCert certified e-signXLInvoicing modulePro-forma, SDI electronic invoicing, payment trackingXLAML compliance (D.lgs. 231)Client identity, PEP screening, risk assessmentXLCadastral lookupOwner lookup, map, yield calc via Agenzia Entrate APILAI market reportsAuto-generated weekly PDF with neighborhood statsL
🔮 Future Enhancements (post-v3)
FeatureNotes360° Virtual toursMatterport embed or 360° photo viewer. Removed from active sprints — low priority for Italian SME agencies, high complexityAndroid appAfter iOS validates mobile strategyAI furnishing visualizerSimilar to onOffice €0.30/img
Priority 5 — Landing Page (LAST)
FeatureDescriptionEffortMarketing landing pagePublic-facing site at / or separate domainLCompetitor comparison tableFeature-by-feature vs Gestim, Getrix, GestionaleImmobiliareSPricing tabPublic pricing pageSTrial signup flowOnboarding wizardM

📋 Implementation Plan
✅ Sprint A — COMPLETE

 Subscription system (plan-limits, Stripe checkout, webhooks, portal)
 PDF Brochure Generator
 Portal Export XML (per-listing + bulk)
 Trial banner in sidebar
 Usage meters in /settings

✅ Sprint B — COMPLETE

 Email Campaigns (/campaigns, compose, send, open tracking)
 Birthday reminder (badge, AI message via DeepSeek, agent notification)
 WhatsApp direct link on contacts + listing output
 Price history timeline
 In-app notifications (table, API, /notifications, sidebar badge)
 Property valuation widget (archived comps)
 Floor plan upload

✅ Sprint C — COMPLETE
Goal: Daily operational tool — matching, Google Calendar, MLS

 Auto-matching buyers on listing detail — matched count + "Notifica acquirenti" button
 Compatible listings on contact detail — buyer contacts see matching active listings
 Google Calendar sync — OAuth2, push/pull, show Google events in calendar view
 MLS basic — share listings across group workspaces (toggle + read-only view)
 Listing stats (mocked) — view count, shares on listing detail

✅ Sprint D — COMPLETE (CSV, Security, UX)

 Export contacts CSV (admin)
 Import contacts CSV (settings, 5-row preview, duplicate skip)
 CSV template download button in settings
 Security audit + fixes (workspace_id enforcement)
 Modern UI redesign (sidebar, dashboard stats bar)
 Calendar week view + agent toggles

✅ Sprint E — COMPLETE (Workflow & i18n)

 Contacts advanced filters (type, budget, city, rooms)
 Contacts WhatsApp SVG icon
 Team dynamic filters (per agent, date range)
 Thank-you email AI draft on sold listing
 Full i18n IT/EN with language switcher
 To Do system (priority, due dates, team assignment, sidebar badge)
 AI generation bug fix (admin client for profile lookup)

Sprint F — iOS App
Goal: Field tool for agents

React Native + Expo

Supabase auth, camera/gallery, listing form
AI content generation, social publish
Push notifications
App Store via EAS




Revenue Model
PlanPrice/moTargetTrialFree 30dAny agencyStarter€149Solo agent / 1 office, max 3 agentsAgenzia€299Branch office, max 15 agentsNetwork€899Multi-branch group, unlimited agents
Friend's branch: free forever as founding partner. Referral fee 10-15% on network sign-ups.

Competitive Advantage Summary

AI-native — only product in Italy where AI is core, not bolt-on
Modern UX — all competitors are 2005-era desktop CRMs
Price — competitive vs enterprise, dramatically better vs Realgest (free but dumb)
Multi-agency group management — built-in from day one
Mobile app (iOS) — most competitors are web-only
Speed — listing content in <10s; competitors require manual copy-paste


Feature Status Master Table
FeatureCompetitorsCasaAITargetListing management✅ All✅✅Contact CRM✅ All✅✅AI content generation✅ onOffice/Apimo only✅ core✅Social publishing✅ AGIM✅✅Multi-agency group✅ most✅✅Role-based access✅ most✅✅PDF Brochure✅ all✅✅Portal export XML✅ all✅✅Subscription billing✅ all✅✅Trial banner + usage meters—✅✅Calendar + appointments✅ all✅✅Email campaigns✅ all✅✅Birthday reminders + AI msg✅ AGIM, Cometa✅✅WhatsApp direct link✅ GestionaleRe✅✅Price history✅ most✅✅In-app notifications✅ most✅✅Property valuation widget✅ onOffice✅✅Floor plan upload✅ all✅✅Auto buyer matching✅ all✅✅Google Calendar sync✅ Gestim, Cometa, Kiwi✅✅MLS / listing share✅ all✅✅Listing stats✅ standard✅✅Contacts advanced filters✅ most✅✅Team dynamic filters✅ most✅✅CSV import/export + template✅ all✅✅Thank-you email on sold❌ none with AI✅✅IT/EN i18n✅ Apimo✅✅To Do task system❌ none✅✅Agency website✅ Getrix, AGIM, Cometa❌Sprint DiOS app✅ Gestim, Getrix, AGIM❌Sprint DAndroid app✅ most❌FuturePortal API sync (real-time)✅ GestionaleRe (80+)❌v3Digital signature✅ add-on❌v3Invoicing✅ Cometa❌v3AML compliance✅ add-on❌v3AI market reports❌ nobody❌v3AI lead scoring❌ nobody❌v3360° Virtual tours✅ most❌Future enhancementAI furnishing visualizer✅ onOffice €0.30/img❌Future enhancement