import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, GedeeldeKost, Kind } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { CategorieKiezer } from './CategorieKiezer'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { vandaag } from '../utils/datum'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import type { NieuweTak } from '../utils/categorietak'
import { Bonknop } from '../ui/Bonknop'
import { voorstelKostensoort, KOSTENSOORT_BRON } from '../utils/kostensoort'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
function beginwaarden() {
  return {
    omschrijving: '',
    bedrag: '',
    datum: vandaag(),
    betaaldDoor: 'jij' as const,
    kindIds: [] as string[],
    categorieId: '',
    kostenType: 'gewoon' as const,
    aandeelOverride: '',
    bonnetje: '',
  }
}

// Formulier om een gedeelde kost toe te voegen of te bewerken. Een kost kan aan
// één of meer kinderen gekoppeld worden, een categorie en kostentype krijgen, en
// optioneel een eigen verdeel-percentage dat de dossier-/categorie-standaard
// overschrijft.
export function GedeeldeKostFormulier({
  dossierId,
  kinderen,
  categorieen,
  onOpslaan,
  onAnnuleer,
  bewerken,
  onNieuweSubcategorie,
}: {
  dossierId: string
  kinderen: Kind[]
  categorieen: Categorie[]
  onOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: GedeeldeKost | null
  /** Maakt ter plekke een nieuwe subcategorie aan en geeft het nieuwe id terug. */
  onNieuweSubcategorie?: (plan: NieuweTak) => Promise<string>
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState(() => beginwaarden().omschrijving)
  const [bedrag, setBedrag] = useState(() => beginwaarden().bedrag)
  const [datum, setDatum] = useState(() => beginwaarden().datum)
  const [betaaldDoor, setBetaaldDoor] = useState<'jij' | 'partner'>(() => beginwaarden().betaaldDoor)
  const [kindIds, setKindIds] = useState<string[]>(() => beginwaarden().kindIds)
  const [categorieId, setCategorieId] = useState(() => beginwaarden().categorieId)
  const [kostenType, setKostenType] = useState<'gewoon' | 'buitengewoon'>(() => beginwaarden().kostenType)
  const [aandeelOverride, setAandeelOverride] = useState(() => beginwaarden().aandeelOverride)
  const [bonnetje, setBonnetje] = useState(() => beginwaarden().bonnetje)
  const [bezigBon, setBezigBon] = useState(false)
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ Eén vast id per invulbeurt; zie de andere formulieren.
  const nieuwIdRef = useRef(nieuwId())
  // Heeft de gebruiker de soort kost zélf gekozen? Zolang dat niet zo is, mag het
  // voorstel van de KB-lijst het veld invullen. Zodra hij hem zelf zet, blijft die
  // keuze staan — ook als hij daarna nog van categorie wisselt.
  const [typeZelfGekozen, setTypeZelfGekozen] = useState(false)
  // De knop "Voorstel volgen" verdwijnt zodra je erop klikt (de tekst wisselt van
  // vorm). Zonder deze ref valt de focus dan terug op <body>, en staat wie met een
  // toetsenbord of schermlezer werkt plots bovenaan de pagina.
  const typeSelectRef = useRef<HTMLSelectElement | null>(null)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    // Klaar voor de volgende kost: een vers id, zodat die niet dezelfde overschrijft.
    nieuwIdRef.current = nieuwId()
    const b = beginwaarden()
    setOmschrijving(b.omschrijving)
    setBedrag(b.bedrag)
    setDatum(b.datum)
    setBetaaldDoor(b.betaaldDoor)
    setKindIds(b.kindIds)
    setCategorieId(b.categorieId)
    setKostenType(b.kostenType)
    setAandeelOverride(b.aandeelOverride)
    setBonnetje(b.bonnetje)
    setTypeZelfGekozen(false)
  }, [])

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(bewerken.bedrag))
      setDatum(bewerken.datum)
      setBetaaldDoor(bewerken.betaaldDoor)
      setKindIds(bewerken.kindIds ?? [])
      setCategorieId(bewerken.categorieId ?? '')
      setKostenType(bewerken.kostenType ?? 'gewoon')
      setAandeelOverride(typeof bewerken.aandeelJijOverride === 'number' ? String(bewerken.aandeelJijOverride) : '')
      setBonnetje(bewerken.bonnetje ?? '')
      // Een bestaande kost die al een soort draagt, is een keuze die iemand ooit
      // gemaakt heeft. Die overschrijven we niet met een voorstel. Staat het veld
      // er niet op (een kost van vóór dit veld), dan mag het voorstel wel helpen.
      setTypeZelfGekozen(bewerken.kostenType !== undefined)
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  // Het voorstel volgens de indicatieve lijst van het KB van 22 april 2019. Puur
  // afgeleid van het gekozen categorie-id, dus geen effect nodig om het te tonen.
  const voorstel = voorstelKostensoort(categorieId || undefined)

  // Vult het veld in zolang de gebruiker er zelf niet aan gekomen is. De afhankelijkheid
  // is bewust alleen het ID (een string) en niet een object uit een herladen lijst:
  // dat laatste is precies de valstrik waardoor een formulier zichzelf bij elke
  // achtergrondsynchronisatie opnieuw invulde.
  useEffect(() => {
    if (typeZelfGekozen) return
    const v = voorstelKostensoort(categorieId || undefined)
    if (v) setKostenType(v.kostenType)
  }, [categorieId, typeZelfGekozen])

  const bedragCenten = invoerNaarCenten(bedrag)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const veldId = useId()

  // ⚠ RONDE 95 — DE VELDEN VAN DIT FORMULIER HETEN GEWOON WAT ZE ZIJN.
  //
  // Tot deze ronde stond er "Kostomschrijving" en "Kostbedrag (€)" — precies het
  // voorvoegsel dat ronde 88 op Budget → Vast wegdeed ("Vaste omschrijving"). Het stond
  // er niet omdat het Nederlands is, maar om botsingen met velden elders te vermijden.
  // Ernaast stond gewoon "Datum", dus het formulier was ook nog eens niet met zichzelf
  // consequent.
  //
  // ⚠ EN OP DEZE PAGINA IS DAT NODIG. Staat het onderdeel "Kindrekening" aan, dan staat
  // het formulier van de pot ONDER dit formulier op hetzelfde scherm. Opgemeten met de
  // naamberekening van `dom-accessibility-api`, in beide toestanden van dat formulier:
  // "Datum", "Bon/factuur (optioneel)", het zoekveld én de hoofdcategorieknop van de
  // categoriekiezer, de groep "Voor wie? (optioneel)", elke gezinslidchip, de rondjes
  // "Jij" en "Partner" — en na het weghalen van de voorvoegsels ook "Bedrag (€)".
  //
  // De oplossing is dezelfde als in ronde 83 en 92: het `<form>` draagt een NAAM (een
  // landmark, dus een schermlezer kondigt hem aan zodra je erin komt), en elk veld dat
  // een tweelingbroer heeft krijgt er onhoorbaar-zichtbaar een toevoeging bij via
  // `aria-labelledby`. De zichtbare tekst staat daarbij VOORAAN en aaneengesloten
  // (WCAG 2.5.3): wie "Datum" zegt, moet het veld raken dat "Datum" heet. En het label
  // blijft een echt `<label htmlFor>`, zodat een klik erop het veld nog focust.
  const soortId = `${veldId}-soort`
  const formuliernaam = bewerken ? t('Deze gedeelde kost') : t('Nieuwe gedeelde kost')
  const geldig = omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const override = Number.parseFloat(aandeelOverride.replace(',', '.'))
    const heeftOverride = Number.isFinite(override) && override >= 0 && override <= 100

    // We beginnen van de BESTAANDE kost en overschrijven wat dit formulier kent.
    // Vroeger stond hier een witte lijst van velden, en dan verdween alles wat het
    // formulier niet kende bij de eerste bewerking. Dat is één keer misgegaan met
    // 'transactieId' (de kost werd niet meer bij haar transactie gevonden, en een
    // tweede bewaring maakte een tweede kost — dezelfde rekening twee keer in de
    // afrekening én in de pdf naar de andere ouder). Met de uitwisseling erbij
    // zouden 'uitwisselId' en 'reactie' precies dezelfde weg gegaan zijn, met
    // dezelfde dubbeltelling tot gevolg. Vandaar deze vorm: nieuwe velden blijven
    // vanzelf behouden, zonder dat iemand eraan moet denken.
    const kost: GedeeldeKost = {
      ...(bewerken ?? {}),
      id: bewerken ? bewerken.id : nieuwIdRef.current,
      dossierId: bewerken ? bewerken.dossierId : dossierId,
      omschrijving: omschrijving.trim(),
      bedrag: bedragCenten,
      betaaldDoor,
      datum,
      kostenType,
    }
    // De optionele velden die dit formulier WEL bestuurt: leeggemaakt betekent
    // hier weg, niet "laat maar staan".
    if (kindIds.length > 0) kost.kindIds = kindIds
    else delete kost.kindIds
    if (categorieId) kost.categorieId = categorieId
    else delete kost.categorieId
    if (heeftOverride) kost.aandeelJijOverride = override
    else delete kost.aandeelJijOverride
    if (bonnetje) kost.bonnetje = bonnetje
    else delete kost.bonnetje

    // ⚠ RONDE 68 — een mislukte opslag mag niet stil blijven. Dit formulier schrijft
    // bovendien een bonfoto weg, dus een volle opslag is hier geen theoretisch geval.
    if (!(await opslag.probeer(() => onOpslaan(kost)))) return
    // Bij een NIEUWE kost blijft 'bewerken' null, dus de useEffect hierboven draait
    // niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en boek je met
    // een tweede klik dezelfde kost nog eens.
    if (!bewerken) leegmaken()
  }

  async function kiesBonnetje(bestand: File) {
    setBezigBon(true)
    try {
      setBonnetje(await verkleinAfbeelding(bestand))
    } catch {
      // stil: een mislukte bon mag het toevoegen niet blokkeren.
    } finally {
      setBezigBon(false)
    }
  }

  return (
    <form onSubmit={verzend} aria-label={formuliernaam} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* De toevoeging waar de velden hieronder naar wijzen. Buiten beeld: wie kijkt, ziet
          de lijst met kosten en de scheidingslijn erboven al en weet dus waar hij zit; wie
          luistert, hoort alleen de veldnaam en heeft die toevoeging nodig. */}
      <span id={soortId} className="alleen-voorlezen">{t('(gedeelde kost)')}</span>
      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-omschrijving-label`} htmlFor="kostomschrijving">{t('Omschrijving')}</label>
        <input id="kostomschrijving" aria-labelledby={`${veldId}-omschrijving-label ${soortId}`} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-bedrag-label`} htmlFor="kostbedrag">{t('Bedrag (€)')}</label>
        <input id="kostbedrag" aria-labelledby={`${veldId}-bedrag-label ${soortId}`} inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      {/* De categorie staat bewust vóór de soort kost: uit de categorie volgt het
          voorstel, dus in die volgorde lezen de twee velden als oorzaak en gevolg. */}
      <CategorieKiezer
        waarde={categorieId || undefined}
        onKies={(id) => setCategorieId(id ?? '')}
        gebruikerCategorieen={categorieen}
        onNieuweSubcategorie={onNieuweSubcategorie}
        naamToevoeging={t('(gedeelde kost)')}
      />
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kosttype">{t('Soort kost')}</label>
        <select
          id="kosttype"
          ref={typeSelectRef}
          value={kostenType}
          onChange={(e) => {
            setKostenType(e.target.value as 'gewoon' | 'buitengewoon')
            setTypeZelfGekozen(true)
          }}
        >
          <option value="gewoon">{t('Gewone kost')}</option>
          <option value="buitengewoon">{t('Buitengewone kost')}</option>
        </select>
        {/* Het voorstel volgens de indicatieve lijst. Nooit dwingend: het staat er
            als toelichting, met de bron erbij, en één knop om het alsnog te volgen. */}
        {voorstel && (
          // `role="status"` omdat het veld hierboven vanzelf van waarde verandert
          // zodra je een categorie kiest — en dat bepaalt hoe het geld verdeeld
          // wordt. Ziend zie je het gebeuren; zonder deze rol hoorde je niets.
          <p className="rij-meta" role="status" style={{ margin: '4px 0 0' }}>
            {voorstel.kostenType === kostenType ? (
              voorstel.kostenType === 'buitengewoon' ? (
                <>
                  {t('Voorstel: buitengewone kost — {reden}. Je kan dit zelf aanpassen.', {
                    reden: t(voorstel.reden),
                  })}
                </>
              ) : (
                <>{t('Deze categorie staat niet op de indicatieve lijst, dus stellen we een gewone kost voor. Je kan dit zelf aanpassen.')}</>
              )
            ) : (
              <>
                {t('Je koos zelf {soort}; het voorstel was {voorstel}.', {
                  soort: t(kostenType === 'buitengewoon' ? 'Buitengewone kost' : 'Gewone kost'),
                  voorstel: t(voorstel.kostenType === 'buitengewoon' ? 'Buitengewone kost' : 'Gewone kost'),
                })}{' '}
                <button
                  type="button"
                  className="knop knop-ghost knop-klein"
                  onClick={() => {
                    setKostenType(voorstel.kostenType)
                    setTypeZelfGekozen(false)
                    typeSelectRef.current?.focus()
                  }}
                >
                  {t('Voorstel volgen')}
                </button>
              </>
            )}
            <br />
            {t(KOSTENSOORT_BRON)}
          </p>
        )}
      </div>
      {/* Aan wie hangt deze kost? Dezelfde kiezer als in het transactieformulier, zodat
          "voor wie is dit?" overal hetzelfde werkt. De kiezer verbergt zichzelf als er
          geen gezinsleden zijn — er blijft dus geen leeg label of lege veldgroep staan.
          Onder water blijft dit gewoon 'kindIds'. */}
      <GezinsledenKiezer
        label={t('Voor wie? (optioneel)')}
        waarden={kindIds}
        onWijzig={setKindIds}
        gezinsleden={kinderen}
        naamToevoeging={t('(gedeelde kost)')}
      />
      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-datum-label`} htmlFor="kostdatum">{t('Datum')}</label>
        <input id="kostdatum" aria-labelledby={`${veldId}-datum-label ${soortId}`} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      {/* ⚠ RONDE 95 — een echte GROEP met een naam, en een toevoeging op elk rondje.
          Deze twee rondjes heetten "Jij" en "Partner", en die van de kindrekening
          hieronder ook — vier rondjes, twee namen, op één scherm. Het kopje erboven was
          een losse `<span>` die aan niets gekoppeld was, dus hulpsoftware hoorde alleen
          "Jij, keuzerondje". Nu draagt de groep de vraag en zegt elk rondje uit welk
          formulier het komt. */}
      <div className="veldgroep" role="group" aria-labelledby={`${veldId}-betaald-label ${soortId}`}>
        <span className="label-caps" id={`${veldId}-betaald-label`}>{t('Betaald door:')}</span>
        {/* `raak-label` (ronde 47): het bolletje zelf is 13 px en het label was
            23 px hoog. Dit is de enige keuze in dit formulier die de RICHTING van
            het geld bepaalt — wie hem mist, boekt een kost op de verkeerde ouder. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              name="betaalddoor"
              aria-labelledby={`${veldId}-betaald-jij ${soortId}`}
              checked={betaaldDoor === 'jij'}
              onChange={() => setBetaaldDoor('jij')}
            />{' '}
            <span id={`${veldId}-betaald-jij`}>{t('Jij')}</span>
          </label>
          <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              name="betaalddoor"
              aria-labelledby={`${veldId}-betaald-partner ${soortId}`}
              checked={betaaldDoor === 'partner'}
              onChange={() => setBetaaldDoor('partner')}
            />{' '}
            <span id={`${veldId}-betaald-partner`}>{t('Partner')}</span>
          </label>
        </div>
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="kost-override">{t('Eigen verdeling (% jij, optioneel)')}</label>
        <input id="kost-override" inputMode="decimal" placeholder={t('leeg = standaard van het dossier')} value={aandeelOverride} onChange={(e) => setAandeelOverride(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-bon-label`} htmlFor="kost-bon">{t('Bon/factuur (optioneel)')}</label>
        {bonnetje ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Bon/factuur')} style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            )}
            <Bonknop bestand={bonnetje} naam={omschrijving || t('Bon')} />
            <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => setBonnetje('')}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="kost-bon"
            aria-labelledby={`${veldId}-bon-label ${soortId}`}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void kiesBonnetje(f)
              e.target.value = ''
            }}
          />
        )}
        {bezigBon && <span className="rij-meta"> {t('bezig…')}</span>}
      </div>
      <div className="knoprij">
        <button
          type="submit" className="knop knop-primair"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
        >
          {bewerken ? t('Kost wijzigen') : t('Kost toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-secundair" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
      {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
          `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
          sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
          knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
          hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
      <Opslagfout fout={opslag.fout} />
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Geef een naam en een geldig bedrag om op te slaan.')}
      </p>
    </form>
  )
}
