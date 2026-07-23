// Geld wordt overal bewaard als gehele centen (zie schema.ts). Deze helpers
// vormen de enige brug tussen die centen en wat de gebruiker ziet of typt.

// Toont centen als een net eurobedrag, bv. 1250 -> "€ 12,50".
export function formatEuro(centen: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(centen / 100)
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
