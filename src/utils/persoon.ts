import type { Gezinslid, Gezinsrol } from '../data/schema'

// Rekenkern rond gezinsleden. Alles zuiver en los testbaar, zodat de verdeling
// van een kost over meerdere personen nergens anders opnieuw uitgevonden wordt.
//
// LET OP: intern heet een gezinslid nog altijd "kind" (het type Kind, het
// event-type 'kind.bewaard' en het veld 'kindIds'). Dat blijft bewust zo: die
// namen staan letterlijk in élke bestaande logregel en in elke back-up. Enkel wat
// de gebruiker ziet, spreekt van "gezinsleden".

// De weergavenaam (Nederlandse sleutel voor t()) van een rol. De opgeslagen
// waarde ('kind', 'partner', …) blijft taal-onafhankelijk; enkel deze tekst wordt
// vertaald.
export const ROL_SLEUTELS: Record<Gezinsrol, string> = {
  kind: 'Kind',
  partner: 'Partner',
  ikzelf: 'Ikzelf',
  ander: 'Ander',
}

/** De naam van een gezinslid, of undefined als het lid (niet meer) bestaat. */
export function naamVanPersoon(id: string | undefined | null, leden: Gezinslid[]): string | undefined {
  if (!id) return undefined
  return leden.find((l) => l.id === id)?.naam
}

/** Enkel de niet-gearchiveerde leden: dit is wat in keuzelijsten hoort te staan. */
export function actieveGezinsleden(leden: Gezinslid[]): Gezinslid[] {
  return leden.filter((l) => !l.gearchiveerd)
}

// Heeft het zin om een keuzeveld voor gezinsleden te tonen? Enkel als er iets te
// kiezen valt, óf als er al iemand gekozen is — dat laatste mag nooit onzichtbaar
// worden, ook niet wanneer die persoon intussen gearchiveerd is.
export function heeftKiesbareLeden(leden: Gezinslid[], gekozen?: string): boolean {
  return actieveGezinsleden(leden).length > 0 || Boolean(gekozen)
}

// Een bedrag (in centen) in gelijke delen splitsen. Omdat centen gehele getallen
// zijn, blijft er bij een oneven deling een restje over: € 10,00 door 3 is
// 333 + 333 + 333 = 999 centen, één cent te weinig. Dat restje gaat naar het
// LAATSTE deel, zodat de som van de delen altijd exact het oorspronkelijke bedrag
// is. Zo kan een taart nooit meer of minder zijn dan het geheel.
export function verdeelBedrag(bedrag: number, aantal: number): number[] {
  if (!Number.isFinite(bedrag) || aantal <= 0) return []
  const basis = Math.trunc(bedrag / aantal)
  const delen = new Array<number>(aantal).fill(basis)
  delen[aantal - 1] = bedrag - basis * (aantal - 1)
  return delen
}

/** Eén post om te verdelen: een bedrag (positief, in centen) en de personen eraan. */
export type TeVerdelenPost = { bedrag: number; persoonIds?: string[] }

/**
 * Eén regel in de verdeling. 'id' is null voor de groep 'Het gezin'.
 *
 * `gedeeld` is waar zodra er ook maar één post aan deze regel bijdroeg die aan
 * MEERDERE personen hing. Dat is geen detail voor de weergave maar een grens voor
 * wat de app met de regel mag doen (ronde 49): bij een gedeelde post staat hier een
 * BEREKEND aandeel — een derde van een kost van € 90 — en zo'n bedrag bestaat
 * nergens als boeking. Doorklikken naar "de boekingen achter dit bedrag" zou dan
 * € 90 tonen waar € 30 staat. Alleen een regel zonder verdeling wijst een echte
 * verzameling boekingen aan.
 */
export type PersoonPost = { id: string | null; naam: string; bedrag: number; gedeeld: boolean }

/**
 * De teksten die de verdeling nodig heeft. Ze komen van buiten (via t()), zodat
 * deze functie zelf taal-onafhankelijk blijft.
 *
 * `gezin` is de groep voor alles wat aan niemand persoonlijk hangt. Die heette
 * vroeger "Niet toegewezen", wat las alsof je iets vergeten was — terwijl een
 * uitgave zonder persoon net het normale geval is: boodschappen, elektriciteit,
 * de huur. Dat is het gezin.
 */
export type PersoonLabels = { gezin: string; onbekend: string }

// Verdeelt een reeks bedragen over de gezinsleden waaraan ze hangen.
//
// Regels:
//  - hangt een post aan meerdere personen, dan wordt het bedrag GELIJK verdeeld
//    (met het restje naar het laatste deel, zie verdeelBedrag);
//  - een post zonder personen komt in de groep 'Het gezin';
//  - een id dat geen bestaand lid meer is, krijgt een eigen regel 'Onbekend'
//    (het bedrag verdwijnt dus nooit stil uit het totaal);
//  - de gezinsgroep staat altijd onderaan, de rest van groot naar klein.
export function uitgavenPerPersoon(
  posten: TeVerdelenPost[],
  leden: Gezinslid[],
  labels: PersoonLabels,
): PersoonPost[] {
  const perPersoon = new Map<string, number>()
  // De personen van wie minstens één bijdrage uit een GEDEELDE post kwam.
  const gedeeldeIds = new Set<string>()
  let gezin = 0
  let heeftGezin = false

  for (const post of posten) {
    // Dubbele id's binnen één post tellen als één persoon: anders zou dezelfde
    // persoon twee keer een deel krijgen.
    const ids = [...new Set((post.persoonIds ?? []).filter((id) => id))]
    if (ids.length === 0) {
      gezin += post.bedrag
      heeftGezin = true
      continue
    }
    const delen = verdeelBedrag(post.bedrag, ids.length)
    ids.forEach((id, i) => perPersoon.set(id, (perPersoon.get(id) ?? 0) + delen[i]))
    if (ids.length > 1) for (const id of ids) gedeeldeIds.add(id)
  }

  const rijen: PersoonPost[] = [...perPersoon.entries()]
    .map(([id, bedrag]) => ({
      id,
      naam: naamVanPersoon(id, leden) ?? labels.onbekend,
      bedrag,
      gedeeld: gedeeldeIds.has(id),
    }))
    .sort((a, b) => b.bedrag - a.bedrag || a.naam.localeCompare(b.naam))

  // De gezinsgroep is per definitie nooit verdeeld: daar komt elke post in haar
  // geheel in terecht.
  if (heeftGezin) rijen.push({ id: null, naam: labels.gezin, bedrag: gezin, gedeeld: false })
  return rijen
}
