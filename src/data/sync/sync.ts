import { db } from '../db'
import type { SyncBackend } from './backend'
import { LogregelSchema, formaatOordeel, type Logregel } from './events'
import { haalToestelId, leesMeta, schrijfMeta, verwerkOntvangenHlc, voegRegelsToeEnHerbouw } from './lokaal'

export type SyncResultaat = {
  gepusht: number
  opgehaald: number
  ongeldig: number
  /** Regels uit een oudere versie van de app, waarvan de bedragen niet betrouwbaar
   *  te lezen zijn. Zie LOG_FORMAAT in events.ts. */
  verouderd: number
  /** Regels uit een NIEUWERE versie dan deze app. Dan draait dit toestel achter. */
  teNieuw: number
}

// Eén synchronisatieronde: eerst eigen nieuwe wijzigingen versturen, dan
// wijzigingen van andere toestellen ophalen, valideren en de staat herbouwen.
export async function synchroniseer(backend: SyncBackend): Promise<SyncResultaat> {
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
      continue
    }
    if (oordeel === 'te-nieuw') {
      teNieuw++
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

  return { gepusht: nieuwEigen.length, opgehaald: nieuw.length, ongeldig, verouderd, teNieuw }
}
