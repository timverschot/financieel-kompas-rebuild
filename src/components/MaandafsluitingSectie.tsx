import { useMemo, useState } from 'react'
import type {
  Budget,
  Categorie,
  Maandafsluiting,
  TerugkerendePost,
  Transactie,
} from '../data/schema'
import { maandStand, openMaanden, vorigeMaand, type Stapsleutel } from '../utils/maandafsluiting'
import { voorstelCategorie, type HandelaarIndex } from '../utils/categorieVoorstel'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { mistCategorie } from '../utils/transactieFilter'
import { bouwPrijsbeeld } from '../utils/prijsstijging'
import { maandJaarLabel, vandaag } from '../utils/datum'
import { formatEuro } from '../utils/format'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { CategorieSelect } from './CategorieSelect'
import { Bedrag, Kaart, PaginaKop, Stat } from '../ui/basis'
import { useT } from '../i18n'

// De maandafsluiting (ronde 43).
//
// WAAROM DIT SCHERM BESTAAT. Een budget-app vraagt dat je er élke dag aan denkt, en
// dat houdt niemand vol. Dit vervangt die belofte door een andere: één keer per
// maand, vijf minuten, met een duidelijk einde. De drie stappen kon de app allemaal
// al — je uittreksel inlezen, je boekingen categoriseren, je cijfers bekijken — maar
// ze stonden op drie schermen en voelden daardoor nooit als één handeling.
//
// HET EINDE IS HET PUNT. Zonder de knop "Maand afsluiten" is dit gewoon nog een
// scherm met cijfers. Mét die knop is het een taak die af kan zijn, en dat is het
// enige wat mensen volhouden.
//
// DESIGN.md: hoogstens één gevulde knop per scherm. Dat is "Maand afsluiten"; alle
// andere knoppen hier zijn secundair of ghost.

/** Hoeveel boekingen zonder categorie het scherm er hoogstens toont. */
const MAX_RIJEN = 25

export function MaandafsluitingSectie({
  transacties,
  categorieen,
  budgetten,
  terugkerendePosten,
  afsluitingen,
  handelaarIndex,
  onCategoriseer,
  onAfsluiten,
  onHeropen,
  onGaNaarInlezen,
  onToonBoekingen,
  onToonZonderCategorie,
  vandaagISO = vandaag(),
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  budgetten: Budget[]
  terugkerendePosten: TerugkerendePost[]
  afsluitingen: Maandafsluiting[]
  /** Om per boeking een categorie te kunnen voorstellen op basis van de handelaar. */
  handelaarIndex: HandelaarIndex
  onCategoriseer: (transactieId: string, categorieId: string) => Promise<void> | void
  onAfsluiten: (m: Maandafsluiting) => Promise<void> | void
  onHeropen: (maand: string) => Promise<void> | void
  onGaNaarInlezen: () => void
  /** Toont de boekingen van deze maand in de transactielijst. */
  onToonBoekingen: (maand: string) => void
  /** Toont enkel wat nog geen categorie heeft — daar bewerk je ze volledig. */
  onToonZonderCategorie: (maand: string) => void
  vandaagISO?: string
}) {
  const { t } = useT()

  // Welke maand sluit je af? De oudste die nog open staat, anders de vorige maand.
  // Bewust NIET de lopende maand: die is nog niet af, en een maand afsluiten die nog
  // loopt is precies het soort vinkje dat later niets blijkt te betekenen.
  const open = useMemo(
    () => openMaanden(transacties, afsluitingen, vandaagISO),
    [transacties, afsluitingen, vandaagISO],
  )
  const standaard = open[0] ?? vorigeMaand(vandaagISO.slice(0, 7))
  const [gekozenMaand, setGekozenMaand] = useState<string | null>(null)
  const maand = gekozenMaand ?? standaard

  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [melding, setMelding] = useState('')

  const stand = useMemo(
    () => maandStand({ maand, transacties, budgetten, terugkerendePosten, afsluitingen, vandaagISO }),
    [maand, transacties, budgetten, terugkerendePosten, afsluitingen, vandaagISO],
  )

  // Bewust NIET op de gekozen maand: een prijsverhoging van maart zie je niet door
  // één maand te bekijken. Deze kijkt achttien maanden terug, net als op Analyse.
  const prijsbeeld = useMemo(
    () => bouwPrijsbeeld({ transacties, terugkerendePosten, vandaagISO }),
    [transacties, terugkerendePosten, vandaagISO],
  )

  const zonderCategorie = useMemo(
    () => gesorteerdNieuwsteEerst(transacties.filter((tx) => tx.datum.startsWith(maand) && mistCategorie(tx))),
    [transacties, maand],
  )

  // De maanden die je kan kiezen: alles wat open staat, plus de vorige maand, plus
  // de maand die je nu bekijkt. Zo kan je ook een al afgesloten maand terugvinden.
  const maandKeuzes = useMemo(() => {
    const set = new Set<string>([...open, vorigeMaand(vandaagISO.slice(0, 7)), maand])
    return [...set].sort().reverse()
  }, [open, maand, vandaagISO])

  async function sluitAf() {
    if (bezig) return
    setBezig(true)
    setFout('')
    setMelding('')
    try {
      await onAfsluiten({
        id: maand,
        afgeslotenOp: vandaagISO,
        // Wat er bleef liggen wordt meebewaard: je mag afsluiten met werk dat open
        // staat, maar dan hoort de app te onthouden dat je dat wist.
        ...(stand.zonderCategorie > 0 ? { zonderCategorie: stand.zonderCategorie } : {}),
      })
      // Op deze maand blijven staan. Zonder deze regel viel ze uit de lijst met
      // openstaande maanden, verschoof het scherm naar de volgende, en stond daar
      // meteen weer een actieve knop "Maand afsluiten" onder een melding over de
      // vorige — één klik verder sloot je een maand af die je niet bedoelde.
      setGekozenMaand(maand)
      setMelding(t('{maand} is afgesloten.', { maand: maandJaarLabel(maand) }))
    } catch {
      setFout(t('Afsluiten is niet gelukt. Probeer het opnieuw.'))
    } finally {
      setBezig(false)
    }
  }

  async function heropen() {
    if (bezig) return
    setBezig(true)
    setFout('')
    setMelding('')
    try {
      await onHeropen(maand)
      setGekozenMaand(maand)
      setMelding(t('{maand} staat weer open.', { maand: maandJaarLabel(maand) }))
    } catch {
      setFout(t('Heropenen is niet gelukt. Probeer het opnieuw.'))
    } finally {
      setBezig(false)
    }
  }

  const stapKlaar = (sleutel: Stapsleutel) => stand.stappen.find((s) => s.sleutel === sleutel)?.klaar ?? false

  return (
    <div className="stapel" data-maandafsluiting>
      <PaginaKop
        titel={t('Maandafsluiting')}
        bijschrift={t('Drie stappen, en dan is je maand rond. Vijf minuten, één keer per maand.')}
        actie={
          maandKeuzes.length > 1 ? (
            <select
              aria-label={t('Welke maand sluit je af?')}
              value={maand}
              onChange={(e) => {
                setGekozenMaand(e.target.value)
                setMelding('')
                setFout('')
              }}
            >
              {maandKeuzes.map((m) => (
                <option key={m} value={m}>
                  {maandJaarLabel(m)}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {open.length > 1 && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('Er staan nog {n} maanden open. Werk de oudste eerst af, dan sluiten je cijfers op elkaar aan.', {
            n: open.length,
          })}
        </p>
      )}

      {/* Stap 1 — de boekingen */}
      <Kaart
        titel={`${t('Stap 1')} · ${t('Staat alles erin?')}`}
        bijschrift={t('Lees je bankuittreksel in, of tik de laatste boekingen zelf bij.')}
        actie={<StapMerk klaar={stapKlaar('boekingen')} />}
      >
        <p style={{ margin: '0 0 10px' }}>
          {stand.boekingen === 0
            ? t('Er staat nog geen enkele boeking in {maand}.', { maand: maandJaarLabel(maand) })
            : t('{n} boeking(en) in {maand}.', { n: stand.boekingen, maand: maandJaarLabel(maand) })}
        </p>
        <div className="knoprij">
          <button type="button" className="knop knop-secundair knop-klein" onClick={onGaNaarInlezen}>
            {t('Uittreksel inlezen')}
          </button>
          {stand.boekingen > 0 && (
            <button type="button" className="knop knop-ghost knop-klein" onClick={() => onToonBoekingen(maand)}>
              {t('Bekijk de boekingen ›')}
            </button>
          )}
        </div>
      </Kaart>

      {/* Stap 2 — de categorieën */}
      <Kaart
        titel={`${t('Stap 2')} · ${t('Waar hoort het bij?')}`}
        bijschrift={t('Wat geen categorie heeft, telt nergens mee — niet in je budget en niet in je analyse.')}
        actie={<StapMerk klaar={stapKlaar('categorieen')} />}
      >
        {stand.zonderCategorie === 0 ? (
          <p style={{ margin: 0 }}>{t('Alles heeft een categorie. Niets te doen.')}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 10px' }}>
              {t('{n} boeking(en) wachten nog op een categorie.', { n: stand.zonderCategorie })}
            </p>
            <ul className="lijst">
              {zonderCategorie.slice(0, MAX_RIJEN).map((tx) => (
                <TeCategoriseren
                  key={tx.id}
                  transactie={tx}
                  categorieen={categorieen}
                  handelaarIndex={handelaarIndex}
                  onCategoriseer={onCategoriseer}
                />
              ))}
            </ul>
            {zonderCategorie.length > MAX_RIJEN && (
              <p className="rij-meta" style={{ margin: '8px 0 0' }}>
                {t('Nog {n} andere. Werk deze eerst weg; de rest schuift dan vanzelf op.', {
                  n: zonderCategorie.length - MAX_RIJEN,
                })}
              </p>
            )}
            <div className="knoprij" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="knop knop-ghost knop-klein"
                onClick={() => onToonZonderCategorie(maand)}
              >
                {t('Bekijk ze in de lijst ›')}
              </button>
            </div>
          </>
        )}
      </Kaart>

      {/* Stap 3 — het oordeel */}
      <Kaart
        titel={`${t('Stap 3')} · ${t('Hoe is de maand geweest?')}`}
        bijschrift={t('De cijfers waarvoor je het allemaal deed.')}
        actie={<StapMerk klaar={stapKlaar('oordeel')} />}
      >
        <div className="stat-rij">
          <Stat label={t('Binnengekomen')}>{formatEuro(stand.inkomsten)}</Stat>
          <Stat label={t('Eraf gegaan')}>{formatEuro(stand.uitgaven)}</Stat>
          <Stat label={t('Verschil')}>
            <Bedrag centen={stand.inkomsten - stand.uitgaven} />
          </Stat>
        </div>
        <p style={{ margin: '10px 0 0' }}>
          {stand.balans.stand === 'overschot'
            ? t('Je hield {bedrag} over.', { bedrag: formatEuro(stand.inkomsten - stand.uitgaven) })
            : stand.balans.stand === 'tekort'
              ? t('Je kwam {bedrag} tekort.', { bedrag: formatEuro(stand.uitgaven - stand.inkomsten) })
              : t('Je kwam precies uit.')}
        </p>
        {/* Wat er duurder werd staat hier bewust ALS ZIN en niet als lijst: de
            volledige uitleg hoort op Analyse, maar de maandafsluiting is het moment
            waarop je er iets mee kan doen. */}
        {prijsbeeld.duurderPerMaand > 0 && (
          <p className="rij-meta" style={{ margin: '10px 0 0' }}>
            {t('Je terugkerende kosten liggen intussen {bedrag} per maand hoger dan voorheen. Op Analyse staat wat er precies duurder werd.', {
              bedrag: formatEuro(prijsbeeld.duurderPerMaand),
            })}
          </p>
        )}
        {(stand.budgettenOver > 0 || stand.vasteLastenOpen > 0) && (
          <ul className="lijst" style={{ marginTop: 10 }}>
            {stand.budgettenOver > 0 && (
              <li className="rij">
                <span className="rij-midden rij-meta">
                  {t('{n} budget(ten) gingen over hun grens.', { n: stand.budgettenOver })}
                </span>
              </li>
            )}
            {stand.vasteLastenOpen > 0 && (
              <li className="rij">
                <span className="rij-midden rij-meta">
                  {t('{n} vaste last(en) staan nog niet ingeboekt in deze maand.', { n: stand.vasteLastenOpen })}
                </span>
              </li>
            )}
          </ul>
        )}
      </Kaart>

      {/* Het einde */}
      <Kaart titel={t('Klaar?')}>
        {/* Altijd aanwezig, ook leeg: een gebied dat pas bij een melding verschijnt,
            wordt door een schermlezer niet voorgelezen. */}
        <p className="rij-meta" role="status" style={{ margin: melding ? '0 0 8px' : 0 }}>
          {melding}
        </p>
        {fout !== '' && (
          <p className="foutregel" role="alert">
            {fout}
          </p>
        )}

        {stand.afgesloten ? (
          <>
            <p style={{ margin: '0 0 10px' }}>
              {t('{maand} is afgesloten op {datum}.', {
                maand: maandJaarLabel(maand),
                datum: stand.afgeslotenOp ?? '',
              })}
            </p>
            <div className="knoprij">
              <button
                type="button"
                className="knop knop-ghost knop-klein"
                aria-disabled={bezig}
                onClick={heropen}
              >
                {t('Toch nog openzetten')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 10px' }}>
              {stand.werkTeDoen
                ? t('Er staat nog werk open. Je mag toch afsluiten — de app onthoudt dan wat er bleef liggen.')
                : t('Alles is rond. Sluit de maand af, dan weet je later dat je ernaar gekeken hebt.')}
            </p>
            <div className="knoprij">
              <button type="button" className="knop knop-primair" aria-disabled={bezig} onClick={sluitAf}>
                {bezig ? t('Bezig…') : t('Maand afsluiten')}
              </button>
            </div>
          </>
        )}
      </Kaart>
    </div>
  )
}

/** Een vinkje of een stipje bij een stap. Bewust een teken en geen kleurvlak. */
function StapMerk({ klaar }: { klaar: boolean }) {
  const { t } = useT()
  return (
    <span className={klaar ? 'badge badge-ok' : 'badge badge-open'}>
      {klaar ? t('rond') : t('open')}
    </span>
  )
}

/**
 * Eén boeking zonder categorie, met een voorstel.
 *
 * Het voorstel komt uit de handelaarsindex die de import al gebruikt: heb je Q8 ooit
 * op "Vervoer" gezet, dan staat dat hier voorgevuld en is één tik genoeg. Zonder dat
 * voorstel is dit scherm een lijst met dertig keuzelijsten, en dan werkt niemand ze
 * weg.
 *
 * Kiezen bewaart meteen. Een aparte bewaarknop per rij zou van één handeling er twee
 * maken, en dat is precies wat de maandafsluiting wil wegnemen.
 */
function TeCategoriseren({
  transactie,
  categorieen,
  handelaarIndex,
  onCategoriseer,
}: {
  transactie: Transactie
  categorieen: Categorie[]
  handelaarIndex: HandelaarIndex
  onCategoriseer: (transactieId: string, categorieId: string) => Promise<void> | void
}) {
  const { t } = useT()
  const voorstel = voorstelCategorie(transactie.omschrijving, handelaarIndex)
  // De keuzelijst begint LEEG, ook wanneer er een voorstel is. Zetten we het
  // voorstel er alvast in, dan leest het scherm alsof de boeking al een categorie
  // heeft — terwijl er niets bewaard is, en een <select> geen wijziging meldt
  // wanneer je de al gekozen optie nog eens aanklikt. Je kon het voorstel dus niet
  // eens overnemen. Nu is er een aparte knop die het in één tik doet.
  const [keuze, setKeuze] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function bewaar(id: string) {
    setKeuze(id)
    if (id === '' || bezig) return
    setBezig(true)
    setFout('')
    try {
      await onCategoriseer(transactie.id, id)
    } catch {
      // De keuze blijft staan: een mislukte opslag mag je je werk niet kosten.
      setFout(t('Bewaren is niet gelukt. Probeer het opnieuw.'))
    } finally {
      setBezig(false)
    }
  }

  return (
    <li className="rij rij-kost" data-te-categoriseren>
      <div className="rij-midden">
        <span className="rij-titel">{transactie.omschrijving || t('Zonder omschrijving')}</span>
        <span className="rij-meta">
          {transactie.datum}
          {voorstel
            ? ` · ${t('voorstel: {naam}', { naam: labelVanCategorie(voorstel, categorieen) ?? voorstel })}`
            : ''}
        </span>
        {fout !== '' && (
          <span className="foutregel" role="alert">
            {fout}
          </span>
        )}
      </div>
      <Bedrag centen={transactie.bedrag} />
      {voorstel && (
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-disabled={bezig}
          onClick={() => bewaar(voorstel)}
        >
          {t('Neem {naam} over', { naam: labelVanCategorie(voorstel, categorieen) ?? voorstel })}
        </button>
      )}
      <CategorieSelect
        id={`cat-${transactie.id}`}
        ariaLabel={t('Categorie voor {naam}', { naam: transactie.omschrijving || transactie.datum })}
        waarde={keuze}
        onKies={bewaar}
        categorieen={categorieen}
        metGeenKeuze
      />
    </li>
  )
}
