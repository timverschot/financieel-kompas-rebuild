import type { Vertaler } from '../i18n'
import { INDEX_BASISJAAR } from '../data/gezondheidsindex'
import { formatEuro } from './format'
import { maandJaarLabel } from './datum'
import { laatsteAanpassing, type BijdrageOpbouw, type IndexatieStap } from './onderhoudsbijdrage'

// De bewoordingen van de onderhoudsbijdrage, op één plek (ronde 42).
//
// Waarom apart, net als `afrekeningTekst.ts`: het scherm, de brief-PDF en de tekst
// die je doorstuurt moeten woord voor woord hetzelfde zeggen. Loopt dat uiteen, dan
// staat er in het document dat je meestuurt iets anders dan wat je zelf op je
// scherm zag — en dit is een onderwerp waar dat verschil meteen tegen je gebruikt
// wordt.
//
// De toon is een functionele eis, geen afwerking: de app rekent en registreert. Ze
// kiest geen partij en ze zegt niet wie gelijk heeft.
//
// Bewust ASCII-vriendelijk (geen pijltjes, geen emoji): deze teksten gaan naar
// jsPDF, en dat kan ze in het standaardlettertype niet tonen.

/**
 * De uitleg onder één verjaardag — de enige versie.
 *
 * Stond eerst in het scherm én in de PDF, allebei met dezelfde drie takken. Die
 * kopieën lopen na één wijziging uiteen, en dan zegt het document dat je meestuurt
 * iets anders dan wat je zelf zag. De kop van dit bestand belooft precies dat dat
 * niet gebeurt.
 */
export function stapUitleg(t: Vertaler, stap: IndexatieStap, basisbedrag: number, aanvangsindex: number | null): string {
  if (stap.nieuweIndex === null) {
    return t('index van {maand} nog niet bekend — bedrag ongewijzigd gelaten', {
      maand: maandJaarLabel(`${stap.indexmaand}-01`),
    })
  }
  if (aanvangsindex === null) {
    return t('index {index} uit {maand}', {
      index: getalTekst(stap.nieuweIndex),
      maand: maandJaarLabel(`${stap.indexmaand}-01`),
    })
  }
  return stapTekst(t, stap, basisbedrag, aanvangsindex)
}

/** De berekening van één aanpassing, uitgeschreven. */
export function stapTekst(t: Vertaler, stap: IndexatieStap, basisbedrag: number, aanvangsindex: number): string {
  return t('{basis} x {nieuw} / {aanvang} = {uit}', {
    basis: formatEuro(basisbedrag),
    nieuw: getalTekst(stap.nieuweIndex ?? 0),
    aanvang: getalTekst(aanvangsindex),
    uit: formatEuro(stap.bedrag),
  })
}

/** Een indexcijfer met twee cijfers na de komma, in Belgische notatie. */
export function getalTekst(waarde: number): string {
  return waarde.toFixed(2).replace('.', ',')
}

/** Waar de aanvangsindex vandaan komt — dat hoort navolgbaar te zijn. */
export function aanvangsindexTekst(t: Vertaler, opbouw: BijdrageOpbouw): string {
  // Eerst het conflict. Zonder deze tak zou hier "de app kent geen indexcijfer voor
  // die maand" staan — en dat is meestal niet waar: de app kent de maand wél, ze
  // weigert alleen twee reeksen door elkaar te halen. Een onware reden in een
  // document dat naar de andere ouder gaat, is erger dan geen reden.
  if (opbouw.indexConflict !== null) return reeksConflictUitleg(t, opbouw)
  if (opbouw.aanvangsindex === null) {
    return t('De aanvangsindex is niet bekend: de app kent geen indexcijfer voor {maand}.', {
      maand: maandJaarLabel(`${opbouw.aanvangsmaand}-01`),
    })
  }
  if (opbouw.aanvangsindexUitAkte) {
    return t('Aanvangsindex {index}, zoals ze in de akte staat.', { index: getalTekst(opbouw.aanvangsindex) })
  }
  return t('Aanvangsindex {index}: de gezondheidsindex van {maand}, de maand vóór de regeling.', {
    index: getalTekst(opbouw.aanvangsindex),
    maand: maandJaarLabel(`${opbouw.aanvangsmaand}-01`),
  })
}

/**
 * De waarschuwing over basisjaren.
 *
 * Dit is de valkuil van het hele onderwerp: een aanvangsindex uit een oud vonnis
 * staat in een andere maatstaf dan de tabel van vandaag, en die twee combineren
 * geeft een verschil van tientallen procenten zonder één foutmelding.
 */
export function reeksConflictUitleg(t: Vertaler, opbouw: BijdrageOpbouw): string {
  if (opbouw.indexConflict === null) return ''

  // De eigen maandcijfers dateren van vóór een herbasering van de tabel. Kan pas
  // gebeuren wanneer deze app ooit een nieuwe basis meelevert.
  if (opbouw.indexConflict === 'ander-basisjaar') {
    return t(
      'De app rekent niet meer met deze regeling. De indexcijfers die je zelf bijzette staan in basis {eigen} = 100, en de tabel in de app staat nu in basis {tabel} = 100. Dat zijn twee verschillende maatstaven; ze combineren geeft een bedrag dat er tientallen procenten naast zit. Verwijder je eigen cijfers hieronder en zet ze opnieuw met de cijfers uit de huidige reeks.',
      { eigen: opbouw.basisjaarEigen, tabel: opbouw.basisjaarTabel },
    )
  }

  const maanden = opbouw.tabelMaanden.map((m) => maandJaarLabel(`${m}-01`)).join(', ')

  // Kent de app de aanvangsmaand zelf, dan is het verschil met het ingetikte cijfer
  // het concreetste wat we kunnen tonen — en meteen de eenvoudigste uitweg: laat het
  // veld leeg.
  if (opbouw.aanvangsindexTabel !== null) {
    return t(
      'De app rekent niet met deze regeling. Je vulde zelf aanvangsindex {eigen} in, maar voor {maand} kent de app {tabel}. Dat verschil wijst erop dat je cijfer uit een oudere indexreeks komt (de index wordt om de zoveel jaar herbaseerd). Combineren met de tabel geeft een bedrag dat er tientallen procenten naast zit. Klopt {tabel} met je akte, laat het veld dan leeg. Klopt het niet, vul dan ook de cijfers van {maanden} zelf in, uit dezelfde reeks als je akte.',
      {
        eigen: opbouw.aanvangsindexIngetikt === null ? '' : getalTekst(opbouw.aanvangsindexIngetikt),
        tabel: getalTekst(opbouw.aanvangsindexTabel),
        maand: maandJaarLabel(`${opbouw.aanvangsmaand}-01`),
        maanden,
      },
    )
  }

  // De app kent de aanvangsmaand niet (een oud vonnis). Dan is er niets te
  // vergelijken en is zelf invullen de enige weg.
  return t(
    'De app rekent niet met deze regeling. Je vulde de aanvangsindex zelf in, maar de jaarlijkse cijfers zou de app uit haar eigen tabel halen (basis {tabel} = 100). Staat je akte in een oudere reeks, dan zit het bedrag er tientallen procenten naast. Vul daarom ook de indexcijfers van {maanden} zelf in, uit dezelfde reeks als je akte.',
    { tabel: opbouw.basisjaarTabel, maanden },
  )
}

export function basisjaarWaarschuwing(t: Vertaler): string {
  return t(
    'Let op: de indexcijfers van de app staan in basis {jaar} = 100. Staat er in je vonnis een aanvangsindex uit een ouder basisjaar, vul die dan hier in én gebruik ook voor de nieuwe index een cijfer uit datzelfde basisjaar. Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en het niet is.',
    { jaar: INDEX_BASISJAAR },
  )
}

/** Hoe de achterstand geteld is. Zonder deze zin is het getal niet te plaatsen. */
export function telwijzeTekst(t: Vertaler): string {
  return t(
    'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Twee gevolgen die je moet kennen voor je dit cijfer gebruikt: de maand van de regeling telt volledig mee, ook als ze halverwege begon, en de maand waarin er geïndexeerd wordt telt nog aan het oude, lagere bedrag. Klopt dat niet met jouw afspraak, corrigeer het dan met een betaling.',
  )
}

/**
 * Het voorbehoud, in het document zelf.
 *
 * Dezelfde grens als bij de bewijsmap (ronde 41): feiten en berekeningen, geen
 * juridisch advies. Bij dit onderwerp weegt het zwaarder, want een bedrag dat als
 * standpunt gelezen wordt, maakt een gesprek tussen twee ouders erger in plaats van
 * makkelijker.
 */
export function bijdrageVoorbehoud(t: Vertaler): string[] {
  return [
    t('Dit blad is een berekening op basis van wat er in Financieel Kompas is ingevoerd: het bedrag uit de regeling, de datum ervan en de gezondheidsindex.'),
    t('De indexatie gebeurt in België van rechtswege, jaarlijks op de verjaardag van de regeling — tenzij de akte iets anders bepaalt. Wat er in jouw akte staat, gaat voor op wat hier staat.'),
    t('Dit is geen juridisch advies en geen ingebrekestelling. De app rekent; wat je met het cijfer doet, beslis jij.'),
  ]
}

/** Wat de brief van de regeling moet weten om niets te beweren dat niet klopt. */
export type BriefGegevens = {
  basisbedrag: number
  datumRegeling: string
  /** Een akte kan indexatie uitsluiten; dan gaat de brief er niet over. */
  geindexeerd?: boolean
  /** De dag waarop de regeling ophoudt, als die er is. */
  eindDatum?: string
}

/** Is de regeling op de peildatum al afgelopen? Dezelfde regel als op het scherm. */
export function briefGestopt(gegevens: BriefGegevens, nuISO: string): boolean {
  return Boolean(gegevens.eindDatum && gegevens.eindDatum < nuISO)
}

/**
 * De onderwerpregel van de begeleidende brief.
 *
 * Namen van kinderen mogen erin: die maken meteen duidelijk waarover het gaat en
 * ze zijn feitelijk. Staan ze er niet, dan blijft het onderwerp neutraal.
 *
 * Sluit de akte indexatie uit, dan verdwijnt het woord "indexatie": een onderwerp
 * dat een indexatie aankondigt bij een akte die er geen kent, leest als een
 * standpunt over die akte. En dat is precies wat dit blad niet mag zijn.
 */
export function briefOnderwerp(t: Vertaler, kindNamen: string, geindexeerd?: boolean): string {
  if (geindexeerd === false) {
    return kindNamen
      ? t('Betreft: de onderhoudsbijdrage voor {namen}', { namen: kindNamen })
      : t('Betreft: de onderhoudsbijdrage')
  }
  return kindNamen
    ? t('Betreft: indexatie van de onderhoudsbijdrage voor {namen}', { namen: kindNamen })
    : t('Betreft: indexatie van de onderhoudsbijdrage')
}

/**
 * De kern van de brief: wat er verandert en waarom.
 *
 * In de derde persoon en zonder verwijt. Er staat "volgens deze berekening bedraagt
 * de bijdrage" en niet "je betaalt te weinig" — dat laatste is een standpunt, en
 * zodra het op papier staat gaat het gesprek daarover in plaats van over het cijfer.
 *
 * Even belangrijk: de brief mag niets beweren wat de rekenkern niet kan waarmaken.
 * Vandaar de vier gevallen hieronder. Zonder die scheiding zei blad 1 "de bijdrage
 * volgt de gezondheidsindex" bij een akte die indexatie uitsluit, "vandaag" bij een
 * regeling die jaren geleden afliep, en een hard bedrag terwijl de aanvangsindex
 * ontbrak — steeds precies het omgekeerde van wat blad 2 zei.
 */
export function briefKern(
  t: Vertaler,
  opbouw: BijdrageOpbouw,
  gegevens: BriefGegevens,
  nuISO: string,
): string[] {
  const { basisbedrag, datumRegeling, geindexeerd, eindDatum } = gegevens
  const gestopt = briefGestopt(gegevens, nuISO)
  const geenIndexatie = geindexeerd === false
  const alineas: string[] = []

  // 1. Waar het over gaat.
  alineas.push(
    geenIndexatie
      ? t('De onderhoudsbijdrage die op {datum} werd vastgelegd, wordt volgens de regeling niet geïndexeerd. Het bedrag blijft daarom ongewijzigd.', {
          datum: datumRegeling,
        })
      : t('De onderhoudsbijdrage die op {datum} werd vastgelegd, volgt de gezondheidsindex. Die aanpassing gebeurt jaarlijks op de verjaardag van de regeling.', {
          datum: datumRegeling,
        }),
  )

  // 2. Het bedrag — en alleen een bedrag dat ook echt berekend is.
  const laatste = laatsteAanpassing(opbouw, basisbedrag)
  if (!geenIndexatie && opbouw.indexConflict !== null) {
    // Deze brief gaat naar de andere ouder of naar een advocaat. Beweren dat de app
    // de maand niet kent, terwijl ze weigert twee reeksen te mengen, is dan geen
    // detail. Het scherm blokkeert deze knop al; dit is het vangnet eronder.
    alineas.push(
      t('De indexatie kon niet berekend worden omdat de gebruikte indexcijfers niet uit dezelfde reeks komen. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.', {
        basis: formatEuro(basisbedrag),
      }),
    )
  } else if (!geenIndexatie && opbouw.aanvangsindex === null) {
    alineas.push(
      t('De aanvangsindex van {maand} is in deze app niet bekend, waardoor de indexatie niet berekend kon worden. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.', {
        maand: maandJaarLabel(`${opbouw.aanvangsmaand}-01`),
        basis: formatEuro(basisbedrag),
      }),
    )
  } else if (gestopt) {
    alineas.push(
      t('Deze regeling liep tot {eind}. Bij het einde ervan bedroeg de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.', {
        eind: eindDatum ?? '',
        bedrag: formatEuro(opbouw.huidigBedrag),
        basis: formatEuro(basisbedrag),
      }),
    )
  } else if (laatste) {
    alineas.push(
      t('De laatste aanpassing viel op {datum}. Vanaf die datum bedraagt de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.', {
        datum: laatste.datum,
        bedrag: formatEuro(opbouw.huidigBedrag),
        basis: formatEuro(basisbedrag),
      }),
    )
  } else {
    alineas.push(
      t('Volgens deze berekening bedraagt de bijdrage vandaag {bedrag} per maand.', {
        bedrag: formatEuro(opbouw.huidigBedrag),
      }),
    )
  }

  // 3. Wat er nog niet in verwerkt zit. Zonder deze zin leest de lezer van blad 1
  //    een bedrag als eindstand terwijl blad 2 zegt dat er een verjaardag wacht.
  if (!geenIndexatie && opbouw.aanvangsindex !== null && opbouw.ontbrekendeMaanden.length > 0) {
    alineas.push(
      t('Voor één of meer verjaardagen was er nog geen indexcijfer bekend. Die aanpassing zit dus nog niet in dit bedrag; op het volgende blad staat om welke maanden het gaat.'),
    )
  }

  // 4. Waarnaar de lezer kijkt.
  alineas.push(
    opbouw.stappen.length > 0
      ? t('Op het volgende blad staat de volledige berekening: het bedrag uit de regeling, de gebruikte indexcijfers en wat er per verjaardag uit kwam. Zo is elke regel na te rekenen zonder deze app.')
      : t('Op het volgende blad staat waarop dit gebaseerd is: het bedrag uit de regeling en de gegevens die daarbij horen. Zo is alles na te kijken zonder deze app.'),
  )
  return alineas
}

/** De afsluitende zin: een uitnodiging om te kijken, geen eis. */
export function briefSlot(t: Vertaler): string {
  return t('Klopt er iets niet met de gegevens hierboven, laat het dan weten — dan kan de berekening aangepast worden.')
}

/** Wie aan wie betaalt, in woorden. Voor het SCHERM: daar ben jij de lezer. */
export function richtingTekst(t: Vertaler, richting: 'jij-betaalt' | 'jij-ontvangt'): string {
  return richting === 'jij-betaalt' ? t('Jij betaalt aan de andere ouder') : t('De andere ouder betaalt aan jou')
}

/**
 * Dezelfde richting, maar zonder "jij" — voor het DOCUMENT.
 *
 * Het blad gaat naar de andere ouder, en die leest "jij" als zichzelf. Dan staat er
 * in het document letterlijk het omgekeerde van wat bedoeld is. Dit is de enige
 * plek in de module waar de taal zelf partij zou kiezen, en juist daar mag het niet.
 */
export function richtingTekstNeutraal(t: Vertaler, richting: 'jij-betaalt' | 'jij-ontvangt'): string {
  return richting === 'jij-betaalt'
    ? t('Betaald door de ouder die dit overzicht opmaakte')
    : t('Betaald aan de ouder die dit overzicht opmaakte')
}

/** Het openstaande saldo in klare taal, zonder oordeel. */
export function openTekst(t: Vertaler, open: number, richting: 'jij-betaalt' | 'jij-ontvangt'): string {
  if (open === 0) return t('Betaald en verschuldigd zijn precies gelijk.')
  if (open > 0) {
    return richting === 'jij-betaalt'
      ? t('Er staat nog {bedrag} open die jij verschuldigd bent.', { bedrag: formatEuro(open) })
      : t('Er staat nog {bedrag} open die aan jou verschuldigd is.', { bedrag: formatEuro(open) })
  }
  return richting === 'jij-betaalt'
    ? t('Er is {bedrag} meer betaald dan berekend.', { bedrag: formatEuro(-open) })
    : t('Er is {bedrag} meer ontvangen dan berekend.', { bedrag: formatEuro(-open) })
}
