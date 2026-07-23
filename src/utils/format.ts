// Geld wordt overal bewaard als gehele centen (zie schema.ts). Deze helpers
// vormen de enige brug tussen die centen en wat de gebruiker ziet of typt.

// Toont centen als een net eurobedrag, bv. 1250 -> "€ 12,50".
export function formatEuro(centen: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(centen / 100)
}

// Zet een getypt eurobedrag ("12,50" of "12.50") om naar gehele centen (1250).
// Geeft NaN terug bij ongeldige invoer, zodat de aanroeper kan valideren.
export function invoerNaarCenten(tekst: string): number {
  const euro = Number.parseFloat(tekst.replace(',', '.'))
  if (!Number.isFinite(euro)) return Number.NaN
  return Math.round(euro * 100)
}

// Zet gehele centen om naar een bewerkbare invoerstring, bv. 1250 -> "12,50".
export function centenNaarInvoer(centen: number): string {
  return (centen / 100).toFixed(2).replace('.', ',')
}
