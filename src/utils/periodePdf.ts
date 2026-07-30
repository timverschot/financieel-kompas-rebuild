import type { Categorie, Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import type { Vertaler } from '../i18n'
import { vandaag } from './datum'
import { veiligeBestandsnaam } from './download'
import { formatEuro } from './format'
import { bouwPeriodeOverzicht } from './periodeOverzicht'
import { LINKS, RECHTS, maakBlad } from './pdfBlad'

// Het maand- of jaarrapport als PDF.
//
// Wat er bewust WEL in staat: de kengetallen, de uitsplitsing per categorie als
// tabel, en de volledige boekingenlijst. Bij een jaarrapport ook de twaalf maanden
// naast elkaar, want dat is het cijfer waar een jaar over gaat.
//
// Wat er bewust NIET in staat: grafieken. Een donut of een staafgrafiek in een PDF
// is mooi op een scherm en waardeloos op papier zodra hij zwart-wit uit de printer
// komt — dan zijn de schijven niet meer van elkaar te onderscheiden. De cijfers
// staan er, en die kan je nalezen, doorsturen en natellen.
//
// Alle getallen komen uit `bouwPeriodeOverzicht`; dit bestand doet enkel de opmaak.

// De kolommen van de categorietabel, in mm van de linkerrand van het blad.
const KOL_AANDEEL = 150
const KOL_BEDRAG = RECHTS

// De kolommen van de boekingenlijst.
const KOL_DATUM = LINKS
const KOL_TEKST = LINKS + 22
const KOL_LIJST_BEDRAG = RECHTS

/** Het percentage van een categorie op het totaal, als "18%" of een streepje. */
function aandeelTekst(bedrag: number, totaal: number): string {
  if (totaal <= 0) return '-'
  return `${Math.round((bedrag / totaal) * 100)}%`
}

/**
 * Bouwt de PDF van één periode en biedt ze aan om te downloaden.
 *
 * `periode` is 'JJJJ-MM' voor een maand of 'JJJJ' voor een jaar.
 */
export async function exporteerPeriodePDF(
  t: Vertaler,
  periode: string,
  transacties: Transactie[],
  categorieen: Categorie[],
  rekeningen: Rekening[],
  overboekingen: Overboeking[] = [],
  waarderingen: Waardering[] = [],
  nu: Date = new Date(),
): Promise<void> {
  const o = bouwPeriodeOverzicht(periode, transacties, categorieen, rekeningen, overboekingen, waarderingen)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const blad = maakBlad(doc)

  // Kop van het blad
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(
    o.soort === 'jaar' ? t('Jaarrapport {periode}', { periode: o.label }) : t('Maandrapport {periode}', { periode: o.label }),
    LINKS,
    blad.positie(),
  )
  blad.verschuif(8)
  blad.regel(`${t('Opgemaakt op')}: ${vandaag(nu)}`)
  blad.regel(t('{n} boeking(en) in deze periode', { n: o.aantal }))

  // Kengetallen
  blad.kop(t('Kengetallen'))
  blad.labelWaarde(t('Inkomsten'), formatEuro(o.inkomsten))
  blad.labelWaarde(t('Uitgaven'), formatEuro(o.uitgaven))
  blad.labelWaarde(t('Netto'), formatEuro(o.netto), true)
  blad.labelWaarde(t('Saldo op {datum}', { datum: o.saldoDatum }), formatEuro(o.saldo))
  blad.alinea(
    t('Netto is inkomsten min uitgaven in deze periode. Het saldo is de stand van al je rekeningen samen op {datum}.', {
      datum: o.saldoDatum,
    }),
    { klein: true, grijs: true },
  )

  // Eén uitsplitsing als tabel: naam, aandeel in het totaal, bedrag.
  function tabel(titel: string, posten: { naam: string; bedrag: number }[], totaal: number) {
    if (posten.length === 0) return
    blad.kop(titel)
    blad.ruimte(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(t('Aandeel'), KOL_AANDEEL, blad.positie(), { align: 'right' })
    doc.text(t('Bedrag'), KOL_BEDRAG, blad.positie(), { align: 'right' })
    doc.setFont('helvetica', 'normal')
    blad.verschuif(5)
    doc.setFontSize(9.5)
    for (const p of posten) {
      // De naam mag doorlopen over meerdere regels in plaats van afgekapt te worden:
      // een lange eigen categorie verloor anders stil haar staart, en dan lijkt er
      // een woord te ontbreken in plaats van een regel.
      const naamDelen = doc.splitTextToSize(p.naam, KOL_AANDEEL - LINKS - 8) as string[]
      blad.ruimte(naamDelen.length * 5)
      const y = blad.positie()
      doc.text(aandeelTekst(p.bedrag, totaal), KOL_AANDEEL, y, { align: 'right' })
      doc.text(formatEuro(p.bedrag), KOL_BEDRAG, y, { align: 'right' })
      for (const deel of naamDelen) {
        doc.text(deel, LINKS, blad.positie())
        blad.verschuif(5)
      }
    }
    blad.labelWaarde(t('Totaal'), formatEuro(totaal), true)
  }

  tabel(t('Uitgaven per categorie'), o.perCategorieUitgaven, o.uitgaven)
  tabel(t('Inkomsten per categorie'), o.perCategorieInkomsten, o.inkomsten)
  blad.alinea(
    t('Een kassaticket dat over meerdere categorieën verdeeld is, staat hierboven per categorie apart — het totaal blijft daardoor gelijk aan de kengetallen.'),
    { klein: true, grijs: true },
  )

  // Bij een jaarrapport: de twaalf maanden naast elkaar.
  if (o.perMaand.length > 0) {
    blad.kop(t('Per maand'))
    blad.ruimte(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(t('Inkomsten'), 110, blad.positie(), { align: 'right' })
    doc.text(t('Uitgaven'), 150, blad.positie(), { align: 'right' })
    doc.text(t('Netto'), RECHTS, blad.positie(), { align: 'right' })
    doc.setFont('helvetica', 'normal')
    blad.verschuif(5)
    doc.setFontSize(9.5)
    for (const m of o.perMaand) {
      blad.ruimte(5)
      doc.text(m.label, LINKS, blad.positie())
      doc.text(formatEuro(m.inkomsten), 110, blad.positie(), { align: 'right' })
      doc.text(formatEuro(m.uitgaven), 150, blad.positie(), { align: 'right' })
      doc.text(formatEuro(m.netto), RECHTS, blad.positie(), { align: 'right' })
      blad.verschuif(5)
    }
  }

  // De boekingenlijst, chronologisch.
  blad.kop(t('Boekingen'))
  if (o.regels.length === 0) {
    blad.alinea(t('Er staan geen boekingen in deze periode.'), { grijs: true })
  }
  for (const r of o.regels) {
    // De meta-regel eronder: rekening, categorie, en bij een gesplitst ticket de
    // volledige uitsplitsing. Die uitsplitsing kan lang zijn, dus ze mag afbreken.
    const meta = [r.rekening, r.categorie].filter(Boolean).join(' · ')
    const metaDelen = [
      ...(meta ? (doc.splitTextToSize(meta, RECHTS - KOL_TEKST) as string[]) : []),
      ...(r.uitsplitsing ? (doc.splitTextToSize(r.uitsplitsing, RECHTS - KOL_TEKST) as string[]) : []),
    ]
    const titelDelen = doc.splitTextToSize(r.omschrijving || t('zonder omschrijving'), KOL_LIJST_BEDRAG - KOL_TEKST - 24) as string[]
    // De hele boeking in één keer plaatsen of naar het volgende blad: een regel
    // waarvan de meta-tekst op het volgende blad staat, leest als een andere boeking.
    blad.ruimte(titelDelen.length * 5 + metaDelen.length * 4 + 2)

    const eerste = blad.positie()
    doc.setFontSize(9.5)
    doc.text(r.datum, KOL_DATUM, eerste)
    for (const deel of titelDelen) {
      doc.text(deel, KOL_TEKST, blad.positie())
      blad.verschuif(5)
    }
    doc.text(formatEuro(r.bedrag), KOL_LIJST_BEDRAG, eerste, { align: 'right' })
    doc.setFontSize(8)
    doc.setTextColor(90)
    for (const deel of metaDelen) {
      doc.text(deel, KOL_TEKST, blad.positie())
      blad.verschuif(4)
    }
    doc.setTextColor(0)
    doc.setFontSize(9.5)
    blad.verschuif(1.5)
  }

  // De app-naam is een eigennaam en wordt niet vertaald.
  blad.voettekst(t, `Financieel Kompas — ${o.label}`)
  doc.save(`${o.soort === 'jaar' ? 'jaarrapport' : 'maandrapport'}-${veiligeBestandsnaam(o.periode)}.pdf`)
}
