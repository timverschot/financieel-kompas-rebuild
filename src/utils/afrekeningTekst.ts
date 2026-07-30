import type { Categorie, Dossier, DossierDocument, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { formatEuro } from './format'
import { vandaag } from './datum'
import { bonnenVanKost } from './kluis'
import {
  bouwAfrekeningOverzicht,
  type AfrekeningGroep,
  type AfrekeningOverzicht,
  type AfrekeningRegel,
  type Verdeelsleutel,
} from './afrekeningOverzicht'

// De momentopname-selectie hoort bij de rekenkern; hier enkel doorgegeven zodat
// bestaande imports blijven werken.
export { afrekeningKosten } from './afrekeningOverzicht'

/**
 * Heeft deze kost een bon — waar hij ook hangt?
 *
 * Eén regel, maar hij staat hier zodat de klembordtekst, de afrekening-PDF, de opbouw
 * op het scherm en de bewijsmap alle vier dezelfde vraag op dezelfde manier stellen.
 * Deden ze dat niet, dan zei het ene document "geen bon" en het andere "zie bijlage 3"
 * over precies dezelfde kost.
 */
export function heeftEenBon(kost: GedeeldeKost, documenten: DossierDocument[] = []): boolean {
  return bonnenVanKost(kost, documenten).length > 0
}

// Nette tekst voor het verrekensaldo. Positief = partner is jou verschuldigd.
export function verrekenTekst(t: Vertaler, netto: number): string {
  if (netto > 0) return t('Partner is jou {bedrag} verschuldigd', { bedrag: formatEuro(netto) })
  if (netto < 0) return t('Jij bent partner {bedrag} verschuldigd', { bedrag: formatEuro(-netto) })
  return t('Niets te verrekenen')
}

// ---------------------------------------------------------------------------
// Gedeelde bewoordingen. De PDF-export gebruikt exact dezelfde functies, zodat
// het PDF-bewijsstuk en de doorgestuurde tekst woord voor woord hetzelfde zeggen.
// Bewust ASCII-vriendelijk (geen pijltjes of emoji): jsPDF kan die in het
// standaardlettertype niet tonen.
// ---------------------------------------------------------------------------

// De periode van de afrekening, of 'alle periodes' wanneer ze niet begrensd is.
export function periodeTekst(t: Vertaler, o: AfrekeningOverzicht): string {
  if (!o.periodeVan && !o.periodeTot) return t('alle periodes')
  return `${o.periodeVan ?? '…'} – ${o.periodeTot ?? '…'}`
}

// Op welke kinderen de afrekening filterde.
export function kinderenTekst(t: Vertaler, o: AfrekeningOverzicht): string {
  return o.kindNamen.length > 0 ? o.kindNamen.join(', ') : t('alle kinderen')
}

// De naam van een uitsplitsingsrij. Vaste app-teksten gaan door t(); kindnamen
// en categorienamen zijn gebruikersdata en worden nooit vertaald.
export function groepLabel(t: Vertaler, groep: AfrekeningGroep): string {
  return groep.vertaalbaar ? t(groep.naam) : groep.naam
}

// 'jij 60% / partner 40%'
export function sleutelPercentages(t: Vertaler, percentageJij: number): string {
  return t('jij {p}% / partner {q}%', { p: percentageJij, q: 100 - percentageJij })
}

// Waarom dit percentage gold, in klare taal.
export function sleutelHerkomst(t: Vertaler, s: Verdeelsleutel): string {
  if (s.herkomst === 'kost') return t('eigen percentage op de kost')
  if (s.herkomst === 'categorie') return t('afspraak voor categorie {bron}', { bron: s.bron })
  if (s.herkomst === 'kostensoort') {
    return t('afspraak voor {bron}', { bron: s.bron === 'buitengewoon' ? t('buitengewone kosten') : t('gewone kosten') })
  }
  if (s.herkomst === 'dossier') return t('standaardverdeling van het dossier')
  return t('afwijkende verdeling')
}

// Eén regel over een gebruikte verdeelsleutel, inclusief hoeveel kosten eronder vielen.
export function verdeelsleutelTekst(t: Vertaler, s: Verdeelsleutel): string {
  const wat = t('{n} kost(en), {bedrag}', { n: s.aantalKosten, bedrag: formatEuro(s.totaal) })
  return `${sleutelPercentages(t, s.percentageJij)} — ${sleutelHerkomst(t, s)} (${wat})`
}

// De kop-cijfers als label/waarde-paren, zodat de PDF en de tekst gegarandeerd
// dezelfde regels in dezelfde volgorde tonen.
// Eén zin die uitlegt hoe je de saldokolom van de uitsplitsingen leest. Zonder
// die uitleg lijkt een min-bedrag bij een kind al snel een fout.
export function saldoLegende(t: Vertaler): string {
  return t('Saldo: plus = partner betaalt jou, min = jij betaalt partner.')
}

export function totaalRegels(t: Vertaler, o: AfrekeningOverzicht): { label: string; waarde: string }[] {
  return [
    { label: t('Totaal kosten'), waarde: formatEuro(o.totaal) },
    {
      label: t('Aantal kosten'),
      waarde:
        o.aantalMetBonnetje > 0
          ? t('{n}, waarvan {m} met bon', { n: o.aantalKosten, m: o.aantalMetBonnetje })
          : String(o.aantalKosten),
    },
    { label: t('Jij betaalde'), waarde: formatEuro(o.betaaldDoorJou) },
    { label: t('Partner betaalde'), waarde: formatEuro(o.betaaldDoorPartner) },
    { label: t('Jouw aandeel'), waarde: formatEuro(o.jouwAandeel) },
    { label: t('Aandeel partner'), waarde: formatEuro(o.partnerAandeel) },
  ]
}

// De regels onder een kost: alles wat de rij navolgbaar maakt. Bewust in twee
// korte stukken in plaats van één lange regel, zodat het ook op een telefoon
// leesbaar blijft.
export function regelMeta(t: Vertaler, r: AfrekeningRegel, bonStatus?: string): string[] {
  const wie = t('betaald door {wie}', { wie: r.betaaldDoorJou ? t('jou') : t('partner') })
  const eerste = [wie, t('jij {p}%', { p: r.percentageJij }), `${t('jouw deel')} ${formatEuro(r.jouwAandeel)}`]

  const tweede: string[] = []
  if (r.kostenType === 'buitengewoon') tweede.push(t('buitengewoon'))
  if (r.kindNamen.length > 0) tweede.push(r.kindNamen.join(', '))
  if (r.heeftCategorie) tweede.push(r.categorieNaam)
  // `bonStatus` laat de bewijsmap "zie bijlage 3" zetten in plaats van "bon
  // toegevoegd". Waarom niet een extra regel eronder: dan stond er twee keer iets
  // over dezelfde bon, en bij een kost zonder bon zelfs twee keer "geen bon".
  tweede.push(bonStatus ?? (r.heeftBonnetje ? t('bon toegevoegd') : t('geen bon')))

  return [eerste.join(' · '), tweede.join(' · ')]
}

// Eén uitsplitsingsrij als leesbare zin (voor de klembordtekst).
export function groepTekst(t: Vertaler, groep: AfrekeningGroep): string {
  const verdeling = t('jij {jij} / partner {partner}', {
    jij: formatEuro(groep.jouwAandeel),
    partner: formatEuro(groep.partnerAandeel),
  })
  return `• ${groepLabel(t, groep)}: ${formatEuro(groep.totaal)} (${verdeling}) · ${t('saldo')} ${formatEuro(groep.netto)}`
}

// ---------------------------------------------------------------------------

// Bouwt een leesbare, meertalige tekstsamenvatting van een afrekening — geschikt
// om te kopiëren naar het klembord of door te sturen (bv. via WhatsApp). Daarom:
// korte regels, duidelijke koppen in hoofdletters en geen kolommen met spaties
// (die verspringen in WhatsApp). Zuiver en los testbaar (de vertaling komt via
// de meegegeven t(), de opmaakdatum via nu).
export function afrekeningSamenvatting(
  t: Vertaler,
  dossier: Dossier,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
  gebruikerCategorieen: Categorie[] = [],
  nu: Date = new Date(),
  // De documentkluis, zodat "bon toegevoegd" en "waarvan n met bon" hier hetzelfde
  // zeggen als in de bewijsmap. Zonder deze lijst las je in de tekst die je
  // doorstuurde "geen bon" bij een kost waar wél een bon van bestond — namelijk een
  // die aan de transactie hangt in plaats van aan de gedeelde kost. Zie kluis.ts.
  documenten: DossierDocument[] = [],
): string {
  const o = bouwAfrekeningOverzicht(dossier, afrekening, kosten, kinderen, gebruikerCategorieen, (k) =>
    heeftEenBon(k, documenten),
  )
  const r: string[] = []

  // Kop
  r.push(t('Afrekening — {naam}', { naam: o.dossierNaam }))
  r.push(`${t('Periode')}: ${periodeTekst(t, o)}`)
  r.push(`${t('Kinderen')}: ${kinderenTekst(t, o)}`)
  r.push(`${t('Datum')}: ${o.datum}`)
  r.push(`${t('Opgemaakt op')}: ${vandaag(nu)}`)

  // Verdeelsleutels
  if (o.verdeelsleutels.length > 0) {
    r.push('')
    r.push(t('Verdeelsleutel').toUpperCase())
    for (const s of o.verdeelsleutels) r.push(`• ${verdeelsleutelTekst(t, s)}`)
  }

  // Totalen en het saldo in klare taal
  r.push('')
  r.push(t('Totalen').toUpperCase())
  for (const { label, waarde } of totaalRegels(t, o)) r.push(`• ${label}: ${waarde}`)
  r.push(`>> ${verrekenTekst(t, o.netto)}`)
  if (o.wijktAf) {
    r.push(t('Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.', {
      bedrag: formatEuro(o.bewaardNetto),
    }))
  }

  let eersteUitsplitsing = true
  const blok = (titel: string, groepen: AfrekeningGroep[]) => {
    if (groepen.length === 0) return
    r.push('')
    r.push(titel.toUpperCase())
    if (eersteUitsplitsing) {
      r.push(saldoLegende(t))
      eersteUitsplitsing = false
    }
    for (const g of groepen) r.push(groepTekst(t, g))
  }
  blok(t('Per kind'), o.perKind)
  blok(t('Per categorie'), o.perCategorie)
  blok(t('Per kostensoort'), o.perKostensoort)

  // Detail: per kost twee korte regels, zodat niets verspringt op een telefoon.
  if (o.regels.length > 0) {
    r.push('')
    r.push(t('Detail').toUpperCase())
    for (const regel of o.regels) {
      r.push(`• ${regel.datum} ${regel.omschrijving}: ${formatEuro(regel.bedrag)}`)
      for (const meta of regelMeta(t, regel)) r.push(`  ${meta}`)
    }
  }

  r.push('')
  r.push(`${t('Resultaat')}: ${verrekenTekst(t, o.netto)}`)
  return r.join('\n')
}

// ---------------------------------------------------------------------------
// BEWIJSMAP (ronde 41)
//
// De bewijsmap moet per kost niet alleen het RESULTAAT tonen maar de BEREKENING:
// welk bedrag, welk percentage, wat er dan uitkomt, en waaróm dat percentage gold.
// Dat staat hier en niet in de PDF, zodat het scherm, de klembordtekst en het
// document dezelfde woorden gebruiken — en zodat de formulering te testen valt.
// ---------------------------------------------------------------------------

/**
 * De verdeelsleutel van één regel, als los object.
 *
 * Waarom deze omweg: `sleutelHerkomst` werkt op een `Verdeelsleutel` (een
 * samengevatte groep kosten). Eén regel heeft dezelfde velden, alleen niet in die
 * vorm. Door ze hier om te zetten hoeft de uitleg over hérkomst maar op één plek te
 * bestaan — anders zou de bewijsmap "afspraak voor categorie Onderwijs" op een
 * eigen manier gaan formuleren dan de samenvatting erboven.
 */
export function sleutelVanRegel(r: AfrekeningRegel): Verdeelsleutel {
  return {
    percentageJij: r.percentageJij,
    herkomst: r.herkomst,
    bron: r.bron,
    aantalKosten: 1,
    totaal: r.bedrag,
  }
}

/**
 * De berekening van één kost, uitgeschreven.
 *
 * Bv. "€ 120,00 x 60% = € 72,00 voor jou, € 48,00 voor partner".
 * Bewust met een gewone 'x' en niet met ×: jsPDF kan dat teken in het
 * standaardlettertype niet tonen.
 */
export function berekeningTekst(t: Vertaler, r: AfrekeningRegel): string {
  return t('{bedrag} x {p}% = {jouw} voor jou, {partner} voor partner', {
    bedrag: formatEuro(r.bedrag),
    p: r.percentageJij,
    jouw: formatEuro(r.jouwAandeel),
    partner: formatEuro(r.partnerAandeel),
  })
}

/**
 * De grens die we bewaken, in het document zelf.
 *
 * De bewijsmap is bedoeld om aan een advocaat of bemiddelaar te geven. Dan moet er
 * zwart op wit in staan wat het stuk wél is (de boekingen en berekeningen zoals ze
 * in de app zijn ingevoerd) en wat het NIET is (juridisch advies, en geen uitspraak
 * over wie waar recht op heeft). Zonder die regels leest een berekening al snel als
 * een standpunt.
 */
export function voorbehoudRegels(t: Vertaler): string[] {
  return [
    t('Dit document is een overzicht van de kosten en berekeningen zoals ze in Financieel Kompas zijn ingevoerd.'),
    t('De bedragen en verdeelsleutels komen uit die invoer. Wie ze invoerde, blijft er verantwoordelijk voor.'),
    t('Dit is geen juridisch advies en geen uitspraak over wie waar recht op heeft. De app rekent; de afspraak of de rechter beslist.'),
    t('Een bon die als PDF-bestand werd toegevoegd, kan niet als afbeelding in dit document. Die staat als aparte bijlage vermeld en is los op te vragen.'),
  ]
}
