import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel } from '../utils/rekening'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { saldoVanRekening } from '../utils/saldo'
import { useT } from '../i18n'
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
}) {
  const { t } = useT()
  // Naam + saldo van vandaag, zodat de keuzelijsten tonen wat er op elke rekening staat.
  const label = (r: Rekening) =>
    `${rekeningLabel(r)} — ${formatEuro(saldoVanRekening(r, transacties, overboekingen, waarderingen, vandaag()))}`
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

  const centen = invoerNaarCenten(bedrag)
  const geldig =
    vanId.length > 0 && naarId.length > 0 && vanId !== naarId && Number.isFinite(centen) && centen > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const o: Overboeking = {
      id: bewerken ? bewerken.id : nieuwId(),
      datum,
      vanRekeningId: vanId,
      naarRekeningId: naarId,
      bedrag: centen,
      ...(omschrijving.trim() ? { omschrijving: omschrijving.trim() } : {}),
    }
    await onOpslaan(o)
    if (!bewerken) {
      setBedrag('')
      setOmschrijving('')
    }
    const nog = blijfOpen.current
    blijfOpen.current = false
    onOpgeslagen?.({ blijfOpen: nog })
  }

  if (rekeningen.length < 2) {
    return <p className="leeg">{t('Je hebt minstens twee rekeningen nodig om over te boeken.')}</p>
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

      {vanId && naarId && vanId === naarId && (
        <p className="rij-meta" style={{ margin: 0, color: 'var(--negative)' }}>
          {t('Kies twee verschillende rekeningen.')}
        </p>
      )}

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

      <div className="knoprij">
        {/* In de popup is dit de hoofdactie van het hele scherm, dus krijgt de knop
            ook het primaire uiterlijk. Binnen de kaart op de rekeningenpagina is ze
            één actie tussen andere, en blijft ze secundair. */}
        <button type="submit" disabled={!geldig} className={onOpgeslagen ? 'knop knop-primair' : 'knop knop-secundair'}>
          {bewerken ? t('Overboeking wijzigen') : t('Overboeking toevoegen')}
        </button>
        {onOpgeslagen && !bewerken && (
          <button
            type="submit"
            disabled={!geldig}
            className="knop knop-ghost"
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
