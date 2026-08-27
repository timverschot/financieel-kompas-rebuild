import type { Vertaler } from '../i18n'
import { maakCsv, metBom, veiligeCsvTekst } from './csv'
import { centenNaarInvoer } from './format'
import { veiligeBestandsnaam } from './download'
import type { FiscaalOverzicht, FiscaleRegel } from './fiscaal'

// Het fiscale jaaroverzicht als CSV (ronde 50).
//
// Dezelfde drie Excel-keuzes als `transactieCsv.ts`: puntkomma als scheidingsteken,
// komma als decimaalteken, en een byte-volgordemarkering vooraan. Dat trio hoort bij
// elkaar; laat je er één weg, dan valt het bestand uit elkaar in een Belgisch Excel.
//
// ÉÉN RIJ PER BOEKING, met de post ernaast. Niet één rij per post: wie dit bestand
// aan zijn boekhouder geeft, moet kunnen zien wáár een bedrag vandaan komt. Het
// totaal per post staat als aparte regel bovenaan, zodat je allebei hebt zonder te
// hoeven draaien.
//
// TOTALEN EN BOEKINGEN STAAN IN VERSCHILLENDE KOLOMMEN (na review). Ze deelden eerst
// één kolom "Bedrag", en dan telt `=SOM(...)` over die kolom alles dubbel: één keer
// als totaal en één keer als losse boekingen. Wie in Excel een som onder een kolom
// zet, controleert die niet — hij gelooft ze. Nu staat een posttotaal in "Totaal per
// post" en een boeking in "Bedrag", zodat elke kolom apart optelbaar is en geen van
// beide sommen kan liegen.
//
// DE WAARSCHUWING REIST MEE, en de kop van het scherm ook. Op het scherm staat per
// post waarom het bedrag niet zomaar in de aangifte mag, plus welke twee jaartallen
// bij elkaar horen. In een los bestand zijn die zinnen nóg belangrijker, want daar
// staat het scherm niet meer omheen — vandaar de kopregels vóór de tabel.

/** De kolomkoppen van de tabel. */
export function fiscaalCsvKoppen(t: Vertaler): string[] {
  return [
    t('Soort'),
    t('Post'),
    t('Vak'),
    t('Code'),
    t('Datum'),
    t('Omschrijving'),
    t('Totaal per post'),
    t('Bedrag'),
    t('Komt in aanmerking'),
    t('Bon'),
    t('Aantal met bon'),
    t('Let op'),
  ]
}

/**
 * De codes van een post.
 *
 * Bij een VERVALLEN post blijft dit leeg. Het scherm toont die codes bewust niet —
 * er valt niets meer in te vullen — en een code in een bestand is een uitnodiging om
 * ze toch over te typen.
 */
function codes(regel: FiscaleRegel, vervallen: boolean): string {
  return vervallen ? '' : regel.post.codes.join(' / ')
}

/** Hoeveel boekingen een bon hebben — leeg wanneer de app het van gééne kan weten. */
function bonTelling(regel: FiscaleRegel): string {
  if (!regel.boekingen.some((b) => b.bon !== null)) return ''
  return String(regel.metBon)
}

function totaalRij(t: Vertaler, regel: FiscaleRegel, vervallen: boolean): string[] {
  return [
    vervallen ? t('Vervallen') : t('Totaal'),
    t(regel.post.naam),
    t(regel.post.vak),
    codes(regel, vervallen),
    '',
    '',
    centenNaarInvoer(regel.bedrag),
    '',
    regel.aftrekbaar !== undefined
      ? t('waarvan {pct}% aftrekbaar: {bedrag}', {
          pct: regel.percentage ?? 0,
          bedrag: centenNaarInvoer(regel.aftrekbaar),
        })
      : '',
    '',
    bonTelling(regel),
    t(regel.post.waarschuwing ?? ''),
  ]
}

function boekingRijen(t: Vertaler, regel: FiscaleRegel, vervallen: boolean): string[][] {
  return regel.boekingen.map((b) => [
    // ⚠ RONDE 101 — HET ETIKET VOLGT WAT HET DING IS. Bij de post "betaalde
    // onderhoudsuitkeringen" komen deze rijen uit je betalingen in Dossiers, niet uit je
    // boekingen. Het bestand wíst dat al (zie de bon-kolom hieronder); alleen dit woord
    // volgde niet mee, en dan zoek je in je boekingenlijst naar iets wat daar niet staat.
    regel.post.uitOnderhoudsbetalingen ? t('Betaling') : t('Boeking'),
    t(regel.post.naam),
    t(regel.post.vak),
    codes(regel, vervallen),
    b.datum,
    veiligeCsvTekst(b.omschrijving),
    '',
    centenNaarInvoer(b.bedrag),
    '',
    // `null` betekent "de app kan het niet weten", en dat is iets anders dan "nee".
    // Bij een onderhoudsbetaling is bewijs een wettelijke voorwaarde, dus daar zou
    // een "nee" ronduit misleiden.
    b.bon === null ? '' : b.bon ? t('ja') : t('nee'),
    '',
    '',
  ])
}

/**
 * Het volledige bestand.
 *
 * Eerst drie kopregels met wat het scherm eromheen zet, dan een lege regel, dan de
 * tabel: per post het totaal, gevolgd door zijn boekingen. De kolom "Soort" houdt
 * die twee uit elkaar, zodat een filter in Excel volstaat.
 */
export function fiscaalCsvBestand(t: Vertaler, overzicht: FiscaalOverzicht): string {
  const rijen: string[][] = [
    [t('Fiscaal jaaroverzicht')],
    [
      t('Wat je in {jaar} betaalde, geef je aan in de aangifte van aanslagjaar {aj}.', {
        jaar: overzicht.inkomstenjaar,
        aj: overzicht.aanslagjaar,
      }),
    ],
    [
      t('De app verzamelt en telt op. Ze rekent niet uit wat je terugkrijgt: dat hangt af van je volledige aangifte. Dit is geen belastingadvies.'),
    ],
    [
      t('De lijst is die van België. Waar een post gewestelijk is, staat ze zoals ze in Vlaanderen geldt; in Brussel en Wallonië gelden andere regels.'),
    ],
    [],
    fiscaalCsvKoppen(t),
  ]

  // Per post het totaal en meteen daaronder zijn boekingen. Zo staat wat bij elkaar
  // hoort ook bij elkaar wanneer niemand filtert of sorteert.
  for (const regel of overzicht.regels) {
    if (regel.bedrag === 0) continue
    rijen.push(totaalRij(t, regel, false))
    rijen.push(...boekingRijen(t, regel, false))
  }

  for (const regel of overzicht.vervallen) {
    rijen.push(totaalRij(t, regel, true))
    // Ook de boekingen van een vervallen post horen erbij: zonder die lijst zie je
    // wél het bedrag maar niet welke uitgaven het waren, en dan valt er niets na te
    // kijken.
    rijen.push(...boekingRijen(t, regel, true))
  }

  return metBom(maakCsv(rijen))
}

/** De bestandsnaam draagt allebei de jaartallen, want die worden makkelijk verward. */
export function fiscaalCsvBestandsnaam(overzicht: FiscaalOverzicht): string {
  return `${veiligeBestandsnaam(`fiscaal-${overzicht.inkomstenjaar}-aanslagjaar-${overzicht.aanslagjaar}`)}.csv`
}
