import type { Transactie } from '../data/schema'

// Een bankuittreksel omzetten naar boekingen. Zuiver: rijen erin, voorstellen eruit.
//
// Waarom er GEEN vaste bankprofielen in staan. De verleiding is groot om voor KBC,
// Belfius, BNP Paribas Fortis en ING elk een lijstje kolomnamen vast te leggen.
// Maar die namen staan nergens officieel gedocumenteerd, ze verschillen per taal
// en per soort rekening, en de banken wijzigen ze zonder aankondiging. Een profiel
// dat vandaag klopt, leest volgende maand misschien de kolom "saldo" als "bedrag" —
// en dat merk je pas wanneer je cijfers al niet meer kloppen.
//
// Daarom raadt deze module, en mag je haar altijd overrulen:
//   1. op de KOLOMNAAM, met een ruime lijst woorden in NL, FR en EN;
//   2. en als dat niets oplevert, op de INHOUD: staan er in een kolom alleen maar
//      datums, dan is het de datumkolom.
// De app bewaart je correctie en herkent hetzelfde bestandsformaat de volgende
// keer vanzelf. Zo werkt ze met elke bank, ook met eentje die we nooit gezien
// hebben, en blijft ze werken als er één zijn formaat verandert.

/** Wat een kolom betekent. */
export type Kolomrol =
  | 'negeren'
  | 'datum'
  | 'omschrijving'
  | 'tegenpartij'
  | 'bedrag'
  /** Sommige banken zetten uitgaven en inkomsten in twee aparte kolommen. */
  | 'bedrag-af'
  | 'bedrag-bij'
  | 'mededeling'

/** Welke rol elke kolom heeft, op index. */
export type Kolommen = Kolomrol[]

export type Kandidaat = {
  /** Vaste sleutel binnen dit bestand, zodat aan- en uitvinken stabiel blijft. */
  sleutel: string
  datum: string
  omschrijving: string
  /** In centen; negatief is een uitgave, net als elke transactie in de app. */
  bedrag: number
  /** Waarom deze regel niet meekan, of undefined wanneer ze in orde is. */
  probleem?: 'geen-datum' | 'geen-bedrag'
  /** De id van de bestaande boeking waar deze regel op lijkt. */
  lijktOp?: string
}

// --- Kolomnamen herkennen ---------------------------------------------------

// Bewust ruim, en bewust in drie talen: dezelfde bank exporteert in het Nederlands
// voor de ene klant en in het Frans voor de andere.
const WOORDEN: { rol: Kolomrol; woorden: string[] }[] = [
  {
    rol: 'datum',
    woorden: [
      'boekingsdatum', 'boekdatum', 'uitvoeringsdatum', 'transactiedatum', 'verrichtingsdatum',
      'datum', 'valutadatum', 'date', 'dateoperation', 'datecomptable', 'datevaleur',
      'bookingdate', 'transactiondate', 'valuedate', 'executiondate',
    ],
  },
  {
    rol: 'bedrag-af',
    woorden: ['debet', 'debit', 'afschrijving', 'uitgave', 'af', 'debitamount', 'montantdebit'],
  },
  {
    rol: 'bedrag-bij',
    woorden: ['credit', 'krediet', 'bijschrijving', 'inkomst', 'bij', 'creditamount', 'montantcredit'],
  },
  {
    rol: 'bedrag',
    woorden: [
      'bedrag', 'montant', 'amount', 'bedragvandeverrichting', 'transactiebedrag',
      'bedraginvaluta', 'montantoperation', 'transactionamount',
    ],
  },
  {
    rol: 'tegenpartij',
    woorden: [
      'tegenpartij', 'naamtegenpartij', 'begunstigde', 'tegenrekeningnaam', 'contrepartie',
      'nomcontrepartie', 'beneficiaire', 'counterparty', 'payee', 'naam', 'nom', 'name',
    ],
  },
  {
    rol: 'mededeling',
    woorden: [
      'mededeling', 'vrijemededeling', 'gestructureerdemededeling', 'communication',
      'communicationlibre', 'message', 'reference', 'referentie',
    ],
  },
  {
    rol: 'omschrijving',
    woorden: [
      'omschrijving', 'detail', 'details', 'beschrijving', 'transactie', 'verrichting',
      'description', 'libelle', 'nature', 'narrative', 'transactiondetails',
      // ⚠ RONDE 108 — ONS EIGEN BESTAND STOND HIER NIET IN. De boekingenexport schrijft de
      // kolomkop "Handelaar / winkel", en die valt na `normaliseer` uiteen tot
      // `handelaarwinkel` — een woord dat in geen enkele lijst voorkwam. De kolom viel dus
      // door naar de lengte-heuristiek verderop, en die verloor van "Hoofdcategorie": lees je
      // je eigen boekingenbestand opnieuw in, dan heette elke boeking "Zonder categorie" of
      // "Onbekend" en was Colruyt nergens meer te bekennen. Verzwarend, want deze module zegt
      // zelf een paar honderd regels lager dat een verkeerde winkelnaam de handelaarsindex
      // vervuilt en dat je dat in het append-only logboek niet meer weg krijgt.
      'handelaarwinkel', 'handelaar', 'winkel', 'merchant', 'commercant',
    ],
  },
]

// Kolommen die er als een bedrag uitzien maar het niet zijn. Een saldokolom
// bestaat volledig uit getallen en wint het anders makkelijk van de echte
// bedragkolom — met als gevolg dat je uitgaven als inkomsten binnenkomen en elk
// cijfer in de app fout staat. Dit is de duurste vergissing die deze module kan
// maken, dus ze staat er met naam in.
const GEEN_BEDRAG_WOORDEN = [
  'saldo', 'solde', 'balance', 'saldona', 'saldonaverrichting', 'nieuwsaldo', 'newbalance',
  'beginsaldo', 'eindsaldo', 'soldeapres', 'rekeningnummer', 'iban', 'volgnummer', 'nummer',
  'valuta', 'currency', 'devise', 'koers',
]

/** Maakt een kolomnaam vergelijkbaar: kleine letters, geen accenten, geen leestekens. */
function normaliseer(naam: string): string {
  return naam
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Zegt deze kolomnaam uitdrukkelijk dat het GEEN bedrag is? */
function isGeenBedrag(naam: string): boolean {
  const n = normaliseer(naam)
  if (!n) return false
  return GEEN_BEDRAG_WOORDEN.some((w) => n === w || n.startsWith(w) || n.includes(w))
}

function rolUitNaam(naam: string): Kolomrol | null {
  const n = normaliseer(naam)
  if (!n) return null
  if (isGeenBedrag(n)) return null
  // Eerst op exacte gelijkheid: "datum" mag niet verliezen van "valutadatum" omdat
  // dat woord er toevallig in zit.
  for (const { rol, woorden } of WOORDEN) if (woorden.includes(n)) return rol
  for (const { rol, woorden } of WOORDEN) if (woorden.some((w) => w.length >= 5 && n.includes(w))) return rol
  return null
}

// --- Datums en bedragen lezen -----------------------------------------------

/**
 * Leest een datum in de vormen die banken gebruiken en geeft JJJJ-MM-DD terug.
 *
 * Let op de dubbelzinnigheid: 03/04/2026 is in België 3 april, in de Verenigde
 * Staten 4 maart. We lezen dag-eerst, want dat is wat elke Belgische en
 * Nederlandse bank exporteert. Staat het jaar vooraan (2026-04-03), dan is er geen
 * twijfel mogelijk en lezen we dat.
 */
export function leesDatum(tekst: string, maandEerst = false): string | null {
  const t = tekst.trim()
  if (!t) return null

  const isoAchtig = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoAchtig) return maakDatum(Number(isoAchtig[1]), Number(isoAchtig[2]), Number(isoAchtig[3]))

  const drie = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (drie) {
    let jaar = Number(drie[3])
    // Een jaartal van twee cijfers: 26 is 2026, niet 1926. Bankuittreksels gaan
    // over het recente verleden.
    if (jaar < 100) jaar += jaar < 70 ? 2000 : 1900
    const dag = maandEerst ? Number(drie[2]) : Number(drie[1])
    const maand = maandEerst ? Number(drie[1]) : Number(drie[2])
    return maakDatum(jaar, maand, dag)
  }
  return null
}

/**
 * Staat in deze kolom de dag vooraan of de maand?
 *
 * 03/04/2026 is hier 3 april en in een Engelstalige export 4 maart. Raden op één
 * waarde kan niet, maar over een hele kolom wél: zodra ergens het EERSTE getal
 * boven 12 uitkomt, kan dat alleen de dag zijn; komt ergens het TWEEDE getal boven
 * 12, dan is dat de dag en staat de maand vooraan.
 *
 * Zonder deze controle leverde een maand-eerst-bestand stil verkeerde datums op:
 * de regels waar het onmogelijk was (01/13/2026) vielen weg als "geen datum", en
 * al de rest kwam er verkeerd maar geloofwaardig in. Bij twijfel houden we
 * dag-eerst aan — dat is wat elke Belgische en Nederlandse bank exporteert.
 */
export function raadDatumvolgorde(waarden: string[]): 'dag-eerst' | 'maand-eerst' {
  let eersteBoven12 = 0
  let tweedeBoven12 = 0
  for (const w of waarden) {
    const m = w.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/)
    if (!m) continue
    if (Number(m[1]) > 12) eersteBoven12++
    if (Number(m[2]) > 12) tweedeBoven12++
  }
  if (tweedeBoven12 > eersteBoven12) return 'maand-eerst'
  return 'dag-eerst'
}

function maakDatum(jaar: number, maand: number, dag: number): string | null {
  if (!Number.isFinite(jaar) || !Number.isFinite(maand) || !Number.isFinite(dag)) return null
  if (maand < 1 || maand > 12 || dag < 1) return null
  if (jaar < 1900 || jaar > 2200) return null
  // Een echte kalendercontrole, geen "dag <= 31". Anders komt 31/02/2026 als
  // '2026-02-31' in de database: de app toont die boeking dan in maart maar telt
  // ze in februari mee, omdat het ene op de tekst sorteert en het andere de datum
  // omrekent. Dezelfde boeking in twee maanden tegelijk.
  const schrikkel = (jaar % 4 === 0 && jaar % 100 !== 0) || jaar % 400 === 0
  const dagenPerMaand = [31, schrikkel ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (dag > dagenPerMaand[maand - 1]) return null
  return `${jaar}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
}

/**
 * Leest een bedrag en geeft het in CENTEN terug. Positief of negatief.
 *
 * Het lastige is het decimaalteken. "1.234,56" is hier twaalfhonderd euro, maar
 * "1,234.56" (zoals sommige banken in hun Engelse export schrijven) net zo goed.
 * De regel die beide gevallen juist leest: het teken dat het LAATST voorkomt is
 * het decimaalteken — behalve wanneer er precies drie cijfers achter staan én er
 * maar één zo'n teken is, want dan is het een duizendtalteken ("1.234").
 */
export function leesBedrag(tekst: string): number | null {
  let t = tekst.trim()
  if (!t) return null

  // Haakjes zijn in boekhoudkundige exports een minteken: (12,34) is −12,34.
  // Haakjes maken een bedrag negatief. Bewust GEEN wisselknop: "(-12,34)" is één
  // keer negatief bedoeld, niet twee keer.
  let negatief = false
  if (/^\(.*\)$/.test(t)) {
    negatief = true
    t = t.slice(1, -1).trim()
  }

  // Een muntcode vooraan of achteraan ("12,50 EUR", "EUR 12,50"). Sommige banken
  // zetten die erbij, en zonder dit viel zo'n waarde weg — waarna één zo'n regel
  // de hele bedragkolom kon diskwalificeren en de herkenning naar de saldokolom
  // doorschoof.
  t = t.replace(/^(EUR|USD|GBP|CHF)\b/i, '').replace(/\b(EUR|USD|GBP|CHF)$/i, '').trim()

  // Munt, spaties (ook de harde spatie die Excel gebruikt) en het plusteken weg.
  // \u00a0 is de harde spatie en \u202f de smalle harde spatie; Excel en sommige
  // banken gebruiken die als duizendtalteken. Expliciet geschreven, want als los
  // teken in de code zijn ze onzichtbaar.
  t = t.replace(/[\u20ac$\u00a3\s\u00a0\u202f]/g, '').replace(/^\+/, '')

  // Een minteken vooraan of achteraan (sommige exports zetten het achteraan).
  if (t.startsWith('-')) {
    negatief = true
    t = t.slice(1)
  }
  if (t.endsWith('-')) {
    negatief = true
    t = t.slice(0, -1)
  }
  if (!/^[0-9.,]*$/.test(t) || !/[0-9]/.test(t)) return null

  const laatstePunt = t.lastIndexOf('.')
  const laatsteKomma = t.lastIndexOf(',')
  let decimaalOp = -1
  if (laatstePunt >= 0 || laatsteKomma >= 0) {
    decimaalOp = Math.max(laatstePunt, laatsteKomma)
    const cijfersErna = t.length - decimaalOp - 1
    const teken = t[decimaalOp]
    const aantalKeer = t.split(teken).length - 1
    const ervoor = t.slice(0, decimaalOp)
    // "1.234" of "1,234": één teken met precies drie cijfers erachter is een
    // duizendtalteken, geen decimaalteken.
    //
    // Maar NIET wanneer er een nul vóór staat: "0,005" is geen vijfhonderd euro,
    // dat zijn drie decimalen — en drie decimalen bestaan niet in een bedrag. Zonder
    // deze voorwaarde werd elk bedrag met drie cijfers achter de komma stil maal
    // duizend gedaan.
    const duizendtal = cijfersErna === 3 && aantalKeer === 1 && /^[1-9][0-9]{0,2}$/.test(ervoor)
    if (duizendtal) decimaalOp = -1
    // Meer dan twee cijfers achter het decimaalteken bestaat niet in een bedrag.
    else if (cijfersErna > 2) return null
  }

  const heel = decimaalOp >= 0 ? t.slice(0, decimaalOp) : t
  const deel = decimaalOp >= 0 ? t.slice(decimaalOp + 1) : ''
  if (deel.includes('.') || deel.includes(',')) return null // twee decimaaltekens: onzin

  // Het hele deel mag alleen nog duizendtaltekens bevatten, en die moeten netjes
  // om de drie cijfers staan. Zonder deze controle werd "1.2.26" (een datum!)
  // gelezen als € 12,26 en "20260201" als ruim twintig miljoen euro.
  if (!/^[0-9]{1,3}([.,][0-9]{3})*$/.test(heel) && !/^[0-9]+$/.test(heel)) return null
  if (/[.,]/.test(heel) && !/^[0-9]{1,3}([.,][0-9]{3})+$/.test(heel)) return null
  // Een kaal getal van meer dan zes cijfers is in een bankbestand geen bedrag maar
  // een datum of een referentienummer. Een uittreksel met een bedrag boven het
  // miljoen bestaat, maar dan staat er een scheidingsteken of een decimaal bij.
  if (/^[0-9]{7,}$/.test(heel) && decimaalOp < 0) return null

  const heelCijfers = heel.replace(/[.,]/g, '')
  const centen = Number(heelCijfers || '0') * 100 + Number((deel + '00').slice(0, 2) || '0')
  if (!Number.isFinite(centen)) return null
  return negatief ? -centen : centen
}

// --- Kolommen raden ---------------------------------------------------------

/** Heeft deze rij kolomnamen in plaats van gegevens? */
export function heeftKoprij(rijen: string[][]): boolean {
  const eerste = rijen[0]
  if (!eerste || eerste.length < 2) return false
  // Een koprij bevat geen datum en geen bedrag; een gegevensrij wel. Dat is het
  // betrouwbaarste kenmerk — betrouwbaarder dan de kolomnamen herkennen, want die
  // staan er soms in een taal die we niet kennen.
  const heeftDatum = eerste.some((v) => leesDatum(v) !== null)
  const heeftBedrag = eerste.some((v) => leesBedrag(v) !== null)
  if (heeftDatum || heeftBedrag) return false
  // Bevatten de rijen eronder wél cijfers, dan is die eerste rij van tekst een
  // koprij, ook al herkennen we geen enkel woord.
  const eronder = rijen.slice(1, 6)
  const cijfersEronder = eronder.some((r) => r.some((v) => leesDatum(v) !== null || leesBedrag(v) !== null))
  return cijfersEronder || eerste.some((v) => rolUitNaam(v) !== null)
}

/**
 * Is kolom `saldo` de doorlopende optelsom van kolom `bedrag`?
 *
 * Dit is het enige signaal dat een saldokolom met zekerheid aanwijst. We eisen niet
 * dat het overal klopt (een uittreksel begint zelden bij de eerste boeking van de
 * rekening), maar wel dat het bij de duidelijke meerderheid van de opeenvolgende
 * paren klopt.
 */
function isLopendeSom(rijen: string[][], bedrag: number, saldo: number): boolean {
  let klopt = 0
  let getest = 0
  for (let n = 1; n < rijen.length; n++) {
    const vorig = leesBedrag(rijen[n - 1][saldo] ?? '')
    const nu = leesBedrag(rijen[n][saldo] ?? '')
    const b = leesBedrag(rijen[n][bedrag] ?? '')
    if (vorig === null || nu === null || b === null) continue
    getest++
    if (Math.abs(nu - vorig - b) <= 1) klopt++
  }
  return getest >= 2 && klopt / getest >= 0.8
}

/**
 * Raadt per kolom wat ze betekent. Eerst op de kolomnaam, en voor wat dan nog
 * onbekend is: op de inhoud van de eerste rijen.
 */
export function raadKolommen(kop: string[] | null, gegevens: string[][]): Kolommen {
  const aantal = kop?.length ?? gegevens[0]?.length ?? 0
  const rollen: Kolommen = new Array(aantal).fill('negeren')
  const gebruikt = new Set<Kolomrol>()

  if (kop) {
    for (let i = 0; i < aantal; i++) {
      const rol = rolUitNaam(kop[i] ?? '')
      // Elke rol maar één keer: staan er twee datumkolommen (boekingsdatum en
      // valutadatum), dan nemen we de eerste en laten we de tweede met rust.
      if (rol && !gebruikt.has(rol)) {
        rollen[i] = rol
        gebruikt.add(rol)
      }
    }
  }

  const proef = gegevens.slice(0, 25)
  const kolomwaarden = (i: number) => proef.map((r) => r[i] ?? '').filter((v) => v.trim() !== '')
  // Eén onleesbare waarde mag een hele kolom niet diskwalificeren: in een echt
  // uittreksel staat er wel eens "12,50 EUR" of een lege regel tussen. Vroeger
  // gebruikten we `every`, en dan schoof de herkenning door naar de saldokolom.
  const bijnaAllemaal = (waarden: string[], test: (v: string) => boolean) =>
    waarden.length > 0 && waarden.filter(test).length / waarden.length >= 0.8

  const isDatumkolom = (i: number) => bijnaAllemaal(kolomwaarden(i), (v) => leesDatum(v) !== null)

  // Datum: de eerste kolom waarvan (bijna) elke waarde als datum leest.
  if (!gebruikt.has('datum')) {
    for (let i = 0; i < aantal; i++) {
      if (rollen[i] !== 'negeren') continue
      if (isDatumkolom(i)) {
        rollen[i] = 'datum'
        gebruikt.add('datum')
        break
      }
    }
  }

  // Bedrag. Dit is de gevaarlijkste gok van de hele module: kiest ze de SALDOkolom,
  // dan komen je uitgaven als inkomsten binnen en klopt geen enkel cijfer in de app
  // meer. Drie dingen houden dat tegen, in volgorde van betrouwbaarheid:
  //
  //  1. de kolomnaam ("saldo", "solde", "balance") — die sluit de kolom meteen uit;
  //  2. het REKENVERBAND: een saldokolom is de doorlopende optelsom van de
  //     bedragkolom. Klopt saldo[n] − saldo[n−1] met bedrag[n], dan weten we het
  //     zeker in plaats van het te vermoeden;
  //  3. en pas als dat allebei niets oplevert: het feit dat er in een bedragkolom
  //     negatieve getallen staan en dat de bedragen kleiner zijn dan de saldo's.
  if (!gebruikt.has('bedrag') && !gebruikt.has('bedrag-af') && !gebruikt.has('bedrag-bij')) {
    const getalKolommen: number[] = []
    for (let i = 0; i < aantal; i++) {
      if (rollen[i] !== 'negeren') continue
      if (kop && isGeenBedrag(kop[i] ?? '')) continue
      // Een datum leest soms óók als getal (31.12.26). Die kolom is geen bedrag.
      if (isDatumkolom(i)) continue
      if (bijnaAllemaal(kolomwaarden(i), (v) => leesBedrag(v) !== null)) getalKolommen.push(i)
    }

    // 2. Het rekenverband. We zoeken een paar (bedrag, saldo) waarvoor het verschil
    //    tussen twee opeenvolgende saldo's gelijk is aan het bedrag ertussen.
    const saldoKolommen = new Set<number>()
    for (const a of getalKolommen) {
      for (const b of getalKolommen) {
        if (a === b) continue
        if (isLopendeSom(proef, a, b)) saldoKolommen.add(b)
      }
    }

    let besteIndex = -1
    let besteScore = -Infinity
    for (const i of getalKolommen) {
      if (saldoKolommen.has(i)) continue
      const waarden = kolomwaarden(i)
      const bedragen = waarden.map((v) => leesBedrag(v)).filter((b): b is number => b !== null)
      const negatieven = bedragen.filter((b) => b < 0).length
      const uniek = new Set(waarden).size
      // Bedragen zijn doorgaans kleiner dan saldo's; bij gelijkspel wint dus de
      // kolom met de kleinste getallen, niet gewoon de meest linkse.
      const gemiddeld = bedragen.reduce((s, b) => s + Math.abs(b), 0) / (bedragen.length || 1)
      const score = uniek + (negatieven > 0 ? 100 : 0) - Math.min(gemiddeld / 100000, 20)
      if (score > besteScore) {
        besteScore = score
        besteIndex = i
      }
    }
    if (besteIndex >= 0) {
      rollen[besteIndex] = 'bedrag'
      gebruikt.add('bedrag')
    }
  }

  // Omschrijving: de overgebleven tekstkolom met de langste inhoud.
  if (!gebruikt.has('omschrijving')) {
    let besteIndex = -1
    let besteLengte = 2
    for (let i = 0; i < aantal; i++) {
      if (rollen[i] !== 'negeren') continue
      const waarden = proef.map((r) => r[i] ?? '').filter((v) => v.trim() !== '')
      if (waarden.length === 0) continue
      if (waarden.every((v) => leesBedrag(v) !== null || leesDatum(v) !== null)) continue
      const gemiddeld = waarden.reduce((s, v) => s + v.length, 0) / waarden.length
      if (gemiddeld > besteLengte) {
        besteLengte = gemiddeld
        besteIndex = i
      }
    }
    if (besteIndex >= 0) rollen[besteIndex] = 'omschrijving'
  }

  return rollen
}

/**
 * Een vingerafdruk van het bestandsformaat, om een eerder gemaakte kolomkeuze te
 * herkennen. Bewust op de KOLOMNAMEN en niet op de bestandsnaam: die verandert
 * elke maand, de kolommen niet.
 */
export function formaatSleutel(kop: string[] | null, gegevens: string[][]): string {
  if (kop && kop.some((k) => k.trim() !== '')) return kop.map(normaliseer).join('|')
  // Zonder kolomnamen is er niets om op te herkennen behalve de VORM van de
  // gegevens. Alleen het aantal kolommen volstaat niet: twee banken die allebei
  // vier kolommen exporteren, maar met bedrag en saldo omgewisseld, zouden dan
  // elkaars onthouden keuze gebruiken — en je saldo als bedrag inlezen.
  const proef = gegevens.slice(0, 10)
  const breedte = gegevens[0]?.length ?? 0
  const soorten: string[] = []
  for (let i = 0; i < breedte; i++) {
    const waarden = proef.map((r) => r[i] ?? '').filter((v) => v.trim() !== '')
    if (waarden.length === 0) soorten.push('leeg')
    else if (waarden.every((v) => leesDatum(v) !== null)) soorten.push('datum')
    else if (waarden.every((v) => leesBedrag(v) !== null)) soorten.push('getal')
    else soorten.push('tekst')
  }
  return `zonder-kop-${breedte}-${soorten.join('.')}`
}

// --- Van rijen naar voorstellen ---------------------------------------------

/** Wat er in de omschrijving komt wanneer het uittreksel er geen enkele geeft. */
export const TERUGVALNAAM = 'Boeking zonder omschrijving'

/** Één regel omzetten. Geeft ook regels terug die niet in orde zijn, mét de reden. */
export function bouwKandidaten(gegevens: string[][], kolommen: Kolommen): Kandidaat[] {
  const indexVan = (rol: Kolomrol) => kolommen.indexOf(rol)
  const iDatum = indexVan('datum')
  const iBedrag = indexVan('bedrag')
  const iAf = indexVan('bedrag-af')
  const iBij = indexVan('bedrag-bij')
  const iOms = indexVan('omschrijving')
  const iTegen = indexVan('tegenpartij')
  const iMed = indexVan('mededeling')

  // De dag-of-maand-eerst-vraag beantwoorden we één keer voor de HELE kolom, niet
  // per regel: op één datum valt het niet te zien, over een kolom wel.
  const volgorde =
    iDatum >= 0 ? raadDatumvolgorde(gegevens.map((r) => r[iDatum] ?? '')) : 'dag-eerst'
  const maandEerst = volgorde === 'maand-eerst'

  return gegevens.map((rij, n) => {
    const datum = iDatum >= 0 ? leesDatum(rij[iDatum] ?? '', maandEerst) : null

    let bedrag: number | null = null
    if (iBedrag >= 0) {
      bedrag = leesBedrag(rij[iBedrag] ?? '')
    } else if (iAf >= 0 || iBij >= 0) {
      // Twee aparte kolommen: wat in de debetkolom staat is een uitgave, ook als
      // de bank het daar zonder minteken schrijft.
      const af = iAf >= 0 ? leesBedrag(rij[iAf] ?? '') : null
      const bij = iBij >= 0 ? leesBedrag(rij[iBij] ?? '') : null
      if (af !== null && af !== 0) bedrag = -Math.abs(af)
      else if (bij !== null && bij !== 0) bedrag = Math.abs(bij)
    }

    // De omschrijving is wat je in je lijst wil zien staan, en in deze app is dat
    // veld de WINKELNAAM: de app leert eruit welke categorie je bij welke handelaar
    // gebruikt, en stelt die de volgende keer voor.
    //
    // Daarom nemen we de mededeling er BEWUST niet standaard bij. Bij een
    // kaartbetaling staat daar een uniek referentienummer in, en dan krijgt elke
    // boeking een unieke "winkelnaam" — waarna de categorievoorstellen niet meer
    // werken en je handelaarslijst volloopt met duizenden eenmalige namen. In het
    // append-only logboek krijg je dat niet meer weg.
    const tegen = iTegen >= 0 ? (rij[iTegen] ?? '').trim() : ''
    const oms = iOms >= 0 ? (rij[iOms] ?? '').trim() : ''
    const med = iMed >= 0 ? (rij[iMed] ?? '').trim() : ''
    const delen = (tegen || oms ? [tegen, oms] : [med]).filter((d) => d !== '')
    // Dubbels weglaten: veel banken herhalen de naam van de tegenpartij in de
    // omschrijving, en "Colruyt · Colruyt" leest als een fout.
    const uniek: string[] = []
    for (const d of delen) if (!uniek.some((u) => u.toLowerCase() === d.toLowerCase())) uniek.push(d)
    const omschrijving = uniek.join(' · ').slice(0, 200)

    const kandidaat: Kandidaat = {
      sleutel: `r${n}`,
      datum: datum ?? '',
      // Een geldopname of een bankkost heeft soms geen enkele tekst. Die regel
      // weggooien zou betekenen dat er geld uit je rekening verdwijnt zonder dat
      // het ergens staat; een terugvalnaam houdt het bedrag in je boekhouding.
      omschrijving: omschrijving || TERUGVALNAAM,
      bedrag: bedrag ?? 0,
    }
    if (!datum) kandidaat.probleem = 'geen-datum'
    else if (bedrag === null || bedrag === 0) kandidaat.probleem = 'geen-bedrag'
    return kandidaat
  })
}

/**
 * Markeert regels die al in je boekingen lijken te staan.
 *
 * De maatstaf is bewust STRENG: dezelfde rekening, dezelfde dag, hetzelfde bedrag
 * tot op de cent. Twee keer op één dag hetzelfde bedrag bij dezelfde winkel komt
 * voor (twee keer tanken, twee kinderen bij de kapper), dus dit is een vermoeden
 * en geen zekerheid — daarom markeren we het en beslis jij.
 *
 * Elke bestaande boeking kan maar één keer een regel "verklaren". Boekte je die dag
 * twee keer € 12,50 en staat er in het bestand ook twee keer € 12,50, dan worden
 * beide regels gemarkeerd. Staat er één keer € 12,50 in de app en twee keer in het
 * bestand, dan wordt er precies één gemarkeerd.
 */
/**
 * Op welke ANDERE rekening lijken deze regels al te staan? (ronde 65)
 *
 * ⚠ WAAROM DIT BESTAAT. `markeerDubbels` kijkt alleen binnen de gekozen rekening.
 * Dat is juist — maar het maakt de dubbelherkenning blind voor de fout die ze het
 * hardst zou moeten vangen: de verkeerde rekening kiezen. Kies je per ongeluk je
 * spaarrekening, dan vindt de controle daar niets, staat élke regel aangevinkt, en
 * boek je een heel uittreksel op het verkeerde boekje — zonder één waarschuwing.
 * De controle zette dus zichzelf uit.
 *
 * Deze functie kijkt de andere kant op: staan deze regels misschien al ergens
 * ánders? Ze geeft de rekening terug met de meeste treffers, en alleen wanneer dat
 * er meer zijn dan op de gekozen rekening — anders is het geen aanwijzing.
 */
export function dubbelsElders(
  kandidaten: Kandidaat[],
  bestaande: Transactie[],
  gekozenRekeningId: string,
): { rekeningId: string; aantal: number } | null {
  // ⚠ Deze functie telt ZELF, op datum en bedrag, en kijkt bewust niet naar de
  // `lijktOp` die er al op staat. De component geeft hier immers de lijst door die
  // `markeerDubbels` al voor de gekozen rekening bewerkt heeft; namen we die
  // markering over, dan telde elke andere rekening haar eigen treffers plus die van
  // de gekozen rekening, stond de rem `aantal > hier` altijd open, en waarschuwde de
  // app terwijl je juist de goede rekening koos.
  const schoon = kandidaten.filter((k) => !k.probleem)
  if (schoon.length === 0) return null

  // Eén doorloop over de boekingen in plaats van één per rekening: bij tweehonderd
  // regels, acht rekeningen en twintigduizend boekingen scheelt dat een factor acht.
  const perRekening = new Map<string, Map<string, number>>()
  for (const t of bestaande) {
    const sleutels = perRekening.get(t.rekeningId) ?? new Map<string, number>()
    const s = `${t.datum}|${t.bedrag}`
    sleutels.set(s, (sleutels.get(s) ?? 0) + 1)
    perRekening.set(t.rekeningId, sleutels)
  }

  // Elke bestaande boeking kan maar één regel verklaren — dezelfde regel als in
  // `markeerDubbels`, dus een teller per sleutel en niet zomaar "komt voor".
  const tel = (rekeningId: string) => {
    const beschikbaar = new Map(perRekening.get(rekeningId) ?? [])
    let n = 0
    for (const k of schoon) {
      const s = `${k.datum}|${k.bedrag}`
      const over = beschikbaar.get(s) ?? 0
      if (over > 0) {
        beschikbaar.set(s, over - 1)
        n++
      }
    }
    return n
  }

  const hier = tel(gekozenRekeningId)
  let beste: { rekeningId: string; aantal: number } | null = null
  for (const id of perRekening.keys()) {
    if (id === gekozenRekeningId) continue
    const aantal = tel(id)
    if (aantal > hier && (beste === null || aantal > beste.aantal)) beste = { rekeningId: id, aantal }
  }
  return beste
}

export function markeerDubbels(
  kandidaten: Kandidaat[],
  bestaande: Transactie[],
  rekeningId: string,
): Kandidaat[] {
  const perSleutel = new Map<string, string[]>()
  for (const t of bestaande) {
    if (t.rekeningId !== rekeningId) continue
    const s = `${t.datum}|${t.bedrag}`
    const lijst = perSleutel.get(s) ?? []
    lijst.push(t.id)
    perSleutel.set(s, lijst)
  }

  return kandidaten.map((k) => {
    if (k.probleem) return k
    const lijst = perSleutel.get(`${k.datum}|${k.bedrag}`)
    if (!lijst || lijst.length === 0) return k
    return { ...k, lijktOp: lijst.shift() }
  })
}
