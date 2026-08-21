import { useState } from 'react'
import type { Categorie, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { TerugkerendePostFormulier, frequentieNaam } from './TerugkerendePostFormulier'
import { formatEuro } from '../utils/format'
import { dagJaar, maandJaarLabel, vandaag } from '../utils/datum'
import { frequentieVan, isGestopt, maandbedrag, opzijPerMaand, valtInMaand, verschuifMaand, volgendeVervaldag } from '../utils/vastelast'
import { contractstand, contractTeltNog, type Contractstand } from '../utils/contract'
import { geboekteVasteLasten, vasteLastTransactieId } from '../utils/vooruitblik'
import { Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'

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
}: {
  posten: TerugkerendePost[]
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
  const [bewerken, setBewerken] = useState<TerugkerendePost | null>(null)
  // Elke sectie toont enkel haar eigen soort.
  const eigen = posten.filter((p) => (soort === 'inkomst' ? p.bedrag > 0 : p.bedrag < 0))
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
    await onOpslaan(p)
    setBewerken(null)
  }

  return (
    <Kaart
      titel={isInkomst ? t('Vaste inkomsten') : t('Vaste lasten')}
      bijschrift={
        isInkomst
          ? t('Je loon en alles wat elke maand binnenkomt. Hierop rekent je plan.')
          : t('Inboeken voor {maand}', { maand: maandLabel })
      }
    >
      {eigen.length === 0 && (
        <Leeg>
          {isInkomst
            ? t('Nog geen vaste inkomsten. Vul hieronder je loon in, anders weet je plan niet wat er te verdelen valt.')
            : t('Nog geen vaste lasten.')}
        </Leeg>
      )}
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
                      {opzij > 0
                        ? t(' · {bedrag} per maand opzij', { bedrag: formatEuro(opzij) })
                        : t(' · {bedrag} per maand omgerekend', { bedrag: formatEuro(-maandbedrag(p)) })}
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
                          aria-label={t('Uitboeken: wis de transactie van {naam}', { naam: p.omschrijving })}
                          onClick={() => onOngedaan(p)}
                        >
                          {t('Uitboeken')}
                        </button>
                      </>
                    ) : onLosmaken && gekoppeld.has(p.id) ? (
                      <>
                        <span className="badge badge-ok">{t('Geboekt ✓')}</span>
                        <button
                          className="knop knop-ghost knop-klein"
                          aria-label={t('Losmaken: {naam} telt dan weer als niet geboekt', { naam: p.omschrijving })}
                          onClick={() => onLosmaken(gekoppeld.get(p.id) as Transactie)}
                        >
                          {t('Losmaken')}
                        </button>
                      </>
                    ) : (
                      <span className="badge badge-ok">{t('Geboekt ✓')}</span>
                    )
                  ) : (
                    <button className="knop knop-secundair knop-klein" onClick={() => onBoek(p)}>
                      {t('Boek in')}
                    </button>
                  )}
                  <button
                    className="knop knop-kaal"
                    aria-label={t('Bewerk vaste post {naam}', { naam: p.omschrijving })}
                    onClick={() => setBewerken(p)}
                  >
                    ✎
                  </button>
                  <button
                    className="knop knop-kaal knop-gevaar"
                    aria-label={t('Verwijder vaste post {naam}', { naam: p.omschrijving })}
                    onClick={() => onVerwijderen(p.id)}
                  >
                    ×
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <TerugkerendePostFormulier
        rekeningen={rekeningen}
        categorieen={categorieen}
        onOpslaan={opslaan}
        onAnnuleer={() => setBewerken(null)}
        bewerken={bewerken}
        soort={soort}
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
