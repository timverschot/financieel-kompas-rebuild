// Een nep-jsPDF om de drie PDF-documenten te kunnen testen (ronde 41).
//
// Waarom dit nodig is. Vóór deze ronde had `afrekeningPdf.ts` geen enkele test: een
// echte PDF valt in een testomgeving niet na te lezen, dus bleef de opmaakcode
// ongedekt. Toen ronde 41 die opmaak naar `pdfBlad.ts` verhuisde, was er dus geen
// vangnet dat zou merken dat er een regel uit het document verdwenen was.
//
// Deze nep-versie noteert wat er geschreven wordt in plaats van het te tekenen. Dat
// is genoeg om de vragen te stellen die echt tellen: staat het bedrag erin, staat het
// voorbehoud erin, krijgt elke bon een eigen bladzijde, wordt een beschadigde bon
// gemeld in plaats van stil weggelaten.
//
// Wat het NIET test: of het blad er mooi uitziet. Dat blijft mensenwerk — en dat is
// precies waarom er ook een meting in de browser gebeurt.
//
// Let op bij het gebruik: `vi.mock` wordt door Vitest naar de top van het bestand
// gehesen, dus het notitieboekje moet via `vi.hoisted` gemaakt worden. Daarom is
// `NepPdf` een kaal gegevensobject zonder methodes: dat is het enige wat je veilig
// door een gehesen fabriek kan geven.
//
//   const { nep } = vi.hoisted(() => ({ nep: { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null } }))
//   vi.mock('jspdf', async () => {
//     const { nepJsPdfKlasse } = await import('../test/nepPdf')
//     return { jsPDF: nepJsPdfKlasse(nep) }
//   })

export type NepTekst = { tekst: string; x: number; y: number; blad: number }
export type NepAfbeelding = { dataUrl: string; x: number; y: number; breedte: number; hoogte: number; blad: number }

/** Het notitieboekje. Kaal gegevensobject, zodat `vi.hoisted` het kan maken. */
export type NepPdf = {
  teksten: NepTekst[]
  afbeeldingen: NepAfbeelding[]
  bladen: number
  bewaardAls: string | null
  /**
   * De maten die `getImageProperties` teruggeeft, in beeldpunten.
   *
   * Instelbaar, want de standaard (liggend 800 x 600) is niet de vorm van een echte
   * bon: een kassaticket fotografeer je staand, en `verkleinAfbeelding` maakt daar
   * 900 x 1200 van. Met alleen de liggende maat bond in élke test een andere grens
   * dan in productie, en dan bewijst een test over de schaling niets.
   */
  beeldmaten?: { width: number; height: number }
}

/** Een leeg notitieboekje. */
export function leegNepPdf(): NepPdf {
  return { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null }
}

/** Maakt het notitieboekje leeg zonder de verwijzing te vervangen. */
export function wisNepPdf(nep: NepPdf): void {
  nep.teksten.length = 0
  nep.afbeeldingen.length = 0
  nep.bladen = 1
  nep.bewaardAls = null
  delete nep.beeldmaten
}

/** Alle tekst van het document als één string, om in te zoeken. */
export function alleTekst(nep: NepPdf): string {
  return nep.teksten.map((r) => r.tekst).join('\n')
}

/** De tekst van één blad (1-gebaseerd). */
export function tekstVanBlad(nep: NepPdf, blad: number): string {
  return nep.teksten
    .filter((r) => r.blad === blad)
    .map((r) => r.tekst)
    .join('\n')
}

/** Een klasse die zich als jsPDF gedraagt en alles in `nep` noteert. */
export function nepJsPdfKlasse(nep: NepPdf) {
  return class NepDoc {
    // Op welk blad we nu schrijven. `setPage` verandert dit; dat doet de voettekst.
    private blad = 1
    // De laatst gezette lettergrootte, om de breedte van tekst te kunnen schatten.
    private grootte = 10

    setFont() {}
    setFontSize(punten: number) {
      this.grootte = punten
    }
    setTextColor() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}

    text(tekst: string | string[], x: number, y: number) {
      const delen = Array.isArray(tekst) ? tekst : [tekst]
      for (const deel of delen) nep.teksten.push({ tekst: deel, x, y, blad: this.blad })
    }

    /**
     * Breekt tekst af op woordgrenzen, zoals jsPDF doet.
     *
     * De maat is een benadering. Dat hoeft niet exact te zijn: de tests kijken naar
     * de inhoud, niet naar de regelbreedte. Wat het WEL moet doen is een lange tekst
     * in méér dan één stuk knippen, want anders zou een fout in de hoogteberekening
     * (en dus in de paginabreuk) nooit opvallen.
     */
    splitTextToSize(tekst: string, breedte: number): string[] {
      const perRegel = Math.max(8, Math.floor(breedte / (this.grootte * 0.38)))
      if (tekst.length <= perRegel) return [tekst]
      const stukken: string[] = []
      let huidig = ''
      for (const woord of tekst.split(' ')) {
        if (huidig === '') huidig = woord
        else if (`${huidig} ${woord}`.length <= perRegel) huidig += ` ${woord}`
        else {
          stukken.push(huidig)
          huidig = woord
        }
      }
      if (huidig !== '') stukken.push(huidig)
      return stukken
    }

    addPage() {
      nep.bladen += 1
      this.blad = nep.bladen
    }

    setPage(blad: number) {
      this.blad = blad
    }

    getNumberOfPages() {
      return nep.bladen
    }

    getImageProperties(dataUrl: string) {
      // Een beschadigde bon: net als de echte bibliotheek gooien we hier een fout,
      // zodat de test kan nagaan dat het document niet stuk gaat maar het zegt.
      if (dataUrl.includes('KAPOT')) throw new Error('geen beeld')
      // Een bibliotheek die 0 x 0 teruggeeft in plaats van te gooien: die tak bestaat
      // in `plaatsAfbeelding` en hoort ook gedekt te zijn.
      if (dataUrl.includes('NULMAAT')) return { width: 0, height: 0, fileType: 'JPEG' }
      // Standaard een liggende bon van 800 x 600; per test te overschrijven met
      // `nep.beeldmaten`, bv. om een staande bon van 900 x 1200 na te rekenen.
      return { ...(nep.beeldmaten ?? { width: 800, height: 600 }), fileType: 'JPEG' }
    }

    addImage(dataUrl: string, x: number, y: number, breedte: number, hoogte: number) {
      nep.afbeeldingen.push({ dataUrl, x, y, breedte, hoogte, blad: this.blad })
    }

    save(bestandsnaam: string) {
      nep.bewaardAls = bestandsnaam
    }
  }
}
