// Rekenlaag voor het garantiebeheer. Zuivere, deterministische functies: de
// "vandaag"-datum wordt altijd meegegeven. Datums zijn ISO-strings (JJJJ-MM-DD).

// De standaard Belgische wettelijke garantie: 2 jaar = 24 maanden.
export const STANDAARD_GARANTIE_MAANDEN = 24

function ymd(iso: string): { j: number; m: number; d: number } {
  const [j, m, d] = iso.split('-').map(Number)
  return { j, m, d }
}

// De vervaldatum: aankoopdatum + aantal maanden. De dag wordt geklemd op de
// laatste dag van de doelmaand (bv. 31 jan + 1 maand = 28/29 feb).
export function vervaldatum(aankoopISO: string, maanden: number): string {
  const { j, m, d } = ymd(aankoopISO)
  const totaal = j * 12 + (m - 1) + maanden
  const nj = Math.floor(totaal / 12)
  const nm = (totaal % 12) + 1 // 1-gebaseerd
  const laatsteDag = new Date(Date.UTC(nj, nm, 0)).getUTCDate()
  const nd = Math.min(d, laatsteDag)
  return `${nj}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

// Hele dagen tussen twee datums (tot − van). Negatief als 'tot' vóór 'van' ligt.
export function dagenTussen(vanISO: string, totISO: string): number {
  const a = ymd(vanISO)
  const b = ymd(totISO)
  const ma = Date.UTC(a.j, a.m - 1, a.d)
  const mb = Date.UTC(b.j, b.m - 1, b.d)
  return Math.round((mb - ma) / 86400000)
}

export type GarantieStatus = {
  vervaldatum: string
  verlopen: boolean
  dagenResterend: number // negatief als verlopen
  maandenResterend: number // hele maanden resterend (>= 0), voor weergave
  bijnaVerlopen: boolean // nog geldig maar binnen 60 dagen
}

// De status van een garantie t.o.v. vandaag: vervaldatum, of ze verlopen is,
// hoeveel er nog rest, en of ze bijna verloopt (waarschuwing in de app).
export function garantieStatus(aankoopISO: string, maanden: number, vandaagISO: string): GarantieStatus {
  const verval = vervaldatum(aankoopISO, maanden)
  const dagenResterend = dagenTussen(vandaagISO, verval)
  const verlopen = dagenResterend < 0
  const maandenResterend = Math.max(0, Math.floor(dagenResterend / 30))
  const bijnaVerlopen = !verlopen && dagenResterend <= 60
  return { vervaldatum: verval, verlopen, dagenResterend, maandenResterend, bijnaVerlopen }
}
