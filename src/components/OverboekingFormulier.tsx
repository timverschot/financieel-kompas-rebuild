import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel, rekeningStandTekst } from '../utils/rekening'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { saldoVanRekening } from '../utils/saldo'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { EersteStapKnop, Leeg } from '../ui/basis'
import { vandaag } from '../utils/datum'

// Het invoerformulier voor een interne overboeking, los van zijn overzicht.
//
// Waarom het losgetrokken is: dit formulier zat vastgeklonken in
// `OverboekingSectie`, midden in de kaart met de lijst van overboekingen. Daardoor
// kon je alleen sparen door eerst naar de rekeningenpagina te navigeren en daar
// naar beneden te scrollen. Nu kan hetzelfde formulier ook in de invoerpopup
// hangen, zonder dat er een tweede, licht afwijkende kopie van deze logica
// ontstaat — precies het soort verdubbeling dat later stil uit elkaar loopt.
//
// Een overboeking is géén inkomst of uitgave: ze verschuift enkel geld en telt dus
// nergens mee in het maandoverzicht of de budgetten.
export function OverboekingFormulier({
  rekeningen,
  overboekingen,
  transacties = [],
  waarderingen,
  bewerken,
  onOpslaan,
  onStopBewerken,
  onOpgeslagen,
  onNaarRekeningen,
}: {
  rekeningen: Rekening[]
  overboekingen: Overboeking[]
  // Nodig om per rekening het saldo van vandaag te tonen in de keuzelijsten, zodat
  // je ziet wat er beschikbaar is vóór je overboekt.
  transacties?: Transactie[]
  waarderingen: Waardering[]
  bewerken?: Overboeking | null
  onOpslaan: (o: Overboeking) => Promise<void> | void
  onStopBewerken?: () => void
  /**
   * Wordt aangeroepen ná een gelukte opslag. `blijfOpen` is waar wanneer je op
   * "Opslaan + volgende" duwde. Zodra deze prop meegegeven wordt, verschijnt die
   * tweede knop — zo hoeft de popup zelf niets over dit formulier te weten.
   */
  onOpgeslagen?: (opties: { blijfOpen: boolean }) => void
  /**
   * De weg naar je rekeningen, wanneer er nog geen twee zijn (ronde 66, slotronde).
   *
   * ⚠ Alleen nodig waar dit formulier LOSGEKOPPELD staat van het rekeningformulier —
   * in de boekingspopup dus. Op de Rekeningen-pagina staat het formulier om er een
   * bij te maken op hetzelfde scherm, en dan is een knop overbodig.
   */
  onNaarRekeningen?: () => void
}) {
  const { t } = useT()
  // Naam + saldo van vandaag, zodat de keuzelijsten tonen wat er op elke rekening staat.
  const label = (r: Rekening) =>
    `${rekeningLabel(r)} — ${rekeningStandTekst(t, r, saldoVanRekening(r, transacties, overboekingen, waarderingen, vandaag()))}`
  const [vanId, setVanId] = useState('')
  const [naarId, setNaarId] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [omschrijving, setOmschrijving] = useState('')
  // Welke van de twee opslaanknoppen ingedrukt werd. Een klik komt altijd vóór de
  // verzending van het formulier, dus dit staat juist op het moment dat we het lezen.
  const blijfOpen = useRef(false)

  // Vul het formulier bij het starten/stoppen van bewerken.
  const bewerkId = bewerken?.id ?? null
  const [vorigeBewerkId, setVorigeBewerkId] = useState<string | null>(null)
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ Eén vast id per invulbeurt: een tweede poging na een mislukking hoort dezelfde
  // overboeking te overschrijven, niet een tweede te maken.
  const nieuwIdRef = useRef(nieuwId())
  if (bewerkId !== vorigeBewerkId) {
    setVorigeBewerkId(bewerkId)
    if (bewerken) {
      setVanId(bewerken.vanRekeningId)
      setNaarId(bewerken.naarRekeningId)
      setBedrag(centenNaarInvoer(bewerken.bedrag))
      setDatum(bewerken.datum)
      setOmschrijving(bewerken.omschrijving ?? '')
    } else {
      setVanId('')
      setNaarId('')
      setBedrag('')
      setDatum(vandaag())
      setOmschrijving('')
    }
  }

  const redenId = useId()
  const centen = invoerNaarCenten(bedrag)
  const geldig =
    vanId.length > 0 && naarId.length > 0 && vanId !== naarId && Number.isFinite(centen) && centen > 0

  // Eén reden tegelijk, in de volgorde waarin je het formulier invult. Het scherm
  // toonde alleen "twee dezelfde rekeningen"; een leeg bedrag of een niet-gekozen
  // rekening bleef onbenoemd, en dan reageert de knop niet zonder te zeggen waarom.
  const redenTekst =
    vanId.length === 0 || naarId.length === 0
      ? t('Kies eerst van welke rekening naar welke rekening je overboekt.')
      : vanId === naarId
        ? t('Kies twee verschillende rekeningen.')
        : t('Vul een bedrag groter dan nul in.')

  // De losse rode regel onder de rekeningkeuze is vervallen: die zei precies
  // hetzelfde als de redenregel hieronder, en tweemaal dezelfde zin op één scherm
  // laat je zoeken naar het verschil dat er niet is.

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) {
      // De vlag WEL wissen. 'Opslaan + volgende' zet ze in zijn eigen onClick, en
      // sinds die knop `aria-disabled` is in plaats van `disabled` loopt die onClick
      // ook bij een onvolledig formulier. Bleef de vlag staan, dan hield een latere,
      // gewone opslag de popup open met lege velden — en dan denk je dat het niet
      // gelukt is en boek je alles een tweede keer (zie TransactieFormulier).
      blijfOpen.current = false
      return
    }
    const o: Overboeking = {
      id: bewerken ? bewerken.id : nieuwIdRef.current,
      datum,
      vanRekeningId: vanId,
      naarRekeningId: naarId,
      bedrag: centen,
      ...(omschrijving.trim() ? { omschrijving: omschrijving.trim() } : {}),
    }
    // ⚠ RONDE 68 — een mislukte opslag mag niet stil blijven, en ze mag zeker de
    // popup niet laten sluiten met een leeg formulier.
    if (!(await opslag.probeer(() => onOpslaan(o)))) {
      // ⚠ Ook hier de vlag wissen. Bleef ze staan, dan hield de vólgende, geslaagde
      // opslag de popup open met lege velden — en dan denk je dat het niet gelukt is
      // en boek je alles een tweede keer.
      blijfOpen.current = false
      return
    }
    if (!bewerken) {
      setBedrag('')
      setOmschrijving('')
      // Klaar voor de volgende overboeking: een vers id, zodat die niet dezelfde
      // overschrijft.
      nieuwIdRef.current = nieuwId()
    }
    const nog = blijfOpen.current
    blijfOpen.current = false
    onOpgeslagen?.({ blijfOpen: nog })
  }

  if (rekeningen.length < 2) {
    return (
      <Leeg
        actie={
          onNaarRekeningen ? (
            <EersteStapKnop onClick={onNaarRekeningen}>{t('Maak een rekening aan')}</EersteStapKnop>
          ) : undefined
        }
      >
        {t('Je hebt minstens twee rekeningen nodig om over te boeken.')}
      </Leeg>
    )
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="ob-van">
            {t('Van rekening')}
          </label>
          <select id="ob-van" value={vanId} onChange={(e) => setVanId(e.target.value)}>
            <option value="">{t('— kies —')}</option>
            {rekeningen.map((r) => (
              <option key={r.id} value={r.id}>
                {label(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="ob-naar">
            {t('Naar rekening')}
          </label>
          <select id="ob-naar" value={naarId} onChange={(e) => setNaarId(e.target.value)}>
            <option value="">{t('— kies —')}</option>
            {rekeningen.map((r) => (
              <option key={r.id} value={r.id}>
                {label(r)}
              </option>
            ))}
          </select>
        </div>
      </div>


      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="ob-bedrag">
            {t('Over te boeken bedrag (€)')}
          </label>
          <input
            id="ob-bedrag"
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="ob-datum">
            {t('Datum overboeking')}
          </label>
          <input id="ob-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
      </div>

      <div className="veldgroep">
        <label className="label-caps" htmlFor="ob-oms">
          {t('Omschrijving')}
        </label>
        <input
          id="ob-oms"
          placeholder={t('optioneel')}
          value={omschrijving}
          onChange={(e) => setOmschrijving(e.target.value)}
        />
      </div>

      {/* Waarom de knop uitstaat, in woorden. `aria-disabled` alleen laat een
          schermlezer "niet-beschikbaar" zeggen zonder één woord uitleg — dan is er
          niets gewonnen tegenover `disabled`. Altijd aanwezig, leeg wanneer er niets
          te melden is: een `role="status"` die pas mét de tekst verschijnt, wordt
          door sommige schermlezers overgeslagen. */}
      <Opslagfout fout={opslag.fout} />
      <p id={redenId} className="rij-meta" role="status" style={{ margin: 0 }}>
        {geldig ? '' : redenTekst}
      </p>

      <div className="knoprij">
        {/* `aria-disabled` en niet `disabled` (huisregel sinds ronde 41): een echt
            uitgeschakelde knop is voor voorleessoftware onvindbaar, en dan hoor je
            nooit wát er nog ontbreekt. De knop blijft dus bereikbaar en gedimd, en
            het verzenden wordt in de handler tegengehouden.

            In de popup is dit de hoofdactie van het hele scherm, dus krijgt de knop
            ook het primaire uiterlijk. Binnen de kaart op de rekeningenpagina is ze
            één actie tussen andere, en blijft ze secundair. */}
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className={(onOpgeslagen ? 'knop knop-primair' : 'knop knop-secundair') + (geldig ? '' : ' knop-uit')}
        >
          {bewerken ? t('Overboeking wijzigen') : t('Overboeking toevoegen')}
        </button>
        {onOpgeslagen && !bewerken && (
          <button
            type="submit"
            aria-disabled={!geldig}
            aria-describedby={geldig ? undefined : redenId}
            className={'knop knop-ghost' + (geldig ? '' : ' knop-uit')}
            onClick={() => {
              blijfOpen.current = true
            }}
          >
            {t('Opslaan + volgende')}
          </button>
        )}
        {bewerken && onStopBewerken && (
          <button type="button" className="knop knop-ghost" onClick={onStopBewerken}>
            {t('Annuleer')}
          </button>
        )}
      </div>
    </form>
  )
}
