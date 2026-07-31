import Dexie, { type Table } from 'dexie'
import type {
  Aflossing,
  Budget,
  Categorie,
  Dossier,
  DossierDocument,
  Garantie,
  GedeeldeKost,
  Kind,
  Kindrekening,
  Kindrekeningpost,
  Lening,
  Ordening,
  Overboeking,
  Rekening,
  Spaardoel,
  Streepjescode,
  Subcategorie,
  TerugkerendePost,
  Transactie,
  Verrekening,
  Waardering,
  Onderhoudsbijdrage,
  Maandafsluiting,
  Onderhoudsbetaling,
} from './schema'
import type { Logregel, MetaRegel } from './sync/events'
import { nieuwId } from './sync/id'
import { euroNaarCenten, gebeurtenisNaarCenten, transactieNaarCenten } from './migraties'

// De echte database in de browser (IndexedDB), via Dexie. Dit is de bron van
// waarheid op je toestel: snel, offline, en met echte garanties.
export class FinancieelKompasDB extends Dexie {
  rekeningen!: Table<Rekening, string>
  transacties!: Table<Transactie, string>
  events!: Table<Logregel, string>
  meta!: Table<MetaRegel, string>
  categorieen!: Table<Categorie, string>
  budgetten!: Table<Budget, string>
  dossiers!: Table<Dossier, string>
  gedeeldeKosten!: Table<GedeeldeKost, string>
  verrekeningen!: Table<Verrekening, string>
  terugkerendePosten!: Table<TerugkerendePost, string>
  spaardoelen!: Table<Spaardoel, string>
  subcategorieen!: Table<Subcategorie, string>
  overboekingen!: Table<Overboeking, string>
  kinderen!: Table<Kind, string>
  kindrekeningen!: Table<Kindrekening, string>
  kindrekeningposten!: Table<Kindrekeningpost, string>
  leningen!: Table<Lening, string>
  aflossingen!: Table<Aflossing, string>
  garanties!: Table<Garantie, string>
  streepjescodes!: Table<Streepjescode, string>
  dossierdocumenten!: Table<DossierDocument, string>
  ordeningen!: Table<Ordening, string>
  waarderingen!: Table<Waardering, string>
  onderhoudsbijdragen!: Table<Onderhoudsbijdrage, string>
  onderhoudsbetalingen!: Table<Onderhoudsbetaling, string>
  maandafsluitingen!: Table<Maandafsluiting, string>

  constructor() {
    super('financieel-kompas')

    // Versie 1 - Fase 1: de eerste tabellen (huidige staat).
    this.version(1).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum',
    })

    // Versie 2 - Fase 2: het append-only logboek (events) en sleutel/waarde
    // (meta). Bij de upgrade krijgen bestaande records uit Fase 1 alsnog een
    // gebeurtenis, zodat het logboek de volledige geschiedenis bevat.
    this.version(2)
      .stores({
        rekeningen: 'id, naam',
        transacties: 'id, rekeningId, datum',
        events: 'id, toestelId, volgnummer',
        meta: 'sleutel',
      })
      .upgrade(async (trans) => {
        const toestelId = nieuwId()
        await trans.table('meta').put({ sleutel: 'toestelId', waarde: toestelId })
        let volg = 0
        const nu = Date.now()
        for (const r of await trans.table('rekeningen').toArray()) {
          volg++
          await trans.table('events').put({
            id: nieuwId(),
            toestelId,
            volgnummer: volg,
            tijdstip: nu,
            gebeurtenis: { type: 'rekening.bewaard', payload: r },
          })
        }
        for (const t of await trans.table('transacties').toArray()) {
          volg++
          await trans.table('events').put({
            id: nieuwId(),
            toestelId,
            volgnummer: volg,
            tijdstip: nu,
            gebeurtenis: { type: 'transactie.bewaard', payload: t },
          })
        }
        await trans.table('meta').put({ sleutel: 'volgnummer', waarde: volg })
      })

    // Versie 3 - categorieën.
    this.version(3).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
    })

    // Versie 4 - budgetten per categorie. Nieuwe tabel; geen omzetting van
    // bestaande data nodig.
    this.version(4).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
    })

    // Versie 5 - Dossiers-module: dossiers voor gedeelde kosten + de gedeelde
    // kosten zelf. Nieuwe tabellen; geen omzetting van bestaande data nodig.
    this.version(5).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId',
    })

    // Versie 6 - afrekeningen: een tabel voor vastgelegde verrekeningen, en een
    // extra index op gedeeldeKosten (verrekeningId) om open vs afgerekende
    // kosten te onderscheiden. Bestaande data blijft ongemoeid.
    this.version(6).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
    })

    // Versie 7 - terugkerende (vaste) posten. Nieuwe tabel; geen omzetting nodig.
    this.version(7).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
    })

    // Versie 8 - geld in gehele centen. De schema-indexen blijven gelijk, maar
    // alle bestaande bedragen (in euro's, drijvende komma) worden eenmalig
    // omgezet naar centen: zowel in het logboek (elke gebeurtenis-payload) als
    // in de afgeleide staat-tabellen. Zo lopen logboek en staat niet uit elkaar.
    this.version(8)
      .stores({
        rekeningen: 'id, naam',
        transacties: 'id, rekeningId, datum, categorieId',
        events: 'id, toestelId, volgnummer',
        meta: 'sleutel',
        categorieen: 'id, naam',
        budgetten: 'id, categorieId',
        dossiers: 'id, naam',
        gedeeldeKosten: 'id, dossierId, verrekeningId',
        verrekeningen: 'id, dossierId',
        terugkerendePosten: 'id',
      })
      .upgrade(async (trans) => {
        // 1) Logboek: het geldveld in elke gebeurtenis-payload naar centen.
        const events = await trans.table('events').toArray()
        for (const e of events) {
          const nieuweGebeurtenis = gebeurtenisNaarCenten(e.gebeurtenis)
          if (nieuweGebeurtenis !== e.gebeurtenis) {
            await trans.table('events').put({ ...e, gebeurtenis: nieuweGebeurtenis })
          }
        }
        // 2) Staat-tabellen: het bedrag rechtstreeks omzetten.
        await trans
          .table('rekeningen')
          .toCollection()
          .modify((r: { beginsaldo: number }) => {
            r.beginsaldo = euroNaarCenten(r.beginsaldo)
          })
        // Transacties apart: naast het totaalbedrag ook de split-regels omzetten.
        await trans
          .table('transacties')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            const omgezet = transactieNaarCenten(t)
            t.bedrag = omgezet.bedrag
            if ('regels' in omgezet) t.regels = omgezet.regels
          })
        for (const tabel of ['budgetten', 'gedeeldeKosten', 'verrekeningen', 'terugkerendePosten']) {
          await trans
            .table(tabel)
            .toCollection()
            .modify((x: { bedrag: number }) => {
              x.bedrag = euroNaarCenten(x.bedrag)
            })
        }
      })

    // Versie 9 - spaardoelen. Nieuwe tabel; geen omzetting van bestaande data nodig.
    this.version(9).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
    })

    // Versie 10 - subcategorieën (gebruikersaanpassingen op de categorieboom).
    this.version(10).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
    })

    // Versie 11 - interne overboekingen tussen eigen rekeningen. Nieuwe tabel;
    // geen omzetting van bestaande data nodig.
    this.version(11).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
    })

    // Versie 12 - kinderen (globale lijst voor de dossiers-module). Nieuwe tabel;
    // geen omzetting van bestaande data nodig.
    this.version(12).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
    })

    // Versie 13 - kindrekening-module: een gezamenlijke pot per dossier
    // (kindrekeningen) en de bewegingen erop (kindrekeningposten). Nieuwe tabellen;
    // geen omzetting van bestaande data nodig.
    this.version(13).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
    })

    // Versie 14 - leningen/kredieten (beide richtingen) en hun aflossingen. Nieuwe
    // tabellen; geen omzetting van bestaande data nodig.
    this.version(14).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
    })

    // Versie 15 - garantie- & factuurbeheer. Nieuwe tabel; geen omzetting nodig.
    this.version(15).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
    })

    // Versie 16 - onthouden streepjescodes (barcode -> product). Nieuwe tabel;
    // geen omzetting nodig. De 'id' is de barcode zelf.
    this.version(16).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
      streepjescodes: 'id',
    })

    // Versie 17 - documentkluis per dossier (overeenkomst, attesten, bonnen).
    // Nieuwe tabel; geen omzetting nodig.
    this.version(17).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
      streepjescodes: 'id',
      dossierdocumenten: 'id, dossierId',
    })

    // Versie 18 - de door de gebruiker gekozen volgorde van de hoofdcategorieën
    // (zie OrdeningSchema). Alleen een nieuwe tabel: geen bestaande gegevens
    // worden aangeraakt, dus er valt niets om te zetten. Ontbreekt er een
    // ordening, dan geldt gewoon de standaardvolgorde.
    this.version(18).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
      streepjescodes: 'id',
      dossierdocumenten: 'id, dossierId',
      ordeningen: 'id',
    })

    // Versie 19 - waarderingen: "op deze dag stond er dit op deze rekening"
    // (zie WaarderingSchema). Alleen een nieuwe tabel: geen bestaande gegevens
    // worden aangeraakt, dus er valt niets om te zetten. Heeft een rekening geen
    // enkele waardering, dan blijft haar saldo exact zoals het altijd was.
    this.version(19).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
      streepjescodes: 'id',
      dossierdocumenten: 'id, dossierId',
      ordeningen: 'id',
      waarderingen: 'id, rekeningId',
    })

    // Versie 20 - de onderhoudsbijdrage en haar betalingen (ronde 42, zie
    // OnderhoudsbijdrageSchema). Alleen twee nieuwe tabellen: geen bestaande
    // gegevens worden aangeraakt, dus er valt niets om te zetten. Een dossier
    // zonder onderhoudsbijdrage gedraagt zich exact zoals voorheen.
    this.version(20).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
      streepjescodes: 'id',
      dossierdocumenten: 'id, dossierId',
      ordeningen: 'id',
      waarderingen: 'id, rekeningId',
      onderhoudsbijdragen: 'id, dossierId',
      onderhoudsbetalingen: 'id, bijdrageId',
    })

    // Versie 21 - de maandafsluiting (ronde 43, zie MaandafsluitingSchema). Eén
    // nieuwe tabel met de MAAND als sleutel; bestaande gegevens blijven ongemoeid,
    // dus er valt niets om te zetten. Wie nooit een maand afsluit, merkt niets.
    this.version(21).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
      budgetten: 'id, categorieId',
      dossiers: 'id, naam',
      gedeeldeKosten: 'id, dossierId, verrekeningId',
      verrekeningen: 'id, dossierId',
      terugkerendePosten: 'id',
      spaardoelen: 'id, naam',
      subcategorieen: 'id, categorieId',
      overboekingen: 'id, datum',
      kinderen: 'id, naam',
      kindrekeningen: 'id, dossierId',
      kindrekeningposten: 'id, kindrekeningId',
      leningen: 'id, richting',
      aflossingen: 'id, leningId',
      garanties: 'id, aankoopdatum',
      streepjescodes: 'id',
      dossierdocumenten: 'id, dossierId',
      ordeningen: 'id',
      waarderingen: 'id, rekeningId',
      onderhoudsbijdragen: 'id, dossierId',
      onderhoudsbetalingen: 'id, bijdrageId',
      maandafsluitingen: 'id',
    })
  }
}

export const db = new FinancieelKompasDB()

/**
 * Zorgt dat de database open is — en geeft binnen redelijke tijd een leesbare
 * fout in plaats van eeuwig te blijven hangen.
 *
 * Waarom dit bestaat (ronde 35). De app toont sinds kort een uitlegscherm wanneer
 * de opslag niet opengaat. Maar precies het geval dat dat scherm bij naam noemt —
 * "deze pagina draait nog een oudere versie van de app" — kwam er nooit in
 * terecht. In dat geval houdt een ander tabblad de database nog op de vorige
 * versie open, en dan doet IndexedDB iets eigenaardigs: de aanvraag lukt niet,
 * maar mislukt ook niet. Ze blíjft gewoon wachten. Het gevolg voor de gebruiker
 * was het ergst denkbare: "Laden…", eindeloos, zonder één woord uitleg.
 *
 * Twee vangnetten dus:
 *  - `blocked` vuurt zodra een ander tabblad de weg verspert. Dat is exact bekend,
 *    dus daar zeggen we meteen wat je moet doen: de andere tabbladen sluiten.
 *  - Een wachttijd van tien seconden vangt al de rest (een trage schijf op een
 *    ouder toestel, een browser die de opslag stilzwijgend weigert). Tien seconden
 *    is lang genoeg om een gewone start niet te storen — bij het meten opende de
 *    database met alle gegevens erin ruim binnen één seconde.
 */
export function openDatabase(wachttijdMs = 10000): Promise<void> {
  return new Promise<void>((klaar, mislukt) => {
    let afgehandeld = false
    const af = (fn: () => void) => {
      if (afgehandeld) return
      afgehandeld = true
      clearTimeout(teller)
      fn()
    }

    const teller = setTimeout(() => {
      af(() =>
        mislukt(
          new Error(
            'De opslag reageert niet. Staat de app nog in een ander tabblad open? Sluit die tabbladen en probeer opnieuw.',
          ),
        ),
      )
    }, wachttijdMs)

    // Dexie roept dit aan wanneer een ander tabblad de oude versie vasthoudt.
    db.on('blocked', () => {
      af(() =>
        mislukt(
          new Error(
            'De app staat nog open in een ander tabblad met een oudere versie. Sluit die tabbladen en laad deze pagina opnieuw.',
          ),
        ),
      )
    })

    db.open().then(
      () => af(klaar),
      (e: unknown) => af(() => mislukt(e instanceof Error ? e : new Error(String(e)))),
    )
  })
}
