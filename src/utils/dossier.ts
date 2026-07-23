import type { GedeeldeKost } from '../data/schema'

// Berekent de verrekening van een dossier. 'aandeelJij' is het percentage van
// elke kost dat jij hoort te dragen. Bedragen zijn in centen; het resultaat is
// het bedrag (in centen, afgerond) dat de partner jou verschuldigd is (positief),
// of dat jij de partner verschuldigd bent (negatief). Er wordt pas op het einde
// afgerond, zodat tussentijdse deel-centen de uitkomst niet laten afdrijven.
// Zuivere functie, zodat ze los en deterministisch getest kan worden.
export function saldoVerrekening(aandeelJij: number, kosten: GedeeldeKost[]): number {
  let netto = 0
  for (const k of kosten) {
    const jouwAandeel = k.bedrag * (aandeelJij / 100)
    const partnerAandeel = k.bedrag - jouwAandeel
    if (k.betaaldDoor === 'jij') {
      // Jij betaalde alles, maar hoefde maar jouw aandeel te dragen -> partner
      // is jou zijn deel verschuldigd.
      netto += partnerAandeel
    } else {
      // Partner betaalde alles -> jij bent jouw aandeel verschuldigd.
      netto -= jouwAandeel
    }
  }
  return Math.round(netto)
}
