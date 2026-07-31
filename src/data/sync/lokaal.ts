import { db } from '../db'
import { pasToe, type Staat } from './replay'
import { GebeurtenisSchema, type Gebeurtenis, type Logregel } from './events'
import { nieuwId } from './id'
import { lokaleStap, ontvangstStap, type Stempel } from './hlc'

// --- Sleutel/waarde-opslag (meta) ---
export async function leesMeta<T>(sleutel: string): Promise<T | undefined> {
  const r = await db.meta.get(sleutel)
  return r ? (r.waarde as T) : undefined
}

export async function schrijfMeta(sleutel: string, waarde: unknown): Promise<void> {
  await db.meta.put({ sleutel, waarde })
}

// Haalt de unieke id van dit toestel op, of maakt ze aan bij de eerste keer.
export async function haalToestelId(): Promise<string> {
  let id = await leesMeta<string>('toestelId')
  if (!id) {
    id = nieuwId()
    await schrijfMeta('toestelId', id)
  }
  return id
}

/**
 * De namen van de staat-tabellen, ÉÉN keer opgeschreven.
 *
 * Waarom dit bestaat (ronde 35): `herbouwStaat` leegde en herschreef hieronder elke
 * tabel met twee handgeschreven regels. Bij twintig tabellen is er dan één vergeten,
 * en dat was ook zo — `ordeningen` (de volgorde van je hoofdcategorieën) stond wel
 * in de lijst hierboven en werd wel correct afgespeeld, maar landde nooit in de
 * tabel. Gevolg: je eigen volgorde kwam nooit op een tweede toestel en overleefde
 * geen enkel herstel van een back-up. Stil, want er ging niets kapot; er gebeurde
 * gewoon niets.
 *
 * Door de lijst uit het STAAT-type af te leiden, kan dat niet meer: komt er een
 * eenentwintigste recordsoort bij, dan dwingt TypeScript af dat ze hier ook staat,
 * en een test controleert dat élke naam een echte tabel is.
 */
export const STAAT_NAMEN = [
  'rekeningen',
  'transacties',
  'categorieen',
  'budgetten',
  'dossiers',
  'gedeeldeKosten',
  'verrekeningen',
  'terugkerendePosten',
  'spaardoelen',
  'subcategorieen',
  'overboekingen',
  'kinderen',
  'kindrekeningen',
  'kindrekeningposten',
  'leningen',
  'aflossingen',
  'garanties',
  'streepjescodes',
  'dossierdocumenten',
  'ordeningen',
  'waarderingen',
  'maandafsluitingen',
  'onderhoudsbijdragen',
  'onderhoudsbetalingen',
] as const satisfies readonly (keyof Staat)[]

// Elke sleutel van Staat moet in STAAT_NAMEN staan. Vergeet je er één, dan is dit
// een typefout bij het bouwen — niet een gegeven dat maanden later blijkt te
// ontbreken.
type OntbrekendeNaam = Exclude<keyof Staat, (typeof STAAT_NAMEN)[number]>
const _alleStaatNamenGedekt: OntbrekendeNaam extends never ? true : never = true
void _alleStaatNamenGedekt

// De tabellen die bij een schrijfactie betrokken zijn: alle staat-tabellen plus
// het logboek en de meta-tabel. Ook hier AFGELEID, om dezelfde reden als hieronder.
const SCHRIJF_TABELLEN = () => [db.events, db.meta, ...STAAT_TABELLEN()]

// De tabellen die de huidige staat bevatten (afgeleid uit het logboek). Bewust
// AFGELEID uit STAAT_NAMEN in plaats van opnieuw opgesomd: anders verschuift het
// gat alleen maar. Voeg je een tabel toe aan Staat maar vergeet je hem hier, dan
// draait `herbouwStaat` haar lus buiten de transactiescope en faalt élke sync en
// élk herstel — luidruchtiger dan de vergeten `ordeningen`, maar dezelfde fout.
const STAAT_TABELLEN = () => STAAT_NAMEN.map((naam) => db[naam])

// Past één gebeurtenis toe op de huidige staat (voor eigen, nieuwe wijzigingen).
async function pasStaatToe(regel: Logregel): Promise<void> {
  const g = regel.gebeurtenis
  switch (g.type) {
    case 'transactie.bewaard':
      await db.transacties.put(g.payload)
      break
    case 'transactie.verwijderd':
      await db.transacties.delete(g.payload.id)
      break
    case 'rekening.bewaard':
      await db.rekeningen.put(g.payload)
      break
    case 'rekening.verwijderd':
      await db.rekeningen.delete(g.payload.id)
      break
    case 'categorie.bewaard':
      await db.categorieen.put(g.payload)
      break
    case 'categorie.verwijderd':
      await db.categorieen.delete(g.payload.id)
      break
    case 'budget.bewaard':
      await db.budgetten.put(g.payload)
      break
    case 'budget.verwijderd':
      await db.budgetten.delete(g.payload.id)
      break
    case 'dossier.bewaard':
      await db.dossiers.put(g.payload)
      break
    case 'dossier.verwijderd':
      await db.dossiers.delete(g.payload.id)
      break
    case 'gedeeldekost.bewaard':
      await db.gedeeldeKosten.put(g.payload)
      break
    case 'gedeeldekost.verwijderd':
      await db.gedeeldeKosten.delete(g.payload.id)
      break
    case 'verrekening.bewaard':
      await db.verrekeningen.put(g.payload)
      break
    case 'verrekening.verwijderd':
      await db.verrekeningen.delete(g.payload.id)
      break
    case 'terugkerendepost.bewaard':
      await db.terugkerendePosten.put(g.payload)
      break
    case 'terugkerendepost.verwijderd':
      await db.terugkerendePosten.delete(g.payload.id)
      break
    case 'spaardoel.bewaard':
      await db.spaardoelen.put(g.payload)
      break
    case 'spaardoel.verwijderd':
      await db.spaardoelen.delete(g.payload.id)
      break
    case 'subcategorie.bewaard':
      await db.subcategorieen.put(g.payload)
      break
    case 'subcategorie.verwijderd':
      await db.subcategorieen.delete(g.payload.id)
      break
    case 'overboeking.bewaard':
      await db.overboekingen.put(g.payload)
      break
    case 'overboeking.verwijderd':
      await db.overboekingen.delete(g.payload.id)
      break
    case 'kind.bewaard':
      await db.kinderen.put(g.payload)
      break
    case 'kind.verwijderd':
      await db.kinderen.delete(g.payload.id)
      break
    case 'kindrekening.bewaard':
      await db.kindrekeningen.put(g.payload)
      break
    case 'kindrekening.verwijderd':
      await db.kindrekeningen.delete(g.payload.id)
      break
    case 'kindrekeningpost.bewaard':
      await db.kindrekeningposten.put(g.payload)
      break
    case 'kindrekeningpost.verwijderd':
      await db.kindrekeningposten.delete(g.payload.id)
      break
    case 'maandafsluiting.bewaard':
      await db.maandafsluitingen.put(g.payload)
      break

    case 'maandafsluiting.verwijderd':
      await db.maandafsluitingen.delete(g.payload.id)
      break

    case 'onderhoudsbijdrage.bewaard':
      await db.onderhoudsbijdragen.put(g.payload)
      break
    case 'onderhoudsbijdrage.verwijderd':
      await db.onderhoudsbijdragen.delete(g.payload.id)
      break
    case 'onderhoudsbetaling.bewaard':
      await db.onderhoudsbetalingen.put(g.payload)
      break
    case 'onderhoudsbetaling.verwijderd':
      await db.onderhoudsbetalingen.delete(g.payload.id)
      break
    case 'lening.bewaard':
      await db.leningen.put(g.payload)
      break
    case 'lening.verwijderd':
      await db.leningen.delete(g.payload.id)
      break
    case 'aflossing.bewaard':
      await db.aflossingen.put(g.payload)
      break
    case 'aflossing.verwijderd':
      await db.aflossingen.delete(g.payload.id)
      break
    case 'garantie.bewaard':
      await db.garanties.put(g.payload)
      break
    case 'garantie.verwijderd':
      await db.garanties.delete(g.payload.id)
      break
    case 'streepjescode.bewaard':
      await db.streepjescodes.put(g.payload)
      break
    case 'streepjescode.verwijderd':
      await db.streepjescodes.delete(g.payload.id)
      break
    case 'ordening.bewaard':
      await db.ordeningen.put(g.payload)
      break
    case 'ordening.verwijderd':
      await db.ordeningen.delete(g.payload.id)
      break
    case 'waardering.bewaard':
      await db.waarderingen.put(g.payload)
      break
    case 'waardering.verwijderd':
      await db.waarderingen.delete(g.payload.id)
      break
    case 'dossierdocument.bewaard':
      await db.dossierdocumenten.put(g.payload)
      break
    case 'dossierdocument.verwijderd':
      await db.dossierdocumenten.delete(g.payload.id)
      break
  }
}

// Elke lokale wijziging loopt hierlangs: de gebeurtenis wordt gevalideerd, als
// logregel bewaard (append-only) én toegepast op de huidige staat - alles in één
// database-transactie, zodat logboek en staat nooit uit elkaar lopen.
export async function pasGebeurtenisToe(gebeurtenis: Gebeurtenis): Promise<void> {
  await pasGebeurtenissenToe([gebeurtenis])
}

/**
 * Meerdere gebeurtenissen als ÉÉN ondeelbare wijziging.
 *
 * Waarom dit nodig is (ronde 35): het verwijderen van een transactie ruimt ook op
 * wat eraan hangt — de gedeelde kost in een dossier, de bon. Dat gebeurde als een
 * REEKS losse schrijfacties, elk met een eigen databasetransactie. Brak die reeks
 * halverwege af (schijf vol, tabblad gesloten, browser die de transactie afbreekt),
 * dan was de transactie weg uit je overzicht maar bleef de gedeelde kost als
 * weesrecord in het dossier staan — en telde ze gewoon mee in de volgende
 * afrekening met de andere ouder. Zonder foutmelding, en zonder ongedaan-knop,
 * want die kwam pas na de laatste stap.
 *
 * Nu geldt: ofwel gaat alles door, ofwel niets. De logregels krijgen oplopende
 * volgnummers en stempels, precies zoals wanneer ze na elkaar geschreven waren, dus
 * voor het afspelen en voor de synchronisatie verandert er niets.
 */
export async function pasGebeurtenissenToe(gebeurtenissen: Gebeurtenis[]): Promise<void> {
  if (gebeurtenissen.length === 0) return
  // Eerst álles valideren. Zit er één foute tussen, dan schrijven we er geen enkele
  // — anders zou de helft van een opruiming toch doorgaan.
  const geldige = gebeurtenissen.map((g) => GebeurtenisSchema.parse(g))
  await db.transaction('rw', SCHRIJF_TABELLEN(), async () => {
    const toestelId = await haalToestelId()
    let volg = (await leesMeta<number>('volgnummer')) ?? 0
    let stempel = (await leesMeta<Stempel>('hlc')) ?? { l: 0, c: 0 }
    for (const geldig of geldige) {
      volg += 1
      const nu = Date.now()
      stempel = lokaleStap(stempel, nu)
      const regel: Logregel = {
        id: nieuwId(),
        toestelId,
        volgnummer: volg,
        tijdstip: nu,
        hlcL: stempel.l,
        hlcC: stempel.c,
        gebeurtenis: geldig,
      }
      await db.events.put(regel)
      await pasStaatToe(regel)
    }
    await schrijfMeta('volgnummer', volg)
    await schrijfMeta('hlc', stempel)
  })
}

// Werk de eigen hybride logische klok bij nadat wijzigingen van andere toestellen
// zijn binnengekomen, zodat volgende eigen wijzigingen er zeker ná geordend worden.
export async function verwerkOntvangenHlc(stempels: Stempel[]): Promise<void> {
  if (stempels.length === 0) return
  const nu = Date.now()
  let state = (await leesMeta<Stempel>('hlc')) ?? { l: 0, c: 0 }
  for (const s of stempels) state = ontvangstStap(state, s, nu)
  await schrijfMeta('hlc', state)
}

// Herbouwt de volledige staat uit het logboek. Nodig na het binnenhalen van
// wijzigingen van andere toestellen.

/**
 * Regels van een ánder toestel in het logboek zetten én meteen toepassen, als één
 * ondeelbare stap.
 *
 * Waarom samen: het waren twee losse stappen, en mislukte de tweede, dan stonden de
 * regels wél in het logboek maar niet in je lijsten — en dat herstelde zich nooit
 * meer, want de volgende synchronisatie beschouwt die regels als "al bekend" en
 * slaat de herbouw over. Nu geldt: ofwel staan de regels erin én zijn ze verwerkt,
 * ofwel is er niets gebeurd en probeert de volgende ronde het gewoon opnieuw.
 */
export async function voegRegelsToeEnHerbouw(regels: Logregel[]): Promise<void> {
  await db.transaction('rw', SCHRIJF_TABELLEN(), async () => {
    await db.events.bulkPut(regels)
    await herbouwBinnenTransactie()
  })
}

export async function herbouwStaat(): Promise<void> {
  // Het logboek wordt BINNEN dezelfde transactie gelezen als waarin we de tabellen
  // opnieuw opbouwen. Dat is geen detail (ronde 35).
  //
  // Het stond eerst erbuiten: eerst het logboek lezen, dán een transactie openen
  // die alle tabellen leegmaakt en de gelezen momentopname terugschrijft. Alles wat
  // tússen die twee stappen bewaard werd, verdween daarmee weer uit beeld. En dat
  // venster is precies het moment waarop je zit te werken: `herbouwStaat` draait na
  // elke synchronisatie die iets ophaalt, en de stille synchronisatie loopt elke
  // 45 seconden.
  //
  // Wat je dan zag: je boeking verdwijnt kort nadat je ze bewaard hebt, of het
  // bedrag dat je net van € 40 naar € 80 wijzigde springt terug naar € 40. In het
  // logboek stond ze nog wél, dus na een herstart kwam ze terug — maar wie tikt er
  // niet gewoon opnieuw in wat hij ziet verdwijnen? En dan stond ze er dubbel.
  //
  // Met het lezen binnen de transactie kan er niets meer tussen: IndexedDB laat de
  // schrijfactie ofwel vóór ofwel ná deze hele bewerking plaatsvinden.
  await db.transaction('rw', SCHRIJF_TABELLEN(), herbouwBinnenTransactie)
}

/** Het eigenlijke herbouwen. Draait ALTIJD binnen een openstaande transactie. */
async function herbouwBinnenTransactie(): Promise<void> {
  const regels = await db.events.toArray()
  const staat = pasToe(regels)
  for (const naam of STAAT_NAMEN) {
    // De tabellen hebben dezelfde naam als de sleutels van de staat; dat is de
    // hele reden waarom dit met een lus kan.
    const tabel = db[naam] as unknown as { clear(): Promise<void>; bulkPut(rijen: unknown[]): Promise<unknown> }
    await tabel.clear()
    await tabel.bulkPut([...staat[naam].values()])
  }
}
