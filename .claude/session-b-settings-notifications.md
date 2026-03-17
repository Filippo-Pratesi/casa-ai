# Session B — Branch: sprint-e-settings-notifications

## Scope
This session owns tasks related to **Settings**, **CSV template**, and **Thank you email**.

## Git Setup
```bash
cd "C:\Users\User\Desktop\Claude\Claude Code\casa-ai\web"
git checkout sprint-e-settings-notifications
```

## Tasks

- [ ] **Import CSV: template scaricabile** — bottone "Scarica template CSV" nella sezione Importa contatti di Impostazioni. File con headers corretti + 2 righe di esempio scaricabile come attachment.
- [ ] **Thank you email automatica** — quando un immobile viene marcato come venduto/affittato (status update via API), generare bozza email warm via AI (DeepSeek, stesso pattern delle birthday reminders). Salvare come notification o inviare come campagna bozza.

## Rules
- Before each task: read relevant files
- After each task: `git add && git commit && git push origin sprint-e-settings-notifications`
- Update this file marking [x] when done
- Shared memory is at: `C:\Users\User\.claude\projects\C--Users-User-Desktop-Claude-Claude-Code\memory\`
- Plan is at: `C:\Users\User\.claude\plans\squishy-riding-liskov.md`
- Do NOT merge — Session B pushes to its branch. The user will merge.
- The other session is on branch: sprint-e-contacts-calendar
