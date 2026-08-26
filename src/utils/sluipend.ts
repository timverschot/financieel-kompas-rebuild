import type { TerugkerendePost } from '../data/schema'
import { SLUIPEND_ANDERS, SLUIPENDE_KOSTEN } from '../data/opstelling'

/**
 * Wat maakt een vaste last een SLUIPENDE last? (ronde 84)
 *
 * ⚠ ER BESTAAT GEEN APART SOORT. Een sluipende last is gewoon een vaste last —
 * hetzelfde record, dezelfde lijst, dezelfde rekening. "Sluipend" is een etiket dat de
 * app erbij denkt, zodat ze de kleine abonnementen kan optellen: *"Je sluipende lasten
 * zijn € 87 per maand, oftewel € 1.044 per jaar."*
 *
 * Wat hángt eraan: het bedrag "Waarvan sluipend" bovenaan Je situatie, de zin eronder,
 * én de verdeling van je vaste lasten over de twee aanvinklijsten — het tabblad
 * "Sluipende lasten" telt precies de posten waarvoor deze functie waar zegt, en het
 * tabblad "Vaste lasten" precies de rest. Verandert deze functie van mening over één
 * post, dan verhuist die post van het ene blok naar het andere.
 *
 * ⚠ TWEE REDENEN, EN DE TWEEDE IS NIEUW.
 *
 * 1. **Het VOORSTEL waarop je klikte.** Klik je "Toevoegen" bij Netflix, Fitness of
 *    "Een andere sluipende last", dan schrijft de app `bronVoorstel` mee — en dat
 *    volstaat. Jij zei waar je het toevoegde; de app hoeft het niet af te leiden.
 *
 *    ⚠ DIT GELDT VOOR ALLE ACHTTIEN VOORSTELLEN, niet alleen voor "Een andere
 *    sluipende last" (doorlichting ronde 84). De eerste versie keek hier enkel naar
 *    `sluipend-anders`, en dan bleef precies Timothy's klacht één rij hoger staan: voeg
 *    je Netflix toe via de rij Netflix maar wis je de voorgestelde categorie, dan telde
 *    je abonnement stil niet mee — op de rij waar je het net op zette.
 * 2. **De CATEGORIE.** Staat je post op Streaming Video, Fitnessabonnement,
 *    Krantenabonnement of een van de andere categorieën uit `SLUIPENDE_KOSTEN`, dan
 *    telt hij ook mee. Dit is hoe het altijd al werkte, en het is nodig voor elke post
 *    van vóór ronde 73: die dragen geen `bronVoorstel`.
 */
const SLUIPENDE_CATEGORIEEN: ReadonlySet<string> = new Set(SLUIPENDE_KOSTEN.map((k) => k.categorieId))

/** De sleutels van alle sluipende voorstellen, inclusief de vrije rij. */
const SLUIPENDE_SLEUTELS: ReadonlySet<string> = new Set([
  ...SLUIPENDE_KOSTEN.map((k) => k.sleutel),
  SLUIPEND_ANDERS.sleutel,
])

export function isSluipendeLast(post: TerugkerendePost): boolean {
  if (post.bronVoorstel !== undefined && SLUIPENDE_SLEUTELS.has(post.bronVoorstel)) return true
  return post.categorieId !== undefined && SLUIPENDE_CATEGORIEEN.has(post.categorieId)
}

/**
 * De sluipende lasten die onder geen enkel voorstel vallen — de rij "Een andere
 * sluipende last" verzamelt ze.
 *
 * ⚠ DIT DICHT EEN GAT DAT ER AL LANGER ZAT. Ook vóór deze ronde kon je zelf een
 * abonnement toevoegen met een categorie uit de lijst. Het telde dan gewoon mee in
 * "Waarvan sluipend", maar het stond onder geen enkele rij: die lijst toonde alleen de
 * achttien voorstellen, en jouw "Le Soir" heet naar geen enkel voorstel. Het cijfer
 * telde hem, de lijst verzweeg hem — en dan lijkt de tegel te hoog zonder dat je kan
 * nakijken waarom.
 *
 * `voorstelSleutel` is de functie die zegt onder welk voorstel een post hoort
 * (`undefined` = onder geen enkel). Ze komt van buiten, want alleen het scherm kent de
 * naamtabel in alle drie de talen — deze module hoeft daar niets van te weten.
 */
export function overigeSluipendeLasten(
  posten: readonly TerugkerendePost[],
  voorstelSleutel: (post: TerugkerendePost) => string | undefined,
): TerugkerendePost[] {
  return posten.filter((p) => {
    if (!isSluipendeLast(p)) return false
    const sleutel = voorstelSleutel(p)
    return sleutel === undefined || sleutel === SLUIPEND_ANDERS.sleutel
  })
}
