import { itemPerId } from '../data/categorieen/zoek'
import type { Vertaler } from '../i18n'

// Waar hangt een gekozen SUBcategorie? (ronde 78)
//
// ⚠ WAAROM DIT EEN EIGEN BESTAND IS. Ronde 67 sprak een regel af, in Timothy's eigen
// woorden: *"zorg dat de reeds bestaande subcategorieën enkel een vermelding van de
// hoofdcategorie en categorie te zien krijgen, en enkel bij andere input die
// keuzefunctie wordt aangeboden"*. Een afgemaakte keuze is geen vraag meer.
//
// Die regel is toen in `CategorieKiezer` gezet — het gewone boekingsformulier — maar
// NIET in `ItemZoeker`, het zoekveld van een kassaticketregel. **Drie dagen later**
// kwam dat terug in Timothy's eigen gebruik: op een ticketregel bleef de knop
// "Hoofdcategorie: …" gewoon staan naast een gekozen subcategorie, hij bleef
// aanklikbaar, en een tik erop verving zijn "Brood (wit)" door de brede
// hoofdcategorie "Drank" — omschrijving ongewijzigd, categorie verkeerd, geen woord.
//
// ⚠ WAT DIE VERWISSELING PRECIES KOST, nagerekend en niet geschat (doorlichting
// ronde 78). Ze kantelt: de Analyse per hoofdcategorie en de donut, de stijgers en
// dalers, élk budget op Voeding of daaronder, de vooruitblik, de CSV-export en de
// uitsplitsing in de boekingenlijst. Ze kantelt NIET: de maandgrafiek (die kijkt
// alleen naar het teken), de besparingskaart (Voeding en Drank zitten daar in
// hetzelfde domein) en een afrekening met de co-ouder. "Overal" was te breed gezegd;
// het is genoeg.
//
// Dat is precies de val die dit project al kent (huisregel sinds ronde 73): twee
// invulwegen naar hetzelfde record lopen ooit uit elkaar. De regel staat daarom nu
// één keer, hier, en allebei de schermen lezen hem.
//
// ⚠ EN DE NAAM IS BEWUST `subcategoriePad` EN NIET `categoriePad` (doorlichting ronde
// 78). `data/categorieen/resolve.ts` heeft al een `padVanCategorie`, en die geeft iets
// ánders terug: hoofdcategorie › ITEM ("Voeding › Brood (wit)"), zonder vertaling. Twee
// functies met bijna dezelfde naam en een verschillende uitkomst zijn precies de
// verwarring die deze ronde zegt op te ruimen.

/**
 * "Voeding › Broodwaren" — waar de gekozen subcategorie hangt.
 *
 * `undefined` zodra de keuze GEEN subcategorie is (een hoofdcategorie, een
 * middencategorie, of niets). Dat is niet zomaar een lege uitkomst maar de kern van
 * de afspraak: alleen onderaan de boom is er niets meer te kiezen, en alleen dán
 * verdwijnen de keuzeknoppen. Bij een hoofd- of middencategorie is de laag eronder
 * juist de logische volgende stap.
 *
 * ⚠ WELKE NAAM WEL EN NIET DOOR `t()` MAG. Een naam die de gebruiker zelf intikte
 * gaat er NOOIT doorheen: noemt hij een eigen hoofdcategorie "Sport" of "Auto", dan
 * zijn dat toevallig ook vertaalsleutels van de app, en zou zijn categorie in het
 * Engels ineens anders heten dan op de knop ernaast. De middenlaag blijft altijd
 * staan zoals ze is; de ingebouwde middencategorieën hebben sowieso geen vertaling.
 */
export function subcategoriePad(
  categorieId: string | undefined,
  eigenHoofdIds: ReadonlySet<string>,
  t: Vertaler,
): string | undefined {
  if (!categorieId) return undefined
  const item = itemPerId(categorieId)
  if (!item) return undefined
  const hoofd = eigenHoofdIds.has(item.hoofdId) ? item.hoofdNaam : t(item.hoofdNaam)
  return `${hoofd} › ${item.categorieNaam}`
}
