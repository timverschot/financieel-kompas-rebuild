import {
  alleHoofdcategorieenUitBoom,
  itemsVanMid,
  midPerId,
  midsVanHoofd,
  type PlatItem,
} from '../data/categorieen/zoek'
import type { Transactie } from '../data/schema'

/**
 * Ticketregels die op de VERKEERDE HOOFDCATEGORIE staan (ronde 87).
 *
 * ⚠ WAAR DIT VANDAAN KOMT. Ronde 78 repareerde een echte fout: op een kassaticketregel
 * bleef de knop "Hoofdcategorie: …" naast een gekozen subcategorie staan, en een tik erop
 * verving je "Brood (wit)" door de brede hoofdcategorie "Drank" — omschrijving
 * ongewijzigd, categorie verkeerd, geen woord. Die weg is dicht. Maar de boekingen die je
 * er vóór die ronde mee gemaakt hebt, staan er nog, en Timothy vroeg wat daarmee kon.
 *
 * ⚠ OPSPOREN, NOOIT HERSTELLEN — Timothy's eigen voorwaarde, en de juiste. De app kan niet
 * weten wat je bedoelde: misschien heb je die regel bewust breed gelaten. Deze module
 * geeft dus een LIJST terug en verandert niets.
 *
 * ⚠ ALLEEN TICKETREGELS, en dat is een correctie op mijn eerste opzet (doorlichting).
 * Die keek óók naar een gewone boeking — maar daar is `omschrijving` het veld dat op het
 * scherm **"Handelaar / winkel"** heet. De fout van ronde 78 zat in `ItemZoeker`, en dat
 * component staat op precies één plek: de ticketregels van `TransactieFormulier`. Een
 * handelaarsnaam tegen subcategorienamen leggen leverde ruis op die niets met ronde 78 te
 * maken had ("Restaurant" op Vrije Tijd wees naar Voeding › Fastfood) — en op zo'n rij
 * stond de omschrijving bovendien drie keer, want handelaar en naam zijn daar hetzelfde
 * veld.
 *
 * ⚠ WANNEER ZE ZWIJGT — en dat is de helft van het ontwerp, want een lijst met valse
 * vermoedens is erger dan geen lijst (huisregel sinds ronde 65: kan de app een vergissing
 * niet met zekerheid aanwijzen, dan wijst ze niets aan).
 *
 *  1. **Staat de regel al op een subcategorie**, dan is er niets te zeggen: dat is de
 *     fijnste laag die er is. (Een item-id staat noch in het midden-, noch in het
 *     hoofdregister, dus `laagVan` geeft dan `undefined` — één poort, geen tweede.)
 *  2. **Heet je omschrijving naar niets**, dan zwijgt ze. Alleen een EXACTE naam telt
 *     (na trim, hoofdletterongevoelig) — "brood" of "Brood (wit) 800g" niet. Ook een
 *     SYNONIEM telt niet: "pistolet" vindt wel het item, maar dan heeft de gebruiker die
 *     naam niet ingetikt en is er geen aanwijzing dat hij dat item bedoelde.
 *  3. **Heten er TWEE subcategorieën zo**, dan zwijgt ze: welke van de twee je bedoelde
 *     is niet af te leiden. Dat is geen theorie — de ingebouwde boom heeft er twee
 *     ("Strijkdienst" en "Reisverzekering" hangen elk onder twee verschillende takken).
 *  4. **Staat de regel onder DEZELFDE hoofdcategorie**, dan zwijgt ze. Nagerekend: de
 *     Analyse en de donut groeperen op hoofdcategorie (`groepVanCategorie`), dus "Brood
 *     (wit)" op Voeding — of op Voeding › Zuivel en Kaas — telt daar precies goed mee.
 *     Alleen een ándere hoofdcategorie zet het bedrag aantoonbaar op de verkeerde plek.
 *     ⚠ Mijn eerste opzet vergeleek bij een middencategorie op MIDDENniveau, en meldde
 *     dus "Sport" op Vrije Tijd › Sport en fitness — de meest voor de hand liggende plek
 *     die er is. Dat sprak de regel hierboven letterlijk tegen.
 *  5. **Heet de regel naar de LAAG waar ze op staat**, dan zwijgt ze. Wie zijn regel
 *     "Buffer persoonlijk" noemt en hem op de categorie Buffer persoonlijk zet, heeft
 *     hem niet verkeerd gelegd — ook al bestaat er ergens anders in de boom toevallig een
 *     subcategorie die zo heet. (In de ingebouwde boom gebeurt dat vier keer.)
 *  6. **Staat de regel op een EIGEN hoofdcategorie**, dan zwijgt ze. Die laag heb je zelf
 *     gemaakt om er dingen op te zetten, en een ingebouwd item hangt er per definitie
 *     nooit onder — zonder deze regel werd élke eigen hoofdcategorie altijd gemeld.
 *  7. **Kent de app de categorie niet** (een id uit een oudere versie), dan zwijgt ze:
 *     dan is er niets om tegen te vergelijken.
 *
 * ⚠ NIET PUUR IN DE STRIKTE ZIN, en dat hoort erbij te staan. Deze module leest de
 * ACTUELE categorieboom uit het register van `data/categorieen/zoek.ts` — hetzelfde
 * register dat `stelCategorieboomIn` vult. Dezelfde boekingen geven dus een ander antwoord
 * ná een hernoeming of een nieuwe eigen categorie. ⚠ Wie het resultaat memoiseert, moet de
 * boom in de afhankelijkheden meenemen; een kale `useMemo(…, [transacties])` bevriest hier
 * de oude boom — letterlijk de les van ronde 78.
 *
 * ⚠ EN ZE HERNOEMT NIET MEE. Hernoem je "Brood (wit)" naar "Wit brood", dan verdwijnen de
 * oude vermoedens: er is geen item meer dat zo heet. Dat is een echte beperking en geen
 * vergetelheid — de omschrijving die op je regel staat, is dan geen aanwijzing meer.
 */
export type Vermoeden = {
  transactie: Transactie
  /** De ticketregel (0-gebaseerd). */
  regelIndex: number
  /** De omschrijving van die regel, precies zoals ze er staat. */
  omschrijving: string
  /** De subcategorie die exact zo heet. */
  item: PlatItem
  /** De naam van de laag waarop de regel nu staat ("Drank", of "Voeding › Broodwaren"). */
  staatOp: string
  /** Waar of die laag een middencategorie is (anders een hoofdcategorie). */
  isMiddenlaag: boolean
}

type Laag = { naam: string; eigenNaam: string; hoofdId: string; eigen: boolean; isMiddenlaag: boolean }

/** Waar staat deze regel nu? `undefined` = geen hoofd- of middencategorie. */
function laagVan(categorieId: string): Laag | undefined {
  const hoofden = alleHoofdcategorieenUitBoom()
  const mid = midPerId(categorieId)
  if (mid) {
    const hoofd = hoofden.find((h) => h.id === mid.hoofdId)
    return {
      naam: `${mid.hoofdNaam} › ${mid.naam}`,
      eigenNaam: mid.naam,
      hoofdId: mid.hoofdId,
      eigen: hoofd?.eigen ?? false,
      isMiddenlaag: true,
    }
  }
  const hoofd = hoofden.find((h) => h.id === categorieId)
  if (hoofd) {
    return { naam: hoofd.naam, eigenNaam: hoofd.naam, hoofdId: hoofd.id, eigen: hoofd.eigen, isMiddenlaag: false }
  }
  return undefined
}

/**
 * Elke subcategorienaam van de ACTUELE boom, met de items die zo heten.
 *
 * ⚠ EEN INDEX EN GEEN ZOEKOPDRACHT PER REGEL (doorlichting). Mijn eerste opzet riep per
 * ticketregel `zoekItems` aan, en dat loopt lineair over ruim duizend items. Gemeten:
 * 0,6 seconde bij 5.000 boekingen, en 3,2 seconde met kassatickets — bij élke render van
 * de boekingenpagina, óók bij wie niets fout heeft staan. Deze index kost één doorloop:
 * opnieuw gemeten met 5.000 boekingen van zes ticketregels (dertigduizend regels) staat er
 * nu **26 ms**. De kaart memoiseert het bovendien.
 */
function itemsPerNaam(): Map<string, PlatItem[]> {
  const uit = new Map<string, PlatItem[]>()
  for (const hoofd of alleHoofdcategorieenUitBoom()) {
    for (const mid of midsVanHoofd(hoofd.id)) {
      for (const item of itemsVanMid(mid.id)) {
        const sleutel = item.naam.trim().toLowerCase()
        const rij = uit.get(sleutel)
        if (rij) rij.push(item)
        else uit.set(sleutel, [item])
      }
    }
  }
  return uit
}

/**
 * Alle vermoedens in een lijst boekingen, in dezelfde volgorde als de lijst.
 *
 * Geen datum, geen willekeur, geen bijwerking: wat je erin stopt wordt niet aangeraakt.
 * (Voor de categorieboom, zie de kop van dit bestand.)
 */
export function verkeerdGetagdeBoekingen(transacties: readonly Transactie[]): Vermoeden[] {
  const index = itemsPerNaam()
  const uit: Vermoeden[] = []
  for (const t of transacties) {
    if (!t.regels) continue
    t.regels.forEach((regel, regelIndex) => {
      const { categorieId, omschrijving } = regel
      if (!categorieId || !omschrijving) return
      const laag = laagVan(categorieId)
      if (!laag || laag.eigen) return
      const gezocht = omschrijving.trim().toLowerCase()
      if (gezocht === '') return
      // Zwijgregel 5: de regel heet naar de laag waar ze op staat.
      if (gezocht === laag.eigenNaam.trim().toLowerCase()) return
      const treffers = index.get(gezocht)
      if (!treffers || treffers.length !== 1) return
      const item = treffers[0]
      // Zwijgregel 4: dezelfde hoofdcategorie is grover, niet fout.
      if (item.hoofdId === laag.hoofdId) return
      uit.push({ transactie: t, regelIndex, omschrijving, item, staatOp: laag.naam, isMiddenlaag: laag.isMiddenlaag })
    })
  }
  return uit
}
