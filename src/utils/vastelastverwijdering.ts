import type { Spaardoel, Transactie } from '../data/schema'
import type { Vertaler } from '../i18n'

// Wat hangt er aan deze vaste last? (ronde 76)
//
// ⚠ WAAROM DEZE FUNCTIE BESTAAT. Naast elke vaste last stond een kaal kruisje dat
// meteen wiste, met daarna vier woorden op de ongedaan-balk: "Vaste post
// verwijderd". Ondertussen kunnen er DRIE dingen aan zo'n post hangen:
//
//  1. **Boekingen die de app zelf maakte** met "Boek in". Die dragen een vast id
//     (`tk-<postId>-<maand>`, zie `vasteLastTransactieId`) en zijn dus aantoonbaar
//     van deze post. Verdwijnt de post, dan blijven ze staan als gewone boeking —
//     je saldo klopt nog — maar "Uitboeken" bestaat niet meer voor hen.
//  2. **Boekingen waarvan JIJ zei dat ze deze vaste last zijn** (ronde 64). Dat
//     antwoord staat in `Transactie.vasteLastId`. Verdwijnt de post, dan wijst het
//     antwoord nergens meer naartoe.
//  3. **Spaardoelen die hiervoor sparen** (ronde 74, `Spaardoel.vasteLastId`). Die
//     blijven lopen, maar weten niet meer waarvoor — het scherm zegt dan "Kost
//     bestaat niet meer".
//
// ⚠ NIETS DAARVAN GAAT KAPOT: de app is sinds ronde 64 bestand tegen een verwijzing
// naar een post die niet meer bestaat (zie de weescontrole in `vooruitblik.ts`). Het
// probleem is niet dat er iets breekt, het is dat je het niet WEET. Precies zoals
// bij een gezinslid (ronde 65) en een categorie (ronde 65): tellen, tonen, en de
// zachte weg ernaast zetten.
//
// De zachte weg bestaat hier al sinds ronde 38 en heet OPZEGGEN: vul "Loopt tot en
// met" in, en de post blijft in je historiek staan terwijl alleen de toekomst
// verandert. Voor een abonnement dat je stopzet is dat bijna altijd wat je bedoelt.
//
// Zuivere functies: geen datums van binnenuit, geen database.

/**
 * Is dit het id van een boeking die "Boek in" voor deze post maakte?
 *
 * ⚠ Bewust NIET alleen een `startsWith`. Het id is `tk-<postId>-<maand>`, en een
 * post-id is een UUID met streepjes erin; een kale prefixtoets zou bij een
 * ongelukkig gekozen id ook een boeking van een ándere post kunnen opeisen. De staart
 * MOET een maand zijn, en dan is er geen twijfel meer mogelijk.
 */
export function isInboekingVan(transactieId: string, postId: string): boolean {
  const kop = `tk-${postId}-`
  if (!transactieId.startsWith(kop)) return false
  return /^\d{4}-\d{2}$/.test(transactieId.slice(kop.length))
}

export type VasteLastGegevens = {
  transacties?: Transactie[]
  spaardoelen?: Spaardoel[]
}

export type VasteLastVerwijzingen = {
  /** Boekingen die "Boek in" maakte. */
  ingeboekt: number
  /** Boekingen waarvan de gebruiker zei dat ze deze vaste last zijn (ronde 64). */
  aangeduid: number
  /** Spaardoelen die voor deze vaste last sparen (ronde 74). */
  spaardoelen: number
}

/**
 * Tel de drie soorten verwijzingen.
 *
 * ⚠ Een boeking telt hoogstens één keer. Een boeking die "Boek in" maakte kan er
 * later ook nog een `vasteLastId` bij krijgen — een gebruiker die de vraag "is dit je
 * vaste last?" op zo'n boeking beantwoordt, of een oudere versie van de app. Zonder
 * deze regel stond er dan "2 boekingen" terwijl er één boeking is, en dat is precies
 * het soort telling dat ronde 75 heeft leren wantrouwen.
 */
export function telVasteLastVerwijzingen(id: string, g: VasteLastGegevens): VasteLastVerwijzingen {
  const transacties = g.transacties ?? []
  const ingeboekt = transacties.filter((tx) => isInboekingVan(tx.id, id))
  const ingeboekteIds = new Set(ingeboekt.map((tx) => tx.id))
  return {
    ingeboekt: ingeboekt.length,
    aangeduid: transacties.filter((tx) => tx.vasteLastId === id && !ingeboekteIds.has(tx.id)).length,
    spaardoelen: (g.spaardoelen ?? []).filter((d) => d.vasteLastId === id).length,
  }
}

/** Hangt er iets aan? Dan — en alleen dan — stelt de app een vraag vóór ze wist. */
export function hangtErIetsAan(id: string, g: VasteLastGegevens): boolean {
  const tel = telVasteLastVerwijzingen(id, g)
  return tel.ingeboekt > 0 || tel.aangeduid > 0 || tel.spaardoelen > 0
}

/**
 * Eén regel in het venster: WAT er hangt, en wat er met dat ding gebeurt.
 *
 * ⚠ Bewust in twee stukken (browsermeting ronde 76). Als één zin stonden hier drie
 * halfvette alinea's onder elkaar — `.rij-titel` is gemaakt voor een korte regeltitel,
 * niet voor een volzin — en dan lees je geen van de drie. Nu staat het AANTAL vooraan
 * in de titelregel en het gevolg eronder in de meta-regel, precies zoals elke andere
 * lijst in de app.
 */
export type Gebruiksregel = { kop: string; uitleg: string }

/**
 * De regels voor het vraagvenster. Alleen wat er ECHT is.
 *
 * Staat er niets aan, dan is de lijst LEEG — en niet één regel met "er hangt niets
 * aan". Het venster gaat in dat geval namelijk helemaal niet open (zie
 * `hangtErIetsAan`), en een zin die nooit te zien is, is een belofte die niemand kan
 * nakijken.
 */
export function telVasteLastGebruik(t: Vertaler, id: string, g: VasteLastGegevens): Gebruiksregel[] {
  const tel = telVasteLastVerwijzingen(id, g)
  const paren: [number, string, string][] = [
    [tel.ingeboekt, '{n} boeking(en) die je hier inboekte', 'Ze blijven staan als gewone boeking; alleen de knop "Uitboeken" verdwijnt, want die hoort bij de kost.'],
    [tel.aangeduid, '{n} boeking(en) waarvan je zei dat ze deze kost zijn', 'Ze blijven staan en tellen daarna weer mee als een gewone boeking — de app mag ze dus opnieuw bij een andere vaste last voorstellen.'],
    // ⚠ HIER STOND EERST "en je plan zet er geen geld meer voor opzij" (doorlichting
    // ronde 76). Dat was onvoorwaardelijk gezegd terwijl het maar in één van de
    // gevallen waar is: `opzijVolgensSpaardoelen` slaat een maandelijkse of een al
    // opgezegde post over, en in de maand dat de post vervalt zit hij in
    // `vastDezeMaand` en niet in `opzij`. Bovendien ging die zin niet over het DOEL
    // maar over het wissen van de POST zelf — en dat verschuift je plan altijd, ook
    // wanneer er geen doel aan hangt en dit venster dus niet opengaat.
    [tel.spaardoelen, '{n} spaardoel(en) sparen hiervoor', 'Ze blijven lopen, maar weten daarna niet meer waarvoor.'],
  ]
  return paren
    .filter(([n]) => n > 0)
    .map(([n, kop, uitleg]) => ({ kop: t(kop, { n }), uitleg: t(uitleg) }))
}

/**
 * De korte zin op de ongedaan-balk.
 *
 * ⚠ Er stond "Vaste post verwijderd" — vier woorden die niet zeggen WELKE post weg
 * is en niet dat er iets aan hing. Wist je er drie na elkaar, dan las de balk drie
 * keer hetzelfde en wist je bij "Ongedaan maken" niet welke je terughaalde.
 */
export function vasteLastUndoTekst(t: Vertaler, naam: string, tel: VasteLastVerwijzingen): string {
  const boekingen = tel.ingeboekt + tel.aangeduid
  if (boekingen === 0 && tel.spaardoelen === 0) return t('{naam} verwijderd', { naam })
  if (tel.spaardoelen === 0) return t('{naam} verwijderd, {n} boeking(en) blijven staan', { naam, n: boekingen })
  if (boekingen === 0) return t('{naam} verwijderd, {n} spaardoel(en) blijven lopen', { naam, n: tel.spaardoelen })
  return t('{naam} verwijderd, {n} boeking(en) blijven staan en {d} spaardoel(en) blijven lopen', {
    naam,
    n: boekingen,
    d: tel.spaardoelen,
  })
}
