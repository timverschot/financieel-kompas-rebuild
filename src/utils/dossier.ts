import type { Dossier, GedeeldeKost } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'

// Bepaalt het effectieve percentage dat JIJ voor één kost draagt, volgens de
// verdeel-hiërarchie, van sterk naar zwak:
//   1. een eigen percentage op de kost zelf (aandeelJijOverride),
//   2. een percentage per categorie (categorieAandelen; een kost op een
//      subcategorie/item rolt op naar haar hoofdcategorie),
//   3. een percentage per kostensoort (typeAandelen: gewoon/buitengewoon — in de
//      Belgische praktijk spreken ouders voor buitengewone kosten vaak een andere
//      sleutel af dan voor gewone),
//   4. de dossier-standaard (aandeelJij).
// Een kost zonder kostenType telt als 'gewoon': zo gedragen oude kosten van vóór
// dat veld zich net als wat het formulier vandaag standaard invult.
export function effectiefAandeel(dossier: Dossier, kost: GedeeldeKost): number {
  if (typeof kost.aandeelJijOverride === 'number') return kost.aandeelJijOverride

  const splits = dossier.categorieAandelen
  if (kost.categorieId && splits) {
    if (kost.categorieId in splits) return splits[kost.categorieId]
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
