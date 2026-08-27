import { opmaakLocale } from './opmaaktaal'

// Geld wordt overal bewaard als gehele centen (zie schema.ts). Deze helpers
// vormen de enige brug tussen die centen en wat de gebruiker ziet of typt.

// Toont centen als een net eurobedrag, bv. 1250 -> "€ 12,50".
//
// De opmaak volgt sinds ronde 54 de gekozen taal: "€ 12,50" in het Nederlands,
// "€12.50" in het Engels, "12,50 €" in het Frans. Zie utils/opmaaktaal.ts.
//
// DE SMALLE VASTE SPATIE ERUIT, en dat is geen schoonheidsfoutje. In het Frans zet
// `Intl` als duizendtalscheiding U+202F (een SMALLE vaste spatie). Dat teken bestaat
// niet in WinAnsi, de tekentabel van het standaardlettertype in jsPDF — zie de uitleg
// in utils/pdfBlad.ts. Elk bedrag vanaf duizend euro kwam daardoor in een Franse PDF
// als tekenbrij op papier: "1 234,56 €" werd een reeks lege vakjes met een schuine
// streep middenin. Precies de totaalregel onderaan een afrekening of een fiscaal
// overzicht, en precies het blad dat naar een advocaat of een boekhouder gaat.
//
// U+00A0 (de gewone vaste spatie) staat wél in WinAnsi, ziet er nagenoeg hetzelfde
// uit, en breekt net zomin af aan het einde van een regel. Op het scherm verandert er
// niets zichtbaars; op papier is het het verschil tussen leesbaar en onleesbaar.
export function formatEuro(centen: number): string {
  return new Intl.NumberFormat(opmaakLocale(), { style: 'currency', currency: 'EUR' })
    .format(centen / 100)
    .replace(/\u202F/g, '\u00A0')
}

// Zet een getypt eurobedrag om naar gehele centen (1250). Verwerkt de Belgische
// notatie met duizendtalpunten en decimale komma ("1.234,50"), de gewone komma
// ("12,50") én de punt-notatie ("12.50"), en negeert spaties. Trailing rommel
// zoals "12abc" wordt geweigerd. Geeft NaN terug bij ongeldige invoer, zodat de
// aanroeper kan valideren.
export function invoerNaarCenten(tekst: string): number {
  let s = tekst.trim().replace(/\s/g, '')
  if (s === '') return Number.NaN
  const heeftKomma = s.includes(',')
  const heeftPunt = s.includes('.')
  if (heeftKomma && heeftPunt) {
    // Punt = duizendtal, komma = decimaal (1.234,50).
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (heeftKomma) {
    s = s.replace(',', '.')
  }
  // Enkel een zuiver getal aanvaarden (geen tekst of extra tekens).
  if (!/^-?\d*\.?\d+$/.test(s)) return Number.NaN
  const euro = Number.parseFloat(s)
  if (!Number.isFinite(euro)) return Number.NaN
  return Math.round(euro * 100)
}

// Zet gehele centen om naar een bewerkbare invoerstring, bv. 1250 -> "12,50".
export function centenNaarInvoer(centen: number): string {
  return (centen / 100).toFixed(2).replace('.', ',')
}

// Een percentage afgerond op twee decimalen.
//
// ⚠ WAAROM DIT BESTAAT. Percentages worden in dit huis als gewone getallen bewaard, en
// `100 - 66.6` is in drijvendekommagetallen niet 33,4 maar 33.400000000000006. Zonder deze
// afronding komt een percentage na één keer heen en weer zo terug uit een uitwisseling, en
// toont de bewijsmap twee aparte verdeelsleutel-regels voor één afspraak.
//
// ⚠ RONDE 107 — VERHUISD UIT `uitwisseling.ts`. Daar loste hij het probleem op voor de
// OPGESLAGEN waarde, maar het complement dat de afrekeningtekst zelf uitrekent viel erbuiten
// en zette "partner 33.400000000000006%" in het document dat naar de andere ouder gaat. Een
// regel die op twee plaatsen moet gelden, hoort niet in één van de twee te wonen.
export function rondPercentage(p: number): number {
  return Math.round(p * 100) / 100
}

/**
 * Leest een percentageveld: leeg betekent 'niet ingesteld', een getal van 0 tot en met 100 is
 * geldig, al de rest is ongeldig (`null`) en hoort de bewaarknop uit te zetten.
 *
 * ⚠ RONDE 107 — VERHUISD UIT `DossierSectie.tsx`, WANT ÉÉN VELD DEED HET ANDERS. Het veld
 * "Eigen verdeling" op een gedeelde kost had zijn eigen regeltje: ongeldige invoer werd daar
 * stil GEWIST in plaats van geweigerd. Wie bij een kost van € 400 met 100% eigen verdeling
 * per ongeluk "110" tikte, bewaarde die kost terug op de standaardverdeling — € 200 verschil
 * in het saldo naar de andere ouder, zonder één woord op het scherm. Twee velden die
 * hetzelfde vragen, horen hetzelfde antwoord te geven.
 */
export function leesPercentage(waarde: string): number | 'leeg' | null {
  const tekst = waarde.trim()
  if (!tekst) return 'leeg'
  const getal = Number.parseFloat(tekst.replace(',', '.'))
  if (!Number.isFinite(getal) || getal < 0 || getal > 100) return null
  return getal
}
