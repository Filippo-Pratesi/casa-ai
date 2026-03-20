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
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: '2px solid #e05a30',
  },
  brandName: {
    fontSize: 22,
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
  invoiceTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    marginTop: 2,
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#f8f5f2',
    borderRadius: 6,
    padding: 12,
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color: '#555',
    marginBottom: 1.5,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    padding: '6px 8px',
    marginBottom: 2,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '1px solid #f0ebe6',
  },
  tableCell: {
    fontSize: 9,
    color: '#333',
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colAmount: { flex: 2, textAlign: 'right' },
  totalsBox: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 220,
    backgroundColor: '#f8f5f2',
    borderRadius: 6,
    padding: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: '#555',
  },
  totalsValue: {
    fontSize: 9,
    color: '#333',
  },
  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTop: '1.5px solid #e05a30',
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  totalsFinalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#e05a30',
  },
  paymentBox: {
    marginTop: 24,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    padding: 10,
    borderLeft: '3px solid #3b82f6',
  },
  paymentTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  paymentDetail: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 2,
  },
  notesBox: {
    marginTop: 16,
    padding: 10,
    borderRadius: 6,
    border: '1px solid #e8e0d8',
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#555',
    lineHeight: 1.4,
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
  regimeNote: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    borderLeft: '2px solid #f59e0b',
  },
  regimeNoteText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.4,
  },
})

function fmt(amount: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount / 100)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InvoicePdf({ invoice }: { invoice: Record<string, any> }) {
  const voci = (invoice.voci ?? []) as { descrizione: string; quantita: number; prezzo_unitario: number; importo: number }[]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{invoice.emittente_nome}</Text>
            <Text style={styles.brandSubtitle}>Agenzia Immobiliare</Text>
            {invoice.emittente_indirizzo && <Text style={{ ...styles.partyDetail, marginTop: 6 }}>{invoice.emittente_indirizzo}</Text>}
            {invoice.emittente_partita_iva && <Text style={styles.partyDetail}>P.IVA {invoice.emittente_partita_iva}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{invoice.document_type === 'nota_credito' ? 'NOTA DI CREDITO' : 'FATTURA'}</Text>
            <Text style={styles.invoiceNumber}>N. {invoice.numero_fattura}</Text>
            <Text style={{ ...styles.invoiceNumber, marginTop: 4 }}>
              {new Date(invoice.data_emissione).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>EMITTENTE</Text>
            <Text style={styles.partyName}>{invoice.emittente_nome}</Text>
            {invoice.emittente_indirizzo && <Text style={styles.partyDetail}>{invoice.emittente_indirizzo}</Text>}
            {invoice.emittente_partita_iva && <Text style={styles.partyDetail}>P.IVA: {invoice.emittente_partita_iva}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>DESTINATARIO</Text>
            <Text style={styles.partyName}>{invoice.cliente_nome}</Text>
            {invoice.cliente_indirizzo && <Text style={styles.partyDetail}>{invoice.cliente_indirizzo}</Text>}
            {invoice.cliente_citta && (
              <Text style={styles.partyDetail}>
                {invoice.cliente_cap ? `${invoice.cliente_cap} ` : ''}{invoice.cliente_citta}{invoice.cliente_provincia ? ` (${invoice.cliente_provincia})` : ''}
              </Text>
            )}
            {invoice.cliente_codice_fiscale && <Text style={styles.partyDetail}>C.F./P.IVA: {invoice.cliente_codice_fiscale}</Text>}
            {invoice.cliente_pec && <Text style={styles.partyDetail}>PEC: {invoice.cliente_pec}</Text>}
          </View>
        </View>

        {/* Line items */}
        <Text style={styles.sectionTitle}>Voci</Text>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, ...styles.colDesc }}>Descrizione</Text>
          <Text style={{ ...styles.tableHeaderCell, ...styles.colQty }}>Qt.</Text>
          <Text style={{ ...styles.tableHeaderCell, ...styles.colPrice }}>Prezzo unit.</Text>
          <Text style={{ ...styles.tableHeaderCell, ...styles.colAmount }}>Importo</Text>
        </View>
        {voci.map((v, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, ...styles.colDesc }}>{v.descrizione}</Text>
            <Text style={{ ...styles.tableCell, ...styles.colQty }}>{v.quantita}</Text>
            <Text style={{ ...styles.tableCell, ...styles.colPrice }}>{fmt(v.prezzo_unitario)}</Text>
            <Text style={{ ...styles.tableCell, ...styles.colAmount }}>{fmt(v.importo)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Imponibile</Text>
            <Text style={styles.totalsValue}>{fmt(invoice.imponibile)}</Text>
          </View>
          {invoice.contributo_cassa && invoice.importo_cassa > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Contributo cassa ({invoice.aliquota_cassa}%)</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.importo_cassa)}</Text>
            </View>
          )}
          {invoice.regime === 'ordinario' && invoice.importo_iva > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA ({invoice.aliquota_iva}%)</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.importo_iva)}</Text>
            </View>
          )}
          <View style={styles.totalsFinalRow}>
            <Text style={styles.totalsFinalLabel}>Totale documento</Text>
            <Text style={styles.totalsFinalValue}>{fmt(invoice.totale_documento)}</Text>
          </View>
          {invoice.ritenuta_acconto && invoice.importo_ritenuta > 0 && (
            <>
              <View style={{ ...styles.totalsRow, marginTop: 6 }}>
                <Text style={styles.totalsLabel}>Ritenuta d'acconto ({invoice.aliquota_ritenuta}%)</Text>
                <Text style={styles.totalsValue}>- {fmt(invoice.importo_ritenuta)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={{ ...styles.totalsLabel, fontFamily: 'Helvetica-Bold' }}>Netto a pagare</Text>
                <Text style={{ ...styles.totalsValue, fontFamily: 'Helvetica-Bold' }}>{fmt(invoice.netto_a_pagare)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Regime note */}
        {invoice.regime === 'forfettario' && (
          <View style={styles.regimeNote}>
            <Text style={styles.regimeNoteText}>
              Operazione in franchigia IVA ai sensi dell'art. 1, commi 54-89, L. 190/2014. Non assoggettata a ritenuta d'acconto ai sensi dell'art. 1, c. 67, L. 190/2014.
            </Text>
          </View>
        )}
        {invoice.regime === 'esente' && (
          <View style={styles.regimeNote}>
            <Text style={styles.regimeNoteText}>
              Operazione esente da IVA ai sensi dell'art. 10, n. 8-ter, DPR 633/72.
            </Text>
          </View>
        )}

        {/* Payment */}
        {invoice.metodo_pagamento && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>DATI DI PAGAMENTO</Text>
            <Text style={styles.paymentDetail}>
              Modalità: {invoice.metodo_pagamento === 'bonifico' ? 'Bonifico bancario' : invoice.metodo_pagamento.charAt(0).toUpperCase() + invoice.metodo_pagamento.slice(1)}
            </Text>
            {invoice.iban && <Text style={styles.paymentDetail}>IBAN: {invoice.iban}</Text>}
            {invoice.data_scadenza && (
              <Text style={styles.paymentDetail}>
                Scadenza: {new Date(invoice.data_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
            )}
          </View>
        )}

        {/* Notes */}
        {invoice.note && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>NOTE</Text>
            <Text style={styles.notesText}>{invoice.note}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{invoice.emittente_nome}</Text>
          <Text style={styles.footerText}>{invoice.document_type === 'nota_credito' ? 'Nota di credito' : 'Fattura'} n. {invoice.numero_fattura} — {new Date(invoice.data_emissione).toLocaleDateString('it-IT')}</Text>
          <Text style={styles.footerText}>Generata con CasaAI</Text>
        </View>
      </Page>
    </Document>
  )
}

// GET /api/invoices/[id]/pdf
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
  const { data: invoice } = await (admin as any)
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })

  try {
    const buffer = await renderToBuffer(<InvoicePdf invoice={invoice} />)
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Fattura-${invoice.numero_fattura}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Errore generazione PDF' }, { status: 500 })
  }
}
