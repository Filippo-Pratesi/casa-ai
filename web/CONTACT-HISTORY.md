# Contact History (Cronistoria) System

## Overview

The contact history system (cronistoria) provides a comprehensive audit trail and interaction log for each contact. It tracks all interactions, communications, notes, and important milestones in the customer relationship.

## Architecture

### Database Table: `contact_events`

**Location:** `web/supabase/migrations/057_contact_events.sql`

```sql
CREATE TABLE contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  agent_id uuid,
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  related_property_id uuid,
  related_listing_id uuid,
  event_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Event Types

The system supports 6 event types:

| Type | Label | Icon | Color | Description |
|------|-------|------|-------|-------------|
| `nota` | Nota | FileText | Blue | Internal note or status update |
| `chiamata` | Chiamata | Phone | Green | Phone call or direct conversation |
| `email` | Email | Mail | Orange | Email communication |
| `appuntamento` | Appuntamento | Calendar | Purple | Scheduled meeting or appointment |
| `campagna_inviata` | Campagna inviata | Megaphone | Amber | Mass email or campaign sent |
| `immobile_proposto` | Immobile proposto | Home | Teal | Property proposal to client |

### Components

**Frontend:** `web/components/contacts/contact-cronistoria.tsx`
- Display timeline of events
- Add notes inline
- Filter by event type
- Link to related properties and listings
- Responsive timeline UI with visual indicators

**Types:** `web/lib/contact-event-types.ts`
- TypeScript interfaces and constants
- Event templates per contact type
- Helper functions for validation
- Color and icon mappings

## Mock Data Generation

### Migration-Based Seeding

**File:** `web/supabase/migrations/062_seed_contact_events.sql`

Automatically generates 8-10 realistic events for each existing contact when the migration is applied. Events include:

1. **First contact note** (Day 0) — Initial interaction
2. **First call** (Day 3) — Initial consultation
3. **Email** (Day 5) — Send documentation
4. **Appointment** (Day 8) — In-person meeting
5. **Property proposal** (Day 12) — Suggest matching property
6. **Follow-up note** (Day 15) — Post-appointment feedback
7. **Campaign email** (Day 18) — Automated campaign
8. **Status update** (Day 25) — Important progress update
9. **Follow-up call** (Day 30) — Weekly check-in
10. **Recent note** (Within last 7 days) — Latest progress

**Behavior:**
- Each contact type (buyer, seller, renter, landlord) gets context-appropriate messages
- Events are distributed logically across 30+ days
- Includes references to real listings/properties when available
- Respects workspace isolation (RLS enabled)

### TypeScript Seed Script

**File:** `web/scripts/seed-contact-events.ts`

Manual seed script for development and testing:

```bash
npx ts-node scripts/seed-contact-events.ts
```

**Features:**
- Fetches existing contacts from database
- Generates 8-10 events per contact
- Supports batch insertion for performance
- Includes progress logging
- Error handling with process exit on failure

## Event Templates by Contact Type

### Buyer
- Looking to purchase property
- Budget and timeline discussions
- Property visits and feedback
- Offer negotiation
- Closing timeline updates

**Sample events:**
- "Cliente ha visitato 2 proprietà interessanti. Feedback positivo su una."
- "Cliente ha deciso di fare offerta per una proprietà. Pre-approvazione mutuo in corso."

### Seller
- Wanting to sell property
- Preliminary valuation
- Market strategy discussion
- Property listing publication
- Feedback on prospective buyers

**Sample events:**
- "Valutazione preliminare completata. Prezzo di mercato concordato."
- "Annuncio pubblicato su 5 piattaforme. Già ricevute 4 richieste di visita."

### Renter
- Looking to rent property
- Lease requirements discussion
- Property viewing coordination
- Contract negotiation
- Move-in preparation

**Sample events:**
- "Discussi requisiti di locazione. Cliente ha dichiarato disponibilità economica."
- "Contratto di locazione praticamente concordato. Cliente molto soddisfatto."

### Landlord
- Wanting to rent out property
- Lease terms discussion
- Tenant screening
- Contract preparation
- Tenant onboarding

**Sample events:**
- "Proprietario soddisfatto della documentazione. Pronto a procedere."
- "Inquilino identificato e approvato. Documentazione completa raccolta."

## Usage in UI

### Contact Detail Page

The cronistoria is displayed on the contact detail page (`/contacts/[id]`):

```tsx
<ContactCronistoria
  contactId={id}
  initialEvents={cronistoriaEvents}
/>
```

**Features:**
- Timeline display with visual indicators
- Add notes button with inline form
- Event filtering (show 10, expand to show all)
- Links to related properties and listings
- Separate "Immobili proposti" (properties proposed) section
- Time display using `formatDistanceToNow` (e.g., "3 days ago")

### Sorting and Display

- Events sorted by `event_date` (newest first)
- Shows up to 10 events by default
- "Show all" button to expand complete history
- Proposed properties shown in dedicated section

## API Endpoints

### Create Event

**POST** `/api/contacts/[id]/events`

**Request:**
```json
{
  "event_type": "nota",
  "title": "Note text",
  "body": "Optional detailed body",
  "related_listing_id": "uuid (optional)",
  "related_property_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "id": "event-uuid"
}
```

### List Events

Events are fetched server-side on the contact detail page:

```typescript
const { data: cronistoriaData } = await admin
  .from('contact_events')
  .select('id, event_type, title, body, event_date, created_at, related_property_id, related_listing_id, agent:users!contact_events_agent_id_fkey(name)')
  .eq('contact_id', id)
  .eq('workspace_id', workspace_id)
  .order('event_date', { ascending: false })
  .limit(100)
```

## Security

### Row Level Security (RLS)

All contact events are scoped to workspace:

```sql
CREATE POLICY "workspace_isolation" ON contact_events
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid())
  )
```

**Implications:**
- Users can only see events for contacts in their workspace
- No cross-workspace data leakage
- Enforced at database level

### Input Validation

- Event type validated against enum in database CHECK constraint
- Title and event_type required (NOT NULL)
- Body is optional
- Event date defaults to current timestamp if not provided

## Performance Considerations

### Indexing

Optimized for common queries:

```sql
CREATE INDEX idx_contact_events_contact ON contact_events(contact_id, event_date DESC);
CREATE INDEX idx_contact_events_workspace ON contact_events(workspace_id);
CREATE INDEX idx_contact_events_listing ON contact_events(related_listing_id);
CREATE INDEX idx_contact_events_property ON contact_events(related_property_id);
```

**Impact:**
- Fast filtering by contact (primary use case)
- Efficient workspace isolation
- Quick lookups for linked properties/listings

### Query Optimization

- Limit to 100 events per contact (display 10, allow expansion)
- Single round-trip fetch with agent name join
- No N+1 queries for event details

## Future Enhancements

### Potential Improvements

1. **Event Categories/Tags**
   - Allow tagging events with custom labels
   - Filter by tags on UI
   - Search by tag

2. **Automated Event Generation**
   - Automatically log appointments when created
   - Auto-create "property proposed" events from listings
   - Send email → auto-log as email event

3. **Analytics Dashboard**
   - Timeline of engagement per contact
   - Average days to conversion
   - Most active communication channels
   - Heatmap of contact activity

4. **Bulk Operations**
   - Export contact history as PDF
   - Print timeline
   - Share history with colleagues or clients

5. **Notifications**
   - Alert on important events (offer, visitation, etc.)
   - Reminder to follow-up after X days of inactivity
   - Workflow automation based on event triggers

6. **Integration Logging**
   - Auto-log WhatsApp messages sent
   - Calendar integration for appointments
   - CRM activity sync

## Testing

### Mock Data for Development

The seed files provide realistic test data:

```bash
# Migration-based: Applied automatically on deploy
# OR manually run:
npx supabase db reset

# Manual seed script:
npx ts-node scripts/seed-contact-events.ts
```

### Test Scenarios

1. **View contact with rich history** — Navigate to any contact with 30+ events
2. **Add event** — Click "Aggiungi nota" and submit
3. **Expand timeline** — Click "Mostra tutti" to expand 10-event limit
4. **Link navigation** — Click property/listing links from events

## File Structure

```
web/
├── supabase/
│   └── migrations/
│       ├── 057_contact_events.sql          # Table definition & RLS
│       └── 062_seed_contact_events.sql     # Mock data migration
├── lib/
│   └── contact-event-types.ts              # Types & constants
├── components/contacts/
│   └── contact-cronistoria.tsx             # UI component
├── scripts/
│   └── seed-contact-events.ts              # Manual seed script
├── app/(app)/contacts/
│   └── [id]/
│       └── page.tsx                         # Detail page
└── CONTACT-HISTORY.md                       # This file
```

## Related Files

- Contact types: `web/lib/contact-utils.ts`
- Contact form: `web/components/contacts/contact-form.tsx`
- Contact list: `web/components/contacts/contacts-table.tsx`
- Contact detail: `web/app/(app)/contacts/[id]/page.tsx`

## References

- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security
- Database migrations: See `web/supabase/migrations/`
- Component patterns: See `web/components/` for similar timeline/history patterns
