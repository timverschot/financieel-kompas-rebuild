import type { Categorie, Gezinslid, Rekening, Transactie } from '../data/schema'
import { groepVanCategorie, labelVanCategorie } from '../data/categorieen/resolve'
import type { Vertaler } from '../i18n'
import { maakCsv, metBom, veiligeCsvTekst } from './csv'
import { centenNaarInvoer } from './format'
import { veiligeBestandsnaam } from './download'
import { filterBeschrijving, type FilterNamen } from './filterTekst'
import { categorieBedragen } from './transactie'
import { naamVanPersoon } from './persoon'
import type { TxFilter } from './transactieFilter'

// De transactielijst als CSV-bestand voor Excel.
//
// Twee keuzes die hier vastliggen (ronde 41):
//
// 1. EXCEL-VRIENDELIJK betekent voor een Belgisch of Nederlands Excel: puntkomma
//    als scheidingsteken, komma als decimaalteken, en een byte-volgordemarkering
//    vooraan. Dat trio hoort bij elkaar. Zet je een komma als scheidingsteken, dan
//    valt "12,50" in twee kolommen; laat je de markering weg, dan wordt "Café
//    Piano" tekenbrij. Daarom staan de bedragen als "12,50" en niet als
//    `formatEuro()`: dat laatste geeft "€ 12,50" met een vast spatieteken erin, en
//    dat leest Excel als TEKST — je kan er dan niet mee rekenen.
//
// 2. ÉÉN RIJ PER TICKETREGEL. Een kassaticket van € 53,80 dat over Voeding en
//    Huishouden verdeeld is, geeft twee rijen met hetzelfde ticketnummer. Zou je
//    één rij per transactie schrijven, dan zou een draaitabel op categorie het hele
//    bedrag aan één categorie toewijzen — precies de fout die de app intern
//    nergens meer maakt. De laatste kolom houdt de rijen bij elkaar, zodat je in
//    Excel op ticket kan groeperen.
//
// De volgorde en de selectie van de rijen komen van de aanroeper: het bestand moet
// precies zijn wat er op het scherm staat.

/**
 * De gezinsleden van één boeking, als namen (ronde 51).
 *
 * Waarom deze kolom er is: je kan op een gezinslid FILTEREN, en die naam belandt dan
 * ook in de bestandsnaam — maar in het bestand zelf stond nergens wie waarbij hoorde.
 * Je stuurde dus een bestand met "emma" in de naam waarin Emma niet één keer voorkomt.
 *
 * Namen en geen id's, om dezelfde reden als bij de filterchips: een id zegt de lezer
 * niets, en dit bestand gaat de deur uit.
 *
 * `persoonIds` staat op de BOEKING en niet per ticketregel. Bij een gesplitst
 * kassaticket herhaalt de waarde zich dus op elke regel — net zoals de kolom Rekening
 * dat al doet. Zo blijft elke rij op zichzelf leesbaar.
 *
 * Een lid dat intussen verwijderd is, wordt "Onbekend gezinslid" en verdwijnt niet
 * stil: anders zou een boeking die wél aan iemand hangt er in het bestand uitzien als
 * een boeking die aan niemand hangt.
 */
function gezinsledenTekst(t: Vertaler, tx: Transactie, leden: Gezinslid[]): string {
  const ids = tx.persoonIds ?? []
  if (ids.length === 0) return ''
  return ids.map((id) => naamVanPersoon(id, leden) ?? t('Onbekend gezinslid')).join(', ')
}

/** De kolomkoppen, in de volgorde van de rijen. Vertaalbaar; de data niet. */
export function csvKoppen(t: Vertaler): string[] {
  return [
    t('Datum'),
    t('Handelaar / winkel'),
    t('Toelichting'),
    t('Hoofdcategorie'),
    t('Categorie'),
    t('Rekening'),
    t('Gezinslid'),
    t('Bedrag'),
    t('Soort'),
    t('Ticket'),
  ]
}

/**
 * De transacties als CSV-rijen, kolomkoppen incluis.
 *
 * `transacties` wordt NIET gefilterd of gesorteerd: dat is al gebeurd op het
 * scherm, en het bestand hoort daar één op één mee overeen te komen.
 */
export function transactieCsvRijen(
  t: Vertaler,
  transacties: Transactie[],
  categorieen: Categorie[],
  rekeningen: Rekening[],
  gezinsleden: Gezinslid[],
): string[][] {
  const rekeningNaam = new Map(rekeningen.map((r) => [r.id, r.naam]))
  const rijen: string[][] = [csvKoppen(t)]

  for (const tx of transacties) {
    const regels = categorieBedragen(tx)
    // De toelichting per ticketregel bestaat alleen bij een gesplitst ticket. Bij
    // een gewone boeking zou ze de handelaarsnaam dubbel herhalen.
    const gesplitst = regels.length > 1
    for (const [i, regel] of regels.entries()) {
      const groep = groepVanCategorie(regel.categorieId, categorieen)
      const toelichting = gesplitst ? (tx.regels?.[i]?.omschrijving ?? '') : ''
      rijen.push([
        tx.datum,
        veiligeCsvTekst(tx.omschrijving),
        veiligeCsvTekst(toelichting),
        veiligeCsvTekst(groep.naam),
        veiligeCsvTekst(labelVanCategorie(regel.categorieId, categorieen) ?? ''),
        veiligeCsvTekst(rekeningNaam.get(tx.rekeningId) ?? ''),
        veiligeCsvTekst(gezinsledenTekst(t, tx, gezinsleden)),
        centenNaarInvoer(regel.bedrag),
        regel.bedrag >= 0 ? t('inkomst') : t('uitgave'),
        veiligeCsvTekst(tx.id),
      ])
    }
  }

  return rijen
}

/** De volledige inhoud van het CSV-bestand, klaar om te downloaden. */
export function transactieCsvBestand(
  t: Vertaler,
  transacties: Transactie[],
  categorieen: Categorie[],
  rekeningen: Rekening[],
  gezinsleden: Gezinslid[],
): string {
  return metBom(maakCsv(transactieCsvRijen(t, transacties, categorieen, rekeningen, gezinsleden), ';'))
}

/**
 * De bestandsnaam, met het actieve filter erin.
 *
 * Waarom het filter in de naam hoort: exporteer je drie keer op één dag — één keer
 * alles, één keer Voeding, één keer maart — dan staan er anders drie bestanden met
 * dezelfde naam in je downloadmap, en weet je bij geen enkel welk het is.
 */
export function transactieCsvBestandsnaam(
  t: Vertaler,
  filter: TxFilter,
  vandaagISO: string,
  namen: FilterNamen = {},
): string {
  const beschrijving = veiligeBestandsnaam(filterBeschrijving(t, filter, namen), 50)
  return `transacties-${beschrijving || 'alles'}-${vandaagISO}.csv`
}
