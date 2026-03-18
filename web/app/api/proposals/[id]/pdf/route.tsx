import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

type Params = { params: Promise<{ id: string }> }

// ─── Palette ───────────────────────────────────────────────────────────────
const CORAL   = '#c0472a'
const NAVY    = '#1a1a2e'
const MUTED   = '#666666'
const BEIGE   = '#faf8f5'
const BORDER  = '#e8e0d8'
const WHITE   = '#ffffff'
const DARK    = '#1a1a1a'
const LIGHT_CORAL = '#fff8f5'

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingLeft: 45,
    paddingRight: 45,
    backgroundColor: WHITE,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  agencyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: CORAL,
    letterSpacing: 0.4,
  },
  agencySubtitle: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  agencyContact: {
    fontSize: 7.5,
    color: MUTED,
    textAlign: 'right',
  },

  // ── Title bar ────────────────────────────────────────────────────────────
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CORAL,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  titleBarText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: 0.8,
  },
  titleBarMeta: {
    alignItems: 'flex-end',
  },
  titleBarNumber: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },
  titleBarDate: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },

  // ── Section pill ─────────────────────────────────────────────────────────
  sectionPill: {
    backgroundColor: NAVY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    marginTop: 14,
  },
  sectionPillText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Parties box ──────────────────────────────────────────────────────────
  partiesBox: {
    flexDirection: 'row',
    backgroundColor: BEIGE,
    borderRadius: 4,
    padding: 12,
    gap: 12,
    marginBottom: 4,
    border: `1px solid ${BORDER}`,
  },
  partyCol: {
    flex: 1,
  },
  partyDivider: {
    width: 1,
    backgroundColor: BORDER,
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: CORAL,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 8.5,
    color: MUTED,
    marginBottom: 1.5,
  },
  partyDetailLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#444',
  },

  // ── Property grid ────────────────────────────────────────────────────────
  propBox: {
    backgroundColor: BEIGE,
    borderRadius: 4,
    padding: 12,
    border: `1px solid ${BORDER}`,
    marginBottom: 4,
  },
  propGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propCell: {
    flex: 1,
    minWidth: '45%',
  },
  propCellWide: {
    width: '100%',
  },
  propCellLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  propCellValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  propCellSubValue: {
    fontSize: 8.5,
    color: '#444',
  },

  // ── Pricing table ─────────────────────────────────────────────────────────
  priceBox: {
    backgroundColor: LIGHT_CORAL,
    borderRadius: 4,
    padding: 12,
    borderLeft: `3px solid ${CORAL}`,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottom: `1px solid ${BORDER}`,
  },
  priceRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 9,
    color: '#333',
  },
  priceLabelBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  priceValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  priceTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: CORAL,
  },
  priceSubNote: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 1,
  },

  // ── Vincoli ──────────────────────────────────────────────────────────────
  vincoliBox: {
    borderRadius: 4,
    padding: 10,
    border: `1px solid ${BORDER}`,
    marginBottom: 4,
  },
  vincoloItem: {
    flexDirection: 'row',
    marginBottom: 5,
    gap: 5,
  },
  vincoloBullet: {
    fontSize: 9,
    color: CORAL,
    width: 10,
    marginTop: 0.5,
  },
  vincoloText: {
    fontSize: 8.5,
    color: '#333',
    flex: 1,
    lineHeight: 1.4,
  },
  vincoloNone: {
    fontSize: 8.5,
    color: MUTED,
    fontFamily: 'Helvetica-Oblique',
  },

  // ── Legal clauses ─────────────────────────────────────────────────────────
  clauseBox: {
    marginBottom: 4,
  },
  clauseText: {
    fontSize: 8,
    color: '#333',
    lineHeight: 1.55,
  },
  clauseTextMuted: {
    fontSize: 7.5,
    color: MUTED,
    lineHeight: 1.5,
    marginTop: 5,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 10,
  },

  // ── Notes ────────────────────────────────────────────────────────────────
  noteBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    padding: 10,
    borderLeft: `2px solid #f59e0b`,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 8.5,
    color: '#78350f',
    lineHeight: 1.5,
  },

  // ── Signature block ──────────────────────────────────────────────────────
  signatureSection: {
    marginTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLine: {
    height: 1,
    backgroundColor: '#999',
    width: '100%',
    marginBottom: 5,
  },
  signatureRole: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 3,
  },
  signatureName: {
    fontSize: 8.5,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  signatureDate: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1px solid ${BORDER}`,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#aaa',
  },
})

// ─── Helper functions ──────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtEur(n: number | null | undefined): string {
  if (n == null || n === 0) return '€ 0,00'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function immobileTipoLabel(tipo: string | null | undefined): string {
  if (!tipo) return ''
  const map: Record<string, string> = {
    apartment: 'Appartamento',
    house:     'Casa',
    villa:     'Villa',
    commercial:'Immobile Commerciale',
    land:      'Terreno',
    garage:    'Garage',
    other:     'Altro',
  }
  return map[tipo] ?? tipo.charAt(0).toUpperCase() + tipo.slice(1)
}

type VincoloType = {
  tipo: 'mutuo' | 'vendita_immobile' | 'perizia' | 'personalizzata'
  descrizione?: string
  importo_mutuo?: number
  nome_banca?: string
  indirizzo_immobile_vendita?: string
}

function vincoloText(v: VincoloType): string {
  switch (v.tipo) {
    case 'mutuo': {
      let text = 'La presente proposta è condizionata alla concessione di un mutuo ipotecario'
      if (v.importo_mutuo) text += ` di importo pari a ${fmtEur(v.importo_mutuo)}`
      if (v.nome_banca) text += ` presso ${v.nome_banca}`
      text += '. In caso di mancata concessione, la proposta si intenderà risolta senza penali.'
      return text
    }
    case 'vendita_immobile': {
      let text = "La presente proposta è condizionata alla vendita dell'immobile di proprietà del proponente"
      if (v.indirizzo_immobile_vendita) text += ` sito in ${v.indirizzo_immobile_vendita}`
      text += '.'
      return text
    }
    case 'perizia': {
      return "La presente proposta è condizionata all'esito positivo della perizia bancaria sull'immobile oggetto della presente proposta."
    }
    case 'personalizzata': {
      return v.descrizione ?? 'Condizione personalizzata.'
    }
    default:
      return v.descrizione ?? ''
  }
}

// ─── PDF Component ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProposalPdf({ proposal }: { proposal: Record<string, any> }) {
  const vincoli = (proposal.vincoli ?? []) as VincoloType[]
  const agencyName   = proposal.agente_agenzia || 'CasaAI'
  const agentName    = proposal.agente_nome    || ''
  const caparra      = proposal.caparra_confirmatoria as number | null
  const prezzoOfferto = proposal.prezzo_offerto as number
  const saldo        = caparra ? prezzoOfferto - caparra : null
  const tipoLabel    = immobileTipoLabel(proposal.immobile_tipo)

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── 1. HEADER ──────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.agencyName}>{agencyName}</Text>
            <Text style={styles.agencySubtitle}>Agenzia Immobiliare</Text>
          </View>
          <View>
            {agentName ? <Text style={styles.agencyContact}>{agentName}</Text> : null}
          </View>
        </View>

        {/* ── Title bar ──────────────────────────────────────────────── */}
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>PROPOSTA D'ACQUISTO IMMOBILIARE</Text>
          <View style={styles.titleBarMeta}>
            <Text style={styles.titleBarNumber}>N. {proposal.numero_proposta}</Text>
            <Text style={styles.titleBarDate}>{fmtDate(proposal.data_proposta)}</Text>
          </View>
        </View>

        {/* ── 2. PARTI ───────────────────────────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>Parti</Text>
        </View>
        <View style={styles.partiesBox}>
          {/* Proponente */}
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Proponente (Acquirente)</Text>
            <Text style={styles.partyName}>{proposal.proponente_nome}</Text>
            {proposal.proponente_codice_fiscale ? (
              <Text style={styles.partyDetail}>
                <Text style={styles.partyDetailLabel}>C.F.: </Text>
                {proposal.proponente_codice_fiscale}
              </Text>
            ) : null}
            {proposal.proponente_telefono ? (
              <Text style={styles.partyDetail}>
                <Text style={styles.partyDetailLabel}>Tel.: </Text>
                {proposal.proponente_telefono}
              </Text>
            ) : null}
            {proposal.proponente_email ? (
              <Text style={styles.partyDetail}>
                <Text style={styles.partyDetailLabel}>Email: </Text>
                {proposal.proponente_email}
              </Text>
            ) : null}
            {proposal.proponente_indirizzo ? (
              <Text style={styles.partyDetail}>
                <Text style={styles.partyDetailLabel}>Domicilio: </Text>
                {proposal.proponente_indirizzo}
              </Text>
            ) : null}
          </View>

          <View style={styles.partyDivider} />

          {/* Venditore */}
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Destinatario (Venditore)</Text>
            {proposal.proprietario_nome ? (
              <Text style={styles.partyName}>{proposal.proprietario_nome}</Text>
            ) : (
              <Text style={{ ...styles.partyDetail, fontFamily: 'Helvetica-Oblique' }}>
                (da compilare)
              </Text>
            )}
          </View>
        </View>

        {/* ── 3. IMMOBILE ────────────────────────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>2) Descrizione e Stato dell'Immobile</Text>
        </View>
        <View style={styles.propBox}>
          <View style={styles.propGrid}>
            <View style={styles.propCellWide}>
              <Text style={styles.propCellLabel}>Indirizzo</Text>
              <Text style={styles.propCellValue}>{proposal.immobile_indirizzo}</Text>
            </View>
            <View style={styles.propCell}>
              <Text style={styles.propCellLabel}>Città</Text>
              <Text style={styles.propCellValue}>{proposal.immobile_citta}</Text>
            </View>
            {tipoLabel ? (
              <View style={styles.propCell}>
                <Text style={styles.propCellLabel}>Tipologia</Text>
                <Text style={styles.propCellValue}>{tipoLabel}</Text>
              </View>
            ) : null}
            {proposal.prezzo_richiesto > 0 ? (
              <View style={styles.propCell}>
                <Text style={styles.propCellLabel}>Prezzo richiesto dal venditore</Text>
                <Text style={styles.propCellSubValue}>{fmtEur(proposal.prezzo_richiesto)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── 4. PREZZO E PAGAMENTO ──────────────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>1) Prezzo di Acquisto Offerto e Condizioni di Pagamento</Text>
        </View>
        <View style={styles.priceBox}>
          {/* Prezzo offerto */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prezzo offerto</Text>
            <Text style={styles.priceValue}>{fmtEur(prezzoOfferto)}</Text>
          </View>
          {/* Caparra */}
          {caparra != null && caparra > 0 ? (
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>
                  Caparra confirmatoria{proposal.caparra_in_gestione_agenzia ? '' : ''}
                </Text>
                {proposal.caparra_in_gestione_agenzia ? (
                  <Text style={styles.priceSubNote}>(in gestione all'Agenzia)</Text>
                ) : null}
              </View>
              <Text style={styles.priceValue}>{fmtEur(caparra)}</Text>
            </View>
          ) : null}
          {/* Saldo al rogito */}
          {saldo != null ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Saldo al rogito definitivo</Text>
              <Text style={styles.priceValue}>{fmtEur(saldo)}</Text>
            </View>
          ) : null}
          {/* Totale */}
          <View style={styles.priceRowLast}>
            <Text style={styles.priceLabelBold}>PREZZO TOTALE OFFERTO</Text>
            <Text style={styles.priceTotalValue}>{fmtEur(prezzoOfferto)}</Text>
          </View>
        </View>

        {/* ── 5. CONDIZIONI SOSPENSIVE ───────────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>Condizioni Sospensive</Text>
        </View>
        <View style={styles.vincoliBox}>
          {vincoli.length > 0 ? (
            vincoli.map((v, i) => (
              <View key={i} style={styles.vincoloItem}>
                <Text style={styles.vincoloBullet}>•</Text>
                <Text style={styles.vincoloText}>{vincoloText(v)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.vincoloNone}>Nessuna condizione sospensiva.</Text>
          )}
        </View>

        {/* ── 6. ATTO NOTARILE E CONSEGNA ───────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>3) Atto Notarile e Consegna dell'Immobile</Text>
        </View>
        <View style={styles.clauseBox}>
          <Text style={styles.clauseText}>
            {proposal.data_rogito_proposta
              ? `Il rogito definitivo sarà stipulato entro il ${fmtDate(proposal.data_rogito_proposta)}`
              : 'Il rogito definitivo sarà stipulato entro la data da concordarsi tra le parti'}
            {proposal.notaio_preferito
              ? ` presso il Notaio ${proposal.notaio_preferito}`
              : ' presso Notaio a scelta delle parti'}
            {". Tutte le spese relative all'acquisto (imposte, onorari notarili, ecc.) sono a carico dell'ACQUIRENTE, salvo quanto diversamente stabilito per legge. L'immobile verrà consegnato libero da persone e cose alla data del rogito, salvo diverso accordo scritto."}
          </Text>
        </View>

        {/* ── 7. IRREVOCABILITÀ ─────────────────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>4) Irrevocabilità della Proposta</Text>
        </View>
        <View style={styles.clauseBox}>
          <Text style={styles.clauseText}>
            La presente proposta è irrevocabile per <Text style={{ fontFamily: 'Helvetica-Bold' }}>15 GIORNI</Text> dal giorno della sua sottoscrizione, ovvero fino al{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmtDate(proposal.validita_proposta)}</Text>.
            Decorso tale termine senza accettazione da parte del VENDITORE, la proposta si intenderà priva di effetti e la caparra sarà restituita all'ACQUIRENTE.
          </Text>
        </View>

        {/* ── 8. ACCETTAZIONE ───────────────────────────────────────── */}
        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>5) Accettazione della Proposta</Text>
        </View>
        <View style={styles.clauseBox}>
          <Text style={styles.clauseText}>
            Ove il VENDITORE accetti la proposta entro i 15 giorni dalla sottoscrizione, l'affare si intenderà concluso e vincolante per entrambe le parti ai sensi degli artt. 1326 e seguenti c.c. Sarà onere dell'Agenzia darne tempestiva comunicazione scritta all'ACQUIRENTE. La presente proposta, unitamente alla comunicazione di accettazione, costituirà contratto preliminare vincolante.
          </Text>
        </View>

        <View style={styles.divider} />

        {/* ── 9. PRIVACY & ANTIRICICLAGGIO ──────────────────────────── */}
        <Text style={styles.clauseTextMuted}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Privacy: </Text>
          I dati personali forniti saranno trattati ai sensi del Reg. UE 2016/679 (GDPR) esclusivamente per le finalità connesse alla presente proposta e alla conclusione del contratto.{'  '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Antiriciclaggio: </Text>
          Il PROPONENTE dichiara di essere a conoscenza degli obblighi di cui al D.Lgs. 231/2007 e di aver ricevuto l'informativa al riguardo.
        </Text>

        {/* ── 10. MEDIAZIONE ────────────────────────────────────────── */}
        <Text style={{ ...styles.clauseTextMuted, marginTop: 4 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Incarico di Mediazione: </Text>
          Il PROPONENTE, con la sottoscrizione della presente, conferisce incarico di mediazione all'Agenzia{agencyName !== 'CasaAI' ? ` ${agencyName}` : ''}. La provvigione a carico dell'ACQUIRENTE maturerà al momento della conclusione dell'affare, nella misura concordata e comunicata dall'Agenzia. L'Agenzia ha messo in contatto le parti ai sensi degli artt. 1754 e ss. c.c.
        </Text>

        {/* ── Note aggiuntive ────────────────────────────────────────── */}
        {proposal.note ? (
          <>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>Note</Text>
            </View>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{proposal.note}</Text>
            </View>
          </>
        ) : null}

        {/* ── 11. FIRME ──────────────────────────────────────────────── */}
        <View style={styles.signatureSection}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>Firme</Text>
          </View>
          <View style={styles.signatureRow}>
            {/* Proponente */}
            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureRole}>Il Proponente</Text>
              <Text style={styles.signatureName}>{proposal.proponente_nome}</Text>
              <Text style={styles.signatureDate}>Data _______________</Text>
            </View>
            {/* Venditore */}
            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureRole}>Il Venditore</Text>
              <Text style={styles.signatureName}>{proposal.proprietario_nome || '_______________'}</Text>
              <Text style={styles.signatureDate}>Data _______________</Text>
            </View>
            {/* Agente */}
            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureRole}>L'Agente Immobiliare</Text>
              <Text style={styles.signatureName}>{agentName || '_______________'}</Text>
              <Text style={styles.signatureDate}>Data _______________</Text>
            </View>
          </View>
        </View>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{agencyName}</Text>
          <Text style={styles.footerText}>
            Proposta n. {proposal.numero_proposta} — {fmtDateShort(proposal.data_proposta)}
          </Text>
          <Text style={styles.footerText}>Generata con CasaAI</Text>
        </View>

      </Page>
    </Document>
  )
}

// ─── GET handler ───────────────────────────────────────────────────────────

// GET /api/proposals/[id]/pdf
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: proposal } = await (admin as any)
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposta non trovata' }, { status: 404 })

  try {
    const buffer = await renderToBuffer(<ProposalPdf proposal={proposal} />)
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Proposta-${proposal.numero_proposta}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Errore generazione PDF' }, { status: 500 })
  }
}
