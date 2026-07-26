// Benoemt de uitkomst van één maand: houd je over, kom je tekort, of sluit het
// exact? De app rekende dit netto-bedrag al uit, maar zei nooit wat het bétekent.
// Zuiver en los testbaar; bedragen in centen.

export type BalansStand = 'overschot' | 'tekort' | 'balans'

export type Balans = {
  stand: BalansStand
  /** Het verschil, altijd positief. Bij 'balans' is dit 0. */
  verschil: number
  /** Er is deze maand niets geboekt: dan valt er ook niets te zeggen. */
  leeg: boolean
}

export function bepaalBalans(inkomsten: number, uitgaven: number): Balans {
  const netto = inkomsten - uitgaven
  const leeg = inkomsten === 0 && uitgaven === 0
  if (netto > 0) return { stand: 'overschot', verschil: netto, leeg }
  if (netto < 0) return { stand: 'tekort', verschil: -netto, leeg }
  return { stand: 'balans', verschil: 0, leeg }
}
