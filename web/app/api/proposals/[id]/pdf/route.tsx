import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

type Params = { params: Promise<{ id: string }> }

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    padding: 48,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingBottom: 18,
    borderBottom: '2px solid #e05a30',
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#e05a30',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 8,
    color: '#888',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  docNumber: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f8f5f2',
    borderRadius: 5,
    padding: 10,
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  infoDetail: {
    fontSize: 8.5,
    color: '#555',
    marginBottom: 1.5,
  },
  highlightBox: {
    backgroundColor: '#fff8f5',
    borderRadius: 6,
    padding: 14,
    borderLeft: '3px solid #e05a30',
    marginTop: 12,
  },
  highlightTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#c0472a',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  highlightLabel: {
    fontSize: 9,
    color: '#555',
  },
  highlightValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  bigPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 6,
    borderTop: '1px solid #e8d8d0',
  },
  bigPriceLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  bigPriceValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#e05a30',
  },
  vincoliBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    border: '1px solid #e8e0d8',
  },
  vincoloItem: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  vincoloBullet: {
    fontSize: 9,
    color: '#e05a30',
    width: 10,
  },
  vincoloText: {
    fontSize: 9,
    color: '#333',
    flex: 1,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  dateBox: {
    flex: 1,
    backgroundColor: '#f0f7ff',
    borderRadius: 5,
    padding: 8,
    borderLeft: '2px solid #3b82f6',
  },
  dateLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 9,
    color: '#1e3a8a',
    fontFamily: 'Helvetica-Bold',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 20,
  },
  signatureBox: {
    flex: 1,
    borderTop: '1px solid #999',
    paddingTop: 6,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#888',
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 9,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e8e0d8',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: '#aaa',
  },
  legalNote: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    borderLeft: '2px solid #f59e0b',
  },
  legalNoteText: {
    fontSize: 7.5,
    color: '#78350f',
    lineHeight: 1.5,
  },
})

function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', opts ?? { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtEur(n: number | null | undefined) {
  if (!n) return '€ 0'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const vincoloLabels: Record<string, string> = {
  mutuo: 'Soggetta alla concessione del mutuo',
  vendita_immobile: "Soggetta alla vendita dell'immobile del proponente",
  perizia: 'Soggetta a perizia bancaria positiva',
  personalizzata: 'Condizione personalizzata',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProposalPdf({ proposal }: { proposal: Record<string, any> }) {
  const vincoli = (proposal.vincoli ?? []) as { tipo: string; descrizione?: string; importo_mutuo?: number; nome_banca?: string; indirizzo_immobile_vendita?: string }[]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{proposal.agente_agenzia || 'CasaAI'}</Text>
            <Text style={styles.brandSubtitle}>Agenzia Immobiliare · Proposta d'acquisto</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>PROPOSTA D'ACQUISTO</Text>
            <Text style={styles.docNumber}>N. {proposal.numero_proposta}</Text>
            <Text style={{ ...styles.docNumber, marginTop: 4 }}>
              {fmtDate(proposal.data_proposta)}
            </Text>
          </View>
        </View>

        {/* Parties */}
        <Text style={styles.sectionTitle}>Parti</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Proponente (Acquirente)</Text>
            <Text style={styles.infoValue}>{proposal.proponente_nome}</Text>
            {proposal.proponente_codice_fiscale && <Text style={styles.infoDetail}>C.F.: {proposal.proponente_codice_fiscale}</Text>}
            {proposal.proponente_telefono && <Text style={styles.infoDetail}>Tel: {proposal.proponente_telefono}</Text>}
            {proposal.proponente_email && <Text style={styles.infoDetail}>Email: {proposal.proponente_email}</Text>}
          </View>
          {proposal.proprietario_nome && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Proprietario (Venditore)</Text>
              <Text style={styles.infoValue}>{proposal.proprietario_nome}</Text>
            </View>
          )}
        </View>

        {/* Property */}
        <Text style={styles.sectionTitle}>Immobile oggetto della proposta</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoValue}>{proposal.immobile_indirizzo}</Text>
          <Text style={styles.infoDetail}>{proposal.immobile_citta}</Text>
          {proposal.immobile_tipo && (
            <Text style={styles.infoDetail}>
              Tipologia: {proposal.immobile_tipo.charAt(0).toUpperCase() + proposal.immobile_tipo.slice(1)}
            </Text>
          )}
          {proposal.prezzo_richiesto > 0 && (
            <Text style={styles.infoDetail}>Prezzo richiesto: {fmtEur(proposal.prezzo_richiesto)}</Text>
          )}
        </View>

        {/* Offer */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>OFFERTA ECONOMICA</Text>
          <View style={styles.highlightRow}>
            <Text style={styles.highlightLabel}>Prezzo offerto</Text>
            <Text style={styles.highlightValue}>{fmtEur(proposal.prezzo_offerto)}</Text>
          </View>
          {proposal.caparra_confirmatoria > 0 && (
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>
                Caparra confirmatoria{proposal.caparra_in_gestione_agenzia ? ' (in gestione agenzia)' : ''}
              </Text>
              <Text style={styles.highlightValue}>{fmtEur(proposal.caparra_confirmatoria)}</Text>
            </View>
          )}
          <View style={styles.bigPriceRow}>
            <Text style={styles.bigPriceLabel}>PREZZO TOTALE OFFERTO</Text>
            <Text style={styles.bigPriceValue}>{fmtEur(proposal.prezzo_offerto)}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Data proposta</Text>
            <Text style={styles.dateValue}>{fmtDate(proposal.data_proposta)}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Validità fino al</Text>
            <Text style={styles.dateValue}>{fmtDate(proposal.validita_proposta)}</Text>
          </View>
          {proposal.data_rogito_proposta && (
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Rogito entro il</Text>
              <Text style={styles.dateValue}>{fmtDate(proposal.data_rogito_proposta)}</Text>
            </View>
          )}
        </View>

        {/* Conditions */}
        {vincoli.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Condizioni sospensive</Text>
            <View style={styles.vincoliBox}>
              {vincoli.map((v, i) => {
                let detail = vincoloLabels[v.tipo] ?? v.tipo
                if (v.tipo === 'mutuo' && v.importo_mutuo) detail += ` di ${fmtEur(v.importo_mutuo)}`
                if (v.tipo === 'mutuo' && v.nome_banca) detail += ` presso ${v.nome_banca}`
                if (v.tipo === 'vendita_immobile' && v.indirizzo_immobile_vendita) detail += ` sito in ${v.indirizzo_immobile_vendita}`
                if (v.tipo === 'personalizzata' && v.descrizione) detail = v.descrizione
                return (
                  <View key={i} style={styles.vincoloItem}>
                    <Text style={styles.vincoloBullet}>•</Text>
                    <Text style={styles.vincoloText}>{detail}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Notary */}
        {proposal.notaio_preferito && (
          <>
            <Text style={styles.sectionTitle}>Notaio</Text>
            <Text style={styles.infoDetail}>{proposal.notaio_preferito}</Text>
          </>
        )}

        {/* Notes */}
        {proposal.note && (
          <>
            <Text style={styles.sectionTitle}>Note</Text>
            <View style={styles.vincoliBox}>
              <Text style={styles.vincoloText}>{proposal.note}</Text>
            </View>
          </>
        )}

        {/* Legal note */}
        <View style={styles.legalNote}>
          <Text style={styles.legalNoteText}>
            La presente proposta d'acquisto, una volta accettata dal venditore nei termini indicati, costituirà impegno contrattuale preliminare vincolante per entrambe le parti. L'acquirente si impegna a versare la caparra confirmatoria entro i termini stabiliti.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Firma del Proponente</Text>
            <Text style={styles.signatureName}>{proposal.proponente_nome}</Text>
          </View>
          {proposal.proprietario_nome && (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Firma del Proprietario / Venditore</Text>
              <Text style={styles.signatureName}>{proposal.proprietario_nome}</Text>
            </View>
          )}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Agente Immobiliare</Text>
            <Text style={styles.signatureName}>{proposal.agente_nome}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{proposal.agente_agenzia}</Text>
          <Text style={styles.footerText}>Proposta n. {proposal.numero_proposta} — {fmtDate(proposal.data_proposta, { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
          <Text style={styles.footerText}>Generata con CasaAI</Text>
        </View>
      </Page>
    </Document>
  )
}

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
    return new NextResponse(buffer, {
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
