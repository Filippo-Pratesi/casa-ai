import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// Map regime → codice regime fiscale SDI
function regimeFiscale(regime: string): string {
  switch (regime) {
    case 'forfettario': return 'RF19'
    case 'esente': return 'RF06'
    default: return 'RF01' // ordinario
  }
}

// Map document_type → tipo documento SDI
function tipoDocumento(docType: string): string {
  return docType === 'nota_credito' ? 'TD04' : 'TD01'
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fmtDate(d: string): string {
  // Returns YYYY-MM-DD
  return d.split('T')[0]
}

function fmtAmount(n: number): string {
  return n.toFixed(2)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildXml(invoice: Record<string, any>): string {
  const voci = (invoice.voci ?? []) as {
    descrizione: string
    quantita: number
    prezzo_unitario: number
    importo: number
  }[]

  const aliquotaIva = invoice.regime === 'ordinario' ? (invoice.aliquota_iva ?? 22) : 0
  const naturaIva = invoice.regime === 'ordinario' ? '' : invoice.regime === 'forfettario' ? 'N2.2' : 'N4'

  const dettaglioLinee = voci.map((v, i) => `
    <DettaglioLinee>
      <NumeroLinea>${i + 1}</NumeroLinea>
      <Descrizione>${esc(v.descrizione)}</Descrizione>
      <Quantita>${fmtAmount(v.quantita)}</Quantita>
      <PrezzoUnitario>${fmtAmount(v.prezzo_unitario)}</PrezzoUnitario>
      <PrezzoTotale>${fmtAmount(v.importo)}</PrezzoTotale>
      <AliquotaIVA>${fmtAmount(aliquotaIva)}</AliquotaIVA>
      ${naturaIva ? `<Natura>${naturaIva}</Natura>` : ''}
    </DettaglioLinee>`).join('')

  const riepilogoIva = `
    <DatiRiepilogo>
      <AliquotaIVA>${fmtAmount(aliquotaIva)}</AliquotaIVA>
      ${naturaIva ? `<Natura>${naturaIva}</Natura>` : ''}
      <ImponibileImporto>${fmtAmount(invoice.imponibile)}</ImponibileImporto>
      <Imposta>${fmtAmount(invoice.importo_iva ?? 0)}</Imposta>
      <EsigibilitaIVA>I</EsigibilitaIVA>
    </DatiRiepilogo>`

  const ritenuta = invoice.ritenuta_acconto && invoice.importo_ritenuta > 0
    ? `
    <DatiRitenuta>
      <TipoRitenuta>RT01</TipoRitenuta>
      <ImportoRitenuta>${fmtAmount(invoice.importo_ritenuta)}</ImportoRitenuta>
      <AliquotaRitenuta>${fmtAmount(invoice.aliquota_ritenuta ?? 20)}</AliquotaRitenuta>
      <CausalePagamento>A</CausalePagamento>
    </DatiRitenuta>` : ''

  const causaRitenuta = invoice.ritenuta_acconto && invoice.importo_ritenuta > 0
    ? '<SoggettoARitenuta>SI</SoggettoARitenuta>' : ''

  const modalitaPagamento = invoice.metodo_pagamento === 'bonifico' ? 'MP05'
    : invoice.metodo_pagamento === 'contanti' ? 'MP01'
    : invoice.metodo_pagamento === 'assegno' ? 'MP02'
    : 'MP05'

  const datiPagamento = `
  <DatiPagamento>
    <CondizioniPagamento>TP02</CondizioniPagamento>
    <DettaglioPagamento>
      <ModalitaPagamento>${modalitaPagamento}</ModalitaPagamento>
      ${invoice.data_scadenza ? `<DataScadenzaPagamento>${fmtDate(invoice.data_scadenza)}</DataScadenzaPagamento>` : ''}
      <ImportoPagamento>${fmtAmount(invoice.netto_a_pagare ?? invoice.totale_documento)}</ImportoPagamento>
      ${invoice.iban ? `<IBAN>${esc(invoice.iban)}</IBAN>` : ''}
    </DettaglioPagamento>
  </DatiPagamento>`

  const codiceDestinatario = invoice.cliente_codice_sdi
    ? `<CodiceDestinatario>${esc(invoice.cliente_codice_sdi)}</CodiceDestinatario>`
    : '<CodiceDestinatario>0000000</CodiceDestinatario>'

  const pecDestinatario = invoice.cliente_pec
    ? `<PECDestinatario>${esc(invoice.cliente_pec)}</PECDestinatario>` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPA12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${esc(invoice.emittente_partita_iva ?? invoice.emittente_codice_fiscale ?? '00000000000')}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${String(invoice.progressivo).padStart(5, '0')}</ProgressivoInvio>
      <FormatoTrasmissione>FPA12</FormatoTrasmissione>
      ${codiceDestinatario}
      ${pecDestinatario}
    </DatiTrasmissione>

    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${esc(invoice.emittente_partita_iva ?? '00000000000')}</IdCodice>
        </IdFiscaleIVA>
        ${invoice.emittente_codice_fiscale ? `<CodiceFiscale>${esc(invoice.emittente_codice_fiscale)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${esc(invoice.emittente_nome)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${regimeFiscale(invoice.regime)}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(invoice.emittente_indirizzo ?? 'N/D')}</Indirizzo>
        <CAP>${esc(invoice.emittente_cap ?? '00000')}</CAP>
        <Comune>${esc(invoice.emittente_citta ?? 'N/D')}</Comune>
        ${invoice.emittente_provincia ? `<Provincia>${esc(invoice.emittente_provincia)}</Provincia>` : ''}
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>

    <CessionarioCommittente>
      <DatiAnagrafici>
        ${invoice.cliente_codice_fiscale ? `<CodiceFiscale>${esc(invoice.cliente_codice_fiscale)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${esc(invoice.cliente_nome)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(invoice.cliente_indirizzo ?? 'N/D')}</Indirizzo>
        <CAP>${esc(invoice.cliente_cap ?? '00000')}</CAP>
        <Comune>${esc(invoice.cliente_citta ?? 'N/D')}</Comune>
        ${invoice.cliente_provincia ? `<Provincia>${esc(invoice.cliente_provincia)}</Provincia>` : ''}
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>

  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${tipoDocumento(invoice.document_type ?? 'fattura')}</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${fmtDate(invoice.data_emissione)}</Data>
        <Numero>${esc(invoice.numero_fattura)}</Numero>
        ${ritenuta}
        ${causaRitenuta}
        ${invoice.regime === 'forfettario' ? `<Art73>SI</Art73>` : ''}
      </DatiGeneraliDocumento>
    </DatiGenerali>

    <DatiBeniServizi>
      ${dettaglioLinee}
      ${riepilogoIva}
    </DatiBeniServizi>

    ${datiPagamento}
  </FatturaElettronicaBody>
</p:FatturaElettronica>`
}

// GET /api/invoices/[id]/xml
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
    const xml = buildXml(invoice)
    const filename = `FatturaPA_${invoice.numero_fattura.replace(/[^A-Za-z0-9_-]/g, '_')}.xml`
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Errore generazione XML' }, { status: 500 })
  }
}
