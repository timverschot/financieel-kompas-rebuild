import type { Categorie, Dossier, GedeeldeKost, Kind, Kostentype, Verrekening } from '../data/schema'
import { groepVanCategorie, labelVanCategorie } from '../data/categorieen/resolve'
import { effectiefAandeel, saldoVerrekeningDossier } from './dossier'
// Bewust dezelfde functie als de uitwisseling zelf gebruikt, niet een kopie: liep
// die uit elkaar, dan zou het scherm "moet nog beantwoord worden" zeggen terwijl
// de bewijsmap "aanvaard door de andere ouder" drukt.
import { reactieVervallen } from './uitwisseling'

// ---------------------------------------------------------------------------
// Dit bestand is de ENIGE rekenkern achter een afrekening. De PDF-export en de
// klembordtekst halen hun cijfers hier op en doen zelf niets meer dan opmaken.
// Zo kan er nooit een verschil ontstaan tussen wat het PDF-bewijsstuk toont en
// wat je naar je ex-partner doorstuurt.
//
// Alles blijft in hele centen. Er wordt pas HELEMAAL op het einde afgerond, net
// zoals de netto-berekening in dossier.ts dat doet, en elke uitsplitsing wordt
// zo afgerond dat ze exact optelt tot hetzelfde totaal. Een uitsplitsing die
// niet optelt tot het totaal is erger dan geen uitsplitsing: dan lijkt het alsof
// er geld verdwijnt.
// ---------------------------------------------------------------------------

// De kosten die een afrekening dekt (volgens de opgeslagen momentopname kostIds).
export function afrekeningKosten(afrekening: Verrekening, kosten: GedeeldeKost[]): GedeeldeKost[] {
  const ids = new Set(afrekening.kostIds ?? [])
  return kosten.filter((k) => ids.has(k.id))
}

// Waar komt het toegepaste percentage vandaan? Dit is enkel een LABEL: het
// percentage zelf komt altijd uit effectiefAandeel() in dossier.ts.
// 'uitwisseling' (ronde 44): het percentage komt niet van een eigen keuze maar van
// de andere ouder, vastgepind bij het inlezen van een uitwisselbestand. Dat als
// 'kost' rapporteren zou in het document beweren dat je het zelf koos.
export type AandeelHerkomst = 'kost' | 'categorie' | 'kostensoort' | 'dossier' | 'uitwisseling' | 'onbekend'

export type AandeelUitleg = {
  percentageJij: number
  herkomst: AandeelHerkomst
  // Waar de regel op slaat: de categorienaam, of de kostensoort. Leeg bij een
  // eigen percentage op de kost en bij de dossier-standaard.
  bron: string
}

// Zoekt uit welke regel het percentage van deze kost bepaalde. Het getal komt
// altijd van effectiefAandeel(); we controleren daarna welke regel datzelfde
// getal oplevert. Klopt geen enkele regel (bv. omdat de hiërarchie in dossier.ts
// later verandert), dan zeggen we eerlijk 'onbekend' in plaats van een verkeerde
// uitleg te tonen.
export function aandeelUitleg(
  dossier: Dossier,
  kost: GedeeldeKost,
  gebruikerCategorieen: Categorie[] = [],
): AandeelUitleg {
  const percentageJij = effectiefAandeel(dossier, kost)

  if (kost.aandeelJijOverride === percentageJij) {
    return { percentageJij, herkomst: kost.uitwisselId ? 'uitwisseling' : 'kost', bron: '' }
  }

  const splits = dossier.categorieAandelen
  if (kost.categorieId && splits) {
    const eigen = splits[kost.categorieId]
    if (eigen === percentageJij) {
      return { percentageJij, herkomst: 'categorie', bron: labelVanCategorie(kost.categorieId, gebruikerCategorieen) ?? kost.categorieId }
    }
    const groep = groepVanCategorie(kost.categorieId, gebruikerCategorieen)
    if (groep.sleutel && splits[groep.sleutel] === percentageJij) {
      return { percentageJij, herkomst: 'categorie', bron: groep.naam }
    }
  }

  const soort: Kostentype = kost.kostenType ?? 'gewoon'
  if (dossier.typeAandelen?.[soort] === percentageJij) {
    return { percentageJij, herkomst: 'kostensoort', bron: soort }
  }

  if (dossier.aandeelJij === percentageJij) return { percentageJij, herkomst: 'dossier', bron: '' }

  return { percentageJij, herkomst: 'onbekend', bron: '' }
}

// Eén rij van een uitsplitsing (per kind, per categorie of per kostensoort).
export type AfrekeningGroep = {
  sleutel: string
  // De weergavenaam. 'vertaalbaar' zegt of dit een vaste app-tekst is (dan mag
  // t() erop) of gebruikersdata zoals een kindnaam (die vertaal je nooit).
  naam: string
  vertaalbaar: boolean
  aantal: number
  totaal: number // wat er in deze groep is uitgegeven
  jouwAandeel: number // wat jij van dat bedrag hoort te dragen
  partnerAandeel: number // = totaal - jouwAandeel
  betaaldDoorJou: number
  betaaldDoorPartner: number // = totaal - betaaldDoorJou
  netto: number // effect op het saldo; positief = partner is jou dit verschuldigd
}

// Eén regel in de detaillijst: alles wat nodig is om de rij na te rekenen.
export type AfrekeningRegel = {
  kostId: string
  datum: string
  omschrijving: string
  bedrag: number
  betaaldDoorJou: boolean
  percentageJij: number
  herkomst: AandeelHerkomst
  bron: string
  kostenType: Kostentype
  kindNamen: string[]
  categorieNaam: string
  heeftCategorie: boolean
  heeftBonnetje: boolean
  // Het antwoord van de andere ouder op deze kost (ronde 44), zodat de PDF en de
  // klembordtekst het kunnen vermelden. Een document dat een betwisting verzwijgt
  // is erger dan geen document: dat is net het enige waar discussie over is.
  reactie?: 'akkoord' | 'betwist'
  // De reden die de andere ouder opgaf. Juist dát is voor een bemiddelaar het
  // interessantste stuk: niet DAT er betwist wordt, maar waarom.
  reactieReden?: string
  jouwAandeel: number
  partnerAandeel: number
  netto: number
}

// Eén gebruikte verdeelsleutel, met hoeveel kosten er onder vielen.
export type Verdeelsleutel = {
  percentageJij: number
  herkomst: AandeelHerkomst
  bron: string
  aantalKosten: number
  totaal: number
}

export type AfrekeningOverzicht = {
  dossierNaam: string
  datum: string // de datum van de afrekening zelf
  periodeVan?: string
  periodeTot?: string
  kindNamen: string[] // waarop de afrekening filterde; leeg = alle kinderen
  aantalKosten: number
  aantalMetBonnetje: number
  // Hoeveel van die kosten de andere ouder betwist, respectievelijk aanvaardde
  // (ronde 44). Ze tellen gewoon mee in alle bedragen — stil geld uit een
  // afrekening laten vallen is erger — maar ze staan er wel bij.
  aantalBetwist: number
  aantalAkkoord: number
  totaal: number
  betaaldDoorJou: number
  betaaldDoorPartner: number
  jouwAandeel: number
  partnerAandeel: number
  netto: number // herberekend met de verdeelsleutels van vandaag
  bewaardNetto: number // wat er bij het genereren werd vastgelegd
  wijktAf: boolean // true als beide verschillen (dossierverdeling is sindsdien gewijzigd)
  verdeelsleutels: Verdeelsleutel[]
  perKind: AfrekeningGroep[]
  perCategorie: AfrekeningGroep[]
  perKostensoort: AfrekeningGroep[]
  regels: AfrekeningRegel[]
}

// De sleutel voor kosten die aan geen enkel kind hangen. We verzinnen géén
// toewijzing die er niet is: zulke kosten krijgen een eigen noemer.
export const ZONDER_KIND = '__zonder-kind__'

// Verdeelt afgeronde centen over een reeks exacte (nog niet afgeronde) waarden,
// zó dat de som van de afgeronde waarden exact het doel is. Het werkt met een
// lopend totaal: elke rij krijgt het verschil tussen het afgeronde lopende
// totaal vóór en na die rij. Daardoor wijkt geen enkele rij meer dan één cent af
// van haar exacte waarde, en klopt de kolomsom altijd. Werkt ook met negatieve
// bedragen (een saldo kan naar beide kanten uitslaan).
export function centenVerdelen(waarden: number[], doel?: number): number[] {
  const uit: number[] = []
  let lopend = 0
  let gegeven = 0
  for (const w of waarden) {
    lopend += w
    const tot = Math.round(lopend)
    uit.push(tot - gegeven)
    gegeven = tot
  }
  if (typeof doel === 'number' && uit.length > 0 && gegeven !== doel) {
    // Vangnet: het doel werd elders berekend (bv. door saldoVerrekeningDossier),
    // in een andere optelvolgorde. Bij een halve cent kan dat één cent schelen.
    // Dat verschil leggen we bij de grootste rij, zodat het totaal exact klopt.
    let grootste = 0
    for (let i = 1; i < waarden.length; i++) {
      if (Math.abs(waarden[i]) > Math.abs(waarden[grootste])) grootste = i
    }
    uit[grootste] += doel - gegeven
  }
  return uit
}

// De totalen waar élke uitsplitsing exact op moet uitkomen.
type Doelen = { totaal: number; jouwAandeel: number; betaaldDoorJou: number; netto: number }

// Eén bijdrage van een kost aan een groep. 'fractie' is 1 voor een gewone
// groepering, en 1/n wanneer een kost gelijk over n kinderen verdeeld wordt.
type Bijdrage = { kost: GedeeldeKost; fractie: number }
type RuweGroep = { sleutel: string; naam: string; vertaalbaar: boolean; bijdragen: Bijdrage[] }

function maakGroepen(dossier: Dossier, ruwe: RuweGroep[], doelen: Doelen): AfrekeningGroep[] {
  const totaalEx: number[] = []
  const jouwEx: number[] = []
  const betaaldEx: number[] = []
  const nettoEx: number[] = []

  for (const groep of ruwe) {
    let totaal = 0
    let jouw = 0
    let betaald = 0
    let netto = 0
    for (const { kost, fractie } of groep.bijdragen) {
      const deel = kost.bedrag * fractie
      const jouwDeel = deel * (effectiefAandeel(dossier, kost) / 100)
      totaal += deel
      jouw += jouwDeel
      if (kost.betaaldDoor === 'jij') {
        betaald += deel
        netto += deel - jouwDeel // partner is jou zijn deel verschuldigd
      } else {
        netto -= jouwDeel // jij bent jouw deel verschuldigd
      }
    }
    totaalEx.push(totaal)
    jouwEx.push(jouw)
    betaaldEx.push(betaald)
    nettoEx.push(netto)
  }

  const totaal = centenVerdelen(totaalEx, doelen.totaal)
  const jouw = centenVerdelen(jouwEx, doelen.jouwAandeel)
  const betaald = centenVerdelen(betaaldEx, doelen.betaaldDoorJou)
  const netto = centenVerdelen(nettoEx, doelen.netto)

  return ruwe.map((groep, i) => ({
    sleutel: groep.sleutel,
    naam: groep.naam,
    vertaalbaar: groep.vertaalbaar,
    aantal: groep.bijdragen.length,
    totaal: totaal[i],
    jouwAandeel: jouw[i],
    // Bewust afgeleid: zo klopt élke rij ook overlangs (totaal = jij + partner).
    partnerAandeel: totaal[i] - jouw[i],
    betaaldDoorJou: betaald[i],
    betaaldDoorPartner: totaal[i] - betaald[i],
    netto: netto[i],
  }))
}

// Bouwt het volledige, uitgesplitste overzicht van één afrekening.
export function bouwAfrekeningOverzicht(
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[] = [],
  gebruikerCategorieen: Categorie[] = [],
  // Of een kost een bon heeft. Standaard: het `bonnetje`-veld op de kost zelf.
  //
  // Ronde 41: de bewijsmap geeft hier een strengere versie mee, die ook de
  // documentkluis kent. Boek je een uitgave, hang je de bon eraan en deel je die in
  // een dossier, dan zit de bonfoto namelijk in de kluis onder `transactieId` en
  // NIET op de gedeelde kost. Zonder deze haak zei het document "geen bon" en
  // "waarvan 0 met bon" bij kosten waar wél een bon van bestond — en dan mist
  // precies het bewijsstuk dat je wilde meesturen.
  heeftBon: (kost: GedeeldeKost) => boolean = (kost) => !!kost.bonnetje,
): AfrekeningOverzicht {
  const regelKosten = afrekeningKosten(afrekening, kosten)
  const kindNaam = (id: string) => kinderen.find((k) => k.id === id)?.naam ?? id

  // 1. De doeltotalen. Deze staan vast; elke uitsplitsing moet er exact op
  //    uitkomen. Het netto komt rechtstreeks uit dossier.ts, zodat de afrekening
  //    nooit een ander saldo toont dan de rest van de app.
  let totaal = 0
  let betaaldDoorJou = 0
  let jouwExact = 0
  for (const k of regelKosten) {
    totaal += k.bedrag
    if (k.betaaldDoor === 'jij') betaaldDoorJou += k.bedrag
    jouwExact += k.bedrag * (effectiefAandeel(dossier, k) / 100)
  }
  const doelen: Doelen = {
    totaal,
    jouwAandeel: Math.round(jouwExact),
    betaaldDoorJou,
    netto: saldoVerrekeningDossier(dossier, regelKosten),
  }

  // 2. Per kind. Een kost die aan meerdere kinderen hangt, wordt gelijk over die
  //    kinderen verdeeld. Een kost zonder kind krijgt een eigen noemer.
  const perKindRuw = new Map<string, Bijdrage[]>()
  const push = (sleutel: string, bijdrage: Bijdrage) => {
    const lijst = perKindRuw.get(sleutel)
    if (lijst) lijst.push(bijdrage)
    else perKindRuw.set(sleutel, [bijdrage])
  }
  for (const k of regelKosten) {
    const ids = k.kindIds ?? []
    if (ids.length === 0) push(ZONDER_KIND, { kost: k, fractie: 1 })
    else for (const id of ids) push(id, { kost: k, fractie: 1 / ids.length })
  }
  // Volgorde: eerst de kinderen zoals ze in de app staan, dan onbekende id's,
  // en 'niet toegewezen' altijd als laatste.
  const kindSleutels: string[] = []
  for (const kind of kinderen) if (perKindRuw.has(kind.id)) kindSleutels.push(kind.id)
  for (const sleutel of perKindRuw.keys()) {
    if (sleutel !== ZONDER_KIND && !kindSleutels.includes(sleutel)) kindSleutels.push(sleutel)
  }
  if (perKindRuw.has(ZONDER_KIND)) kindSleutels.push(ZONDER_KIND)
  const perKind = maakGroepen(
    dossier,
    kindSleutels.map((sleutel) => ({
      sleutel,
      naam: sleutel === ZONDER_KIND ? 'Niet toegewezen aan een kind' : kindNaam(sleutel),
      vertaalbaar: sleutel === ZONDER_KIND,
      bijdragen: perKindRuw.get(sleutel) ?? [],
    })),
    doelen,
  )

  // 3. Per (hoofd)categorie. Een kost op een subcategorie rolt op naar haar
  //    hoofdcategorie, zodat 'Brood' en 'Melk' samen onder 'Voeding' staan.
  const perCatRuw = new Map<string, { naam: string; bijdragen: Bijdrage[] }>()
  for (const k of regelKosten) {
    const groep = groepVanCategorie(k.categorieId, gebruikerCategorieen)
    const bestaand = perCatRuw.get(groep.sleutel)
    if (bestaand) bestaand.bijdragen.push({ kost: k, fractie: 1 })
    else perCatRuw.set(groep.sleutel, { naam: groep.naam, bijdragen: [{ kost: k, fractie: 1 }] })
  }
  const catRuw: RuweGroep[] = [...perCatRuw.entries()].map(([sleutel, waarde]) => ({
    sleutel,
    naam: waarde.naam,
    // Categorienamen komen uit de categorieboom of van de gebruiker zelf: die
    // vertalen we niet.
    vertaalbaar: false,
    bijdragen: waarde.bijdragen,
  }))
  // Grootste post eerst; bij gelijk bedrag alfabetisch, zodat de volgorde vast ligt.
  const catSom = (g: RuweGroep) => g.bijdragen.reduce((s, b) => s + b.kost.bedrag * b.fractie, 0)
  catRuw.sort((a, b) => catSom(b) - catSom(a) || a.naam.localeCompare(b.naam))
  const perCategorie = maakGroepen(dossier, catRuw, doelen)

  // 4. Per kostensoort. Een kost zonder kostenType telt als 'gewoon', net zoals
  //    in dossier.ts.
  const soorten: Kostentype[] = ['gewoon', 'buitengewoon']
  const soortRuw: RuweGroep[] = soorten
    .map((soort) => ({
      sleutel: soort,
      naam: soort === 'gewoon' ? 'Gewone kosten' : 'Buitengewone kosten',
      vertaalbaar: true,
      bijdragen: regelKosten.filter((k) => (k.kostenType ?? 'gewoon') === soort).map((kost) => ({ kost, fractie: 1 })),
    }))
    .filter((g) => g.bijdragen.length > 0)
  const perKostensoort = maakGroepen(dossier, soortRuw, doelen)

  // 5. De detaillijst. Ook hier lopen de bedragen door dezelfde afronding, zodat
  //    de kolom 'jouw aandeel' van de detaillijst optelt tot hetzelfde totaal.
  const gesorteerd = [...regelKosten].sort(
    (a, b) => a.datum.localeCompare(b.datum) || a.omschrijving.localeCompare(b.omschrijving) || a.id.localeCompare(b.id),
  )
  const perKost = maakGroepen(
    dossier,
    gesorteerd.map((kost) => ({ sleutel: kost.id, naam: kost.omschrijving, vertaalbaar: false, bijdragen: [{ kost, fractie: 1 }] })),
    doelen,
  )
  const regels: AfrekeningRegel[] = gesorteerd.map((k, i) => {
    const uitleg = aandeelUitleg(dossier, k, gebruikerCategorieen)
    return {
      kostId: k.id,
      datum: k.datum,
      omschrijving: k.omschrijving,
      bedrag: k.bedrag,
      betaaldDoorJou: k.betaaldDoor === 'jij',
      percentageJij: uitleg.percentageJij,
      herkomst: uitleg.herkomst,
      bron: uitleg.bron,
      kostenType: k.kostenType ?? 'gewoon',
      kindNamen: (k.kindIds ?? []).map(kindNaam),
      categorieNaam: groepVanCategorie(k.categorieId, gebruikerCategorieen).naam,
      heeftCategorie: !!k.categorieId,
      heeftBonnetje: heeftBon(k),
      ...(k.reactie && !reactieVervallen(k)
        ? { reactie: k.reactie.soort, ...(k.reactie.reden ? { reactieReden: k.reactie.reden } : {}) }
        : {}),
      jouwAandeel: perKost[i].jouwAandeel,
      partnerAandeel: perKost[i].partnerAandeel,
      netto: perKost[i].netto,
    }
  })

  // 6. De gebruikte verdeelsleutels, met hoeveel kosten er onder vielen.
  const sleutelMap = new Map<string, Verdeelsleutel>()
  for (const r of regels) {
    const sleutel = `${r.percentageJij}|${r.herkomst}|${r.bron}`
    const bestaand = sleutelMap.get(sleutel)
    if (bestaand) {
      bestaand.aantalKosten += 1
      bestaand.totaal += r.bedrag
    } else {
      sleutelMap.set(sleutel, {
        percentageJij: r.percentageJij,
        herkomst: r.herkomst,
        bron: r.bron,
        aantalKosten: 1,
        totaal: r.bedrag,
      })
    }
  }
  const verdeelsleutels = [...sleutelMap.values()].sort((a, b) => b.totaal - a.totaal || a.percentageJij - b.percentageJij)

  return {
    dossierNaam: dossier.naam,
    datum: afrekening.datum,
    ...(afrekening.periodeVan ? { periodeVan: afrekening.periodeVan } : {}),
    ...(afrekening.periodeTot ? { periodeTot: afrekening.periodeTot } : {}),
    kindNamen: (afrekening.kindIds ?? []).map(kindNaam),
    aantalKosten: regelKosten.length,
    aantalMetBonnetje: regelKosten.filter((k) => heeftBon(k)).length,
    aantalBetwist: regels.filter((r) => r.reactie === 'betwist').length,
    aantalAkkoord: regels.filter((r) => r.reactie === 'akkoord').length,
    totaal,
    betaaldDoorJou,
    betaaldDoorPartner: totaal - betaaldDoorJou,
    jouwAandeel: doelen.jouwAandeel,
    partnerAandeel: totaal - doelen.jouwAandeel,
    netto: doelen.netto,
    bewaardNetto: afrekening.bedrag,
    wijktAf: afrekening.bedrag !== doelen.netto,
    verdeelsleutels,
    perKind,
    perCategorie,
    perKostensoort,
    regels,
  }
}
