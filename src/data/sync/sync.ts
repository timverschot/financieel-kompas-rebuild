import { db } from '../db'
import type { SyncBackend } from './backend'
import { LogregelSchema, formaatOordeel, type Logregel } from './events'
import { haalToestelId, leesMeta, schrijfMeta, verwerkOntvangenHlc, voegRegelsToeEnHerbouw } from './lokaal'
import { SLEUTEL_LAATSTE_SYNC } from '../backupmoment'
import { vandaag } from '../../utils/datum'
import type { GeweigerdeRegel, Weigering } from '../../utils/geweigerdeRegels'

export type SyncResultaat = {
  gepusht: number
  opgehaald: number
  ongeldig: number
  /** Regels uit een oudere versie van de app, waarvan de bedragen niet betrouwbaar
   *  te lezen zijn. Zie LOG_FORMAAT in events.ts. */
  verouderd: number
  /** Regels uit een NIEUWERE versie dan deze app. Dan draait dit toestel achter. */
  teNieuw: number
  /**
   * WELKE regels geweigerd zijn — niet alleen hoeveel (ronde 100).
   *
   * ⚠ WAAROM DIT ERBIJ MOEST. Een geweigerde regel wordt nooit aan het eigen logboek
   * toegevoegd (terecht: ze is niet te vertrouwen), dus de volgende ronde ziet haar
   * opnieuw als onbekend en telt haar opnieuw. Met alleen een TELLER kan het scherm niet
   * zien of het om dezelfde regel gaat of om een nieuwe — en dan komt dezelfde melding na
   * elke herlaadbeurt terug, voor altijd. Dat is precies wat Timothy meemaakte.
   *
   * Met de id's erbij kan het scherm onthouden wat het al gezegd heeft, en zwijgen tot er
   * écht iets nieuws is. Zie `utils/geweigerdeRegels.ts`.
   */
  geweigerd: GeweigerdeRegel[]
}

// Eén synchronisatieronde: eerst eigen nieuwe wijzigingen versturen, dan
// wijzigingen van andere toestellen ophalen, valideren en de staat herbouwen.
export async function synchroniseer(backend: SyncBackend, dagISO: string = vandaag()): Promise<SyncResultaat> {
  const toestelId = await haalToestelId()

  // --- PUSH: het volledige eigen logboek versturen zodra er iets nieuw is.
  // (Compactie: één bestand per toestel dat overschreven wordt, i.p.v. een nieuw
  // bestand per sync.) ---
  const laatstGepusht = (await leesMeta<number>('laatstGepushtVolgnummer')) ?? 0
  const eigen = await db.events.where('toestelId').equals(toestelId).sortBy('volgnummer')
  const nieuwEigen = eigen.filter((r) => r.volgnummer > laatstGepusht)

  if (nieuwEigen.length > 0) {
    await backend.stuur(toestelId, eigen)
    await schrijfMeta('laatstGepushtVolgnummer', eigen[eigen.length - 1].volgnummer)
  }

  // --- PULL: alle regels ophalen, nieuwe eruit halen, valideren en toepassen ---
  const alle = await backend.haalOp()
  const bestaandeIds = new Set((await db.events.toArray()).map((e) => e.id))

  let ongeldig = 0
  let verouderd = 0
  let teNieuw = 0
  const geweigerd: GeweigerdeRegel[] = []
  const nieuw: Logregel[] = []
  for (const regel of alle) {
    if (bestaandeIds.has(regel.id)) continue
    const check = LogregelSchema.safeParse(regel)
    // BEWUST `regel` en niet `check.data`. Het schema controleert of de regel
    // deugt, maar het KNIPT ook alles weg wat het niet kent. Sla je de geparste
    // versie op, dan bewaart een toestel met een oudere app-versie de logregels van
    // een nieuwere versie zónder de velden die het niet begrijpt — en schrijft het
    // die verminkte versie daarna gewoon terug naar de back-up. Het logboek wordt
    // dan wél herschreven, alleen onzichtbaar, en de velden zijn op álle toestellen
    // weg zodra dat oudere toestel die regel nog eens aanraakt.
    //
    // Het hele idee van een append-only logboek is dat een regel blijft wat ze is.
    // Dus: valideren met het schema, bewaren wat er stond.
    if (!check.success) {
      ongeldig++
      // ⚠ RONDE 109 — ÓÓK IN `geweigerd`. Dit getal ging alleen naar de vluchtige statuszin, en
      // de stille synchronisatie toont die niet: een regel van je andere toestel die deze app
      // niet kan lezen, verdween zo zonder één woord, elke 45 seconden opnieuw. De twee andere
      // redenen komen wél in de blijvende melding op het Overzicht.
      //
      // ⚠ Het kenmerk komt hier uit de RUWE regel en niet uit `check.data` — dat bestaat niet,
      // want de controle is juist mislukt. `id` en `tijdstip` worden apart nagekeken: van een
      // onleesbare regel is niets te vertrouwen, ook die twee velden niet.
      const id = typeof regel.id === 'string' && regel.id.length > 0 ? regel.id : `onleesbaar-${ongeldig}`
      const tijdstip = typeof regel.tijdstip === 'number' && Number.isFinite(regel.tijdstip) ? regel.tijdstip : 0
      geweigerd.push({ id, tijdstip, reden: 'onleesbaar' })
      continue
    }
    // Een regel uit de euro-tijd draagt geen eenheid. Zo'n regel toepassen zou haar
    // bedragen als CENTEN lezen, en dan staat € 2.400 er als € 24. Dat is precies
    // hoe deze fout aan het licht kwam. We passen ze niet toe en tellen ze apart,
    // zodat de gebruiker het ziet in plaats van dat zijn cijfers stil veranderen.
    // NA de schemacontrole: een kapotte regel is 'ongeldig', geen 'verouderd'.
    const oordeel = formaatOordeel(check.data)
    if (oordeel === 'te-oud') {
      verouderd++
      geweigerd.push(kenmerk(check.data, 'te-oud'))
      continue
    }
    if (oordeel === 'te-nieuw') {
      teNieuw++
      geweigerd.push(kenmerk(check.data, 'te-nieuw'))
      continue
    }
    nieuw.push(regel)
  }

  if (nieuw.length > 0) {
    // Binnenhalen en toepassen horen bij elkaar (ronde 35).
    //
    // Dit waren drie losse stappen. Mislukte de laatste — de herbouw — dan stonden
    // de opgehaalde regels wél in het logboek maar nergens in je lijsten. En dat
    // herstelde zich nooit meer: de volgende synchronisatie ziet die regels als
    // "al bekend" en slaat de herbouw over, en een herstart herbouwt niets. De
    // boeking van je andere toestel bleef dus onzichtbaar tot er toevallig weer
    // iets nieuws van buiten binnenkwam. Zonder foutmelding, want de stille
    // synchronisatie slikt fouten in.
    //
    // Gaat het nu mis, dan verdwijnen ook de regels weer uit het logboek, en haalt
    // de volgende ronde ze gewoon opnieuw op.
    await voegRegelsToeEnHerbouw(nieuw)
    await verwerkOntvangenHlc(nieuw.map((r) => ({ l: r.hlcL ?? r.tijdstip, c: r.hlcC ?? 0 })))
  }

  // ⚠ De dag van de laatste geslaagde ronde — maar alleen wanneer élke lokale
  // logregel ook ECHT in de back-up staat (ronde 63, tweemaal aangescherpt).
  //
  // Deze dag is het bewijs waarop het belletje zwijgt. Hij mag dus niet betekenen
  // "de ronde gooide geen fout": een ronde die nul bytes verstuurt en nul regels
  // ophaalt, gooit ook geen fout. Dat gebeurt bij een hernoemde Drive-map (de app
  // maakt dan een nieuwe, lege map aan), bij een logbestand dat je zelf weggooide,
  // en wanneer een ánder toestel "Begin opnieuw" deed — dat gooit álle logbestanden
  // in de prullenbak, ook de jouwe.
  //
  // De controle vergelijkt IDS en niet volgnummers. Een eerdere versie keek alleen
  // of er een regel van dít toestel met een hoog genoeg volgnummer op stond, en dat
  // liet een groot gat open: zet je op een nieuwe telefoon een back-upbestand terug,
  // dan draagt je hele geschiedenis het toestel-id van je OUDE telefoon. `stuur()`
  // verstuurt alleen je eigen regels, dus die geschiedenis komt nooit op Drive — en
  // toch keurde de controle elke ronde goed.
  //
  // `alle` is opgehaald NA de push, dus ze toont wat er nu werkelijk in de back-up
  // ligt. Twee dingen dragen die redenering, en allebei staan ze elders vast:
  // `stuur()` schrijft het VOLLEDIGE logboek van een toestel in één bestand (zie
  // `SyncBackend`), en `haalOp()` slaat een bestand dat niet te lezen is over in
  // plaats van het half in te lezen (zie `DriveBackend.haalOp`).
  //
  // De dag komt van buiten (met de echte dag als standaard), zodat een test hem
  // kan vastzetten zonder de klok stil te leggen — neptijd en de nep-IndexedDB
  // gaan niet samen (ronde 61).
  const idsInBackup = new Set(alle.map((r) => r.id))
  const allesStaatErop = [...bestaandeIds].every((id) => idsInBackup.has(id))
  if (allesStaatErop) {
    await schrijfMeta(SLEUTEL_LAATSTE_SYNC, dagISO)
  } else {
    // ⚠ Niet alleen vaststellen, ook herstellen (tweede nakijkronde ronde 63).
    // `laatstGepushtVolgnummer` onthoudt hoe ver we al waren; staat die hoog en is
    // de back-up leeg, dan valt er nooit meer iets te pushen en blijft de app
    // eeuwig "0 verstuurd, 0 opgehaald" melden. Door de teller terug te zetten,
    // stuurt de eerstvolgende ronde alles opnieuw — en dan lost het probleem
    // zichzelf op in plaats van dat je het alleen te horen krijgt.
    await schrijfMeta('laatstGepushtVolgnummer', 0)
  }

  return { gepusht: nieuwEigen.length, opgehaald: nieuw.length, ongeldig, verouderd, teNieuw, geweigerd }
}

/**
 * Net genoeg van een geweigerde regel om te kunnen zeggen wélke het is (ronde 100).
 *
 * ⚠ BEWUST NIET DE HELE REGEL. Wat erin staat is niet te vertrouwen — dat is de reden dat
 * ze geweigerd wordt — dus we nemen alleen wat de app zeker weet: haar id en wanneer ze
 * geschreven is. Geen bedragen, geen omschrijvingen.
 */
function kenmerk(regel: Logregel, reden: Weigering): GeweigerdeRegel {
  return { id: regel.id, tijdstip: regel.tijdstip, reden }
}
