import type { Categorie, Dossier, DossierDocument, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { bouwAfrekeningOverzicht, type AfrekeningGroep } from './afrekeningOverzicht'
import {
  groepLabel,
  heeftEenBon,
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
import { veiligeBestandsnaam } from './download'
import { laadJsPdf, LINKS, maakBlad, RECHTS } from './pdfBlad'

// De kolommen van een uitsplitsingstabel. De maatvoering van het blad zelf staat
// sinds ronde 41 in `pdfBlad.ts`, samen met de paginabreuk en de voettekst — die
// werden door drie documenten gebruikt en hoorden dus niet meer hier.
const KOL_TOTAAL = 118
const KOL_JIJ = 142
const KOL_PARTNER = 166
const KOL_SALDO = RECHTS

// Genereert een PDF van een afrekening en biedt ze aan om te downloaden. Alle
// cijfers komen uit bouwAfrekeningOverzicht(); dit bestand doet enkel de opmaak.
// jsPDF wordt lazy geïmporteerd, zodat de bibliotheek de app-start niet belast.
//
// Dit is de SAMENVATTING van een afrekening. Wie het volledige dossier nodig heeft
// — met per kost de berekening en de bonnen als bijlage — gebruikt de bewijsmap
// (`bewijsmapPdf.ts`).
export async function exporteerAfrekeningPDF(
  t: Vertaler,
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
  gebruikerCategorieen: Categorie[] = [],
  nu: Date = new Date(),
  // De documentkluis: zonder deze lijst zegt dit document "geen bon" bij een kost
  // waarvan de bon aan de transactie hangt, terwijl de bewijsmap hem wél vindt. Twee
  // documenten over dezelfde afrekening die elkaar tegenspreken.
  documenten: DossierDocument[] = [],
): Promise<void> {
  const { jsPDF } = await laadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const blad = maakBlad(doc)
  const o = bouwAfrekeningOverzicht(dossier, afrekening, kosten, kinderen, gebruikerCategorieen, (k) =>
    heeftEenBon(k, documenten),
  )
  const opmaakdatum = vandaag(nu)

  // Kop van het blad
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(t('Afrekening — {naam}', { naam: o.dossierNaam }), LINKS, blad.positie())
  blad.verschuif(8)
  for (const regel of [
    `${t('Periode')}: ${periodeTekst(t, o)}`,
    `${t('Kinderen')}: ${kinderenTekst(t, o)}`,
    `${t('Datum')}: ${o.datum}`,
  ]) {
    blad.regel(regel)
  }

  // Verdeelsleutels
  if (o.verdeelsleutels.length > 0) {
    blad.kop(t('Verdeelsleutel'))
    for (const s of o.verdeelsleutels) blad.alinea(`• ${verdeelsleutelTekst(t, s)}`)
  }

  // Totalen en het saldo in klare taal
  blad.kop(t('Totalen'))
  for (const { label, waarde } of totaalRegels(t, o)) blad.labelWaarde(label, waarde)
  blad.besluit(verrekenTekst(t, o.netto))
  if (o.wijktAf) {
    blad.alinea(
      t('Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.', {
        bedrag: formatEuro(o.bewaardNetto),
      }),
    )
  }

  // Eén uitsplitsing als tabel met rechts uitgelijnde bedragen.
  let eersteTabel = true
  function tabel(titel: string, groepen: AfrekeningGroep[]) {
    if (groepen.length === 0) return
    blad.kop(titel)
    if (eersteTabel) {
      eersteTabel = false
      blad.alinea(saldoLegende(t), { klein: true, grijs: true })
    }
    blad.ruimte(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(t('Totaal'), KOL_TOTAAL, blad.positie(), { align: 'right' })
    doc.text(t('Jij'), KOL_JIJ, blad.positie(), { align: 'right' })
    doc.text(t('Partner'), KOL_PARTNER, blad.positie(), { align: 'right' })
    doc.text(t('Te verrekenen'), KOL_SALDO, blad.positie(), { align: 'right' })
    doc.setFont('helvetica', 'normal')
    blad.verschuif(5)
    doc.setFontSize(9.5)
    for (const g of groepen) {
      // De naam mag over twee regels lopen in plaats van afgekapt te worden.
      // "Niet toegewezen aan een kind" werd anders stil "Niet toegewezen aan een",
      // en dan lijkt er een woord te ontbreken in plaats van een regel.
      const naamDelen = doc.splitTextToSize(groepLabel(t, g), KOL_TOTAAL - LINKS - 6) as string[]
      blad.ruimte(naamDelen.length * 5 + 1)
      const y = blad.positie()
      doc.text(formatEuro(g.totaal), KOL_TOTAAL, y, { align: 'right' })
      doc.text(formatEuro(g.jouwAandeel), KOL_JIJ, y, { align: 'right' })
      doc.text(formatEuro(g.partnerAandeel), KOL_PARTNER, y, { align: 'right' })
      doc.text(formatEuro(g.netto), KOL_SALDO, y, { align: 'right' })
      for (const deel of naamDelen) {
        doc.text(deel, LINKS, blad.positie())
        blad.verschuif(5)
      }
    }
  }

  tabel(t('Per kind'), o.perKind)
  tabel(t('Per categorie'), o.perCategorie)
  tabel(t('Per kostensoort'), o.perKostensoort)

  // Detail: elke kost navolgbaar, met een tweede regel die de rij uitlegt.
  if (o.regels.length > 0) {
    blad.kop(t('Detail'))
    for (const regel of o.regels) {
      const titel = doc.splitTextToSize(`${regel.datum}  ${regel.omschrijving}`, KOL_TOTAAL - LINKS) as string[]
      const meta = regelMeta(t, regel).flatMap((deel) => doc.splitTextToSize(deel, RECHTS - LINKS - 4) as string[])
      blad.ruimte(titel.length * 5 + meta.length * 4 + 2)
      const eersteRegel = blad.positie()
      doc.setFontSize(9.5)
      for (const deel of titel) {
        doc.text(deel, LINKS, blad.positie())
        blad.verschuif(5)
      }
      doc.text(formatEuro(regel.bedrag), RECHTS, eersteRegel, { align: 'right' })
      doc.setFontSize(8)
      doc.setTextColor(90)
      for (const deel of meta) {
        doc.text(deel, LINKS + 4, blad.positie())
        blad.verschuif(4)
      }
      doc.setTextColor(0)
      doc.setFontSize(9.5)
      blad.verschuif(1.5)
    }
  }

  blad.voettekst(t, `${o.dossierNaam} — ${t('Opgemaakt op')}: ${opmaakdatum}`)
  doc.save(`afrekening-${veiligeBestandsnaam(o.dossierNaam)}-${o.datum}.pdf`)
}
