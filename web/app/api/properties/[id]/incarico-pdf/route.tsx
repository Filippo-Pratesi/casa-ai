// @ts-nocheck — react-pdf JSX types are not compatible with TypeScript strict mode
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

type Params = { params: Promise<{ id: string }> }

// ─── Palette ───────────────────────────────────────────────────────────────
const CORAL     = '#c0472a'
const NAVY      = '#1a1a2e'
const MUTED     = '#666666'
const BEIGE     = '#faf8f5'
const BORDER    = '#e8e0d8'
const WHITE     = '#ffffff'
const DARK      = '#1a1a1a'
const LIGHT_BG  = '#f5f5f0'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 50,
    paddingRight: 50,
    backgroundColor: WHITE,
  },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  agencyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: CORAL, letterSpacing: 0.4 },
  agencySubtitle: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  agencyContact: { fontSize: 7.5, color: MUTED, textAlign: 'right' },
  divider: { height: 1, backgroundColor: CORAL, marginBottom: 14 },
  // Title bar
  titleBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 18,
  },
  titleText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: 0.6 },
  titleMeta: { alignItems: 'flex-end' },
  titleDate: { fontSize: 8, color: 'rgba(255,255,255,0.85)' },
  titleRef: { fontSize: 7.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  // Section
  sectionBar: { backgroundColor: LIGHT_BG, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8, marginTop: 16, borderLeft: `3px solid ${CORAL}` },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.8, textTransform: 'uppercase' },
  // Parties box
  partiesBox: { flexDirection: 'row', backgroundColor: BEIGE, padding: 12, gap: 12, marginBottom: 4, border: `1px solid ${BORDER}` },
  partyCol: { flex: 1 },
  partyDivider: { width: 1, backgroundColor: BORDER },
  partyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: CORAL, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  partyDetail: { fontSize: 8, color: MUTED, marginBottom: 1.5 },
  // Data table
  dataRow: { flexDirection: 'row', paddingVertical: 4, borderBottom: `1px solid ${BORDER}` },
  dataLabel: { width: 140, fontSize: 8, color: MUTED, fontFamily: 'Helvetica-Bold' },
  dataValue: { flex: 1, fontSize: 8.5, color: DARK },
  dataRowHighlight: { flexDirection: 'row', paddingVertical: 5, backgroundColor: BEIGE, paddingHorizontal: 6 },
  dataValueBold: { flex: 1, fontSize: 8.5, color: DARK, fontFamily: 'Helvetica-Bold' },
  // Clause box
  clauseBox: { border: `1px solid ${BORDER}`, padding: 10, marginBottom: 6 },
  clauseText: { fontSize: 8, color: DARK, lineHeight: 1.5 },
  clauseHighlight: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: CORAL },
  // Signature
  sigBox: { flexDirection: 'row', gap: 30, marginTop: 30 },
  sigCol: { flex: 1, borderTop: `1px solid ${DARK}`, paddingTop: 6 },
  sigLabel: { fontSize: 7.5, color: MUTED },
  sigName: { fontSize: 8.5, color: DARK, marginTop: 2 },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, borderTop: `1px solid ${BORDER}`, paddingTop: 6 },
  footerText: { fontSize: 7, color: MUTED, textAlign: 'center' },
})

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  )
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRowHighlight}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValueBold}>{value}</Text>
    </View>
  )
}

// ─── Document ───────────────────────────────────────────────────────────────
interface IncaricoDocProps {
  property: Record<string, unknown>
  owner: { name: string; phone?: string | null; email?: string | null; codice_fiscale?: string | null } | null
  workspace: { name: string; email?: string | null; phone?: string | null } | null
  agentName: string
  today: string
}

function IncaricoDocument({ property, owner, workspace, agentName, today }: IncaricoDocProps) {
  const isAffitto = property.transaction_type === 'affitto'
  const contractType = isAffitto ? 'CONTRATTO DI MEDIAZIONE PER LOCAZIONE' : 'INCARICO DI MEDIAZIONE PER VENDITA'
  const incaricoTypeLabel = property.incarico_type === 'esclusivo' ? 'ESCLUSIVO'
    : property.incarico_type === 'non_esclusivo' ? 'NON ESCLUSIVO'
    : String(property.incarico_type ?? '').toUpperCase()

  const propertyDesc = [
    property.property_type ? String(property.property_type) : null,
    property.sqm ? `${property.sqm} mq` : null,
    property.rooms ? `${property.rooms} locali` : null,
  ].filter(Boolean).join(' · ') || '—'

  const commissionText = property.incarico_commission_percent
    ? `${property.incarico_commission_percent}% sul prezzo di ${isAffitto ? 'locazione concordato' : 'vendita concordato'} (IVA inclusa)`
    : '____%'

  const priceLabel = isAffitto ? 'Canone mensile richiesto (€)' : 'Prezzo richiesto (€)'
  const priceValue = isAffitto
    ? (property.monthly_rent ? `€ ${Number(property.monthly_rent).toLocaleString('it-IT')}/mese` : '—')
    : (property.estimated_value ? `€ ${Number(property.estimated_value).toLocaleString('it-IT')}` : '—')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.agencyName}>{workspace?.name ?? 'Agenzia Immobiliare'}</Text>
            <Text style={styles.agencySubtitle}>Mediazione Immobiliare</Text>
          </View>
          <View>
            {workspace?.email && <Text style={styles.agencyContact}>{workspace.email}</Text>}
            {workspace?.phone && <Text style={styles.agencyContact}>{workspace.phone}</Text>}
          </View>
        </View>
        <View style={styles.divider} />

        {/* Title bar */}
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>{contractType}</Text>
          <View style={styles.titleMeta}>
            <Text style={styles.titleDate}>{today}</Text>
            <Text style={styles.titleRef}>{incaricoTypeLabel}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionTitle}>Parti contraenti</Text>
        </View>
        <View style={styles.partiesBox}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Mandante (Proprietario)</Text>
            <Text style={styles.partyName}>{owner?.name ?? '____________________________'}</Text>
            {owner?.phone && <Text style={styles.partyDetail}>Tel: {owner.phone}</Text>}
            {owner?.email && <Text style={styles.partyDetail}>Email: {owner.email}</Text>}
            {owner?.codice_fiscale && <Text style={styles.partyDetail}>C.F.: {owner.codice_fiscale}</Text>}
          </View>
          <View style={styles.partyDivider} />
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Mediatore (Agenzia)</Text>
            <Text style={styles.partyName}>{workspace?.name ?? '____________________________'}</Text>
            {agentName && <Text style={styles.partyDetail}>Agente: {agentName}</Text>}
            {workspace?.email && <Text style={styles.partyDetail}>Email: {workspace.email}</Text>}
          </View>
        </View>

        {/* Property */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionTitle}>Immobile oggetto del mandato</Text>
        </View>
        <FieldRow label="Indirizzo" value={`${property.address}, ${property.city}`} />
        <FieldRow label="Zona" value={[property.zone, property.sub_zone].filter(Boolean).join(' / ') as string || null} />
        <FieldRow label="Tipologia" value={propertyDesc} />
        {property.foglio && <FieldRow label="Dati catastali" value={`Fg. ${property.foglio} – Part. ${property.particella ?? '—'}${property.subalterno ? ` – Sub. ${property.subalterno}` : ''}`} />}
        <HighlightRow label={priceLabel} value={priceValue} />

        {/* Incarico terms */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionTitle}>Termini dell&apos;incarico</Text>
        </View>
        <FieldRow label="Tipo incarico" value={incaricoTypeLabel} />
        <FieldRow label="Data conferimento" value={property.incarico_date ? new Date(property.incarico_date as string).toLocaleDateString('it-IT') : '—'} />
        <FieldRow label="Scadenza incarico" value={property.incarico_expiry ? new Date(property.incarico_expiry as string).toLocaleDateString('it-IT') : 'Non specificata'} />
        <HighlightRow label="Provvigione di mediazione" value={commissionText} />
        {property.incarico_notes && <FieldRow label="Note" value={property.incarico_notes as string} />}

        {/* Clause */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionTitle}>Clausole principali</Text>
        </View>
        <View style={styles.clauseBox}>
          <Text style={styles.clauseText}>
            {`Il/La sottoscritto/a, in qualità di proprietario/disponente dell'immobile sopra descritto, conferisce all'Agenzia `}
            <Text style={styles.clauseHighlight}>{workspace?.name ?? '____________'}</Text>
            {isAffitto
              ? ` l'incarico ${incaricoTypeLabel.toLowerCase()} di mediazione per la locazione dell'immobile alle condizioni sopra indicate.`
              : ` l'incarico ${incaricoTypeLabel.toLowerCase()} di mediazione per la vendita dell'immobile alle condizioni sopra indicate.`
            }
            {'\n\n'}
            {`Il Mediatore si impegna a pubblicizzare l'immobile e a presentare potenziali `}
            {isAffitto ? 'conduttori' : 'acquirenti'}
            {`. La provvigione di mediazione sarà dovuta al perfezionamento del contratto definitivo di `}
            {isAffitto ? 'locazione' : 'compravendita'}
            {`, nella misura indicata e secondo le condizioni di mercato.`}
            {'\n\n'}
            {`Il Mandante dichiara di essere l'unico proprietario/avente titolo e che l'immobile è libero da vincoli, ipoteche o gravami non dichiarati, ovvero si impegna a darne tempestiva comunicazione al Mediatore.`}
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.sigBox}>
          <View style={styles.sigCol}>
            <Text style={styles.sigLabel}>Il Mandante</Text>
            <Text style={styles.sigName}>{owner?.name ?? '_____________________'}</Text>
          </View>
          <View style={styles.sigCol}>
            <Text style={styles.sigLabel}>Per il Mediatore</Text>
            <Text style={styles.sigName}>{agentName}</Text>
          </View>
          <View style={styles.sigCol}>
            <Text style={styles.sigLabel}>Luogo e data</Text>
            <Text style={styles.sigName}>{property.city as string ?? '____________'}, ___________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {`${workspace?.name ?? ''} · Documento generato il ${today} · Valido solo se firmato da entrambe le parti`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── Route handler ──────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userProfile } = await (admin as any)
    .from('users')
    .select('workspace_id, name')
    .eq('id', user.id)
    .single()

  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const { workspace_id, name: agentName } = userProfile as { workspace_id: string; name: string }

  // Fetch property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property, error: propError } = await (admin as any)
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspace_id)
    .single()

  if (propError || !property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })

  const prop = property as Record<string, unknown>

  if (prop.stage !== 'incarico') {
    return NextResponse.json({ error: "Il contratto è disponibile solo per immobili in fase 'incarico'" }, { status: 400 })
  }

  // Fetch owner contact if present
  let owner: { name: string; phone?: string | null; email?: string | null; codice_fiscale?: string | null } | null = null
  if (prop.owner_contact_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownerData } = await (admin as any)
      .from('contacts')
      .select('name, phone, email, codice_fiscale')
      .eq('id', prop.owner_contact_id)
      .single()
    if (ownerData) owner = ownerData as typeof owner
  }

  // Fetch workspace details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wsData } = await (admin as any)
    .from('workspaces')
    .select('name, email, phone')
    .eq('id', workspace_id)
    .single()

  const workspace = wsData as { name: string; email?: string; phone?: string } | null

  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  let buffer: Buffer
  try {
    buffer = await renderToBuffer(
      <IncaricoDocument
        property={prop}
        owner={owner}
        workspace={workspace}
        agentName={agentName}
        today={today}
      />
    )
  } catch (renderErr) {
    console.error('PDF render failed for property', id, renderErr)
    return NextResponse.json({ error: 'Errore nella generazione del PDF' }, { status: 500 })
  }

  const fileName = `incarico-${String(prop.address ?? 'immobile').replace(/\s+/g, '-').toLowerCase()}.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
