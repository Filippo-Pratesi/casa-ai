#!/usr/bin/env npx ts-node

/**
 * Seed script for contact event history (cronistoria)
 * Generates realistic mock interaction data for demonstration and testing
 *
 * Usage:
 *   npx ts-node scripts/seed-contact-events.ts
 *
 * This script:
 * - Fetches all existing contacts
 * - Generates 8-10 realistic events per contact based on their type
 * - Creates a logical timeline of interactions (notes, calls, emails, appointments, proposals)
 * - Seeds the contact_events table with meaningful data
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Event type constants
const EVENT_TYPES = {
  nota: 'nota',
  chiamata: 'chiamata',
  email: 'email',
  appuntamento: 'appuntamento',
  campagna_inviata: 'campagna_inviata',
  immobile_proposto: 'immobile_proposto',
} as const

// Logical event templates per contact type
const EVENT_TEMPLATES = {
  buyer: {
    nota: [
      'Cliente interessato a acquistare. Compilato form online con preferenze. Segue-up necessario.',
      'Discussione su budget, timeline, e preferenze. Cliente molto disponibile a riunioni. Interesse confermato.',
      'Cliente ha visitato 2 proprietà interessanti. Feedback positivo su una. Desideroso di approfondire.',
      'Cliente ha deciso di fare offerta per una proprietà. Pre-approvazione mutuo in corso.',
      'Contattare per aggiornamento su stato ispezione e mutuo. Atteso timeline finale per closing.',
    ],
    chiamata: [
      'Prima telefonata di consultazione - Discussione su esigenze e preferenze',
      'Telefonata di aggiornamento settimanale - Progressi e prossimi step',
      'Chiamata per discutere offerta e condizioni di negoziazione',
    ],
  },
  seller: {
    nota: [
      'Proprietario interessato a vendere. Contatto iniziale molto promettente. Visita preliminare consigliata.',
      'Visione preliminare dell''immobile concordata. Proprietario organizzato. Quotazione di mercato discussa.',
      'Valutazione preliminare completata. Prezzo di mercato concordato. Proprietario pronto per pubblicare.',
      'Annuncio pubblicato su 5 piattaforme. Già ricevute 4 richieste di visita.',
      'Due visite proprietà programmate per il weekend. Proprietario molto disponibile.',
    ],
    chiamata: [
      'Prima telefonata per concordare visione preliminare dell''immobile',
      'Telefonata per discutere valutazione e strategia di marketing',
      'Aggiornamento settimanale su visite ricevute e feedback potenziali acquirenti',
    ],
  },
  renter: {
    nota: [
      'Inquilino interessato a locare. Necessita urgentemente tra 1-2 mesi. Buona potenziale.',
      'Discussi requisiti di locazione. Cliente ha dichiarato disponibilità economica. Referenze da verificare.',
      'Cliente ha visitato appartamento disponibile. Ha fatto buona impressione ai proprietari.',
      'Contratto di locazione praticamente concordato. Cliente molto soddisfatto.',
      'Controllare status firma documenti finali. Deposito cauzione già ricevuto.',
    ],
    chiamata: [
      'Prima consulenza telefonica - Discussione su requisiti e timeline',
      'Telefonata per coordinare visita appartamento',
      'Aggiornamento su status documentazione e contratto',
    ],
  },
  landlord: {
    nota: [
      'Proprietario che desidera affittare. Immobile in buone condizioni. Interesse alto.',
      'Discussione su condizioni di locazione, costi di gestione, e profilo inquilino ideale.',
      'Proprietario soddisfatto dell''agenzia e documentazione fornita. Pronto a procedere.',
      'Inquilino identificato e approvato dopo screening. Documentazione completa raccolta.',
      'Contattare per confermare data esatta trasloco dell''inquilino.',
    ],
    chiamata: [
      'Prima telefonata di consultazione su gestione della proprietà',
      'Telefonata per discutere profilo inquilino e condizioni contrattuali',
      'Aggiornamento settimanale su candidati e timeline',
    ],
  },
  other: {
    nota: [
      'Nuovo contatto registrato. Necessario approfondimento iniziale.',
      'Conversazione iniziale positiva. Nuove informazioni raccolte.',
      'Feedback positivo ricevuto dal cliente. Engagement buono.',
      'Situazione in evoluzione positiva. Cliente rimane molto coinvolto.',
      'Mantenersi in contatto regolare. Cliente mostra forte interesse.',
    ],
    chiamata: [
      'Prima telefonata per comprendere esigenze e preferenze',
      'Telefonata di follow-up su proposte inviate',
      'Aggiornamento settimanale su progressi',
    ],
  },
}

interface ContactRecord {
  id: string
  workspace_id: string
  type: string
  name: string
  agent_id: string | null
  created_at: string
}

interface ContactEvent {
  workspace_id: string
  contact_id: string
  agent_id: string | null
  event_type: string
  title: string
  body?: string | null
  related_listing_id?: string | null
  related_property_id?: string | null
  event_date: string
}

async function seedContactEvents() {
  const admin = createAdminClient()

  console.log('Starting contact events seed...\n')

  try {
    // Fetch all contacts
    const { data: contacts, error: contactsError } = await admin
      .from('contacts')
      .select('id, workspace_id, type, name, agent_id, created_at')
      .is('deleted_at', null)
      .order('workspace_id')
      .order('id')

    if (contactsError) throw contactsError
    if (!contacts || contacts.length === 0) {
      console.log('No contacts found. Nothing to seed.')
      return
    }

    console.log(`Found ${contacts.length} contacts. Generating events...\n`)

    const allEvents: ContactEvent[] = []

    for (const contact of contacts as ContactRecord[]) {
      const templates = EVENT_TEMPLATES[(contact.type as keyof typeof EVENT_TEMPLATES) || 'other']
      const baseDate = new Date(contact.created_at)
      let eventDate = new Date(baseDate)

      // EVENT 1: First contact note (day 0)
      eventDate = new Date(baseDate)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.nota,
        title: 'Primo contatto',
        body: templates.nota?.[0] || 'Primo contatto registrato.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 2: First call (day 3)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 3)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.chiamata,
        title: 'Prima telefonata di consultazione',
        body: templates.chiamata?.[0],
        event_date: eventDate.toISOString(),
      })

      // EVENT 3: Email (day 5)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 5)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.email,
        title: 'Invio documentazione e proposte iniziali',
        body: 'Email inviata con catalogo e schede tecniche di proprietà selezionate.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 4: Appointment (day 8)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 8)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.appuntamento,
        title: 'Riunione di consultazione in agenzia',
        body: 'Incontro in persona per valutare opzioni e stabilire strategy.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 5: Property proposal (day 12) - if listing exists
      const { data: listing } = await admin
        .from('listings')
        .select('id, address')
        .eq('workspace_id', contact.workspace_id)
        .limit(1)
        .single()

      if (listing) {
        eventDate = new Date(baseDate)
        eventDate.setDate(eventDate.getDate() + 12)
        allEvents.push({
          workspace_id: contact.workspace_id,
          contact_id: contact.id,
          agent_id: contact.agent_id,
          event_type: EVENT_TYPES.immobile_proposto,
          title: `Nuova proposta: ${listing.address}`,
          body: 'Immobile che soddisfa perfettamente i criteri espressi. Visita consigliata.',
          related_listing_id: listing.id,
          event_date: eventDate.toISOString(),
        })
      }

      // EVENT 6: Follow-up note (day 15)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 15)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.nota,
        title: 'Feedback post-appuntamento',
        body: templates.nota?.[2] || 'Feedback positivo ricevuto dal cliente.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 7: Campaign email (day 18)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 18)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.campagna_inviata,
        title: 'Newsletter settimanale - Nuove disponibilità',
        body: 'Newsletter automatica con ultimi annunci rilevanti per il cliente.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 8: Status update (day 25)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 25)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.nota,
        title: 'Aggiornamento importante della situazione',
        body: templates.nota?.[3] || 'Situazione in evoluzione positiva.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 9: Follow-up call (day 30)
      eventDate = new Date(baseDate)
      eventDate.setDate(eventDate.getDate() + 30)
      allEvents.push({
        workspace_id: contact.workspace_id,
        contact_id: contact.id,
        agent_id: contact.agent_id,
        event_type: EVENT_TYPES.chiamata,
        title: 'Telefonata di aggiornamento settimanale',
        body: templates.chiamata?.[1] || 'Check-in settimanale per discutere progressi.',
        event_date: eventDate.toISOString(),
      })

      // EVENT 10: Recent note (if older than 37 days)
      const ageInDays = Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24))
      if (ageInDays > 37) {
        eventDate = new Date()
        eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 7))
        allEvents.push({
          workspace_id: contact.workspace_id,
          contact_id: contact.id,
          agent_id: contact.agent_id,
          event_type: EVENT_TYPES.nota,
          title: Math.random() > 0.5 ? 'Follow-up programmato' : 'Nota di progresso',
          body: templates.nota?.[4] || 'Mantenersi in contatto regolare.',
          event_date: eventDate.toISOString(),
        })
      }

      console.log(`✓ Generated ${allEvents.filter(e => e.contact_id === contact.id).length} events for ${contact.name}`)
    }

    // Insert all events in batches of 100
    const batchSize = 100
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)
      const { error } = await admin.from('contact_events').insert(batch)
      if (error) throw error
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} events)`)
    }

    console.log(`\n✅ Successfully seeded ${allEvents.length} contact events!`)
  } catch (error) {
    console.error('Error seeding contact events:', error)
    process.exit(1)
  }
}

// Run the seed
seedContactEvents()
