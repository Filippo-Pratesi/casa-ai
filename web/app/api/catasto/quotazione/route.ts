import { NextRequest, NextResponse } from 'next/server'
import { getValuation } from '@/lib/omi-valuation'

// GET /api/catasto/quotazione?codice_comune=E327&zona_omi=B1&tipo_immobile=apartment&sqm=80
export async function GET(req: NextRequest) {
  const codice_comune = req.nextUrl.searchParams.get('codice_comune')
  const zona_omi = req.nextUrl.searchParams.get('zona_omi')
  const tipo_immobile = req.nextUrl.searchParams.get('tipo_immobile')
  const sqmStr = req.nextUrl.searchParams.get('sqm')
  const stato_conservazione = req.nextUrl.searchParams.get('stato_conservazione') ?? undefined
  const operazione = (req.nextUrl.searchParams.get('operazione') as 'acquisto' | 'affitto') ?? 'acquisto'

  if (!codice_comune || !zona_omi || !tipo_immobile || !sqmStr) {
    return NextResponse.json(
      { error: 'Parametri obbligatori: codice_comune, zona_omi, tipo_immobile, sqm' },
      { status: 400 }
    )
  }

  const sqm = parseFloat(sqmStr)
  if (isNaN(sqm) || sqm <= 0 || sqm > 10000) {
    return NextResponse.json(
      { error: 'Superficie non valida (deve essere tra 1 e 10.000 mq)' },
      { status: 400 }
    )
  }

  const { data, error } = await getValuation({
    codice_comune,
    zona_omi,
    tipo_immobile,
    sqm,
    stato_conservazione,
    operazione,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 502 })
  }

  if (!data) {
    return NextResponse.json({
      data: null,
      message: 'Nessuna quotazione disponibile per questa combinazione. Carica il CSV OMI nelle impostazioni per dati piu completi.',
    })
  }

  return NextResponse.json({ data })
}
