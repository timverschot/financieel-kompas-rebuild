import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { REKENING_TYPES, type Rekening, type RekeningType } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { DAG_MAX, DAG_MIN, kaartbedragNaarOpslag, kaartbedragUitOpslag } from '../utils/kredietkaart'
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
const BEGIN = { naam: '', beginsaldo: '', type: 'betaal' as RekeningType, rekeningnummer: '', rubriek: '', kredietlimiet: '', afrekendag: '', afboekdag: '' }

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
  const [afboekdag, setAfboekdag] = useState(BEGIN.afboekdag)
  // De twee kredietvelden gelden alleen bij het kredietype. Ze blijven allebei
  // optioneel: wie zijn limiet niet weet, moet zijn kaart toch kunnen invoeren.
  const isKrediet = type === 'krediet'
  // Een ingevuld maar ongeldig kredietveld hoort de opslag tegen te houden. Liet je
  // het stil vallen, dan verdween een eerder bewaarde afrekendag zonder een woord —
  // een rekening wordt bij het opslaan volledig vervangen, niet samengevoegd.
  const limietFout = isKrediet && kredietlimiet.trim() !== '' && !(invoerNaarCenten(kredietlimiet) > 0)
  const dagGeldig = (waarde: string) =>
    Number.isInteger(Number(waarde)) && Number(waarde) >= DAG_MIN && Number(waarde) <= DAG_MAX
  const dagFout = isKrediet && afrekendag.trim() !== '' && !dagGeldig(afrekendag)
  const afboekFout = isKrediet && afboekdag.trim() !== '' && !dagGeldig(afboekdag)
  // Een negatief bedrag bij een kaart betekent een TEGOED. Dat kan, maar het is
  // bijna altijd het overblijfsel van een kaart die vóór deze ronde met een positief
  // saldo bewaard werd. Benoemen is beter dan stil laten staan.
  const toontTegoed = isKrediet && beginsaldo.trim() !== '' && invoerNaarCenten(beginsaldo) < 0
  const naamFout = naam.trim().length === 0
  const geldig = !naamFout && !limietFout && !dagFout && !afboekFout

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    setNaam(BEGIN.naam)
    setBeginsaldo(BEGIN.beginsaldo)
    setType(beginType ?? BEGIN.type)
    setRekeningnummer(BEGIN.rekeningnummer)
    setRubriek(BEGIN.rubriek)
    setKredietlimiet(BEGIN.kredietlimiet)
    setAfrekendag(BEGIN.afrekendag)
    setAfboekdag(BEGIN.afboekdag)
  }, [beginType])

  /**
   * Van type wisselen mag het BEDRAG niet stil van betekenis doen veranderen.
   *
   * Bij een kaart staat er op het scherm wat je nog schuldig bent; bij elk ander type
   * staat er wat je hébt. Wissel je tussen die twee zonder het getal om te draaien,
   * dan wordt een schuld van € 1.000 bij het bewaren een tegoed van € 1.000 — en
   * springt je netto vermogen € 2.000 omhoog zonder één woord uitleg.
   */
  function wisselType(nieuwType: RekeningType) {
    const wasKrediet = type === 'krediet'
    const wordtKrediet = nieuwType === 'krediet'
    if (wasKrediet !== wordtKrediet && beginsaldo.trim() !== '') {
      const centen = invoerNaarCenten(beginsaldo)
      if (Number.isFinite(centen)) setBeginsaldo(centenNaarInvoer(kaartbedragNaarOpslag(centen)))
    }
    setType(nieuwType)
  }

  useEffect(() => {
    if (bewerken) {
      setNaam(bewerken.naam)
      // Bij een kaart staat er op het scherm wat er OPENSTAAT, dus positief.
      setBeginsaldo(
        centenNaarInvoer(
          bewerken.type === 'krediet' ? kaartbedragUitOpslag(bewerken.beginsaldo) : bewerken.beginsaldo,
        ),
      )
      setType(bewerken.type ?? 'betaal')
      setRekeningnummer(bewerken.rekeningnummer ?? '')
      setRubriek(bewerken.rubriek ?? '')
      setKredietlimiet(bewerken.kredietlimiet === undefined ? '' : centenNaarInvoer(bewerken.kredietlimiet))
      setAfrekendag(bewerken.afrekendag === undefined ? '' : String(bewerken.afrekendag))
      setAfboekdag(bewerken.afboekdag === undefined ? '' : String(bewerken.afboekdag))
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
    const afboek = isKrediet ? Number(afboekdag) : NaN
    // Wat je bij een kaart intikt is wat er OPENSTAAT; de opslag houdt een schuld
    // negatief. Zonder deze omkering telde de kaart als bezit mee.
    const bedrag = Number.isFinite(centen) ? centen : 0
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      naam: naam.trim(),
      beginsaldo: isKrediet ? kaartbedragNaarOpslag(bedrag) : bedrag,
      type,
      ...(nr ? { rekeningnummer: nr } : {}),
      ...(rub ? { rubriek: rub } : {}),
      ...(bewerken?.gearchiveerd ? { gearchiveerd: true } : {}),
      ...(Number.isFinite(limiet) && limiet > 0 ? { kredietlimiet: limiet } : {}),
      ...(Number.isInteger(dag) && dag >= DAG_MIN && dag <= DAG_MAX ? { afrekendag: dag } : {}),
      ...(Number.isInteger(afboek) && afboek >= DAG_MIN && afboek <= DAG_MAX ? { afboekdag: afboek } : {}),
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
          <select id="rekeningtype" value={type} onChange={(e) => wisselType(e.target.value as RekeningType)}>
            {REKENING_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {t(REKENING_TYPE_LABEL[tp])}
              </option>
            ))}
          </select>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="beginsaldo">
            {isKrediet ? t('Openstaand bij de start (€)') : t('Beginsaldo (€)')}
          </label>
          <input
            id="beginsaldo"
            inputMode="decimal"
            placeholder="0,00"
            value={beginsaldo}
            onChange={(e) => setBeginsaldo(e.target.value)}
            aria-describedby={isKrediet ? 'beginsaldo-uitleg' : undefined}
          />
          {/* Bij een kaart is dit het bedrag dat je nog SCHULDIG bent. Zonder deze
              zin typte je 1000 en las de app "er staat 1000 op deze kaart": je
              volledige limiet bleef beschikbaar en de kaart telde als bezit mee. */}
          {isKrediet && (
            <p className="rij-meta" id="beginsaldo-uitleg" style={{ margin: 0 }}>
              {toontTegoed
                ? t('Hier staat nu een tegoed, geen schuld. Bedoelde je dat dit bedrag nog openstaat? Haal dan het minteken weg.')
                : t('Wat er op deze kaart nog openstaat wanneer je ze hier invoert. Vul een gewoon positief bedrag in — de app weet dat dit een schuld is. Staat er niets open, vul dan 0 in.')}
            </p>
          )}
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
                : t('Hoeveel je maximaal mag opnemen op deze kaart.')}
            </p>
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor="afrekendag">
              {t('Afsluitdag van de kaart')}
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
                : t('De dag waarop je kaartrekening wordt opgemaakt. Vanaf de dag erna loopt de volgende periode.')}
            </p>
          </div>
        </div>
      )}

      {/* De tweede dag. Dit is het verschil dat een kaart eigen is: het bedrag van
          de afsluiting gaat pas dagen later van je betaalrekening, en tot dan weegt
          het nog op je limiet. Met alleen een afsluitdag kan de app dat niet zeggen. */}
      {isKrediet && (
        <div className="veldrij">
          <div className="veldgroep">
            <label className="label-caps" htmlFor="afboekdag">
              {t('Dag waarop het bedrag afgeboekt wordt')}
            </label>
            <input
              id="afboekdag"
              inputMode="numeric"
              placeholder={t('1-28, optioneel')}
              value={afboekdag}
              onChange={(e) => setAfboekdag(e.target.value)}
              aria-describedby="afboekdag-uitleg"
              aria-invalid={afboekFout || undefined}
            />
            <p className="rij-meta" id="afboekdag-uitleg" role={afboekFout ? 'alert' : undefined} style={{ margin: 0 }}>
              {afboekFout
                ? t('Kies een dag tussen 1 en 28, of laat het veld leeg.')
                : t('De dag waarop de afsluiting effectief van je betaalrekening gaat. Meestal een dag in de maand na de afsluiting.')}
            </p>
          </div>
          <div className="veldgroep" />
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
