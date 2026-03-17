-- Migration: Seed mock calendar appointments for every agent in every workspace
-- Inserts ~5-7 appointments per agent spread across the next 14 days
-- Types: viewing, meeting, signing, call, other

do $$
declare
  r_agent record;
  base_date date := current_date;
begin
  -- Loop over every agent in every workspace
  for r_agent in
    select u.id as agent_id, u.workspace_id
    from users u
    where u.workspace_id is not null
  loop

    -- Day +0: visita immobile (viewing)
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'viewing', 'Visita immobile — Via Roma 12',
      'Cliente molto interessato, portare planimetria',
      (base_date + interval '9 hours')::timestamptz,
      (base_date + interval '10 hours')::timestamptz,
      'Marco Bianchi', 'scheduled'
    );

    -- Day +1: call
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'call', 'Chiamata follow-up acquirente',
      'Aggiornamento sulla proposta inviata',
      (base_date + 1 + interval '11 hours')::timestamptz,
      (base_date + 1 + interval '11 hours 30 minutes')::timestamptz,
      'Laura Ferretti', 'scheduled'
    );

    -- Day +2: meeting
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'meeting', 'Riunione team settimanale',
      'Review pipeline clienti e nuovi annunci',
      (base_date + 2 + interval '9 hours 30 minutes')::timestamptz,
      (base_date + 2 + interval '10 hours 30 minutes')::timestamptz,
      null, 'scheduled'
    );

    -- Day +3: viewing
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'viewing', 'Visita immobile — Corso Italia 55',
      'Prima visita, mostrare anche il garage',
      (base_date + 3 + interval '15 hours')::timestamptz,
      (base_date + 3 + interval '16 hours')::timestamptz,
      'Giovanni Rossi', 'scheduled'
    );

    -- Day +4: call
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'call', 'Valutazione immobile proprietario',
      'Richiedono stima per vendita',
      (base_date + 4 + interval '10 hours')::timestamptz,
      (base_date + 4 + interval '10 hours 45 minutes')::timestamptz,
      'Anna Conti', 'scheduled'
    );

    -- Day +7: signing
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'signing', 'Firma proposta d''acquisto',
      'Portare compromesso firmato dall''agenzia',
      (base_date + 7 + interval '11 hours')::timestamptz,
      (base_date + 7 + interval '12 hours')::timestamptz,
      'Marco Bianchi', 'scheduled'
    );

    -- Day +9: viewing
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'viewing', 'Visita immobile — Via Garibaldi 8',
      'Secondo appuntamento, cliente pronto a fare offerta',
      (base_date + 9 + interval '16 hours')::timestamptz,
      (base_date + 9 + interval '17 hours')::timestamptz,
      'Stefania Marini', 'scheduled'
    );

    -- Day +10: meeting
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'meeting', 'Incontro con notaio',
      'Preparazione atti per rogito fine mese',
      (base_date + 10 + interval '14 hours')::timestamptz,
      (base_date + 10 + interval '15 hours')::timestamptz,
      'Giovanni Rossi', 'scheduled'
    );

    -- Day +12: other (completed yesterday — for history)
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'other', 'Sopralluogo fotografico',
      'Foto professionali per nuovo annuncio',
      (base_date + 12 + interval '9 hours')::timestamptz,
      (base_date + 12 + interval '10 hours')::timestamptz,
      null, 'scheduled'
    );

    -- Day -1: completed appointment (history)
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'viewing', 'Visita immobile — Piazza Duomo 3',
      'Cliente interessato, seguirà proposta',
      (base_date - 1 + interval '10 hours')::timestamptz,
      (base_date - 1 + interval '11 hours')::timestamptz,
      'Laura Ferretti', 'completed'
    );

    -- Day -2: completed call
    insert into appointments (workspace_id, agent_id, type, title, notes, starts_at, ends_at, contact_name, status)
    values (
      r_agent.workspace_id, r_agent.agent_id,
      'call', 'Aggiornamento trattativa',
      null,
      (base_date - 2 + interval '14 hours 30 minutes')::timestamptz,
      (base_date - 2 + interval '15 hours')::timestamptz,
      'Anna Conti', 'completed'
    );

  end loop;
end $$;
