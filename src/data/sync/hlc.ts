// Hybride Logische Klok (HLC).
//
// Waarom: bij het samenvoegen van wijzigingen van meerdere toestellen moet er een
// duidelijke, deterministische volgorde zijn ("wie wint"). De pure wandklok
// (Date.now()) is daarvoor onbetrouwbaar: als de klok van je gsm een paar minuten
// verschilt van die van je pc, kan een oudere wijziging een nieuwere overschrijven.
//
// Een HLC-stempel combineert de fysieke tijd (l) met een logische teller (c). De
// tijd blijft dicht bij de echte klok (zodat de volgorde intuïtief blijft), maar
// kan nooit terugkeren en neemt altijd de hoogst geziene tijd van andere toestellen
// mee. Zo wint een wijziging die een andere al "gezien" heeft altijd — ongeacht
// klokverschil. Zuivere functies, zodat ze los en deterministisch getest kunnen
// worden.

export type Stempel = { l: number; c: number }

// Nieuw stempel voor een eigen (lokale) wijziging.
export function lokaleStap(vorige: Stempel, nu: number): Stempel {
  if (nu > vorige.l) return { l: nu, c: 0 }
  return { l: vorige.l, c: vorige.c + 1 }
}

// Werk de eigen klok bij nadat een wijziging van een ander toestel is binnengekomen,
// zodat volgende eigen wijzigingen er zeker ná geordend worden (causaliteit).
export function ontvangstStap(vorige: Stempel, inkomend: Stempel, nu: number): Stempel {
  const l = Math.max(vorige.l, inkomend.l, nu)
  let c: number
  if (l === vorige.l && l === inkomend.l) c = Math.max(vorige.c, inkomend.c) + 1
  else if (l === vorige.l) c = vorige.c + 1
  else if (l === inkomend.l) c = inkomend.c + 1
  else c = 0
  return { l, c }
}

// Vergelijkt twee stempels: eerst op fysieke tijd, dan op logische teller.
// Negatief = a vóór b, positief = a ná b, 0 = gelijk.
export function vergelijkStempel(a: Stempel, b: Stempel): number {
  if (a.l !== b.l) return a.l - b.l
  return a.c - b.c
}
