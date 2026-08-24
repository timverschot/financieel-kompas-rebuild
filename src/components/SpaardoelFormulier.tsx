import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Kind, Rekening, Spaardoel, TerugkerendePost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel } from '../utils/rekening'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { volgendeVervaldag } from '../utils/vastelast'
import { dagJaar, vandaag } from '../utils/datum'
import { GezinslidKiezer } from './GezinslidKiezer'
import { heeftKiesbareLeden } from '../utils/persoon'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { IcoonKleurKiezer } from './IcoonKleurKiezer'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
const BEGIN = {
  naam: '',
  doelbedrag: '',
  gekoppeldeRekeningId: '',
  huidig: '',
  doeldatum: '',
  maandbedrag: '',
  kleur: '#3F8A58' as string | undefined,
  icoon: undefined as string | undefined,
  persoonId: '',
  vasteLastId: '',
}

// Formulier om een spaardoel aan te maken of te bewerken.
export function SpaardoelFormulier({
  rekeningen,
  onOpslaan,
  onAnnuleer,
  bewerken,
  gezinsleden = [],
  vasteLasten = [],
  vandaagISO = vandaag(),
}: {
  rekeningen: Rekening[]
  /**
   * De vaste lasten waar je voor kan sparen (ronde 74).
   *
   * Optioneel en standaard leeg: dan verschijnt het veld "Waarvoor spaar je?"
   * gewoon niet, en werkt dit formulier precies zoals vóór die ronde.
   */
  vasteLasten?: TerugkerendePost[]
  /** Welke dag het vandaag is; om de eerstvolgende vervaldag uit te rekenen. */
  vandaagISO?: string
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Spaardoel | null
  // Optioneel: zolang deze lijst leeg is, verschijnt het veld "Voor wie is dit
  // doel?" gewoon niet. Zo blijven bestaande aanroepen ongewijzigd werken.
  gezinsleden?: Kind[]
}) {
  const { t } = useT()
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ RONDE 68 — ÉÉN VAST ID PER INVULBEURT, niet één per poging.
  //
  // Nu een mislukte opslag zichtbaar is en de app zegt "probeer het opnieuw", telt dit
  // ineens: werd het record wél weggeschreven maar liep het opnieuw inlezen daarna mis,
  // dan maakte een tweede poging met een VERS id een tweede record in plaats van
  // hetzelfde te overschrijven. Het boekingsformulier doet dit al sinds ronde 36 zo, om
  // precies dezelfde reden.
  //
  // Het id wordt ververst zodra het formulier na een geslaagde opslag leeggemaakt wordt.
  const nieuwIdRef = useRef(nieuwId())
  const [naam, setNaam] = useState(BEGIN.naam)
  const [doelbedrag, setDoelbedrag] = useState(BEGIN.doelbedrag)
  const [gekoppeldeRekeningId, setGekoppeld] = useState(BEGIN.gekoppeldeRekeningId)
  const [huidig, setHuidig] = useState(BEGIN.huidig)
  const [doeldatum, setDoeldatum] = useState(BEGIN.doeldatum)
  const [maandbedrag, setMaandbedrag] = useState(BEGIN.maandbedrag)
  const [kleur, setKleur] = useState(BEGIN.kleur)
  const [icoon, setIcoon] = useState(BEGIN.icoon)
  const [persoonId, setPersoonId] = useState(BEGIN.persoonId)
  const [vasteLastId, setVasteLastId] = useState(BEGIN.vasteLastId)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    // Klaar voor het volgende record: een vers id, zodat de volgende invoer niet
    // hetzelfde record overschrijft (ronde 68).
    nieuwIdRef.current = nieuwId()
    setNaam(BEGIN.naam)
    setDoelbedrag(BEGIN.doelbedrag)
    setGekoppeld(BEGIN.gekoppeldeRekeningId)
    setHuidig(BEGIN.huidig)
    setDoeldatum(BEGIN.doeldatum)
    setMaandbedrag(BEGIN.maandbedrag)
    setKleur(BEGIN.kleur)
    setIcoon(BEGIN.icoon)
    setPersoonId(BEGIN.persoonId)
    setVasteLastId(BEGIN.vasteLastId)
  }, [])

  useEffect(() => {
    if (bewerken) {
      setNaam(bewerken.naam)
      setDoelbedrag(centenNaarInvoer(bewerken.doelbedrag))
      setGekoppeld(bewerken.gekoppeldeRekeningId ?? '')
      setHuidig(centenNaarInvoer(bewerken.huidigBedrag))
      setDoeldatum(bewerken.doeldatum ?? '')
      setMaandbedrag(bewerken.maandbedrag ? centenNaarInvoer(bewerken.maandbedrag) : '')
      setKleur(bewerken.kleur ?? '#3F8A58')
      setIcoon(bewerken.icoon)
      setPersoonId(bewerken.persoonId ?? '')
      setVasteLastId(bewerken.vasteLastId ?? '')
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  // De gekozen vaste last, en wat we daarover kunnen zeggen. Bewust per render
  // opnieuw opgezocht: de lijst kan tijdens het invullen veranderen (een ander
  // toestel voegt iets toe), en dan hoort de zin eronder mee te veranderen.
  const gekozenLast = vasteLasten.find((p) => p.id === vasteLastId) ?? null
  // ⚠ Hangt dit doel aan een kost die NIET in de keuzelijst staat — opgezegd, of
  // intussen maandelijks geworden — dan is er geen optie met die waarde, en valt de
  // keuzelijst stil terug op "Voor niets in het bijzonder". Het formulier zei dan dat
  // er geen koppeling was terwijl de lijst ernaast er een toonde, en je kon ze niet
  // meer losmaken. Ze krijgt daarom altijd haar eigen optie.
  const ontbrekendeKoppeling = vasteLastId !== '' && gekozenLast === null
  const uitlegId = useId()
  const vervaldag = gekozenLast ? volgendeVervaldag(gekozenLast, vandaagISO) : null

  /**
   * Een vaste last kiezen vult de lege velden in.
   *
   * ⚠ ALLEEN de lege. Wat jij al ingetikt hebt, blijft staan — een keuzelijst die
   * je bedrag overschrijft is precies de fout die ronde 62 kostte (het formulier
   * verving een bedrag dat je aan het typen was). Wil je het bedrag van de vaste
   * last alsnog, dan maak je het veld leeg en kies je opnieuw; de regel eronder
   * zegt altijd wat die vaste last kost, dus je hoeft niets op te zoeken.
   */
  function kiesVasteLast(id: string) {
    setVasteLastId(id)
    const post = vasteLasten.find((p) => p.id === id)
    if (!post) return
    if (naam.trim() === '') setNaam(post.omschrijving)
    if (doelbedrag.trim() === '') setDoelbedrag(centenNaarInvoer(Math.abs(post.bedrag)))
    const volgende = volgendeVervaldag(post, vandaagISO)
    if (doeldatum === '' && volgende) setDoeldatum(volgende)
  }

  const doelCenten = invoerNaarCenten(doelbedrag)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig = naam.trim().length > 0 && Number.isFinite(doelCenten) && doelCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const huidigCenten = invoerNaarCenten(huidig)
    const maandCenten = invoerNaarCenten(maandbedrag)
    // ⚠ RONDE 68 — EEN MISLUKTE OPSLAG MAG NOOIT STIL BLIJVEN. Dit formulier riep
    // `onOpslaan` aan zonder de mislukking op te vangen: de belofte werd weggegooid,
    // er verscheen geen letter, en de knop leek gewoon niet te reageren. Je drukte
    // opnieuw, of je sloot het venster en was je invoer kwijt. Alles wat "het is
    // gelukt" uitstraalt, gebeurt nu pas ná een geslaagde opslag.
    const gelukt = await opslag.probeer(() =>
      onOpslaan({
        id: bewerken ? bewerken.id : nieuwIdRef.current,
        naam: naam.trim(),
        doelbedrag: doelCenten,
        huidigBedrag: gekoppeldeRekeningId ? bewerken?.huidigBedrag ?? 0 : Number.isFinite(huidigCenten) ? huidigCenten : 0,
        ...(doeldatum ? { doeldatum } : {}),
        ...(gekoppeldeRekeningId ? { gekoppeldeRekeningId } : {}),
        ...(Number.isFinite(maandCenten) && maandCenten > 0 ? { maandbedrag: maandCenten } : {}),
        ...(kleur ? { kleur } : {}),
        ...(icoon && icoon.trim() ? { icoon: icoon.trim() } : {}),
        // Ook bewaren als het veld niet zichtbaar is (bv. het gekoppelde lid werd
        // intussen gearchiveerd): een koppeling mag nooit stil verdwijnen.
        ...(persoonId ? { persoonId } : {}),
        // Idem: ook bewaren wanneer de vaste last intussen opgezegd is. Een koppeling
        // mag nooit stil verdwijnen — het scherm zegt dan dat de kost gestopt is, en
        // jij beslist of het doel weg mag.
        ...(vasteLastId ? { vasteLastId } : {}),
      }),
    )
    if (!gelukt) return
    // Bij een NIEUW doel blijft 'bewerken' null, dus de useEffect hierboven draait
    // niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en maakt een
    // tweede klik hetzelfde doel nog eens aan.
    if (!bewerken) leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldgroep">
        <label className="label-caps" htmlFor="doelnaam">
          {t('Doelnaam')}
        </label>
        <input id="doelnaam" placeholder={t('Bv. Communie Kind 1')} value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="doelbedrag">
            {t('Doelbedrag (€)')}
          </label>
          <input id="doelbedrag" inputMode="decimal" placeholder="0,00" value={doelbedrag} onChange={(e) => setDoelbedrag(e.target.value)} />
        </div>
        {!gekoppeldeRekeningId && (
          <div className="veldgroep">
            <label className="label-caps" htmlFor="huidigbedrag">
              {t('Huidig bedrag (€)')}
            </label>
            <input id="huidigbedrag" inputMode="decimal" placeholder="0,00" value={huidig} onChange={(e) => setHuidig(e.target.value)} />
          </div>
        )}
      </div>

      {/* ⚠ Alleen wanneer er iets te kiezen valt (ronde 74). Een lege keuzelijst met
          "Geen" erin is een veld dat een vraag stelt die niemand kan beantwoorden —
          dezelfde regel als bij "Voor wie is dit doel?" hieronder. */}
      {(vasteLasten.length > 0 || ontbrekendeKoppeling) && (
        <div className="veldgroep">
          <label className="label-caps" htmlFor="doelvastelast">
            {t('Waarvoor spaar je? (optioneel)')}
          </label>
          <select
            id="doelvastelast"
            value={vasteLastId}
            aria-describedby={uitlegId}
            onChange={(e) => kiesVasteLast(e.target.value)}
          >
            <option value="">{t('Voor niets in het bijzonder')}</option>
            {vasteLasten.map((p) => (
              <option key={p.id} value={p.id}>
                {p.omschrijving}
              </option>
            ))}
            {ontbrekendeKoppeling && (
              <option value={vasteLastId}>
                {bewerken?.vasteLastId === vasteLastId ? t('De kost waaraan dit doel hangt') : t('Onbekende kost')}
              </option>
            )}
          </select>
          <p id={uitlegId} className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
            {ontbrekendeKoppeling
              ? t('Dit doel hangt aan een kost die niet meer in je lijst staat, of die niet meer om vooraf sparen vraagt. Kies "Voor niets in het bijzonder" om de koppeling los te maken.')
              : gekozenLast
              ? vervaldag
                ? t('{naam} kost {bedrag} en valt de volgende keer op {datum}. Zolang dit doel eraan hangt, vraagt Budget er niet meer apart geld voor opzij te zetten.', {
                    naam: gekozenLast.omschrijving,
                    bedrag: formatEuro(Math.abs(gekozenLast.bedrag)),
                    datum: dagJaar(vervaldag),
                  })
                : t('{naam} kost {bedrag}, maar er komt geen betaling meer.', {
                    naam: gekozenLast.omschrijving,
                    bedrag: formatEuro(Math.abs(gekozenLast.bedrag)),
                  })
              : t('Hang dit doel aan een vaste last die niet elke maand valt — een jaarpremie bijvoorbeeld. Dan weet de app waarvoor je spaart en vraagt ze het geld geen tweede keer.')}
          </p>
        </div>
      )}

      <div className="veldgroep">
        <label className="label-caps" htmlFor="doelrekening">
          {t('Gekoppelde rekening')}
        </label>
        <select id="doelrekening" value={gekoppeldeRekeningId} onChange={(e) => setGekoppeld(e.target.value)}>
          <option value="">{t('Geen — manueel bijhouden')}</option>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {rekeningLabel(r)}
            </option>
          ))}
        </select>
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="doeldatum">
            {t('Doeldatum (optioneel)')}
          </label>
          <input id="doeldatum" type="date" value={doeldatum} onChange={(e) => setDoeldatum(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="maandbedrag">
            {t('Maandelijks streefbedrag (€, optioneel)')}
          </label>
          <input id="maandbedrag" inputMode="decimal" placeholder="0,00" value={maandbedrag} onChange={(e) => setMaandbedrag(e.target.value)} />
        </div>
      </div>

      {heeftKiesbareLeden(gezinsleden, persoonId) && (
        <GezinslidKiezer
          label={t('Voor wie is dit doel?')}
          waarde={persoonId}
          onKies={setPersoonId}
          gezinsleden={gezinsleden}
        />
      )}

      {/* Dezelfde icoon- en kleurkiezer als bij categorieën: één plek waar je
          kiest hoe iets eruitziet, met de kleuren van de app zelf. */}
      <IcoonKleurKiezer
        icoon={icoon}
        kleur={kleur}
        onIcoon={setIcoon}
        onKleur={setKleur}
        naam={naam}
        idVoorvoegsel="spaardoel"
        voorbeeldTekst={t('Zo verschijnt dit doel straks in de lijst.')}
      />

      <div className="knoprij">
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className="knop knop-primair"
        >
          {bewerken ? t('Doel wijzigen') : t('Doel toevoegen')}
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
