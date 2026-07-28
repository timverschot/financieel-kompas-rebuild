import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { REKENING_TYPES, type Rekening, type RekeningType } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

// Weergavenaam per type (Nederlandse sleutel; via t() vertaald bij weergave). De
// opgeslagen waarde blijft altijd de taal-onafhankelijke sleutel ('betaal', ...).
export const REKENING_TYPE_LABEL: Record<RekeningType, string> = {
  betaal: 'Betaalrekening',
  spaar: 'Spaarrekening',
  termijn: 'Termijnrekening',
  effecten: 'Effectenrekening',
  cash: 'Cash',
  krediet: 'Kredietkaart of kredietopening',
}

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
const BEGIN = { naam: '', beginsaldo: '', type: 'betaal' as RekeningType, rekeningnummer: '', rubriek: '', kredietlimiet: '', afrekendag: '' }

// Formulier om een rekening aan te maken of te bewerken: naam, beginsaldo, type,
// rekeningnummer (IBAN) en een vrije rubriek. Staat in App.tsx al binnen een
// <Kaart>, dus hier geen eigen kaart: enkel veldgroepen + knoppenrij.
export function RekeningFormulier({
  onOpslaan,
  onAnnuleer,
  bewerken,
  beginType,
}: {
  onOpslaan: (r: Rekening) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Rekening | null
  // Met welk type het formulier begint. Standaard 'betaal', zoals altijd. Het blok
  // "Voor later" en het blok "Openstaand" van Je situatie zetten hier het type dat
  // daar hoort: stond het daar op Betaalrekening, dan belandde de beleggingsrekening
  // van wie het keuzemenu overslaat stil bij "Je geld", en bleef het blok leeg
  // zonder één woord uitleg.
  beginType?: RekeningType
}) {
  const { t } = useT()
  const [naam, setNaam] = useState(BEGIN.naam)
  const [beginsaldo, setBeginsaldo] = useState(BEGIN.beginsaldo)
  const [type, setType] = useState<RekeningType>(beginType ?? BEGIN.type)
  const [rekeningnummer, setRekeningnummer] = useState(BEGIN.rekeningnummer)
  const [rubriek, setRubriek] = useState(BEGIN.rubriek)
  const [kredietlimiet, setKredietlimiet] = useState(BEGIN.kredietlimiet)
  const [afrekendag, setAfrekendag] = useState(BEGIN.afrekendag)
  // De twee kredietvelden gelden alleen bij het kredietype. Ze blijven allebei
  // optioneel: wie zijn limiet niet weet, moet zijn kaart toch kunnen invoeren.
  const isKrediet = type === 'krediet'
  // Een ingevuld maar ongeldig kredietveld hoort de opslag tegen te houden. Liet je
  // het stil vallen, dan verdween een eerder bewaarde afrekendag zonder een woord —
  // een rekening wordt bij het opslaan volledig vervangen, niet samengevoegd.
  const limietFout = isKrediet && kredietlimiet.trim() !== '' && !(invoerNaarCenten(kredietlimiet) > 0)
  const dagFout =
    isKrediet && afrekendag.trim() !== '' && !(Number.isInteger(Number(afrekendag)) && Number(afrekendag) >= 1 && Number(afrekendag) <= 28)
  const naamFout = naam.trim().length === 0
  const geldig = !naamFout && !limietFout && !dagFout

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    setNaam(BEGIN.naam)
    setBeginsaldo(BEGIN.beginsaldo)
    setType(beginType ?? BEGIN.type)
    setRekeningnummer(BEGIN.rekeningnummer)
    setRubriek(BEGIN.rubriek)
    setKredietlimiet(BEGIN.kredietlimiet)
    setAfrekendag(BEGIN.afrekendag)
  }, [beginType])

  useEffect(() => {
    if (bewerken) {
      setNaam(bewerken.naam)
      setBeginsaldo(centenNaarInvoer(bewerken.beginsaldo))
      setType(bewerken.type ?? 'betaal')
      setRekeningnummer(bewerken.rekeningnummer ?? '')
      setRubriek(bewerken.rubriek ?? '')
      setKredietlimiet(bewerken.kredietlimiet === undefined ? '' : centenNaarInvoer(bewerken.kredietlimiet))
      setAfrekendag(bewerken.afrekendag === undefined ? '' : String(bewerken.afrekendag))
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const centen = invoerNaarCenten(beginsaldo)
    const nr = rekeningnummer.trim()
    const rub = rubriek.trim()
    // Alleen bij een kredietrekening wegschrijven. Wissel je het type terug naar
    // 'betaal', dan horen limiet en afrekendag niet stilletjes te blijven staan.
    const limiet = isKrediet ? invoerNaarCenten(kredietlimiet) : NaN
    const dag = isKrediet ? Number(afrekendag) : NaN
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      naam: naam.trim(),
      beginsaldo: Number.isFinite(centen) ? centen : 0,
      type,
      ...(nr ? { rekeningnummer: nr } : {}),
      ...(rub ? { rubriek: rub } : {}),
      ...(bewerken?.gearchiveerd ? { gearchiveerd: true } : {}),
      ...(Number.isFinite(limiet) && limiet > 0 ? { kredietlimiet: limiet } : {}),
      ...(Number.isInteger(dag) && dag >= 1 && dag <= 28 ? { afrekendag: dag } : {}),
    })
    // Bij een NIEUWE rekening blijft 'bewerken' null, dus de useEffect hierboven
    // draait niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en
    // maakt een tweede klik dezelfde rekening nog eens aan.
    if (!bewerken) leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel" style={{ gap: 14 }}>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="rekeningnaam">
          {t('Rekeningnaam')}
        </label>
        <input id="rekeningnaam" value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="rekeningtype">
            {t('Type')}
          </label>
          <select id="rekeningtype" value={type} onChange={(e) => setType(e.target.value as RekeningType)}>
            {REKENING_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {t(REKENING_TYPE_LABEL[tp])}
              </option>
            ))}
          </select>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="beginsaldo">
            {t('Beginsaldo (€)')}
          </label>
          <input
            id="beginsaldo"
            inputMode="decimal"
            placeholder="0,00"
            value={beginsaldo}
            onChange={(e) => setBeginsaldo(e.target.value)}
          />
        </div>
      </div>

      {isKrediet && (
        <div className="veldrij">
          <div className="veldgroep">
            <label className="label-caps" htmlFor="kredietlimiet">
              {t('Kredietlimiet (€)')}
            </label>
            <input
              id="kredietlimiet"
              inputMode="decimal"
              placeholder={t('optioneel')}
              value={kredietlimiet}
              onChange={(e) => setKredietlimiet(e.target.value)}
              aria-describedby="kredietlimiet-uitleg"
              aria-invalid={limietFout || undefined}
            />
            <p className="rij-meta" id="kredietlimiet-uitleg" role={limietFout ? 'alert' : undefined} style={{ margin: 0 }}>
              {limietFout
                ? t('Geef een bedrag boven nul, of laat het veld leeg.')
                : t('Hoeveel je maximaal mag opnemen. Vul dit in als een positief bedrag, ook al staat je saldo negatief.')}
            </p>
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor="afrekendag">
              {t('Dag waarop de kaart wordt afgerekend')}
            </label>
            <input
              id="afrekendag"
              inputMode="numeric"
              placeholder={t('1-28, optioneel')}
              value={afrekendag}
              onChange={(e) => setAfrekendag(e.target.value)}
              aria-describedby="afrekendag-uitleg"
              aria-invalid={dagFout || undefined}
            />
            <p className="rij-meta" id="afrekendag-uitleg" role={dagFout ? 'alert' : undefined} style={{ margin: 0 }}>
              {dagFout
                ? t('Kies een dag tussen 1 en 28, of laat het veld leeg.')
                : t('De dag van de maand waarop je kaartrekening wordt opgemaakt.')}
            </p>
          </div>
        </div>
      )}

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="rekeningnummer">
            {t('Rekeningnummer (IBAN)')}
          </label>
          <input
            id="rekeningnummer"
            placeholder={t('BE.. (optioneel)')}
            value={rekeningnummer}
            onChange={(e) => setRekeningnummer(e.target.value)}
          />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="rubriek">
            {t('Rubriek')}
          </label>
          <input
            id="rubriek"
            placeholder={t('optionele groepsnaam')}
            value={rubriek}
            onChange={(e) => setRubriek(e.target.value)}
          />
        </div>
      </div>

      <div className="knoprij">
        <button type="submit" className="knop knop-primair" disabled={!geldig}>
          {bewerken ? t('Rekening wijzigen') : t('Rekening toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-ghost" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {t('Geef een naam en een geldig bedrag om op te slaan.')}
        </p>
      )}
    </form>
  )
}
