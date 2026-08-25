import { useRef, useState } from 'react'
import type { Categorie, Rekening, Spaardoel, TerugkerendePost, Transactie } from '../data/schema'
import { TerugkerendePostFormulier, frequentieNaam } from './TerugkerendePostFormulier'
import { formatEuro } from '../utils/format'
import { opzijVolgensSpaardoelen, spaardoelVoorVasteLast } from '../utils/spaardoel'
import { dagJaar, maandJaarLabel, vandaag } from '../utils/datum'
import { frequentieVan, isGestopt, maandbedrag, opzijPerMaand, valtInMaand, verschuifMaand, volgendeVervaldag } from '../utils/vastelast'
import { contractstand, contractTeltNog, type Contractstand } from '../utils/contract'
import { geboekteVasteLasten, vasteLastTransactieId } from '../utils/vooruitblik'
import { Kaart, Leeg } from '../ui/basis'
import { VasteLastWeg } from './VasteLastWeg'
import { hangtErIetsAan, telVasteLastGebruik } from '../utils/vastelastverwijdering'
import { useT } from '../i18n'
import { knopnaamVoorPost } from '../utils/postkenmerk'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'

// Sectie voor vaste (terugkerende) lasten: overzicht, inboeken voor de gekozen
// maand, en een formulier om een vaste post toe te voegen of te bewerken.
//
// Sinds ronde 23 hoeft een vaste last niet meer maandelijks te zijn. Dat verandert
// twee dingen in deze lijst: "Boek in" verschijnt alleen in de maanden waarin de
// post écht vervalt (anders zou je een jaarpremie twaalf keer kunnen boeken), en
// bij een niet-maandelijkse post staat erbij wanneer ze de volgende keer komt en
// wat ze omgerekend per maand kost.
export function TerugkerendeSectie({
  posten,
  rekeningen,
  categorieen,
  transacties,
  maand,
  maandLabel,
  onOpslaan,
  onVerwijderen,
  onBoek,
  onOngedaan,
  onLosmaken,
  soort = 'uitgave',
  vandaagISO = vandaag(),
  spaardoelen = [],
}: {
  posten: TerugkerendePost[]
  /**
   * De spaardoelen, alleen om te tonen dat er voor deze post al gespaard wordt
   * (ronde 74). Optioneel en standaard leeg: zonder deze lijst gedraagt de rij zich
   * precies zoals vóór die ronde.
   */
  spaardoelen?: Spaardoel[]
  rekeningen: Rekening[]

  categorieen: Categorie[]
  transacties: Transactie[]
  maand: string
  maandLabel: string
  /**
   * Welke dag het vandaag is, als 'JJJJ-MM-DD'.
   *
   * Alleen de contractregel gebruikt hem: die gaat over de ECHTE dag van vandaag en
   * niet over de maand die je op het scherm bekijkt. Als parameter en niet als
   * `new Date()` binnenin, zodat een test hem kan vastzetten — precies zoals de
   * rekenkernen het al overal doen. Zie `claude/Kompal_tijdafhankelijke-tests.md`.
   */
  vandaagISO?: string
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBoek: (p: TerugkerendePost) => Promise<void> | void
  /** Een ingeboekte post weer losmaken: wist de transactie die eraan hangt. */
  onOngedaan?: (p: TerugkerendePost) => Promise<void> | void
  /**
   * Toont deze sectie de vaste INKOMSTEN of de vaste LASTEN? Ze stonden tot ronde
   * 25 door elkaar in één lijst met de keuze onderaan het formulier — daardoor was
   * "waar vul ik mijn loon in?" onvindbaar, en bleef "verwachte inkomsten" op nul
   * staan zonder dat iemand kon zien waarom.
   */
  soort?: 'uitgave' | 'inkomst'
  /**
   * De koppeling losmaken die je met "ja" gelegd hebt (ronde 64). De BOEKING gaat
   * mee, niet de post: deze lijst weet precies welke boeking eraan hangt, en dan kan
   * de oproeper er geen andere kiezen. Zonder deze prop blijft alles zoals voorheen:
   * dan zie je alleen het vinkje.
   */
  onLosmaken?: (boeking: Transactie) => void
}) {
  const { t } = useT()
  // Invullen en bewerken kan pas zodra er een rekening bestaat om het aan te hangen.
  const kanBewerken = rekeningen.length > 0
  const [bewerken, setBewerken] = useState<TerugkerendePost | null>(null)
  // De post waarover de verwijdervraag gaat (ronde 76), of null zolang er geen
  // vraag openstaat.
  //
  // ⚠ EEN ID EN GEEN KOPIE (doorlichting ronde 76), precies zoals `lidWegId` in
  // KinderenSectie. De app haalt elke 45 seconden stil nieuwe gegevens op; een venster
  // dat een halve minuut openstaat kan dus over een record hangen dat intussen elders
  // gewijzigd of gewist is. Met een kopie bleef het venster staan met een oude naam,
  // gaf "Ja, verwijder" zichtbaar niets (er is geen record meer om te herstellen, dus
  // ook geen ongedaan-balk), en gaf "Liever opzeggen" een verouderde momentopname aan
  // het formulier — dat schrijft die dan over de nieuwere versie heen. Met een id
  // sluit het venster zichzelf en krijgt het formulier het verse record.
  const [wegPostId, setWegPostId] = useState<string | null>(null)
  // Verhoog om de cursor in "Loopt tot en met" te zetten; zie `focusEindeNa`.
  const [naarEinde, setNaarEinde] = useState(0)
  // ⚠ Waar de focus heen gaat vóór een rij verdwijnt (huisregel sinds ronde 73). De
  // titel van de kaart is het enige dat er in élke toestand staat: de lijst zelf
  // verdwijnt zodra je de laatste post wist, en het formulier eronder staat er niet
  // zonder rekening. Landt de focus op een knop die de app meteen daarna weghaalt,
  // dan valt hij naar `<body>` en sta je met je toetsenbord weer bovenaan de pagina.
  //
  // Voor het venster is dit ook het ANKER waar het naar terugkeert: `Dialoog`
  // onthoudt bij het openen waar de focus stond, en dat is hierdoor niet het kruisje
  // dat straks weg is.
  const ankerRef = useRef<HTMLSpanElement>(null)
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // Elke sectie toont enkel haar eigen soort.
  const eigen = posten.filter((p) => (soort === 'inkomst' ? p.bedrag > 0 : p.bedrag < 0))
  // ⚠ RONDE 83 — DE KNOPNAMEN LEZEN `posten`, DE WAARSCHUWING LEEST `eigen`, en dat is
  // geen slordigheid maar een ander soort vraag.
  //
  // De duplicaatwaarschuwing vraagt "is dit dezelfde KOST?" — en een vaste inkomst
  // "Huur" (kotgeld) is niet dezelfde kost als je huur. Vandaar `bestaande={eigen}`.
  //
  // Een knopnaam vraagt iets anders: "kan ik deze twee knoppen uit elkaar houden?" Op
  // Budget → Vast staan de twee secties ONDER ELKAAR op één scherm, dus met `eigen`
  // heetten er twee knoppen allebei "Verwijderen — Huur". Ronde 82 had dit op "Je
  // situatie" al zo geredeneerd ("de regel is: twee bedieningen op één SCHERM"), maar
  // gaf hier per ongeluk `eigen` mee. Een nakijkronde rekende het na.
  // Zie `wegPostId`: het venster leest het record uit de HUIDIGE lijst, niet uit een
  // bevroren kopie. Uit `eigen` en niet uit `posten`: verandert een post van uitgave
  // naar inkomst, dan hoort zijn rij hier te verdwijnen en het venster mee.
  const wegPost = eigen.find((p) => p.id === wegPostId) ?? null
  const opzijViaDoel = opzijVolgensSpaardoelen(spaardoelen, posten)
  const isInkomst = soort === 'inkomst'
  // Welke posten deze maand al geboekt zijn. Bewust uit de gedeelde kern, want dit
  // moet exact hetzelfde antwoord geven als het belletje en de Vooruitblik.
  // LET OP het filter: `maandVooruitblik` kijkt alleen naar posten die déze maand
  // vervallen. Zonder datzelfde filter kan een post die nu niet aan de beurt is
  // (bv. een jaarlijkse verzekering van hetzelfde bedrag) de boeking van de huur
  // opsnoepen — en dan zegt deze lijst "nog te boeken" terwijl het belletje zwijgt.
  const geboekteIds = geboekteVasteLasten(
    transacties,
    eigen.filter((p) => valtInMaand(p, maand)),
    maand,
    // ⚠ Álle posten voor de weescontrole (tweede nakijkronde ronde 64): een
    // koppeling naar een post die buiten dit filter valt, is geen wees.
    posten,
  )
  // Welke posten zijn geboekt via de knop "Boek in"? Alleen dié kan de app weer
  // uitboeken, want alleen dan bestaat het vaste transactie-id.
  const metVastId = new Set(
    eigen.filter((p) => transacties.some((tx) => tx.id === vasteLastTransactieId(p.id, maand))).map((p) => p.id),
  )
  // Welke posten zijn afgepunt doordat de gebruiker "ja" zei op de vraag "is dit je
  // vaste last?" (ronde 64)? Die kan hij hier weer LOSMAKEN.
  //
  // ⚠ Zonder deze knop was een verkeerd antwoord onherroepelijk: "Uitboeken" bestaat
  // alleen voor een boeking met het vaste id van "Boek in", en de gekoppelde boeking
  // is een gewone boeking die je zelf intikte. Dan stond je vaste last voor die maand
  // als betaald zonder één weg terug.
  const gekoppeld = new Map(
    eigen
      .map((p) => [p.id, transacties.find((tx) => tx.vasteLastId === p.id && tx.datum.startsWith(maand))] as const)
      .filter((paar): paar is readonly [string, typeof transacties[number]] => paar[1] !== undefined),
  )

  async function opslaan(p: TerugkerendePost) {
    // ⚠ RONDE 68 — HIER MAG DE FOUT NIET OPGEVANGEN WORDEN. Het formulier hieronder
    // vangt zelf op en houdt dan je invoer vast; ving deze tussenstap hem al weg, dan
    // zag het formulier "gelukt", maakte het zichzelf leeg, en was je tekst tóch weg —
    // mét een melding erbij. Precies de fout die deze ronde moest uitroeien.
    await onOpslaan(p)
    setBewerken(null)
  }

  return (
    <Kaart
      titel={
        <span ref={ankerRef} tabIndex={-1}>
          {isInkomst ? t('Vaste inkomsten') : t('Vaste lasten')}
        </span>
      }
      bijschrift={
        isInkomst
          ? t('Je loon en alles wat elke maand binnenkomt. Hierop rekent je plan.')
          : t('Inboeken voor {maand}', { maand: maandLabel })
      }
    >
      {eigen.length === 0 && (
        <Leeg>
          {/* ⚠ "Vul hieronder in" mag alleen wanneer daar ook écht een formulier staat.
              Zonder rekening is dat er niet (zie `kanBewerken` verderop), en dan wees
              deze zin naar een leegte. */}
          {isInkomst
            ? kanBewerken
              ? t('Nog geen vaste inkomsten. Vul hieronder je loon in, anders weet je plan niet wat er te verdelen valt.')
              : t('Nog geen vaste inkomsten. Zodra je een rekening hebt, vul je hier je loon in.')
            : t('Nog geen vaste lasten.')}
        </Leeg>
      )}
      <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />

      {eigen.length > 0 && (
        <ul className="lijst">
          {eigen.map((p) => {
            // Uit dezelfde kern als het belletje en de Vooruitblik. Deze lijst
            // keek vroeger alleen naar het vaste id van "Boek in", waardoor een
            // handmatig ingetikte huur hier als "nog niet geboekt" stond terwijl de
            // rest van de app hem al herkende — één klik en je huur stond dubbel.
            const geboekt = geboekteIds.has(p.id)
            const gestopt = isGestopt(p, maand)
            const dezeMaand = valtInMaand(p, maand)
            const periodiek = frequentieVan(p) !== 'maand'
            const volgende = periodiek && !gestopt ? volgendeVervaldag(p, vandaagISO) : null
            const opzij = gestopt ? 0 : opzijPerMaand(p)
            // Hangt er een spaardoel aan? Dan zegt de rij dát, en niet "€ 51,67 per
            // maand opzij" — want dat vraagt de app sinds ronde 74 niet meer: die
            // reservering loopt via de pot van het doel.
            const doel = spaardoelVoorVasteLast(p.id, spaardoelen)
            // Hetzelfde bedrag als Budget onder "Opzij voor later" telt; zie
            // `opzijVolgensSpaardoelen`. Zonder dit zei deze rij "€ 51,67 per maand
            // opzij" terwijl Budget met jouw streefbedrag van € 75 rekende.
            const opzijNu = gestopt ? 0 : (opzijViaDoel.get(p.id) ?? opzij)
            // Het contract achter deze post (ronde 57). Zonder contractgegevens geeft
            // dit `fase: 'geen'` en verandert er niets aan de rij. `contractTeltNog`
            // is dezelfde regel die het belletje gebruikt: zonder haar las je in
            // december nog "beslissen vóór 1 januari" over een post die eind december
            // sowieso stopt, terwijl het belletje er terecht over zweeg.
            const contract = contractstand(p, vandaagISO)
            const contractTelt = contract.fase !== 'geen' && contractTeltNog(p, contract, vandaagISO)
            return (
              // Bovenaan uitlijnen: bij een niet-maandelijkse post staat er een
              // tweede regel tekst, en met verticaal centreren zweefde de badge
              // dan tussen die twee regels in.
              <li key={p.id} className="rij" style={{ alignItems: 'flex-start' }}>
                <div className="rij-midden">
                  <span className="rij-titel">{p.omschrijving}</span>
                  <span className="rij-meta">
                    {t('{bedrag} · dag {dag}', { bedrag: formatEuro(p.bedrag), dag: p.dag })}
                    {periodiek && <> · {frequentieNaam(t, frequentieVan(p))}</>}
                  </span>
                  {/* Wánneer hij gestopt is, hoort zichtbaar te staan — niet in een
                      tooltip, want die bestaat niet op een telefoon. */}
                  {gestopt && p.eindMaand && (
                    <span className="rij-meta">
                      {t('Gestopt na {maand}', { maand: maandJaarLabel(`${verschuifMaand(p.eindMaand, -1)}-01`) })}
                    </span>
                  )}
                  {periodiek && !gestopt && (
                    <span className="rij-meta">
                      {volgende && t('volgende keer {datum}', { datum: dagJaar(volgende) })}
                      {/* ⚠ De omgerekende tak blijft staan (doorlichting ronde 74). Eerst
                          verving de doelzin ALLEBEI de takken, dus bij een post zonder het
                          vinkje "opzijzetten" verdween het omgerekende maandbedrag zonder
                          dat er iets voor in de plaats kwam. Dat cijfer gaat niet over
                          reserveren maar over wat de kost je gemiddeld kost. */}
                      {opzij > 0 || doel
                        ? t(' · {bedrag} per maand opzij', { bedrag: formatEuro(opzijNu) })
                        : t(' · {bedrag} per maand omgerekend', { bedrag: formatEuro(-maandbedrag(p)) })}
                      {doel && t(' · via je spaardoel {doel}', { doel: doel.naam })}
                    </span>
                  )}
                  {/* Het contract (ronde 57). Bewust op de rij zelf en niet achter
                      een knop: dit is een datum waarop je moet handelen, en wat je
                      moet opzoeken, doe je niet. */}
                  {!gestopt && contractTelt && (
                    <span className="rij-meta">
                      {contract.fase === 'onleesbaar'
                        ? // Er STAAT een datum, maar het is er geen. Vroeger zweeg de
                          // app hier volledig, en dan lijkt het contractblok gewoon
                          // leeg terwijl er wel degelijk iets opgeslagen is.
                          t('⚠ De verlengdatum is onleesbaar. Zet ze opnieuw.')
                        : contract.fase === 'verlopen'
                          ? // Mét de oude datum erbij: dan weet je wat er bijgewerkt
                            // moet worden zonder het formulier te openen.
                            t('⚠ De verlengdatum ({datum}) is voorbij. Zet de nieuwe.', {
                              datum: dagJaar(contract.verlengtOp!),
                            })
                          : contract.fase === 'zonder-termijn'
                            ? t('verlengt {datum} · geen opzegtermijn ingevuld', { datum: dagJaar(contract.verlengtOp!) })
                            : contract.fase === 'verlengd'
                              ? // ⚠ Bewust GEEN "opzeggen kan nog" meer (tweede
                                // nakijkronde van ronde 57). Dat klopt voor energie en
                                // voor een stilzwijgend verlengd dienstencontract, maar
                                // niet voor een verzekering in haar eerste jaar of een
                                // abonnement in zijn eerste periode — daar zit je wél
                                // vast tot de volgende vervaldag. De app stelt nu vast
                                // wat ze weet en belooft niets wat ze niet kan waarmaken.
                                termijnZin(t, contract, 'voorbij')
                              : termijnZin(t, contract, 'beslissen')}
                    </span>
                  )}
                </div>
                <span className="rij-acties">
                  {gestopt ? (
                    // Gestopt is iets anders dan "deze maand niet aan de beurt", en
                    // dat verschil moet je kunnen zien: anders lees je bij een
                    // opgezegd abonnement elke maand opnieuw "Niet deze maand" en
                    // snap je niet waarom er niets meer gebeurt.
                    <span className="badge badge-neutraal">{t('Gestopt')}</span>
                  ) : !dezeMaand ? (
                    // Niet deze maand aan de beurt: niets te boeken. Zonder dit zou
                    // je een jaarpremie elke maand opnieuw kunnen inboeken.
                    <span className="badge badge-neutraal">{t('Niet deze maand')}</span>
                  ) : geboekt ? (
                    // "Geboekt ✓" was een doodlopend punt: inboeken maakt een echte
                    // transactie, en die kon je alleen op de Transacties-pagina weer
                    // wissen. Nu kan het hier, waar je geklikt hebt.
                    // ...maar alleen wanneer de app die transactie ook kán wissen.
                    // "Uitboeken" zoekt het vaste id van "Boek in"; heb je de vaste
                    // last zélf ingetikt, dan bestaat dat id niet en deed de knop
                    // letterlijk niets — geen melding, geen effect, twee keer
                    // klikken. Dan tonen we alleen het vinkje.
                    onOngedaan && metVastId.has(p.id) ? (
                      <>
                        <span className="badge badge-ok">{t('Geboekt ✓')}</span>
                        {/* Bewust NIET 'Ongedaan maken': die knop staat op dat
                            moment ook in de undo-melding onderaan het scherm, en
                            twee identieke knoppen naast elkaar zijn verwarrend.
                            'Uitboeken' is bovendien het spiegelbeeld van 'Boek in'. */}
                        <button
                          className="knop knop-ghost knop-klein"
                          aria-label={knopnaamVoorPost(t, t('Uitboeken'), p, posten)}
                          onClick={() => void opslag.probeer(() => onOngedaan(p))}
                        >
                          {t('Uitboeken')}
                        </button>
                      </>
                    ) : onLosmaken && gekoppeld.has(p.id) ? (
                      <>
                        <span className="badge badge-ok">{t('Geboekt ✓')}</span>
                        <button
                          className="knop knop-ghost knop-klein"
                          aria-label={knopnaamVoorPost(t, t('Losmaken'), p, posten)}
                          onClick={() => void opslag.probeer(() => onLosmaken(gekoppeld.get(p.id) as Transactie))}
                        >
                          {t('Losmaken')}
                        </button>
                      </>
                    ) : (
                      <span className="badge badge-ok">{t('Geboekt ✓')}</span>
                    )
                  ) : (
                    <button
                      className="knop knop-secundair knop-klein"
                      // ⚠ RONDE 82 — deze knop droeg alleen zijn eigen woord, op élke rij
                      // hetzelfde. Met tien vaste lasten hoorde je tien keer "Boek in,
                      // knop" en moest je zelf onthouden bij welke rij je was. Van de
                      // vijf knoppen op deze rij noemde het open punt er maar één (de
                      // verwijderknop); deze was de ergste van de vier die er niet in
                      // stonden, want hij verandert je gegevens en heeft geen venster
                      // dat nog eens vraagt of je het zeker weet.
                      aria-label={knopnaamVoorPost(t, t('Boek in'), p, posten)}
                      onClick={() => void opslag.probeer(() => onBoek(p))}
                    >
                      {t('Boek in')}
                    </button>
                  )}
                  {/* Geen potloodje zonder rekening: het formulier eronder staat er
                      dan niet, dus de knop zou nergens toe leiden. */}
                  {kanBewerken && (
                    <button
                      className="knop knop-kaal"
                      aria-label={knopnaamVoorPost(t, t('Bewerken'), p, posten)}
                      onClick={() => setBewerken(p)}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    className="knop knop-kaal knop-gevaar"
                    aria-label={knopnaamVoorPost(t, t('Verwijderen'), p, posten)}
                    // ⚠ Eerst de focus verzetten, dán handelen (ronde 73). Deze knop
                    // haalt zichzelf uit het scherm — of hij opent een venster dat
                    // straks naar deze knop wil terugkeren. Allebei de gevallen zijn
                    // opgelost doordat de focus al op de kaarttitel staat.
                    onClick={() => {
                      // ⚠ Alleen VRAGEN wanneer er iets aan hangt (ronde 76). Hangt er
                      // niets aan, dan is dit precies het kruisje van voorheen, met de
                      // ongedaan-balk als vangnet.
                      if (hangtErIetsAan(p.id, { transacties, spaardoelen })) {
                        // ⚠ HIER GEEN ANKER (doorlichting ronde 76). Deze knop blijft
                        // gewoon staan zolang het venster open is, en `Dialoog` onthoudt
                        // hem als terugkeerpunt. Verzette je de focus tóch, dan kwam je
                        // na "Nee, behouden" op de kaarttitel terecht in plaats van op
                        // het kruisje dat je net indrukte.
                        // Een oude foutmelding hoort niet achter het venster te
                        // blijven staan (regel uit de tweede doorlichting van ronde 68).
                        opslag.wis()
                        setWegPostId(p.id)
                        return
                      }
                      // ⚠ Wél een anker op dit pad: de rij verdwijnt meteen, en een
                      // knop die zichzelf uit het scherm haalt laat de focus naar
                      // `<body>` vallen (huisregel ronde 73).
                      ankerRef.current?.focus()
                      void opslag.probeer(() => onVerwijderen(p.id))
                    }}
                  >
                    ×
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* ⚠ RONDE 66, slotronde — GEEN FORMULIER ZONDER REKENING, MAAR WÉL DE LIJST.
          Een vaste last moet ergens vanaf gaan; zonder rekening bleef de opslaanknop
          voor altijd uit, met een reden die niet klopte. Maar de posten zelf mogen
          niet verdwijnen: wie zijn laatste rekening archiveert, moet ze nog kunnen
          zien en verwijderen. Alleen invullen en bewerken kan even niet. De weg naar
          een nieuwe rekening staat één keer bovenaan dit tabblad, niet twee keer hier
          — twee knoppen met exact dezelfde naam op één scherm is voor een schermlezer
          niet uit elkaar te houden. */}
      {kanBewerken && (
        <TerugkerendePostFormulier
          rekeningen={rekeningen}
          categorieen={categorieen}
          onOpslaan={opslaan}
          onAnnuleer={() => setBewerken(null)}
          bewerken={bewerken}
          focusEindeNa={naarEinde}
          soort={soort}
          // Waarschuwt bij een naam die er al staat (ronde 73). `eigen` en niet `posten`:
          // een vaste ínkomst "Huur" (kotgeld) mag geen waarschuwing geven boven een
          // vaste LAST die ook "Huur" heet — dat zijn twee verschillende dingen.
          bestaande={eigen}
          gedektDoorDoel={(() => {
            // Alleen bij het BEWERKEN van een post die een doel draagt; bij een nieuwe
            // post bestaat er nog geen koppeling.
            const d = bewerken ? spaardoelVoorVasteLast(bewerken.id, spaardoelen) : null
            return d ? { naam: d.naam, perMaand: opzijViaDoel.get(bewerken!.id) ?? 0 } : undefined
          })()}
        />
      )}

      {/* De vraag vóór het kruisje wist (ronde 76). Ze gaat alleen open wanneer er
          echt iets aan de post hangt — boekingen die je hier inboekte, boekingen die
          je als deze kost aanduidde, of een spaardoel dat ervoor spaart.

          ⚠ `onOpzeggen` alleen wanneer er ook écht een formulier staat: zonder
          rekening rendert de app het niet, en dan zou de knop je naar niets sturen. */}
      <VasteLastWeg
        post={wegPost}
        // ⚠ `eigen` en niet `posten` (ronde 82): een vaste inkomst "Huur" (kotgeld) is
        // geen naamgenoot van een vaste last "Huur" — dezelfde afweging als bij
        // `bestaande={eigen}` hieronder.
        alle={eigen}
        onSluiten={() => setWegPostId(null)}
        onVerwijderen={onVerwijderen}
        onOpzeggen={
          kanBewerken
            ? (p) => {
                setWegPostId(null)
                setBewerken(p)
                // ⚠ En de cursor mee naar het veld dat je moet invullen (doorlichting
                // ronde 76). Het formulier staat hier gewoon op de pagina, soms tien
                // vaste lasten naar beneden; zonder dit gebeurde er zichtbaar niets.
                setNaarEinde((n) => n + 1)
              }
            : undefined
        }
        telGebruik={(id) => telVasteLastGebruik(t, id, { transacties, spaardoelen })}
      />
    </Kaart>
  )
}

/**
 * De contractzin op een rij, in de eenheid waarin de termijn ECHT staat.
 *
 * Twee dingen die deze functie bij elkaar houdt. Ten eerste de eenheid: de wet spreekt
 * in maanden, en "60 dagen" schrijven waar ze "twee maanden" zegt, is een ander getal.
 * Ten tweede de herkomst: een termijn die uit de WET komt is een vertrekpunt en geen
 * waarheid over jouw contract — een hospitalisatieverzekering vraagt drie maanden, een
 * abonnement in zijn eerste periode volgt gewoon zijn overeenkomst. Staat er een kale
 * datum, dan handel je erop; daarom staat erbij waar ze vandaan komt.
 *
 * Kort gehouden, want gemeten op een scherm van 393 px liep de volledige zin
 * ("kijk je contract na" erbij) uit tot vier regels onder één post. De raad zelf staat
 * waar er plaats voor is: in het formulier en in de melding van het belletje.
 */
function termijnZin(
  t: (sleutel: string, params?: Record<string, string | number>) => string,
  contract: Contractstand,
  soort: 'beslissen' | 'voorbij',
): string {
  const datum = dagJaar(contract.verlengtOp!)
  const n = contract.termijn?.aantal ?? 0
  const inMaanden = contract.termijn?.eenheid === 'maand'
  const kern =
    soort === 'beslissen'
      ? t('verlengt {datum} · beslissen vóór {beslis}', { datum, beslis: dagJaar(contract.beslisUiterlijk!) })
      : inMaanden
        ? t('verlengt {datum} · beslisdatum voorbij, opzegtermijn {n} maand(en)', { datum, n })
        : t('verlengt {datum} · beslisdatum voorbij, opzegtermijn {n} dag(en)', { datum, n })
  return contract.termijnUitWet ? `${kern} ${t('(wettelijke termijn)')}` : kern
}
