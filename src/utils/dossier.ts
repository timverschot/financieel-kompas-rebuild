import type { Dossier, GedeeldeKost } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'
import { itemPerId } from '../data/categorieen/zoek'

// Bepaalt het effectieve percentage dat JIJ voor één kost draagt, volgens de
// verdeel-hiërarchie, van sterk naar zwak:
//   1. een eigen percentage op de kost zelf (aandeelJijOverride),
//   2. een percentage per categorie (categorieAandelen; een kost op een item zoekt eerst
//      haar eigen id, dan haar middencategorie, dan haar hoofdcategorie),
//   3. een percentage per kostensoort (typeAandelen: gewoon/buitengewoon — in de
//      Belgische praktijk spreken ouders voor buitengewone kosten vaak een andere
//      sleutel af dan voor gewone),
//   4. de dossier-standaard (aandeelJij).
// Een kost zonder kostenType telt als 'gewoon': zo gedragen oude kosten van vóór
// dat veld zich net als wat het formulier vandaag standaard invult.
/**
 * Wordt de standaardverdeling van dit dossier (`aandeelJij`) nog ergens toegepast? (ronde 107)
 *
 * ⚠ WAAROM DIT BESTAAT. `effectiefAandeel` zet `typeAandelen` BOVEN `aandeelJij`, en elke
 * kost is ofwel gewoon ofwel buitengewoon. Vul je dus beide velden van "Verdeling per
 * kostensoort" in — de twee staan naast elkaar, dus dat is de voor de hand liggende handeling
 * — dan wordt `aandeelJij` nooit meer gebruikt. Drie plaatsen bleven het niettemin tonen:
 * *"Standaard draag jij 50%"*, de keuzelijst bovenaan (*"Emma & Lars (jij 50%)"*) en het
 * overzicht op Je situatie — terwijl de app 60% rekende.
 *
 * Verzwarend: `aandeelJij` is na het aanmaken van een dossier niet meer te wijzigen, dus
 * "beide kostensoorten op 60 zetten" IS vandaag de manier om een gewijzigde afspraak te
 * verwerken. Precies de toestand hierboven.
 */
export function standaardWordtNogGebruikt(dossier: Dossier): boolean {
  const perType = dossier.typeAandelen
  return !(typeof perType?.gewoon === 'number' && typeof perType?.buitengewoon === 'number')
}

export function effectiefAandeel(dossier: Dossier, kost: GedeeldeKost): number {
  if (typeof kost.aandeelJijOverride === 'number') return kost.aandeelJijOverride

  const splits = dossier.categorieAandelen
  if (kost.categorieId && splits) {
    if (kost.categorieId in splits) return splits[kost.categorieId]
    // ⚠ RONDE 107 — EERST DE MIDDENLAAG, DAN PAS DE HOOFDCATEGORIE. De kiezer in "Verdeling
    // per categorie" laat je een middencategorie kiezen (bv. *Kinderen en Gezin › Kinderen
    // school*), en die afspraak stond netjes in de lijst — maar een kost die je één stap
    // dieper tagde (*Schoolfactuur Kind 1*) rolde in één sprong door naar de HOOFDcategorie
    // en vond je afspraak nooit. Je stelde 100% in, de app rekende 50%, en de PDF noemde als
    // reden "standaardverdeling van het dossier". Bij een schooljaar van € 2.000 is dat
    // € 1.000 verschil in het document dat naar de andere ouder gaat.
    //
    // Dezelfde ladder als een budget al gebruikt (`regelHoortBijBudget` in utils/budget.ts):
    // item → middencategorie → hoofdcategorie.
    const midden = itemPerId(kost.categorieId)?.categorieId
    if (midden && midden in splits) return splits[midden]
    const groep = groepVanCategorie(kost.categorieId, []).sleutel
    if (groep && groep in splits) return splits[groep]
  }

  const perType = dossier.typeAandelen?.[kost.kostenType ?? 'gewoon']
  if (typeof perType === 'number') return perType

  return dossier.aandeelJij
}

// Zuivere kern: netto verrekening voor een reeks kosten, waarbij het percentage
// per kost bepaald wordt door 'aandeelVan'. Bedragen in centen; er wordt pas op
// het einde afgerond, zodat tussentijdse deel-centen de uitkomst niet laten
// afdrijven. Positief = partner is jou verschuldigd, negatief = jij de partner.
//
// De uitkomst is altijd: WAT JIJ BETAALDE min WAT JIJ MOEST DRAGEN. Dat is precies
// wat er per kost gebeurt, alleen in één keer geteld:
//   betaalde jij de kost, dan komt het deel van de partner erbij;
//   betaalde de partner, dan gaat jouw deel eraf.
//
// Waarom dat expliciet zo geschreven staat (ronde 35): er werd op TWEE plaatsen
// apart afgerond. Deze functie rondde het eindsaldo af, en het afrekeningsoverzicht
// rondde JOUW AANDEEL af en leidde het aandeel van de partner daaruit af. Bij een
// bedrag dat exact op een halve cent uitkomt, geven die twee een verschil van één
// cent — en dan zei hetzelfde document tegelijk "aandeel partner € 61,72" en
// "partner is jou € 61,73 verschuldigd". Eén cent, maar het staat in het stuk dat
// je naar de andere ouder stuurt.
//
// Door hier van hetzelfde AFGERONDE aandeel uit te gaan, sluit elke weergave op
// elkaar aan: totaal = jouw aandeel + aandeel partner, en saldo = betaald − aandeel.
function netto(kosten: GedeeldeKost[], aandeelVan: (k: GedeeldeKost) => number): number {
  let betaaldDoorJou = 0
  let jouwExact = 0
  for (const k of kosten) {
    if (k.betaaldDoor === 'jij') betaaldDoorJou += k.bedrag
    jouwExact += k.bedrag * (aandeelVan(k) / 100)
  }
  return betaaldDoorJou - Math.round(jouwExact)
}

// Verrekening met één vast percentage voor alle kosten (de eenvoudige variant).
export function saldoVerrekening(aandeelJij: number, kosten: GedeeldeKost[]): number {
  return netto(kosten, () => aandeelJij)
}

// Verrekening voor een volledig dossier, waarbij elke kost zijn effectieve
// percentage krijgt volgens de hiërarchie
// (kost-override -> categorie -> kostensoort -> dossier-standaard).
export function saldoVerrekeningDossier(dossier: Dossier, kosten: GedeeldeKost[]): number {
  return netto(kosten, (k) => effectiefAandeel(dossier, k))
}
