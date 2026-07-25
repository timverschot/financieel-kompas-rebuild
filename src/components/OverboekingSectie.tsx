import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Overboeking, Rekening } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { vandaag } from '../utils/datum'


// Overzicht + formulier voor interne overboekingen tussen je eigen rekeningen.
// Een overboeking is géén inkomst of uitgave; ze verschuift enkel geld en telt dus
// nergens mee in het maandoverzicht of de budgetten.
export function OverboekingSectie({
  overboekingen,
  rekeningen,
  bewerken,
  onOpslaan,
  onVerwijderen,
  onBewerk,
  onStopBewerken,
}: {
  overboekingen: Overboeking[]
  rekeningen: Rekening[]
  bewerken?: Overboeking | null
  onOpslaan: (o: Overboeking) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBewerk: (o: Overboeking) => void
  onStopBewerken: () => void
}) {
  const { t } = useT()
  const [vanId, setVanId] = useState('')
  const [naarId, setNaarId] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [omschrijving, setOmschrijving] = useState('')

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

  const naam = (id: string) => rekeningen.find((r) => r.id === id)?.naam ?? t('onbekende rekening')

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
  }

  const gesorteerd = [...overboekingen].sort((a, b) => (a.datum < b.datum ? 1 : -1))

  return (
    <Kaart titel={t('Overboekingen')} bijschrift={t('Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).')}>
      {rekeningen.length < 2 ? (
        <Leeg>{t('Je hebt minstens twee rekeningen nodig om over te boeken.')}</Leeg>
      ) : (
        <>
          {gesorteerd.length > 0 && (
            <ul className="lijst">
              {gesorteerd.map((o) => (
                <li key={o.id} className="rij">
                  <div className="rij-midden">
                    <span className="rij-titel">
                      {naam(o.vanRekeningId)} → {naam(o.naarRekeningId)}
                    </span>
                    <span className="rij-meta">
                      {o.omschrijving ? o.omschrijving + ' · ' : ''}
                      {o.datum}
                    </span>
                  </div>
                  <span className="rij-acties">
                    <Bedrag centen={o.bedrag} />
                    <button
                      className="knop knop-kaal"
                      aria-label={t('Bewerk overboeking {van} naar {naar}', { van: naam(o.vanRekeningId), naar: naam(o.naarRekeningId) })}
                      onClick={() => onBewerk(o)}
                    >
                      ✎
                    </button>
                    <button
                      className="knop knop-kaal knop-gevaar"
                      aria-label={t('Verwijder overboeking {van} naar {naar}', { van: naam(o.vanRekeningId), naar: naam(o.naarRekeningId) })}
                      onClick={() => onVerwijderen(o.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

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
                      {r.naam}
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
                      {r.naam}
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
              <button type="submit" disabled={!geldig} className="knop knop-secundair">
                {bewerken ? t('Overboeking wijzigen') : t('Overboeking toevoegen')}
              </button>
              {bewerken && (
                <button type="button" className="knop knop-ghost" onClick={onStopBewerken}>
                  {t('Annuleer')}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </Kaart>
  )
}
