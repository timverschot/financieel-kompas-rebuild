import type { Vertaler } from '../i18n'

// De opmaakgereedschappen voor een A4-blad, één keer.
//
// Waarom dit bestaat (ronde 41). `afrekeningPdf.ts` had zijn eigen `ruimte()`,
// `kop()` en `labelWaarde()`, plus de lus die onderaan elk blad de voettekst zet.
// Ronde 41 voegt er twee PDF's bij (het maand-/jaarrapport en de bewijsmap). Zonder
// dit bestand zouden dat drie kopieën van dezelfde maatvoering worden — en dan
// staat na één wijziging de marge van het ene document 4 mm anders dan die van het
// andere, wat je pas ziet als je ze naast elkaar legt.
//
// Twee dingen die hier bewust NIET in zitten: kleur (deze documenten zijn
// zwart-wit-grijs, ook om te printen) en emoji of pijltjes. jsPDF kan die in het
// standaardlettertype helvetica niet tonen — je krijgt dan geen foutmelding maar
// een leeg vlakje of een verkeerd teken.

// Maatvoering van het blad, in mm. Alles op één plek.
export const LINKS = 20
export const RECHTS = 190
export const BOVEN = 20
/** Vanaf hier begint een nieuwe pagina. De voettekst staat lager, op 285. */
export const ONDERGRENS = 272
export const VOETTEKST_Y = 285

/** De regelhoogte van gewone tekst, en van de kleine grijze meta-regels. */
export const REGEL = 5
export const REGEL_KLEIN = 4

/** Het lettergrijs van een meta-regel (0 = zwart, 255 = wit). */
const GRIJS = 90
const GRIJS_VOET = 110

/**
 * Alleen de jsPDF-methodes die deze helper gebruikt.
 *
 * Bewust een eigen, smalle vorm en niet het volledige `jsPDF`-type. Twee redenen:
 * dit bestand mag geen sterkere eisen stellen dan het gebruikt, en zo kan een test
 * een eenvoudig notitieboekje meegeven om na te gaan waar de tekst precies landt —
 * met het volle type zou dat een klasse met honderd ongebruikte methodes vragen.
 */
export type Doc = {
  setFont: (naam: string, stijl: string) => unknown
  setFontSize: (punten: number) => unknown
  setTextColor: (grijs: number) => unknown
  setDrawColor: (grijs: number) => unknown
  setLineWidth: (mm: number) => unknown
  line: (x1: number, y1: number, x2: number, y2: number) => unknown
  text: (tekst: string | string[], x: number, y: number, opties?: { align?: 'left' | 'center' | 'right' }) => unknown
  splitTextToSize: (tekst: string, breedte: number) => string[]
  addPage: () => unknown
  setPage: (blad: number) => unknown
  getNumberOfPages: () => number
  getImageProperties: (dataUrl: string) => { width: number; height: number }
  addImage: (dataUrl: string, x: number, y: number, breedte: number, hoogte: number) => unknown
}

/**
 * Een blad om op te schrijven: houdt zelf bij hoe ver het is en wanneer er een
 * nieuwe pagina nodig is.
 */
export type Blad = {
  /** Zorgt dat er nog 'hoogte' mm plaats is; anders begint een nieuw blad. */
  ruimte: (hoogte: number) => void
  /** Een sectiekop met een dunne lijn eronder. */
  kop: (tekst: string) => void
  /** Eén regel met een label links en een waarde rechts uitgelijnd. */
  labelWaarde: (label: string, waarde: string, vet?: boolean) => void
  /** Gewone tekst, automatisch afgebroken over meerdere regels. */
  alinea: (tekst: string, opties?: { klein?: boolean; grijs?: boolean; indent?: number; vet?: boolean }) => void
  /** Eén regel tekst zonder afbreken. */
  regel: (tekst: string, opties?: { klein?: boolean; grijs?: boolean; vet?: boolean; indent?: number }) => void
  /** Een vetgedrukte conclusieregel, iets groter. */
  besluit: (tekst: string) => void
  /** Begint hoe dan ook een nieuw blad. */
  nieuwBlad: () => void
  /** Zet de voettekst op élk blad. Als laatste aanroepen. */
  voettekst: (t: Vertaler, links: string) => void
  /** Waar we nu staan, in mm van boven. */
  positie: () => number
  /** Verschuift de schrijfpositie. */
  verschuif: (mm: number) => void
  /** De breedte waarover tekst mag lopen. */
  breedte: number
}

export function maakBlad(doc: Doc): Blad {
  let y = BOVEN

  function normaal(klein = false) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(klein ? 8 : 9.5)
  }

  function ruimte(hoogte: number) {
    if (y + hoogte > ONDERGRENS) {
      doc.addPage()
      y = BOVEN
    }
  }

  function stukken(tekst: string, breedte: number): string[] {
    // splitTextToSize geeft bij een lege tekst één lege regel terug; dat is precies
    // wat we willen voor een witregel.
    return doc.splitTextToSize(tekst, breedte) as string[]
  }

  return {
    breedte: RECHTS - LINKS,
    ruimte,
    positie: () => y,
    verschuif: (mm) => {
      y += mm
    },
    nieuwBlad: () => {
      doc.addPage()
      y = BOVEN
    },
    kop: (tekst) => {
      ruimte(14)
      y += 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(tekst, LINKS, y)
      y += 2
      doc.setDrawColor(150)
      doc.setLineWidth(0.2)
      doc.line(LINKS, y, RECHTS, y)
      y += REGEL
      normaal()
    },
    labelWaarde: (label, waarde, vet = false) => {
      ruimte(6)
      doc.setFont('helvetica', vet ? 'bold' : 'normal')
      doc.setFontSize(9.5)
      doc.text(label, LINKS, y)
      doc.text(waarde, RECHTS, y, { align: 'right' })
      normaal()
      y += 5.5
    },
    regel: (tekst, opties = {}) => {
      const hoogte = opties.klein ? REGEL_KLEIN : REGEL
      ruimte(hoogte)
      doc.setFont('helvetica', opties.vet ? 'bold' : 'normal')
      doc.setFontSize(opties.klein ? 8 : 9.5)
      if (opties.grijs) doc.setTextColor(GRIJS)
      doc.text(tekst, LINKS + (opties.indent ?? 0), y)
      doc.setTextColor(0)
      normaal()
      y += hoogte
    },
    alinea: (tekst, opties = {}) => {
      const indent = opties.indent ?? 0
      const hoogte = opties.klein ? REGEL_KLEIN : REGEL
      normaal(opties.klein)
      // Vet zetten vóór het afbreken: vette letters zijn breder, dus met de gewone
      // maat gemeten past de laatste regel net niet meer binnen de marge.
      if (opties.vet) doc.setFont('helvetica', 'bold')
      const delen = stukken(tekst, RECHTS - LINKS - indent)
      if (opties.grijs) doc.setTextColor(GRIJS)
      for (const deel of delen) {
        ruimte(hoogte)
        doc.text(deel, LINKS + indent, y)
        y += hoogte
      }
      doc.setTextColor(0)
      normaal()
    },
    besluit: (tekst) => {
      ruimte(10)
      y += 1
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(tekst, LINKS, y)
      normaal()
      y += 6
    },
    voettekst: (t, links) => {
      const bladen = doc.getNumberOfPages()
      for (let blad = 1; blad <= bladen; blad++) {
        doc.setPage(blad)
        doc.setFontSize(8)
        doc.setTextColor(GRIJS_VOET)
        doc.text(links, LINKS, VOETTEKST_Y)
        doc.text(t('blad {n} van {totaal}', { n: blad, totaal: bladen }), RECHTS, VOETTEKST_Y, { align: 'right' })
        doc.setTextColor(0)
      }
    },
  }
}

// De ondergrens voor de scherpte van een ingevoegde bon, in punten per duim.
//
// Waarvoor: een bon van 200 bij 150 beeldpunten mag niet over de volle 170 mm
// uitgesmeerd worden. Dat is dan geen bewijsstuk meer maar een wazige vlek — en wie
// het blad krijgt, denkt dat de foto slecht genomen is.
//
// Waarom 100 en niet 150. `verkleinAfbeelding` maakt van elke bon hoogstens 1200
// beeldpunten op de LANGSTE zijde. Een kassaticket fotografeer je staand, dus je
// houdt zo'n 900 punten breed over. Bij 150 ppi zou die bon op 152 mm afgedrukt
// worden in plaats van op de volle 170 mm — dan maakt deze regel het normale geval
// stil kleiner, en dat is het omgekeerde van de bedoeling. Bij 100 ppi bindt de
// paginabreedte weer (900 punten mag dan tot 228 mm) en raakt de grens alleen nog
// écht kleine afbeeldingen: 200 punten breed wordt hoogstens 50 mm.
const MIN_PPI = 100
const MM_PER_PUNT = 25.4 / MIN_PPI

/**
 * Plaatst een afbeelding zo groot als ze op één blad past, zonder haar te vervormen
 * en zonder haar op te rekken tot ze wazig wordt.
 *
 * Geeft terug of het gelukt is. Een bon kan onleesbaar of beschadigd zijn (of een
 * PDF in plaats van een afbeelding); dan mag het hele document daar niet op
 * stuklopen — de bijlage krijgt in dat geval een regel die zegt wat er aan de hand
 * is, in plaats van dat je een document zonder waarschuwing incompleet doorstuurt.
 */
export function plaatsAfbeelding(
  doc: Doc,
  dataUrl: string,
  vak: { x: number; y: number; breedte: number; hoogte: number },
): boolean {
  try {
    // Een vak zonder plaats: dan is er iets misgegaan in de opmaak erboven. jsPDF
    // klaagt niet over negatieve maten — het tekent dan een onzichtbare afbeelding, en
    // dan zou er een blanco bijlagebladzijde uitkomen zonder één woord uitleg.
    if (vak.breedte <= 0 || vak.hoogte <= 0) return false
    const eigenschappen = doc.getImageProperties(dataUrl)
    const bron = { breedte: eigenschappen.width, hoogte: eigenschappen.height }
    if (!bron.breedte || !bron.hoogte) return false
    // De kleinste van de drie: passend in de breedte, passend in de hoogte, en niet
    // groter dan wat bij MIN_PPI nog scherp is. Zo blijft de verhouding intact.
    const schaal = Math.min(vak.breedte / bron.breedte, vak.hoogte / bron.hoogte, MM_PER_PUNT)
    const breedte = bron.breedte * schaal
    const hoogte = bron.hoogte * schaal
    // Gecentreerd in het vak; dat leest rustiger dan alles tegen de linkermarge.
    const x = vak.x + (vak.breedte - breedte) / 2
    doc.addImage(dataUrl, x, vak.y, breedte, hoogte)
    return true
  } catch {
    return false
  }
}
