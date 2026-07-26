import type { Categorie, Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { bouwAfrekeningOverzicht, type AfrekeningGroep } from './afrekeningOverzicht'
import {
  groepLabel,
  kinderenTekst,
  periodeTekst,
  regelMeta,
  saldoLegende,
  totaalRegels,
  verdeelsleutelTekst,
  verrekenTekst,
} from './afrekeningTekst'
import { formatEuro } from './format'
import { vandaag } from './datum'

// Maatvoering van het blad (A4, in mm). Alles staat hier bij elkaar, zodat de
// marges op één plek te wijzigen zijn.
const LINKS = 20
const RECHTS = 190
const ONDERGRENS = 272 // vanaf hier begint een nieuwe pagina (voettekst op 285)
const KOL_TOTAAL = 118
const KOL_JIJ = 142
const KOL_PARTNER = 166
const KOL_SALDO = RECHTS

// Genereert een PDF van een afrekening en biedt ze aan om te downloaden. Alle
// cijfers komen uit bouwAfrekeningOverzicht(); dit bestand doet enkel de opmaak.
// jsPDF wordt lazy geïmporteerd, zodat de bibliotheek de app-start niet belast.
export async function exporteerAfrekeningPDF(
  t: Vertaler,
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
  gebruikerCategorieen: Categorie[] = [],
  nu: Date = new Date(),
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const o = bouwAfrekeningOverzicht(dossier, afrekening, kosten, kinderen, gebruikerCategorieen)
  const opmaakdatum = vandaag(nu)

  let y = 20

  // Zorgt dat er nog 'hoogte' mm plaats is; anders begint een nieuw blad. Een
  // afrekening over een heel jaar past niet op één blad, dus dit wordt vóór
  // elke regel gecontroleerd.
  function ruimte(hoogte: number) {
    if (y + hoogte > ONDERGRENS) {
      doc.addPage()
      y = 20
    }
  }

  function kop(tekst: string) {
    ruimte(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(tekst, LINKS, y)
    y += 2
    doc.setDrawColor(150)
    doc.setLineWidth(0.2)
    doc.line(LINKS, y, RECHTS, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
  }

  // Eén regel met een label links en een bedrag rechts uitgelijnd.
  function labelWaarde(label: string, waarde: string, vet = false) {
    ruimte(6)
    doc.setFont('helvetica', vet ? 'bold' : 'normal')
    doc.setFontSize(9.5)
    doc.text(label, LINKS, y)
    doc.text(waarde, RECHTS, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 5.5
  }

  // Kop van het blad
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(t('Afrekening — {naam}', { naam: o.dossierNaam }), LINKS, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  for (const regel of [
    `${t('Periode')}: ${periodeTekst(t, o)}`,
    `${t('Kinderen')}: ${kinderenTekst(t, o)}`,
    `${t('Datum')}: ${o.datum}`,
  ]) {
    doc.text(regel, LINKS, y)
    y += 5
  }

  // Verdeelsleutels
  if (o.verdeelsleutels.length > 0) {
    kop(t('Verdeelsleutel'))
    for (const s of o.verdeelsleutels) {
      const stukken = doc.splitTextToSize(verdeelsleutelTekst(t, s), RECHTS - LINKS - 4) as string[]
      ruimte(stukken.length * 5)
      for (const [i, deel] of stukken.entries()) {
        doc.text(i === 0 ? `• ${deel}` : `  ${deel}`, LINKS, y)
        y += 5
      }
    }
  }

  // Totalen en het saldo in klare taal
  kop(t('Totalen'))
  for (const { label, waarde } of totaalRegels(t, o)) labelWaarde(label, waarde)
  ruimte(10)
  y += 1
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(verrekenTekst(t, o.netto), LINKS, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  y += 6
  if (o.wijktAf) {
    const waarschuwing = doc.splitTextToSize(
      t('Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.', {
        bedrag: formatEuro(o.bewaardNetto),
      }),
      RECHTS - LINKS,
    ) as string[]
    ruimte(waarschuwing.length * 5)
    for (const deel of waarschuwing) {
      doc.text(deel, LINKS, y)
      y += 5
    }
  }

  // Eén uitsplitsing als tabel met rechts uitgelijnde bedragen.
  let eersteTabel = true
  function tabel(titel: string, groepen: AfrekeningGroep[]) {
    if (groepen.length === 0) return
    kop(titel)
    if (eersteTabel) {
      eersteTabel = false
      doc.setFontSize(8)
      doc.setTextColor(90)
      ruimte(5)
      doc.text(saldoLegende(t), LINKS, y)
      doc.setTextColor(0)
      y += 5
    }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    ruimte(6)
    doc.text(t('Totaal'), KOL_TOTAAL, y, { align: 'right' })
    doc.text(t('Jij'), KOL_JIJ, y, { align: 'right' })
    doc.text(t('Partner'), KOL_PARTNER, y, { align: 'right' })
    doc.text(t('Saldo'), KOL_SALDO, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 5
    doc.setFontSize(9.5)
    for (const g of groepen) {
      ruimte(6)
      const naam = (doc.splitTextToSize(groepLabel(t, g), KOL_TOTAAL - LINKS - 6) as string[])[0]
      doc.text(naam, LINKS, y)
      doc.text(formatEuro(g.totaal), KOL_TOTAAL, y, { align: 'right' })
      doc.text(formatEuro(g.jouwAandeel), KOL_JIJ, y, { align: 'right' })
      doc.text(formatEuro(g.partnerAandeel), KOL_PARTNER, y, { align: 'right' })
      doc.text(formatEuro(g.netto), KOL_SALDO, y, { align: 'right' })
      y += 5
    }
  }

  tabel(t('Per kind'), o.perKind)
  tabel(t('Per categorie'), o.perCategorie)
  tabel(t('Per kostensoort'), o.perKostensoort)

  // Detail: elke kost navolgbaar, met een tweede regel die de rij uitlegt.
  if (o.regels.length > 0) {
    kop(t('Detail'))
    for (const regel of o.regels) {
      const titel = doc.splitTextToSize(`${regel.datum}  ${regel.omschrijving}`, KOL_TOTAAL - LINKS) as string[]
      const meta = regelMeta(t, regel).flatMap((deel) => doc.splitTextToSize(deel, RECHTS - LINKS - 4) as string[])
      ruimte(titel.length * 5 + meta.length * 4 + 2)
      const eersteRegel = y
      for (const deel of titel) {
        doc.text(deel, LINKS, y)
        y += 5
      }
      doc.text(formatEuro(regel.bedrag), RECHTS, eersteRegel, { align: 'right' })
      doc.setFontSize(8)
      doc.setTextColor(90)
      for (const deel of meta) {
        doc.text(deel, LINKS + 4, y)
        y += 4
      }
      doc.setTextColor(0)
      doc.setFontSize(9.5)
      y += 1.5
    }
  }

  // Voettekst op elk blad: wanneer het stuk is opgemaakt en welk blad het is.
  const bladen = doc.getNumberOfPages()
  for (let blad = 1; blad <= bladen; blad++) {
    doc.setPage(blad)
    doc.setFontSize(8)
    doc.setTextColor(110)
    doc.text(`${o.dossierNaam} — ${t('Opgemaakt op')}: ${opmaakdatum}`, LINKS, 285)
    doc.text(t('blad {n} van {totaal}', { n: blad, totaal: bladen }), RECHTS, 285, { align: 'right' })
    doc.setTextColor(0)
  }

  const veiligeNaam = o.dossierNaam.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`afrekening-${veiligeNaam}-${o.datum}.pdf`)
}
