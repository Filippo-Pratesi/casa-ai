# Session A — Branch: sprint-e-contacts-calendar

## Scope
This session owns tasks related to **Contacts UX** and **Calendar improvements**.

## Git Setup
```bash
cd "C:\Users\User\Desktop\Claude\Claude Code\casa-ai\web"
git checkout sprint-e-contacts-calendar
```

## Tasks

- [x] **Contacts: filtri avanzati** — filtro lista clienti per tipo (acquirente/venditore), budget, città, stanze. Toggle visuale compressa (tabella) ↔ estesa (card)
- [x] **Contacts: icona WhatsApp** — sostituire il testo "WA" con SVG ufficiale WhatsApp sul link nei contatti. Usare `lucide-react` se disponibile, altrimenti SVG inline.
- [x] **Team: filtri dinamici** — periodo personalizzato (date picker da/a), filtro per agente specifico, filtro per tipo appuntamento. Sostituire il solo filtro per mese.

## Rules
- Before each task: read relevant files
- After each task: `git add && git commit && git push origin sprint-e-contacts-calendar`
- Update this file marking [x] when done
- Shared memory is at: `C:\Users\User\.claude\projects\C--Users-User-Desktop-Claude-Claude-Code\memory\`
- Plan is at: `C:\Users\User\.claude\plans\squishy-riding-liskov.md`
- Do NOT merge — Session A pushes to its branch. The user will merge.
- The other session is on branch: sprint-e-settings-notifications
