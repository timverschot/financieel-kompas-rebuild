import type { TerugkerendePost } from '../data/schema'
import type { Vertaler } from '../i18n'
import { formatEuro } from './format'
import { frequentieVan, PERIODE_SLEUTELS } from './vastelast'

/**
 * Waaraan je één vaste last van een gelijknamige andere onderscheidt (ronde 82).
 *
 * ⚠ WAAROM DIT ER KOMT. Twee vaste lasten mogen dezelfde naam dragen —
 * "Autoverzekering" voor de auto en "Autoverzekering" voor de bestelwagen. Ronde 73
 * koos daar uitdrukkelijk voor: het formulier WAARSCHUWT bij een dubbele naam maar
 * blokkeert niet, want twee gezinsauto's bestaan. (Op Budget → Vast kon het daarvóór
 * al, want dat formulier had nooit enige controle.) Diezelfde ronde gaf de knoppen op
 * "Je situatie" daarom bedrag en dag mee. Budget → Vast is nooit meegegaan: daar
 * heetten twee knoppen allebei "Verwijder vaste post Autoverzekering", en met een
 * schermlezer wist je niet welke van de twee je wiste. Het punt stond sinds ronde 76
 * op de open lijst en kwam elke ronde terug.
 *
 * ⚠ ÉÉN REGEL VOOR ALLE DRIE DE PLEKKEN, en dat is de correctie op mijn eerste opzet.
 * Die gaf de knopnaam en de venstertitel het kenmerk ALTIJD, en de ongedaan-balk
 * alleen bij een naamgenoot — met als verantwoording dat een zin die je LEEST er niet
 * mee opgezadeld hoort te worden. Een nakijkronde wees erop dat die verantwoording
 * woord voor woord óók voor de venstertitel geldt, en dat drie regels voor hetzelfde
 * probleem precies is hoe schermen uit elkaar gaan lopen. Dus: **het kortste kenmerk
 * dat volstaat**, overal. Heet er niets anders zo, dan is het kenmerk leeg en blijft
 * de knopnaam "Verwijderen — Autoverzekering" (29 tekens in plaats van 55, en dat
 * telt: een schermlezer leest dat label bij élke knop op élke rij voor).
 */

/** Het bedrag van een post met de periode erachter: "€ 620,00 per jaar". */
export function bedragMetPeriode(t: Vertaler, post: TerugkerendePost): string {
  return `${formatEuro(Math.abs(post.bedrag))} ${t(PERIODE_SLEUTELS[frequentieVan(post)])}`
}

/**
 * Heten deze twee posten hetzelfde?
 *
 * ⚠ Trim en kleine letters, precies zoals `TerugkerendePostFormulier` het vraagt bij
 * zijn duplicaatwaarschuwing en zoals `sleutelVan` het op "Je situatie" doet. Met een
 * exacte vergelijking zou `"Autoverzekering "` (met een spatie erachter) geen
 * naamgenoot zijn van `"Autoverzekering"` — terwijl HTML witruimte samenvouwt en die
 * twee rijen op het scherm dus identiek zijn. Uitgerekend het geval waarin je ze zelf
 * niet kan onderscheiden, zou dan zwijgen. (Werkafspraak van ronde 76: twee functies
 * die dezelfde vraag stellen, moeten hem identiek stellen.)
 */
function heetHetzelfde(a: TerugkerendePost, b: TerugkerendePost): boolean {
  return a.omschrijving.trim().toLowerCase() === b.omschrijving.trim().toLowerCase()
}

/**
 * Het kortste kenmerk dat deze post onderscheidt van de andere in `alle` — of een
 * lege tekst wanneer er niets te onderscheiden valt.
 *
 * ⚠ DRIE TRAPPEN, en elke trap bestaat omdat de vorige tekortschiet:
 *
 *  1. Geen naamgenoot → **leeg**. Verreweg het gewone geval.
 *  2. Wel een naamgenoot → **bedrag met periode, en de dag**. Dat is wat er zichtbaar
 *     op de rij staat, dus je kan het naast elkaar leggen.
 *  3. Ook dát niet onderscheidend → **"(1 van 2)"**. Dit is geen bedacht geval: het
 *     venster van ronde 76 duwt je actief naar "Liever opzeggen", en dan staat je
 *     oude Netflix er nog mét einddatum naast de nieuwe — zelfde naam, zelfde bedrag,
 *     zelfde dag. En ronde 73 laat twee identieke posten bewust toe.
 *
 * ⚠ `alle` hoort de lijst te zijn waar de post ook echt naast staat: op Budget → Vast
 * de posten van dezelfde SOORT. Een vaste inkomst "Huur" (kotgeld) is geen naamgenoot
 * van een vaste last "Huur" — dat is dezelfde afweging die `TerugkerendeSectie` bij
 * `bestaande={eigen}` maakt, en ze telt hier dubbel omdat `bedragMetPeriode` de
 * absolute waarde neemt en een inkomst en een uitgave dus niet uit elkaar zou houden.
 */
export function postKenmerk(t: Vertaler, post: TerugkerendePost, alle: readonly TerugkerendePost[]): string {
  const naamgenoten = alle.filter((p) => p.id !== post.id && heetHetzelfde(p, post))
  if (naamgenoten.length === 0) return ''
  const details = `${bedragMetPeriode(t, post)}, ${t('dag {dag}', { dag: post.dag })}`
  const zelfdeDetails = naamgenoten.filter(
    (p) => `${bedragMetPeriode(t, p)}, ${t('dag {dag}', { dag: p.dag })}` === details,
  )
  if (zelfdeDetails.length === 0) return details
  // ⚠ De volgorde van `alle` bepaalt het nummer, en dat is dezelfde volgorde als op
  // het scherm — de aanroeper geeft de lijst door die hij ook rendert. Zou dit op de
  // id sorteren, dan zou "1 van 2" naar de tweede rij kunnen wijzen.
  const gelijken = alle.filter((p) => heetHetzelfde(p, post))
  const n = gelijken.findIndex((p) => p.id === post.id) + 1
  return t('{details} ({n} van {totaal})', { details, n, totaal: gelijken.length })
}

/**
 * De volledige toegankelijke naam van een knop op een rij met vaste lasten.
 *
 * ⚠ DE ACTIE STAAT VOORAAN. Staat dat woord ook zichtbaar op de knop — "Boek in",
 * "Uitboeken", "Losmaken", en op "Je situatie" ook "Bewerken" en "Verwijderen" — dan
 * voldoet die volgorde meteen aan WCAG 2.5.3: wie de app met zijn stem bedient, zegt
 * wat hij LEEST. Op de icoonknoppen van Budget → Vast (✎ en ×) is er geen zichtbaar
 * woord en is 2.5.3 niet van toepassing; daar houdt dezelfde volgorde de lijst
 * gewoon voorspelbaar.
 */
export function knopnaamVoorPost(
  t: Vertaler,
  actie: string,
  post: TerugkerendePost,
  alle: readonly TerugkerendePost[],
): string {
  const details = postKenmerk(t, post, alle)
  if (details === '') return t('{actie} — {naam}', { actie, naam: post.omschrijving })
  return t('{actie} — {naam}, {details}', { actie, naam: post.omschrijving, details })
}

/**
 * De naam van een post zoals ze in een zichtbare titel of melding hoort te staan:
 * "Netflix", of "Autoverzekering (€ 620,00 per jaar, dag 5)" wanneer er een tweede zo
 * heet.
 */
export function postNaamMetKenmerk(
  t: Vertaler,
  post: TerugkerendePost,
  alle: readonly TerugkerendePost[],
): string {
  const details = postKenmerk(t, post, alle)
  return details === '' ? post.omschrijving : `${post.omschrijving} (${details})`
}
