import type { Categorie, Subcategorie } from '../data/schema'

/**
 * Een nieuwe subcategorie, en waar ze in de boom komt te hangen.
 *
 * WAAROM DIT ZO GEVORMD IS. Tot ronde 67 was het aanmaken van een subcategorie
 * één ding: "hier is een naam, hier is de categorie waaronder ze hoort". Je kon
 * dus alleen iets bijzetten op een plek die al bestond. Wie een televisie kocht en
 * daar een eigen hoofdcategorie "Huisraad" voor wilde, kon dat vanuit het
 * boekingsvenster niet — en dat is precies het moment waarop je het wil.
 *
 * De vorm hieronder maakt de onmogelijke toestanden onmogelijk: een BESTAANDE
 * categorie draagt geen ouder mee (die heeft ze al), en een NIEUWE categorie kan
 * niet bestaan zonder te zeggen onder welke hoofdcategorie ze valt. Er is dus geen
 * combinatie te bedenken die half klopt.
 */
export type NieuweTak = {
  /** De naam van de subcategorie zelf. */
  subnaam: string
  /** Waar ze onder komt: een bestaande categorie, of een nieuwe mét haar ouder. */
  categorie: { id: string } | { naam: string; hoofd: { id: string } | { naam: string } }
}

/** Wat er weggeschreven moet worden om de tak te laten bestaan. */
export type TakRecords = {
  /**
   * De categorierecords die nog niet bestaan, van STAM naar TAK: eerst een
   * eventuele nieuwe hoofdcategorie, dan een eventuele nieuwe categorie.
   *
   * ⚠ Die volgorde is geen smaak. Ze bepaalt hoe het logboek zich laat lezen en in
   * welke volgorde een ánder toestel de regels afspeelt; een categorie die vóór
   * haar ouder binnenkomt, is voor `stelCategorieboomIn` even een wees. Binnen één
   * ondeelbare stap maakt het voor de uitkomst niets uit, maar de leesbaarheid van
   * het logboek is de enige plek waar je later nog kan zien wat er gebeurd is.
   */
  categorieen: Categorie[]
  subcategorie: Subcategorie
}

/**
 * Een naam zoals ze bewaard hoort te worden: zonder spaties eromheen én zonder
 * ONZICHTBARE tekens.
 *
 * ⚠ Waarom dat tweede erbij hoort. `trim()` haalt alleen echte witruimte weg. Plak
 * je een naam uit een website of een pdf, dan zit er soms een teken in dat nergens
 * getekend wordt (een zero-width space, of het onzichtbare teken dat sommige
 * programma's vooraan een bestand zetten). Zo'n naam is niet leeg voor de computer
 * maar wel voor het oog: je krijgt dan een categorie die in elke lijst als een lege
 * regel staat, die je niet kan terugvinden en niet kan onderscheiden van de
 * volgende lege regel.
 */
export function schoneNaam(naam: string): string {
  // U+200B t/m U+200D: zero-width space, non-joiner, joiner. U+FEFF: byte order mark.
  return naam.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
}

/**
 * Bouwt de records voor een nieuwe tak. Zuiver: geen database, geen klok, en de
 * id-generator komt van buiten zodat een test exact kan nagaan wat er weggeschreven
 * wordt.
 *
 * Namen worden opgeschoond (zie `schoneNaam`). Een lege naam is geen fout die deze
 * functie oplost — het scherm laat de knop dan niet toe — maar opschonen hoort hier
 * omdat élke oproeper het anders zelf moet doen.
 */
export function bouwTak(plan: NieuweTak, nieuwId: () => string): TakRecords {
  const categorieen: Categorie[] = []

  let categorieId: string
  if ('id' in plan.categorie) {
    categorieId = plan.categorie.id
  } else {
    let ouderId: string
    if ('id' in plan.categorie.hoofd) {
      ouderId = plan.categorie.hoofd.id
    } else {
      ouderId = nieuwId()
      categorieen.push({ id: ouderId, naam: schoneNaam(plan.categorie.hoofd.naam) })
    }
    categorieId = nieuwId()
    categorieen.push({ id: categorieId, naam: schoneNaam(plan.categorie.naam), ouderId })
  }

  return {
    categorieen,
    subcategorie: { id: nieuwId(), naam: schoneNaam(plan.subnaam), categorieId },
  }
}
