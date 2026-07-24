import type { Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { formatEuro } from './format'

// Nette tekst voor het verrekensaldo. Positief = partner is jou verschuldigd.
export function verrekenTekst(t: Vertaler, netto: number): string {
  if (netto > 0) return t('Partner is jou {bedrag} verschuldigd', { bedrag: formatEuro(netto) })
  if (netto < 0) return t('Jij bent partner {bedrag} verschuldigd', { bedrag: formatEuro(-netto) })
  return t('Niets te verrekenen')
}

// De kosten die een afrekening dekt (volgens de opgeslagen momentopname kostIds).
export function afrekeningKosten(afrekening: Verrekening, kosten: GedeeldeKost[]): GedeeldeKost[] {
  const ids = new Set(afrekening.kostIds ?? [])
  return kosten.filter((k) => ids.has(k.id))
}

// Bouwt een leesbare, meertalige tekstsamenvatting van een afrekening — geschikt
// om te kopiëren naar het klembord of door te sturen (bv. via WhatsApp). Zuiver en
// los testbaar (de vertaling komt via de meegegeven t()).
export function afrekeningSamenvatting(
  t: Vertaler,
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
): string {
  const regels = afrekeningKosten(afrekening, kosten)
  const kindNaam = (id: string) => kinderen.find((k) => k.id === id)?.naam ?? id
  const periode =
    afrekening.periodeVan || afrekening.periodeTot
      ? `${afrekening.periodeVan ?? '…'} – ${afrekening.periodeTot ?? '…'}`
      : t('alle periodes')
  const wie =
    afrekening.kindIds && afrekening.kindIds.length > 0
      ? afrekening.kindIds.map(kindNaam).join(', ')
      : t('alle kinderen')

  const lijnen: string[] = []
  lijnen.push(t('Afrekening — {naam}', { naam: dossier.naam }))
  lijnen.push(`${t('Periode')}: ${periode}`)
  lijnen.push(`${t('Kinderen')}: ${wie}`)
  lijnen.push(`${t('Datum')}: ${afrekening.datum}`)
  lijnen.push('')
  for (const k of regels) {
    const wieBetaalde = k.betaaldDoor === 'jij' ? t('jou') : t('partner')
    const extra: string[] = []
    if (k.kindIds && k.kindIds.length > 0) extra.push(k.kindIds.map(kindNaam).join(', '))
    if (k.kostenType === 'buitengewoon') extra.push(t('buitengewoon'))
    const staart = extra.length > 0 ? ` (${extra.join(', ')})` : ''
    lijnen.push(`- ${k.omschrijving}: ${formatEuro(k.bedrag)} — ${t('betaald door {wie}', { wie: wieBetaalde })}${staart}`)
  }
  lijnen.push('')
  lijnen.push(`${t('Resultaat')}: ${verrekenTekst(t, afrekening.bedrag)}`)
  return lijnen.join('\n')
}
