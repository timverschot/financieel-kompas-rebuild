import { useState } from 'react'
import type { Categorie, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { TerugkerendePostFormulier, frequentieNaam } from './TerugkerendePostFormulier'
import { formatEuro } from '../utils/format'
import { vandaag } from '../utils/datum'
import { frequentieVan, maandbedrag, opzijPerMaand, valtInMaand, volgendeVervaldag } from '../utils/vastelast'
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
  soort = 'uitgave',
}: {
  posten: TerugkerendePost[]
  rekeningen: Rekening[]
  categorieen: Categorie[]
  transacties: Transactie[]
  maand: string
  maandLabel: string
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
  )
  // Welke posten zijn geboekt via de knop "Boek in"? Alleen dié kan de app weer
  // uitboeken, want alleen dan bestaat het vaste transactie-id.
  const metVastId = new Set(
    eigen.filter((p) => transacties.some((tx) => tx.id === vasteLastTransactieId(p.id, maand))).map((p) => p.id),
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
            const dezeMaand = valtInMaand(p, maand)
            const periodiek = frequentieVan(p) !== 'maand'
            const volgende = periodiek ? volgendeVervaldag(p, vandaag()) : null
            const opzij = opzijPerMaand(p)
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
                  {periodiek && (
                    <span className="rij-meta">
                      {volgende && t('volgende keer {datum}', { datum: volgende })}
                      {opzij > 0
                        ? t(' · {bedrag} per maand opzij', { bedrag: formatEuro(opzij) })
                        : t(' · {bedrag} per maand omgerekend', { bedrag: formatEuro(-maandbedrag(p)) })}
                    </span>
                  )}
                </div>
                <span className="rij-acties">
                  {!dezeMaand ? (
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
