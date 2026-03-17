import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', padding: 48, fontSize: 10, color: '#222222' },
  header: { marginBottom: 24, borderBottom: '2pt solid #111111', paddingBottom: 12 },
  agency: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#111111' },
  subtitle: { fontSize: 10, color: '#666666' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#111111', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { lineHeight: 1.6, color: '#333333' },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 9, color: '#888888', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  fieldValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  signatureBox: { marginTop: 32, borderTop: '1pt solid #cccccc', paddingTop: 16, flexDirection: 'row', gap: 40 },
  sigLine: { flex: 1, borderBottom: '1pt solid #cccccc', paddingBottom: 4, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: '#aaaaaa' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTop: '1pt solid #eeeeee', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#aaaaaa' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  checkbox: { width: 10, height: 10, border: '1pt solid #333333', marginTop: 1 },
  checkText: { flex: 1, lineHeight: 1.5 },
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, workspaces(name)')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; workspaces: { name: string } | null } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactData } = await (admin as any)
    .from('contacts')
    .select('name, email, phone, city_of_residence, address_of_residence, privacy_consent, privacy_consent_date, date_of_birth')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!contactData) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })

  const contact = contactData as {
    name: string; email: string | null; phone: string | null
    city_of_residence: string | null; address_of_residence: string | null
    privacy_consent: boolean; privacy_consent_date: string | null
    date_of_birth: string | null
  }

  const agencyName = profile.workspaces?.name ?? 'Agenzia Immobiliare'
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agency}>{agencyName}</Text>
          <Text style={styles.title}>Modulo di Consenso al Trattamento dei Dati Personali</Text>
          <Text style={styles.subtitle}>Ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dati del Cliente</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome e Cognome</Text>
                <Text style={styles.fieldValue}>{contact.name}</Text>
              </View>
              {contact.date_of_birth && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Data di nascita</Text>
                  <Text style={styles.fieldValue}>{new Date(contact.date_of_birth).toLocaleDateString('it-IT')}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              {contact.phone && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Telefono</Text>
                  <Text style={styles.fieldValue}>{contact.phone}</Text>
                </View>
              )}
              {contact.email && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <Text style={styles.fieldValue}>{contact.email}</Text>
                </View>
              )}
            </View>
          </View>
          {(contact.address_of_residence || contact.city_of_residence) && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Indirizzo di residenza</Text>
              <Text style={styles.fieldValue}>
                {[contact.address_of_residence, contact.city_of_residence].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informativa Privacy</Text>
          <Text style={styles.body}>
            Il Titolare del trattamento è {agencyName}. I dati personali da Lei forniti saranno
            trattati per le seguenti finalità:{'\n\n'}
            • Gestione del rapporto professionale e delle attività di intermediazione immobiliare{'\n'}
            • Adempimento degli obblighi contrattuali e pre-contrattuali{'\n'}
            • Comunicazioni di marketing relative a nuovi immobili e offerte (solo previo consenso specifico){'\n'}
            • Adempimento di obblighi di legge{'\n\n'}
            I dati saranno conservati per il tempo strettamente necessario alle finalità sopra indicate e
            comunque per non oltre 10 anni dalla conclusione del rapporto. Lei ha il diritto di accedere,
            rettificare, cancellare i propri dati e di opporsi al loro trattamento in qualsiasi momento.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dichiarazioni di Consenso</Text>

          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Consenso obbligatorio — </Text>
              Acconsento al trattamento dei miei dati personali per la gestione del rapporto di
              intermediazione immobiliare e per l&apos;adempimento degli obblighi contrattuali.
            </Text>
          </View>

          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Consenso marketing (facoltativo) — </Text>
              Acconsento a ricevere comunicazioni commerciali relative a nuovi immobili, offerte e
              aggiornamenti del mercato immobiliare da parte di {agencyName}.
            </Text>
          </View>

          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Cessione a terzi (facoltativo) — </Text>
              Acconsento alla comunicazione dei miei dati personali a soggetti terzi per finalità di
              marketing e per proposte immobiliari da parte di agenzie partner.
            </Text>
          </View>
        </View>

        {contact.privacy_consent && contact.privacy_consent_date && (
          <View style={{ marginBottom: 16, padding: 10, backgroundColor: '#f0fdf4', border: '1pt solid #bbf7d0', borderRadius: 4 }}>
            <Text style={{ fontSize: 10, color: '#166534', fontFamily: 'Helvetica-Bold' }}>
              ✓ Consenso già registrato il {new Date(contact.privacy_consent_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}

        <View style={styles.signatureBox}>
          <View style={{ flex: 1 }}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Luogo e Data</Text>
            <Text style={{ fontSize: 9, color: '#666666', marginTop: 4 }}>{today}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Firma del Cliente</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{agencyName} — Modulo Privacy GDPR</Text>
          <Text style={styles.footerText}>Generato il {today}</Text>
        </View>
      </Page>
    </Document>
  )

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="privacy-${contact.name.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
