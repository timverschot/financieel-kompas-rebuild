import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Frequentie, Rekening, TerugkerendePost } from '../data/schema'
import { CONTRACTSOORTEN, opzegregelVan, type Contractsoort } from '../data/opzegregels'
import { FREQUENTIES } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel } from '../utils/rekening'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { huidigeMaand, maandJaarLabel } from '../utils/datum'
import { INTERVAL_MAANDEN, verschuifMaand } from '../utils/vastelast'
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
  // ⚠ NIET afleiden uit de lijst. Ik heb dat in ronde 66 geprobeerd — "val terug op
  // de eerste rekening zodra de gekozene niet meer in de lijst staat" — en dat is
  // erger dan het gaatje dat het dichtte: bewerk je een vaste last die op een
  // intussen GEARCHIVEERDE rekening staat, dan schoof zo'n afleiding hem stil naar
  // een andere rekening zodra je alleen het bedrag aanpaste. Een koppeling mag nooit
  // stil verdwijnen; dat is elders in deze app een harde regel (zie het spaardoel-,
  // garantie- en leningformulier), en ze geldt hier ook.
  const [categorieId, setCategorieId] = useState(BEGIN.categorieId)
  const [dag, setDag] = useState(BEGIN.dag)
  const [frequentie, setFrequentie] = useState<Frequentie>(BEGIN.frequentie)
  // De maand van de eerste betaling. Bepaalt het ritme van een niet-maandelijkse
  // post: begin je in augustus met een halfjaarlijkse premie, dan valt de volgende
  // in februari — niet in januari, want het contract volgt geen kalenderhalfjaar.
  const [startMaand, setStartMaand] = useState(() => huidigeMaand())
  // Leeg = loopt door. Geldt voor ELKE frequentie, ook maandelijks: een opgezegde
  // huur of een gestopt abonnement is precies het normale geval.
  const [eindMaand, setEindMaand] = useState('')
  const [opbouwen, setOpbouwen] = useState(BEGIN.opbouwen)
  // --- Het CONTRACT achter deze vaste last (ronde 57) --------------------------
  // Leeg = deze post is gewoon een vaste last en gedraagt zich precies zoals
  // vroeger. Vul je een soort én een datum in, dan rekent de app uit wanneer je
  // uiterlijk moet beslissen; zie utils/contract.ts.
  const [contractsoort, setContractsoort] = useState<Contractsoort | ''>('')
  const [verlengtOp, setVerlengtOp] = useState('')
  const [verlengtElke, setVerlengtElke] = useState('')
  const [eigenTermijn, setEigenTermijn] = useState('')
  // Maanden als vertrekpunt, want zo staat een opzegtermijn in een Belgisch contract
  // ("drie maanden opzeg"). Dagen blijven mogelijk voor wie een contract heeft dat het
  // wél in dagen zegt. Zie de uitleg bij `opzegtermijnMaanden` in data/schema.ts.
  const [eigenEenheid, setEigenEenheid] = useState<'maand' | 'dag'>('maand')
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
    setEindMaand('')
    setOpbouwen(BEGIN.opbouwen)
    setContractsoort('')
    setVerlengtOp('')
    setVerlengtElke('')
    setEigenTermijn('')
    setEigenEenheid('maand')
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
      setEindMaand(bewerken.eindMaand ?? '')
      setOpbouwen(bewerken.opbouwen ?? false)
      setContractsoort(bewerken.contractsoort ?? '')
      setVerlengtOp(bewerken.verlengtOp ?? '')
      setVerlengtElke(bewerken.verlengtElkeMaanden ? String(bewerken.verlengtElkeMaanden) : '')
      // Maanden winnen, net als in de rekenkern: een oud logboekbestand kan nog het
      // dagenveld dragen, en dan hoort er één voorspelbaar antwoord te zijn.
      if (bewerken.opzegtermijnMaanden !== undefined) {
        setEigenTermijn(String(bewerken.opzegtermijnMaanden))
        setEigenEenheid('maand')
      } else if (bewerken.opzegtermijnDagen !== undefined) {
        setEigenTermijn(String(bewerken.opzegtermijnDagen))
        setEigenEenheid('dag')
      } else {
        setEigenTermijn('')
        setEigenEenheid('maand')
      }
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const dagGetal = Number.parseInt(dag, 10)

  // --- Het contract ------------------------------------------------------------
  const regel = opzegregelVan(contractsoort || undefined)
  // Met een regel keuren en niet met `parseInt`: die leest "12abc" als 12 en "3,5" als
  // 3. Bij een getal dat een OPZEGDATUM bepaalt, is stil iets anders begrijpen dan wat
  // er staat precies het soort fout dat je een contract kost.
  const heelGetal = (tekst: string): number | null => {
    const kaal = tekst.trim()
    return /^\d{1,3}$/.test(kaal) ? Number(kaal) : null
  }
  const verlengtElkeIngevuld = verlengtElke.trim() !== ''
  const verlengtElkeGetal = (() => {
    const n = heelGetal(verlengtElke)
    return n !== null && n > 0 && n <= 120 ? n : 0
  })()
  const eigenTermijnIngevuld = eigenTermijn.trim() !== ''
  const TERMIJN_MAX = eigenEenheid === 'maand' ? 24 : 365
  const eigenTermijnGetal = (() => {
    const n = heelGetal(eigenTermijn)
    return n !== null && n <= TERMIJN_MAX ? n : null
  })()
  // Een ingevuld veld dat de app niet kan lezen, mag ze NIET stil laten vallen (fout
  // uit de nakijkronde van ronde 57). Vroeger sloeg ze dan gewoon niets op en rekende
  // ze verder met de wettelijke termijn, zonder dat er iets op het scherm veranderde.
  const termijnGeldig = !contractsoort || !eigenTermijnIngevuld || eigenTermijnGetal !== null
  const periodeGeldig = !contractsoort || !verlengtElkeIngevuld || verlengtElkeGetal > 0
  // Stond er contractinfo op de post die je aan het bewerken bent, en zet je de soort
  // terug op "geen"? Dan gaat die info weg bij het opslaan.
  const contractsoortWordtGewist = Boolean(bewerken?.contractsoort) && contractsoort === ''
  const periodiek = frequentie !== 'maand'
  // Een lege eindmaand betekent "loopt door" en is dus geldig. Is ze ingevuld, dan
  // moet ze een echte maand zijn én ná de eerste betaling liggen — een post die
  // stopt vóór hij begint bestaat niet. Die kruiscontrole staat hier en niet in het
  // schema: een strengere zod-regel zou bestaande gegevens ongeldig kunnen maken.
  const eindeGeldig =
    eindMaand === '' || (/^\d{4}-\d{2}$/.test(eindMaand) && (!periodiek || eindMaand > startMaand))
  // De id van de regel die zegt wat er nog ontbreekt (ronde 61).
  const redenId = useId()
  const geldig =
    omschrijving.trim().length > 0 &&
    Number.isFinite(bedragCenten) &&
    bedragCenten > 0 &&
    rekeningId.length > 0 &&
    Number.isInteger(dagGetal) &&
    dagGetal >= 1 &&
    dagGetal <= 28 &&
    (!periodiek || /^\d{4}-\d{2}$/.test(startMaand)) &&
    eindeGeldig &&
    termijnGeldig &&
    periodeGeldig

  // Wat het per maand zou kosten als je ervoor opzijzet. Meteen tonen, want dat is
  // het bedrag waar je in je maandplan rekening mee houdt — niet het volle bedrag.
  const perMaand = Number.isFinite(bedragCenten) && bedragCenten > 0
    ? Math.round(bedragCenten / INTERVAL_MAANDEN[frequentie])
    : 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) {
      // ⚠ De vlag WEL wissen (ronde 61). Sinds 'Opslaan + volgende' met `aria-disabled`
      // werkt in plaats van `disabled`, loopt zijn onClick ook bij een onvolledig
      // formulier. Bleef de vlag staan, dan hield een latere, gewone opslag de popup
      // open met lege velden — en dan denk je dat het niet gelukt is en boek je alles
      // een tweede keer. Dezelfde val als in OverboekingFormulier.
      blijfOpen.current = false
      return
    }
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
      ...(eindeGeldig && eindMaand ? { eindMaand } : {}),
      ...(periodiek && opbouwen ? { opbouwen: true } : {}),
      // Het contract. Zonder soort wordt er niets weggeschreven, en dan blijft dit
      // record byte voor byte wat het vóór ronde 57 was.
      ...(contractsoort ? { contractsoort } : {}),
      ...(contractsoort && verlengtOp ? { verlengtOp } : {}),
      ...(contractsoort && verlengtElkeGetal ? { verlengtElkeMaanden: verlengtElkeGetal } : {}),
      // Hoogstens één van de twee wordt weggeschreven, zodat er nooit twee eigen
      // termijnen naast elkaar staan die iets anders zeggen.
      ...(contractsoort && eigenTermijnGetal !== null
        ? eigenEenheid === 'maand'
          ? { opzegtermijnMaanden: eigenTermijnGetal }
          : { opzegtermijnDagen: eigenTermijnGetal }
        : {}),
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

      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${veldId}-vaste-einde`}>
          {t('Loopt tot en met')}
        </label>
        <input
          id={`${veldId}-vaste-einde`}
          type="month"
          value={eindMaand === '' ? '' : verschuifMaand(eindMaand, -1)}
          onChange={(e) => setEindMaand(e.target.value === '' ? '' : verschuifMaand(e.target.value, 1))}
          aria-describedby={`${veldId}-vaste-einde-uitleg`}
        />
        <span className="rij-meta" id={`${veldId}-vaste-einde-uitleg`}>
          {eindMaand === ''
            ? t('Laat leeg zolang de post doorloopt. Vul hem in wanneer je opzegt — de post blijft dan gewoon in je historiek staan.')
            : t('De laatste keer is {maand}. Daarna telt deze post niet meer mee.', { maand: maandJaarLabel(`${verschuifMaand(eindMaand, -1)}-01`) })}
        </span>
      </div>

      {periodiek && soort === 'uitgave' && (
        <div className="veldgroep">
          <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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

      {/* --- Het contract achter deze vaste last (ronde 57) ---------------------

          Waarom dit hier staat en niet in een eigen module: het gaat om drie feiten
          over een afspraak die al in de app staat. En waarom het ONDERAAN staat en
          niet bovenaan: negen van de tien vaste lasten zijn geen contract dat je in
          de gaten moet houden, en dan mag dit blok niet in de weg zitten.

          ⚠ De app WAARSCHUWT, ze BEVEELT NIET AAN. Ze zegt wanneer je moet beslissen;
          ze zegt nooit bij wie je beter zou zitten. Een leverancier voorstellen tegen
          vergoeding is gereglementeerde bemiddeling. */}
      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${veldId}-contractsoort`}>
          {t('Zit hier een contract achter? (optioneel)')}
        </label>
        <select
          id={`${veldId}-contractsoort`}
          value={contractsoort}
          onChange={(e) => setContractsoort(e.target.value as Contractsoort | '')}
        >
          <option value="">{t('Nee, gewoon een vaste last')}</option>
          {CONTRACTSOORTEN.map((soortNaam) => (
            <option key={soortNaam} value={soortNaam}>
              {t(opzegregelVan(soortNaam)?.naam ?? soortNaam)}
            </option>
          ))}
        </select>
        {/* Zonder soort schrijft het formulier de contractvelden niet weg, en omdat
            opslaan het hele record vervangt, verdwijnt de verlengdatum dan echt. Het
            blok van het scherm zien verdwijnen is niet hetzelfde als weten dat je een
            datum wist — dus staat het er nu bij. */}
        {contractsoortWordtGewist && (
          <span className="rij-meta">
            {t('Sla je zo op, dan wis je de verlengdatum en de opzegtermijn van deze post.')}
          </span>
        )}
      </div>

      {contractsoort && (
        <>
          <div className="veldrij">
            <div className="veldgroep">
              <label className="label-caps" htmlFor={`${veldId}-verlengt-op`}>
                {t('Verlengt of loopt af op')}
              </label>
              <input
                id={`${veldId}-verlengt-op`}
                type="date"
                value={verlengtOp}
                onChange={(e) => setVerlengtOp(e.target.value)}
              />
            </div>
            <div className="veldgroep">
              <label className="label-caps" htmlFor={`${veldId}-verlengt-elke`}>
                {t('Om de hoeveel maanden? (optioneel)')}
              </label>
              <input
                id={`${veldId}-verlengt-elke`}
                inputMode="numeric"
                placeholder="12"
                value={verlengtElke}
                onChange={(e) => setVerlengtElke(e.target.value)}
              />
            </div>
          </div>
          <span className={periodeGeldig ? 'rij-meta' : 'foutregel'} style={{ marginTop: -6 }}>
            {!periodeGeldig
              ? t('Vul hier een heel aantal maanden in, van 1 tot 120 — of laat het leeg.')
              : verlengtElkeGetal
                ? t('De app schuift deze datum vanzelf op zodra ze voorbij is.')
                : t('Zonder dit getal schuift de app de datum NIET zelf op: ze vraagt je de nieuwe. Ze kan niet weten voor hoe lang er verlengd is.')}
          </span>

          <div className="veldgroep">
            <label className="label-caps" htmlFor={`${veldId}-opzegtermijn`}>
              {t('Je eigen opzegtermijn (optioneel)')}
            </label>
            {/* ⚠ MET EEN EENHEID, en dat is de reparatie uit de tweede nakijkronde van
                ronde 57. Eerst kon je hier alleen DAGEN invullen, terwijl een Belgisch
                contract bijna altijd maanden noemt. Wie "3 maanden opzeg" als 90 dagen
                invulde, kreeg 17 oktober te zien waar 15 oktober de echte laatste dag
                was — twee dagen te laat, en dus precies de rekenfout die deze ronde in
                haar eigen kern net weggewerkt had. */}
            <div className="termijnrij">
              <input
                id={`${veldId}-opzegtermijn`}
                inputMode="numeric"
                value={eigenTermijn}
                onChange={(e) => setEigenTermijn(e.target.value)}
                aria-describedby={`${veldId}-opzeg-uitleg`}
                aria-invalid={!termijnGeldig}
              />
              <select
                aria-label={t('Eenheid van de opzegtermijn')}
                value={eigenEenheid}
                onChange={(e) => setEigenEenheid(e.target.value as 'maand' | 'dag')}
              >
                <option value="maand">{t('maanden')}</option>
                <option value="dag">{t('dagen')}</option>
              </select>
            </div>
            <span className={termijnGeldig ? 'rij-meta' : 'foutregel'} id={`${veldId}-opzeg-uitleg`}>
              {!termijnGeldig
                ? eigenEenheid === 'maand'
                  ? t('Vul een heel aantal maanden in, van 0 tot 24. Zolang dit niet klopt, kan je niet opslaan.')
                  : t('Vul een heel aantal dagen in, van 0 tot 365. Zolang dit niet klopt, kan je niet opslaan.')
                : eigenTermijnGetal !== null
                  ? eigenEenheid === 'maand'
                    ? t('De app rekent met jouw {n} maand(en).', { n: eigenTermijnGetal })
                    : t('De app rekent met jouw {n} dagen.', { n: eigenTermijnGetal })
                  : regel?.standaardTermijnMaanden != null
                    ? t('De app rekent met de wettelijke {n} maand(en). Staat er in jouw overeenkomst een kortere termijn, vul die dan hier in.', { n: regel.standaardTermijnMaanden })
                    : t('Zonder termijn toont de app alleen de datum en rekent ze niets uit.')}
            </span>
          </div>

          {/* Wat de wet zegt, en wat de app daarover NIET weet, bewust op twee aparte
              regels: aan elkaar geplakt las het voorbehoud als een voetnoot bij de
              regel, terwijl het net het stuk is waar jouw contract kan afwijken. */}
          {regel && regel.uitleg && (
            <>
              <p className="rij-meta" style={{ margin: 0 }}>
                {t(regel.uitleg)}
              </p>
              {regel.voorbehoud && (
                <p className="rij-meta" style={{ margin: 0 }}>
                  <strong>{t('Let op:')}</strong> {t(regel.voorbehoud)}
                </p>
              )}
            </>
          )}
        </>
      )}

      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${veldId}-vaste-rekening`}>
          {t('Vaste rekening')}
        </label>
        <select id={`${veldId}-vaste-rekening`} value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {rekeningLabel(r)}
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
            <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="vastsoort" checked={soort === 'uitgave'} onChange={() => setEigenSoort('uitgave')} /> {t('Uitgave')}
            </label>
            <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="vastsoort" checked={soort === 'inkomst'} onChange={() => setEigenSoort('inkomst')} /> {t('Inkomst')}
            </label>
          </div>
        </>
      )}

      <div className="knoprij">
        {/* In de popup is dit de hoofdactie van het scherm; in de kaart op de
            budgetpagina is het één actie tussen andere. */}
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className={onOpgeslagen ? 'knop knop-primair' : 'knop knop-secundair'}
        >
          {bewerken
            ? t('Vaste post wijzigen')
            : soortVanBuiten === 'inkomst'
              ? t('Vaste inkomst toevoegen')
              : t('Vaste post toevoegen')}
        </button>
        {onOpgeslagen && !bewerken && (
          <button
            type="submit"
            aria-disabled={!geldig}
            aria-describedby={geldig ? undefined : redenId}
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
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt.
          Sinds ronde 57 kan het contractblok de knop óók tegenhouden, en dan mag hier
          niet "geef een naam en een bedrag" staan terwijl die allebei ingevuld zijn:
          dan zoek je je blind. "Niet kan gebruiken" en niet "niet kan lezen": zet je
          een veld van 90 dagen om naar maanden, dan LEEST de app die 90 prima — ze
          valt alleen buiten het bereik van 0 tot 24. Het veld zelf zegt welk bereik. */}
      {/* ⚠ Altijd aanwezig, leeg wanneer er niets te melden is (ronde 61): een
          `role="status"` die pas MÉT zijn tekst verschijnt, wordt door sommige
          schermlezers overgeslagen, en de twee knoppen hierboven wijzen ernaar. */}
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig
          ? ''
          : !termijnGeldig || !periodeGeldig
            ? t('In het contractblok staat een getal dat de app niet kan gebruiken. Pas het aan om op te slaan.')
            : t('Geef een naam en een geldig bedrag om op te slaan.')}
      </p>
    </form>
  )
}
