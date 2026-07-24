import type { Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { afrekeningKosten, verrekenTekst } from './afrekeningTekst'
import { formatEuro } from './format'

// Genereert een PDF van een afrekening en biedt ze aan om te downloaden. jsPDF
// wordt hier lazy geïmporteerd, zodat de bibliotheek de app-start niet belast.
export async function exporteerAfrekeningPDF(
  t: Vertaler,
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const kindNaam = (id: string) => kinderen.find((k) => k.id === id)?.naam ?? id
  const periode =
    afrekening.periodeVan || afrekening.periodeTot
      ? `${afrekening.periodeVan ?? '…'} - ${afrekening.periodeTot ?? '…'}`
      : t('alle periodes')
  const wie =
    afrekening.kindIds && afrekening.kindIds.length > 0
      ? afrekening.kindIds.map(kindNaam).join(', ')
      : t('alle kinderen')

  let y = 20
  doc.setFontSize(16)
  doc.text(t('Afrekening — {naam}', { naam: dossier.naam }), 20, y)
  y += 9
  doc.setFontSize(11)
  doc.text(`${t('Periode')}: ${periode}`, 20, y)
  y += 6
  doc.text(`${t('Kinderen')}: ${wie}`, 20, y)
  y += 6
  doc.text(`${t('Datum')}: ${afrekening.datum}`, 20, y)
  y += 10

  for (const k of afrekeningKosten(afrekening, kosten)) {
    if (y > 275) {
      doc.addPage()
      y = 20
    }
    const wieBetaalde = k.betaaldDoor === 'jij' ? t('jou') : t('partner')
    const extra = k.kostenType === 'buitengewoon' ? ` (${t('buitengewoon')})` : ''
    doc.text(`- ${k.omschrijving}: ${formatEuro(k.bedrag)} - ${t('betaald door {wie}', { wie: wieBetaalde })}${extra}`, 22, y)
    y += 6
  }

  y += 6
  doc.setFontSize(13)
  doc.text(`${t('Resultaat')}: ${verrekenTekst(t, afrekening.bedrag)}`, 20, y)

  const veiligeNaam = dossier.naam.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`afrekening-${veiligeNaam}-${afrekening.datum}.pdf`)
}
