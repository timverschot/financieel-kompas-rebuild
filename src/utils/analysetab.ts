/**
 * De drie onderdelen van de Analyse-pagina (ronde 60).
 *
 * ⚠ WAAROM DIT ER KOMT. De pagina zette NEGEN kaarten onder elkaar: waar loop je
 * op, wat werd er duurder, vier verdelingen, de trends, je vermogen en de
 * vooruitblik. Dat is niet één scherm maar drie vragen op elkaar gestapeld, en op
 * een telefoon betekende het scrollen tot je vond wat je zocht — of, vaker, tot je
 * ophield met zoeken.
 *
 * De indeling volgt de VRAAG die je stelt, niet het soort grafiek:
 *  - `verdeling` — waar gaat mijn geld heen? (de vier donuts)
 *  - `verandering` — wat is er anders dan vroeger? (besparen, prijsstijgingen, trends)
 *  - `vooruit` — waar sta ik straks? (vermogen en vooruitblik)
 *
 * Taal-onafhankelijke sleutels, zoals overal: ze staan in het adres (`#/analyse/…`),
 * en dat adres mag niet met de taal meeveranderen. Verder wordt de keuze nérgens
 * bewaard — niet in de instellingen, niet in de database: sluit je de app, dan open
 * je weer op het eerste tabblad.
 */
export const ANALYSE_TABS = ['verdeling', 'verandering', 'vooruit'] as const
export type AnalyseTab = (typeof ANALYSE_TABS)[number]
