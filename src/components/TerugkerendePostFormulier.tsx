import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Frequentie, Rekening, TerugkerendePost } from '../data/schema'
import { FREQUENTIES } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { huidigeMaand } from '../utils/datum'
import { INTERVAL_MAANDEN } from '../utils/vastelast'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'
import { CategorieNiveauKiezer } from './CategorieNiveauKiezer'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen. De gekozen rekening
// hoort hier bewust niet bij: die blijft staan als handige standaard.
const BEGIN = {
  omschrijving: '',
  bedrag: '',
  soort: 'uitgave' as const,
  categorieId: '',
  dag: '1',
  frequentie: 'maand' as Frequentie,
  opbouwen: false,
}

// De weergavenaam van een frequentie. De opgeslagen sleutel ('kwartaal', ...)
// blijft taal-onafhankelijk; alleen wat je ziet, wordt vertaald.
export function frequentieNaam(t: Vertaler, f: Frequentie): string {
  switch (f) {
    case 'kwartaal':
      return t('Om de 3 maanden')
    case 'semester':
      return t('Om de 6 maanden')
    case 'jaar':
      return t('Eén keer per jaar')
    default:
      return t('Elke maand')
  }
}

// Formulier om een vaste (terugkerende) post aan te maken of te bewerken.
export function TerugkerendePostFormulier({
  rekeningen,
  categorieen,
  onOpslaan,
  onAnnuleer,
  bewerken,
  onOpgeslagen,
  soort: soortVanBuiten,
}: {
  rekeningen: Rekening[]
  categorieen: Categorie[]
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: TerugkerendePost | null
  /**
   * Inkomst of uitgave, van buitenaf gezet. De Plan-pagina heeft sinds ronde 25
   * twee aparte lijsten ("Vaste inkomsten" en "Vaste lasten"), en elk formulier
   * hoort daar maar één soort te maken. Dan verdwijnen de twee bolletjes onderaan:
   * dezelfde keuze op twee plaatsen is hoe je je loon per ongeluk als kost boekt.
   */
  soort?: 'uitgave' | 'inkomst'
  /**
   * Wordt aangeroepen ná een gelukte opslag. `blijfOpen` is waar wanneer je op
   * "Opslaan + volgende" duwde. Zodra deze prop meegegeven wordt, verschijnt die
   * tweede knop — zo hoeft de invoerpopup niets over dit formulier te weten.
   */
  onOpgeslagen?: (opties: { blijfOpen: boolean }) => void
}) {
  const { t } = useT()
  // Sinds ronde 25 staan er TWEE van deze formulieren op de Plan-pagina (één voor
  // inkomsten, één voor lasten). Vaste id's zouden dan dubbel voorkomen, en dan
  // wijst een label naar het veld van de andere kaart.
  const veldId = useId()
  const [omschrijving, setOmschrijving] = useState(BEGIN.omschrijving)
  const [bedrag, setBedrag] = useState(BEGIN.bedrag)
  const [eigenSoort, setEigenSoort] = useState<'uitgave' | 'inkomst'>(BEGIN.soort)
  // Van buiten gezet heeft voorrang; anders houdt het formulier zijn eigen keuze bij.
  const soort = soortVanBuiten ?? eigenSoort
  const [rekeningId, setRekeningId] = useState(rekeningen[0]?.id ?? '')
  const [categorieId, setCategorieId] = useState(BEGIN.categorieId)
  const [dag, setDag] = useState(BEGIN.dag)
  const [frequentie, setFrequentie] = useState<Frequentie>(BEGIN.frequentie)
  // De maand van de eerste betaling. Bepaalt het ritme van een niet-maandelijkse
  // post: begin je in augustus met een halfjaarlijkse premie, dan valt de volgende
  // in februari — niet in januari, want het contract volgt geen kalenderhalfjaar.
  const [startMaand, setStartMaand] = useState(() => huidigeMaand())
  const [opbouwen, setOpbouwen] = useState(BEGIN.opbouwen)
  // Welke van de twee opslaanknoppen ingedrukt werd. Een klik komt altijd vóór de
  // verzending van het formulier, dus dit staat juist op het moment dat we het lezen.
  const blijfOpen = useRef(false)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    setOmschrijving(BEGIN.omschrijving)
    setBedrag(BEGIN.bedrag)
    setEigenSoort(BEGIN.soort)
    setCategorieId(BEGIN.categorieId)
    setDag(BEGIN.dag)
    setFrequentie(BEGIN.frequentie)
    setStartMaand(huidigeMaand())
    setOpbouwen(BEGIN.opbouwen)
  }, [])

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      setEigenSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setRekeningId(bewerken.rekeningId)
      setCategorieId(bewerken.categorieId ?? '')
      setDag(String(bewerken.dag))
      setFrequentie(bewerken.frequentie ?? 'maand')
      setStartMaand(bewerken.startMaand ?? huidigeMaand())
      setOpbouwen(bewerken.opbouwen ?? false)
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const dagGetal = Number.parseInt(dag, 10)
  const periodiek = frequentie !== 'maand'
  const geldig =
    omschrijving.trim().length > 0 &&
    Number.isFinite(bedragCenten) &&
    bedragCenten > 0 &&
    rekeningId.length > 0 &&
    Number.isInteger(dagGetal) &&
    dagGetal >= 1 &&
    dagGetal <= 28 &&
    (!periodiek || /^\d{4}-\d{2}$/.test(startMaand))

  // Wat het per maand zou kosten als je ervoor opzijzet. Meteen tonen, want dat is
  // het bedrag waar je in je maandplan rekening mee houdt — niet het volle bedrag.
  const perMaand = Number.isFinite(bedragCenten) && bedragCenten > 0
    ? Math.round(bedragCenten / INTERVAL_MAANDEN[frequentie])
    : 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      omschrijving: omschrijving.trim(),
      bedrag: soort === 'uitgave' ? -bedragCenten : bedragCenten,
      rekeningId,
      dag: dagGetal,
      ...(categorieId ? { categorieId } : {}),
      // Een maandelijkse post laat deze drie velden weg, zodat ze exact hetzelfde
      // record blijft als vóór deze uitbreiding.
      ...(periodiek ? { frequentie, startMaand } : {}),
      ...(periodiek && opbouwen ? { opbouwen: true } : {}),
    })
    // Bij een NIEUWE vaste post blijft 'bewerken' null, dus de useEffect hierboven
    // draait niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en
    // maakt een tweede klik dezelfde post nog eens aan.
    if (!bewerken) leegmaken()
    const nog = blijfOpen.current
    blijfOpen.current = false
    onOpgeslagen?.({ blijfOpen: nog })
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${veldId}-vaste-omschrijving`}>
          {t('Vaste omschrijving')}
        </label>
        <input id={`${veldId}-vaste-omschrijving`} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${veldId}-vast-bedrag`}>
            {t('Vast bedrag (€)')}
          </label>
          <input id={`${veldId}-vast-bedrag`} inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${veldId}-vaste-dag`}>
            {t('Dag van de maand')}
          </label>
          <input id={`${veldId}-vaste-dag`} inputMode="numeric" value={dag} onChange={(e) => setDag(e.target.value)} />
        </div>
      </div>

      {/* Hoe vaak komt dit terug? Niet elke vaste last is maandelijks: een
          verzekering, de onroerende voorheffing of een jaarabonnement komen per
          kwartaal, per halfjaar of één keer per jaar. Zonder deze keuze telde de
          app zo'n kost élke maand mee, en klopten de vooruitblik én het
          buffercijfer niet. */}
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${veldId}-vaste-frequentie`}>
            {t('Hoe vaak?')}
          </label>
          <select
            id={`${veldId}-vaste-frequentie`}
            value={frequentie}
            onChange={(e) => setFrequentie(e.target.value as Frequentie)}
          >
            {FREQUENTIES.map((f) => (
              <option key={f} value={f}>
                {frequentieNaam(t, f)}
              </option>
            ))}
          </select>
        </div>
        {periodiek && (
          <div className="veldgroep">
            <label className="label-caps" htmlFor={`${veldId}-vaste-start`}>
              {t('Eerste betaling in')}
            </label>
            {/* Het ritme telt vanaf hier, niet vanaf het kalenderjaar: begin je in
                augustus met een halfjaarlijkse premie, dan volgt februari. */}
            <input
              id={`${veldId}-vaste-start`}
              type="month"
              value={startMaand}
              onChange={(e) => setStartMaand(e.target.value)}
            />
          </div>
        )}
      </div>

      {periodiek && soort === 'uitgave' && (
        <div className="veldgroep">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={opbouwen} onChange={(e) => setOpbouwen(e.target.checked)} />{' '}
            {t('Hier maandelijks voor opzijzetten')}
          </label>
          <span className="rij-meta">
            {opbouwen
              ? t('In de maanden zonder betaling rekent je plan op {bedrag} opzij.', { bedrag: formatEuro(perMaand) })
              : t('Zonder dit staat het volle bedrag in één keer in je plan, in de maand dat het vervalt.')}
          </span>
        </div>
      )}

      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${veldId}-vaste-rekening`}>
          {t('Vaste rekening')}
        </label>
        <select id={`${veldId}-vaste-rekening`} value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.naam}
            </option>
          ))}
        </select>
      </div>

      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${veldId}-vaste-categorie`}>
          {t('Vaste categorie')}
        </label>
        {/* Alle drie de niveaus, met een zoekveld. Tot ronde 27 kon je hier alleen
            een hoofdcategorie kiezen, dus stond je huur op "Woning en vaste lasten"
            en je elektriciteit ook — en dan zegt de analyse niets meer dan dat er
            geld naar je woning ging. Nu kan je rechtstreeks "Huur" of
            "Elektriciteit" kiezen, en die tag verhuist mee naar de transactie
            zodra je de vaste last inboekt. */}
        <CategorieNiveauKiezer
          id={`${veldId}-vaste-categorie`}
          waarde={categorieId}
          onKies={setCategorieId}
          categorieen={categorieen}
          metGeenKeuze
        />
      </div>

      {/* Deze twee bolletjes stonden zonder enige uitleg onder het formulier. In de
          invoerpopup staat er nu bovenaan een knop "Vaste last", en dan lijkt een
          losse keuze "Uitgave / Inkomst" eronder een tegenspraak. Ze is het niet:
          een vaste post kán ook geld zijn dat elke maand binnenkomt (loon, huurgeld
          dat je ontvangt). Vandaar dit kopje. */}
      {soortVanBuiten === undefined && (
        <>
          <span className="label-caps">{t('Komt dit geld binnen of gaat het eruit?')}</span>
          <div className="veldrij" style={{ gap: 18, marginTop: -6 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="vastsoort" checked={soort === 'uitgave'} onChange={() => setEigenSoort('uitgave')} /> {t('Uitgave')}
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="vastsoort" checked={soort === 'inkomst'} onChange={() => setEigenSoort('inkomst')} /> {t('Inkomst')}
            </label>
          </div>
        </>
      )}

      <div className="knoprij">
        {/* In de popup is dit de hoofdactie van het scherm; in de kaart op de
            budgetpagina is het één actie tussen andere. */}
        <button type="submit" disabled={!geldig} className={onOpgeslagen ? 'knop knop-primair' : 'knop knop-secundair'}>
          {bewerken
            ? t('Vaste post wijzigen')
            : soortVanBuiten === 'inkomst'
              ? t('Vaste inkomst toevoegen')
              : t('Vaste post toevoegen')}
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
