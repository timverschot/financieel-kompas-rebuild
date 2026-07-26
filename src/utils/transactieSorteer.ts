import type { Transactie } from '../data/schema'
import { nieuwsteEerst } from './sorteer'

// Sorteren van de transactielijst op een kolom naar keuze.
//
// De datumsortering leunt bewust op `utils/sorteer.ts` en schrijft geen eigen
// vergelijker. Dat was de fout van vóór ronde 19: op zes plaatsen stond
// `(a,b) => a.datum < b.datum ? 1 : -1`, die nooit 0 geeft, waardoor rijen van
// dezelfde dag bij elke herlaad van plaats wisselden. Elke sortering hieronder
// eindigt daarom op diezelfde vergelijker als tiebreaker — zo is de uitkomst
// altijd volledig bepaald, ook wanneer twee bedragen of twee namen gelijk zijn.

export const SORTEERVELDEN = ['datum', 'bedrag', 'omschrijving'] as const
export type Sorteerveld = (typeof SORTEERVELDEN)[number]

export type Sortering = { veld: Sorteerveld; oplopend: boolean }

/** De standaard: nieuwste boeking bovenaan. */
export const STANDAARD_SORTERING: Sortering = { veld: 'datum', oplopend: false }

/**
 * Welke kant een kolom op gaat wanneer je erop klikt. Bij een nieuwe kolom kies je
 * de richting die je bijna altijd wil: nieuwste datum eerst, grootste bedrag
 * eerst, maar namen van A naar Z. Klik je nog eens op dezelfde kolom, dan draait
 * ze om.
 */
export function volgendeSortering(huidig: Sortering, veld: Sorteerveld): Sortering {
  if (huidig.veld === veld) return { veld, oplopend: !huidig.oplopend }
  return { veld, oplopend: veld === 'omschrijving' }
}

export function sorteerTransacties(lijst: Transactie[], sortering: Sortering): Transactie[] {
  const { veld, oplopend } = sortering
  const teken = oplopend ? -1 : 1

  return [...lijst].sort((a, b) => {
    if (veld === 'bedrag') {
      // Op grootte, niet op teken: wie op bedrag sorteert, zoekt de grootste
      // bewegingen — en dan hoort een uitgave van € 900 bovenaan te staan, niet
      // onderaan omdat ze negatief is.
      const va = Math.abs(a.bedrag)
      const vb = Math.abs(b.bedrag)
      if (va !== vb) return (vb - va) * teken
    } else if (veld === 'omschrijving') {
      const vgl = a.omschrijving.localeCompare(b.omschrijving, 'nl')
      if (vgl !== 0) return vgl * -teken
    }
    // Datum, én de tiebreaker voor de andere twee.
    return nieuwsteEerst(a, b) * teken
  })
}
