import { memo, useCallback, useId, useMemo, useRef, useState } from 'react'
import type { Categorie, Rekening, Transactie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { leesTekstbestand, lijktOpCsv, raadScheider, splitsCsv, zonderRommelregels, type Scheider } from '../utils/csv'
import {
  bouwKandidaten,
  dubbelsElders,
  formaatSleutel,
  heeftKoprij,
  markeerDubbels,
  raadKolommen,
  type Kandidaat,
  type Kolommen,
  type Kolomrol,
} from '../utils/bankimport'
import { voorstelCategorie, type HandelaarIndex } from '../utils/categorieVoorstel'
import { CategorieKiezer } from './CategorieKiezer'
import { UitlegBlok } from './UitlegBlok'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { formatEuro } from '../utils/format'
import { dagKort } from '../utils/datum'
import { Bedrag, EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { useT, type Vertaler } from '../i18n'
import { rekeningLabel, standaardRekening } from '../utils/rekening'

// Je bankuittreksel inlezen.
//
// Dit is de functie die de app van karakter verandert: van iets dat je bijhoudt
// naar iets dat bijgehouden wordt. Alles gebeurt op je eigen toestel — het bestand
// wordt gelezen in het geheugen van de browser en gaat nergens heen.
//
// De opbouw is bewust drie stappen onder elkaar in plaats van een assistent met
// "volgende"-knoppen: je ziet zo altijd waar je vandaan komt, en een correctie in
// stap 2 werkt meteen door in stap 3.

const ROLLEN: { rol: Kolomrol; label: string }[] = [
  { rol: 'negeren', label: 'niet gebruiken' },
  { rol: 'datum', label: 'Datum' },
  { rol: 'omschrijving', label: 'Omschrijving' },
  { rol: 'tegenpartij', label: 'Tegenpartij' },
  { rol: 'mededeling', label: 'Mededeling' },
  { rol: 'bedrag', label: 'Bedrag' },
  { rol: 'bedrag-af', label: 'Bedrag af (debet)' },
  { rol: 'bedrag-bij', label: 'Bedrag bij (credit)' },
]

// De onthouden kolomkeuze leeft in localStorage en niet in het gebeurtenislogboek.
// Reden: het zegt niets over jouw geld, alleen iets over de vorm van een bestand
// dat op dít toestel binnenkomt. Het hoort dus niet thuis in een back-up die je
// jaren bijhoudt — en het niet bewaren zou betekenen dat je élke maand opnieuw
// dezelfde vier kolommen aanduidt.
const OPSLAG_VOORVOEGSEL = 'fk_importkolommen_'

function laadKolomkeuze(sleutel: string): Kolommen | null {
  try {
    const ruw = localStorage.getItem(OPSLAG_VOORVOEGSEL + sleutel)
    if (!ruw) return null
    const gelezen: unknown = JSON.parse(ruw)
    if (!Array.isArray(gelezen)) return null
    const geldig = ROLLEN.map((r) => r.rol)
    if (!gelezen.every((r) => typeof r === 'string' && geldig.includes(r as Kolomrol))) return null
    return gelezen as Kolommen
  } catch {
    // localStorage niet beschikbaar of onleesbaar: dan raden we gewoon opnieuw.
    return null
  }
}

function bewaarKolomkeuze(sleutel: string, kolommen: Kolommen): void {
  try {
    localStorage.setItem(OPSLAG_VOORVOEGSEL + sleutel, JSON.stringify(kolommen))
  } catch {
    // Vol of geweigerd: niet erg, dan raadt de app volgende keer opnieuw.
  }
}

// Hoeveel regels we in één keer tonen. Alles tekenen kan: vijfduizend `<li>` met
// evenveel vinkjes maakt élke tik traag, want de hele lijst wordt hertekend. Wat
// niet zichtbaar is, wordt wél gewoon mee ingelezen — dat staat er ook bij.
const VENSTER = 200

/** Zegt in één regel wat er aan de overgeslagen regels mankeerde. */
function redenTekst(t: Vertaler, stuk: Kandidaat[]): string {
  const zonderDatum = stuk.filter((k) => k.probleem === 'geen-datum').length
  const zonderBedrag = stuk.length - zonderDatum
  const delen: string[] = []
  if (zonderDatum > 0) delen.push(t('{n}× geen datum gevonden', { n: zonderDatum }))
  if (zonderBedrag > 0) delen.push(t('{n}× geen bedrag gevonden', { n: zonderBedrag }))
  return t('{n} regels overgeslagen: {redenen}.', { n: stuk.length, redenen: delen.join(', ') })
}

// Eén rij apart, en gememoïseerd: zonder dit hertekent élk vinkje de volledige
// lijst, en dat is op een telefoon meteen een seconde wachten per tik.
const ImportRij = memo(function ImportRij({
  kandidaat,
  aan,
  categorieNaam,
  onSchakel,
  t,
}: {
  kandidaat: Kandidaat
  aan: boolean
  categorieNaam: string | undefined
  onSchakel: (k: Kandidaat) => void
  t: Vertaler
}) {
  const k = kandidaat
  return (
    <li className="rij" style={{ flexWrap: 'wrap' }}>
      {/* Het vinkje zit in een label dat de hele rij dekt: aanvinken is hier de
          hoofdhandeling en die doe je tientallen keren na elkaar op een telefoon,
          dus een raakvlak van 18 px volstaat niet. */}
      <label
        className="rij-midden"
        style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          className="tx-vinkje"
          checked={aan}
          onChange={() => onSchakel(k)}
          aria-label={t('Neem {oms} van {datum} mee', { oms: k.omschrijving, datum: k.datum })}
        />
        <span className="rij-midden">
          <span className="rij-titel">
            {k.omschrijving}
            {k.lijktOp && (
              <>
                {' '}
                <span className="badge badge-open badge-mini" title={t('Deze boeking staat er waarschijnlijk al')}>
                  {t('lijkt al geboekt')}
                </span>
              </>
            )}
          </span>
          <span className="rij-meta">
            {dagKort(k.datum)}
            {categorieNaam ? ` · ${categorieNaam}` : ''}
          </span>
        </span>
      </label>
      <Bedrag centen={k.bedrag} richting="auto" />
    </li>
  )
})

type Bestand = {
  naam: string
  scheider: Scheider
  kop: string[] | null
  gegevens: string[][]
  sleutel: string
  herkend: boolean
  /** Regels bovenaan die niet bij de tabel hoorden (rekeninginfo van de bank). */
  overgeslagen: number
}

export function ImportSectie({
  rekeningen,
  transacties,
  categorieen,
  handelaarIndex,
  onImporteer,
  onNaarRekeningen,
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  categorieen: Categorie[]
  handelaarIndex: HandelaarIndex
  onImporteer: (nieuwe: Transactie[]) => Promise<void> | void
  /** De eerste stap wanneer er nog geen rekening is (ronde 66). Optioneel. */
  onNaarRekeningen?: () => void
}) {
  const { t } = useT()
  const [bestand, setBestand] = useState<Bestand | null>(null)
  const [kolommen, setKolommen] = useState<Kolommen>([])
  const [rekeningId, setRekeningId] = useState(() => standaardRekening(rekeningen))
  const [keuze, setKeuze] = useState<Map<string, boolean>>(new Map())
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const [klaarMet, setKlaarMet] = useState(0)
  const [toon, setToon] = useState(VENSTER)
  // Eén categorie voor alle regels waarvoor de app zelf niets voorstelt. Bij een
  // eerste import kent ze nog geen enkele winkel, en dan is alles categorieloos.
  const [restCategorie, setRestCategorie] = useState('')
  const redenId = useId()
  // Twee keer tikken op "Inlezen" mag geen twee reeksen boekingen maken. Een ref,
  // want state is pas na een hertekening bijgewerkt en twee snelle tikken zitten
  // binnen datzelfde beeldje.
  const bezigRef = useRef(false)

  async function kiesBestand(f: File) {
    setFout('')
    setKlaarMet(0)
    try {
      const tekst = await leesTekstbestand(f)
      const scheider = raadScheider(tekst)
      const alleRijen = splitsCsv(tekst, scheider)
      if (alleRijen.length === 0) {
        setFout(t('Dit bestand bevat geen regels.'))
        setBestand(null)
        return
      }
      if (!lijktOpCsv(tekst, alleRijen)) {
        setFout(
          t('Dit lijkt geen CSV-bestand. Kies bij je bank de export als CSV — een pdf of een Excel-bestand kan Kompal niet lezen.'),
        )
        setBestand(null)
        return
      }
      // Regels die niet bij de tabel horen (de rekeninginfo die banken bovenaan
      // zetten) vallen hier weg. Anders telde de app één kolom en kon je in het
      // scherm niet eens de juiste kolom aanduiden.
      const rijen = zonderRommelregels(alleRijen)
      const overgeslagen = alleRijen.length - rijen.length
      const metKop = heeftKoprij(rijen)
      const kop = metKop ? rijen[0] : null
      const gegevens = metKop ? rijen.slice(1) : rijen
      if (gegevens.length === 0) {
        setFout(t('Dit bestand bevat alleen kolomnamen en geen boekingen.'))
        setBestand(null)
        return
      }
      const sleutel = formaatSleutel(kop, gegevens)
      const onthouden = laadKolomkeuze(sleutel)
      // Een onthouden keuze telt alleen als ze bij dit bestand past: heeft de bank
      // er een kolom bij gezet, dan raden we liever opnieuw dan de verkeerde kolom
      // als bedrag te lezen.
      const passend = onthouden && onthouden.length === gegevens[0].length ? onthouden : null
      setBestand({ naam: f.name, scheider, kop, gegevens, sleutel, herkend: passend !== null, overgeslagen })
      setKolommen(passend ?? raadKolommen(kop, gegevens))
      setKeuze(new Map())
      setToon(VENSTER)
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e))
      setBestand(null)
    }
  }

  function zetKolom(index: number, rol: Kolomrol) {
    setKolommen((oud) => {
      const nieuw = [...oud]
      // Elke rol maar één keer: duid je een tweede kolom als "Bedrag" aan, dan is
      // de eerste dat niet meer. Anders zou stil de laatste winnen.
      if (rol !== 'negeren') {
        for (let i = 0; i < nieuw.length; i++) if (nieuw[i] === rol) nieuw[i] = 'negeren'
      }
      nieuw[index] = rol
      if (bestand) bewaarKolomkeuze(bestand.sleutel, nieuw)
      return nieuw
    })
  }

  const kandidaten: Kandidaat[] = useMemo(() => {
    if (!bestand) return []
    return markeerDubbels(bouwKandidaten(bestand.gegevens, kolommen), transacties, rekeningId)
  }, [bestand, kolommen, transacties, rekeningId])

  const bruikbaar = kandidaten.filter((k) => !k.probleem)
  const stuk = kandidaten.filter((k) => k.probleem)

  // Staan deze regels misschien al op een ándere rekening? De gewone
  // dubbelherkenning kijkt alleen binnen de gekozen rekening en is dus blind voor
  // precies de fout die ze zou moeten vangen (ronde 65).
  const elders = useMemo(
    () => dubbelsElders(kandidaten, transacties, rekeningId),
    [kandidaten, transacties, rekeningId],
  )
  // Hetzelfde volledige label als in het keuzemenu erboven: twee rekeningen die
  // allebei "Betaalrekening" heten zijn met de kale naam niet uit elkaar te houden,
  // en dan wijst deze zin naar geen van beide. Staat de dubbel op een GEARCHIVEERDE
  // rekening, dan zit die niet in deze lijst en kennen we haar naam niet — dan
  // liever "een andere rekening" dan een zin met een gat erin.
  const eldersRekening = elders ? rekeningen.find((r) => r.id === elders.rekeningId) : undefined
  const eldersNaam = elders ? (eldersRekening ? rekeningLabel(eldersRekening) : t('een andere rekening')) : ''

  // Standaard staat alles aan behálve wat al geboekt lijkt. `keuze` bevat alleen
  // wat de gebruiker ZELF anders gezet heeft — zo blijft zijn beslissing staan
  // wanneer de lijst opnieuw berekend wordt (bv. omdat hij een kolom corrigeert),
  // en verandert het standaardgedrag mee met de nieuwe dubbelherkenning.
  const aan = useCallback(
    (k: Kandidaat) => keuze.get(k.sleutel) ?? !k.lijktOp,
    [keuze],
  )

  function schakel(k: Kandidaat) {
    setKeuze((oud) => {
      const nieuw = new Map(oud)
      nieuw.set(k.sleutel, !aan(k))
      return nieuw
    })
  }

  /** Alles aan of alles uit. Bij tweehonderd regels is één voor één geen optie. */
  function zetAlles(waarde: boolean) {
    setKeuze(new Map(bruikbaar.map((k) => [k.sleutel, waarde])))
  }

  /** Alleen de vermoedelijke dubbels uit — de gewoonste correctie van allemaal. */
  function zetDubbelsUit() {
    setKeuze((oud) => {
      const nieuw = new Map(oud)
      for (const k of bruikbaar) if (k.lijktOp) nieuw.set(k.sleutel, false)
      return nieuw
    })
  }

  const gekozen = bruikbaar.filter(aan)
  const rekening = rekeningen.find((r) => r.id === rekeningId)
  const kanInlezen = gekozen.length > 0 && Boolean(rekening) && !bezig
  const dubbels = bruikbaar.filter((k) => k.lijktOp).length
  const zonderVoorstel = gekozen.filter((k) => !voorstelCategorie(k.omschrijving, handelaarIndex)).length
  const zichtbaar = bruikbaar.slice(0, toon)

  // De samenvatting die je op een uittreksel wil kunnen nakijken vóór je op de knop
  // duwt: hoeveel, van wanneer tot wanneer, en hoeveel er netto beweegt.
  const periode = useMemo(() => {
    const datums = gekozen.map((k) => k.datum).sort()
    return {
      van: datums[0] ?? '',
      tot: datums[datums.length - 1] ?? '',
      som: gekozen.reduce((s, k) => s + k.bedrag, 0),
    }
  }, [gekozen])

  // De categorienamen één keer per lijst berekenen in plaats van per hertekening
  // per rij: `voorstelCategorie` liep anders duizenden keren per tik.
  const catNaamVan = useMemo(() => {
    const kaart = new Map<string, string | undefined>()
    for (const k of zichtbaar) {
      const voorstel = voorstelCategorie(k.omschrijving, handelaarIndex)
      kaart.set(k.sleutel, voorstel ? labelVanCategorie(voorstel, categorieen) : undefined)
    }
    return kaart
  }, [zichtbaar, handelaarIndex, categorieen])

  async function lees() {
    if (!kanInlezen || bezigRef.current) return
    bezigRef.current = true
    setBezig(true)
    setFout('')
    try {
      // Eén tijdstip voor de hele reeks, oplopend per regel: zo staan ze in de
      // lijst in dezelfde volgorde als in je uittreksel.
      const nu = Date.now()
      const stempel = (i: number) => new Date(nu + i).toISOString()
      const nieuwe: Transactie[] = gekozen.map((k, i) => {
        const voorstel = voorstelCategorie(k.omschrijving, handelaarIndex)
        return {
          id: nieuwId(),
          datum: k.datum,
          omschrijving: k.omschrijving,
          bedrag: k.bedrag,
          rekeningId,
          // Zonder invoertijdstip belanden deze boekingen ÓNDER je handmatige
          // boekingen van dezelfde dag (zie utils/sorteer.ts) — precies omgekeerd
          // aan wat je wil zien vlak na een import.
          ingevoerdOp: stempel(i),
          ...(voorstel ? { categorieId: voorstel } : restCategorie ? { categorieId: restCategorie } : {}),
        }
      })
      await onImporteer(nieuwe)
      setKlaarMet(nieuwe.length)
      setBestand(null)
      setKolommen([])
      setKeuze(new Map())
    } catch (e) {
      // Een mislukte opslag mag nooit stil gebeuren: je zou denken dat het gelukt
      // is en je uittreksel weggooien.
      setFout(e instanceof Error ? e.message : String(e))
    } finally {
      bezigRef.current = false
      setBezig(false)
    }
  }

  const kolomnaam = (i: number) => bestand?.kop?.[i]?.trim() || t('Kolom {n}', { n: i + 1 })
  const heeftDatum = kolommen.includes('datum')
  const heeftBedrag = kolommen.includes('bedrag') || kolommen.includes('bedrag-af') || kolommen.includes('bedrag-bij')

  return (
    <div className="stapel">
      <Kaart
        titel={t('Bankuittreksel inlezen')}
        bijschrift={t('Kies het CSV-bestand dat je bij je bank downloadt. Het blijft op dit toestel — er wordt niets verstuurd.')}
      >
        {/* ⚠ RONDE 66: dit was een doodlopend scherm — de zin zei wat je moest doen,
            maar er stond nergens een weg erheen. */}
        {rekeningen.length === 0 ? (
          <Leeg
            actie={
              onNaarRekeningen ? (
                <EersteStapKnop onClick={onNaarRekeningen}>{t('Maak een rekening aan')}</EersteStapKnop>
              ) : undefined
            }
          >
            {t('Maak eerst een rekening aan; een boeking moet ergens op staan.')}
          </Leeg>
        ) : (
          <>
            <div className="veldgroep">
              <label className="label-caps" htmlFor="imp-bestand">{t('Bestand')}</label>
              <input
                id="imp-bestand"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void kiesBestand(f)
                  // Leegmaken, zodat hetzelfde bestand opnieuw kiezen ook werkt.
                  e.target.value = ''
                }}
              />
            </div>
            {/* ⚠ RONDE 66. Dit is de beste uitleg in de hele app, en ze stond in een
                kale, DICHTE `<details>` met een VRAAG als opschrift. Wie niet weet
                dát hij het niet weet, klapt zo'n vraag niet open. Nu is het het
                gewone uitlegblok van de app, met een mededeling als opschrift — en
                het staat OPEN zolang er nog geen énkele boeking in de app staat, want
                dan is dit precies wat je zoekt. Wie al boekingen heeft, heeft de weg
                naar zijn bank al gevonden of tikt liever met de hand in. */}
            <UitlegBlok titel={t('Zo vind je dat bestand bij je bank')} open={transacties.length === 0}>
              <p>
                {t('In je bankapp of op de website van je bank zoek je bij je rekeninguittreksels naar "exporteren" of "downloaden". Kies daar het formaat CSV (soms staat er "CSV/Excel"). Kompal kan geen pdf lezen — dat is een afdruk, geen bestand met cijfers erin.')}
              </p>
            </UitlegBlok>
            <div className="veldgroep">
              <label className="label-caps" htmlFor="imp-rekening">{t('Op welke rekening?')}</label>
              {/* ⚠ RONDE 65. Hier stond kaal {r.naam}. Dit was het ENIGE
                  keuzemenu in de app dat `rekeningLabel` niet gebruikte, dus twee
                  rekeningen die allebei "Betaalrekening" heten waren hier niet uit
                  elkaar te houden — op precies het scherm waar een misgreep een
                  heel uittreksel op het verkeerde boekje zet. */}
              <select
                id="imp-rekening"
                value={rekeningId}
                onChange={(e) => setRekeningId(e.target.value)}
                // Zo hoort wie later opnieuw in dit menu belandt de waarschuwing
                // nog steeds; een losse `role="alert"` spreekt maar één keer.
                aria-describedby={elders ? 'imp-elders' : undefined}
              >
                {rekeningen.map((r) => (
                  <option key={r.id} value={r.id}>
                    {rekeningLabel(r)}
                  </option>
                ))}
              </select>
              {/* Altijd aanwezig, leeg wanneer er niets te melden is: een
                  `role="status"` die pas MÉT zijn tekst verschijnt, wordt door
                  sommige schermlezers overgeslagen. En het is een vermoeden, geen
                  fout — dus geen `foutregel` en geen `alert`. */}
              <p id="imp-elders" role="status" className="rij-meta" style={{ margin: 0, color: 'var(--negative)' }}>
                {elders
                  ? t('Let op: {n} van deze regels staan al op {rekening}. Staat hierboven wel de juiste rekening?', {
                      n: elders.aantal,
                      rekening: eldersNaam,
                    })
                  : ''}
              </p>
            </div>
            {fout && (
              <p role="alert" className="rij-meta" style={{ color: 'var(--negative)' }}>
                {fout}
              </p>
            )}
            {klaarMet > 0 && (
              <p role="status" className="rij-meta">
                {t('{n} boeking(en) ingelezen.', { n: klaarMet })}
              </p>
            )}
          </>
        )}
      </Kaart>

      {bestand && (
        <Kaart
          titel={t('Kloppen de kolommen?')}
          bijschrift={
            bestand.herkend
              ? t('Dit formaat kennen we van de vorige keer — de kolommen staan al goed.')
              : t('Kompal heeft geraden. Klopt er iets niet, zet het dan hier recht; de volgende keer onthoudt ze het.')
          }
        >
          <p className="rij-meta" role="status" style={{ margin: 0 }}>
            {t('{naam} · {n} regels', { naam: bestand.naam, n: bestand.gegevens.length })}
            {bestand.overgeslagen > 0
              ? ` · ${t('{n} regel(s) bovenaan overgeslagen (geen boekingen)', { n: bestand.overgeslagen })}`
              : ''}
          </p>
          {/* Eén rij per kolom in plaats van een brede tabel: op een telefoon past
              een tabel van tien kolommen nooit, en dit leest ook op een breed
              scherm prima. Onder elke keuze staan twee echte waarden uit het
              bestand, want de kolomnaam alleen zegt vaak niets. */}
          <ul className="lijst">
            {kolommen.map((rol, i) => (
              <li key={i} className="rij" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="rij-midden">
                  <span className="rij-titel">{kolomnaam(i)}</span>
                  <span className="rij-meta">
                    {/* Afkappen: één cel uit een verkeerd gekozen bestand kan
                        tienduizenden tekens lang zijn, en dan loopt de pagina
                        zijwaarts uit haar voegen. */}
                    {bestand.gegevens
                      .slice(0, 2)
                      .map((r) => (r[i] ?? '').trim().slice(0, 40))
                      .filter((v) => v !== '')
                      .join(' · ')
                      .slice(0, 90) || t('(leeg)')}
                  </span>
                </span>
                <select
                  aria-label={t('Wat staat er in de kolom {naam}?', { naam: kolomnaam(i) })}
                  value={rol}
                  onChange={(e) => zetKolom(i, e.target.value as Kolomrol)}
                  style={{ maxWidth: 220 }}
                >
                  {ROLLEN.map((r) => (
                    <option key={r.rol} value={r.rol}>
                      {t(r.label)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          {(!heeftDatum || !heeftBedrag) && (
            <p role="alert" className="rij-meta" style={{ color: 'var(--negative)' }}>
              {!heeftDatum
                ? t('Duid aan welke kolom de datum bevat.')
                : t('Duid aan welke kolom het bedrag bevat.')}
            </p>
          )}
        </Kaart>
      )}

      {bestand && heeftDatum && heeftBedrag && (
        <Kaart
          titel={t('Nakijken en inlezen')}
          bijschrift={t('Vink aan wat je wil overnemen. Wat al geboekt lijkt, staat standaard uit.')}
        >
          {bruikbaar.length === 0 ? (
            <>
              <Leeg>{t('Met deze kolommen valt er geen enkele boeking te lezen.')}</Leeg>
              {/* Zeggen WAT er mis is, niet alleen dát er iets mis is. */}
              {stuk.length > 0 && (
                <p className="rij-meta" style={{ margin: 0 }}>
                  {redenTekst(t, stuk)}
                </p>
              )}
            </>
          ) : (
            <>
              {/* De knop staat BOVEN de lijst, samen met de samenvatting. Bij
                  driehonderd regels moest je anders eerst langs alles scrollen wat
                  je niet zocht, en verscheen een foutmelding bovenaan de pagina
                  terwijl je onderaan stond te duwen. */}
              {/* ⚠ RONDE 66, slotronde: met nul aangevinkte regels heeft dit sjabloon
                  geen datums om in te vullen, en las je letterlijk "0 boekingen van
                  t/m , samen € 0,00" — een zin met gaten. Dat gebeurt echt: herkent de
                  app élke regel als vermoedelijke dubbel, dan staat er niets aan. */}
              <p className="rij-titel" style={{ margin: 0 }}>
                {gekozen.length === 0
                  ? bruikbaar.length > 0 && dubbels === bruikbaar.length
                    ? t('Elke regel uit dit bestand staat al in de app. Vink zelf aan wat je tóch wil inlezen.')
                    : t('Niets aangevinkt. Vink aan wat je wil inlezen.')
                  : t('{n} boekingen van {van} t/m {tot}, samen {saldo}', {
                      n: gekozen.length,
                      van: dagKort(periode.van),
                      tot: dagKort(periode.tot),
                      saldo: formatEuro(periode.som),
                    })}
              </p>
              <div className="knoprij">
                <button
                  type="button"
                  className="knop knop-primair"
                  aria-disabled={!kanInlezen}
                  aria-busy={bezig}
                  aria-describedby={kanInlezen ? undefined : redenId}
                  onClick={() => void lees()}
                >
                  {bezig ? t('bezig…') : t('Lees {n} boeking(en) in', { n: gekozen.length })}
                </button>
                <button type="button" className="knop knop-ghost knop-klein" onClick={() => zetAlles(true)}>
                  {t('Alles aan')}
                </button>
                <button type="button" className="knop knop-ghost knop-klein" onClick={() => zetAlles(false)}>
                  {t('Alles uit')}
                </button>
                {dubbels > 0 && (
                  <button type="button" className="knop knop-ghost knop-klein" onClick={zetDubbelsUit}>
                    {t('Zet de {n} vermoedelijke dubbels uit', { n: dubbels })}
                  </button>
                )}
              </div>
              {!kanInlezen && !bezig && (
                <p id={redenId} className="rij-meta">
                  {t('Vink minstens één boeking aan.')}
                </p>
              )}
              {fout && (
                <p role="alert" className="rij-meta" style={{ color: 'var(--negative)' }}>
                  {t('Het inlezen is niet gelukt. Je selectie staat er nog, dus je kan het opnieuw proberen.')}{' '}
                  {fout}
                </p>
              )}
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('Ze komen op {rekening} te staan. Categorieën worden voorgesteld op basis van wat je eerder boekte bij dezelfde winkel.', {
                  rekening: rekening ? rekeningLabel(rekening) : '',
                })}
              </p>

              {/* Bij een eerste import kent de app nog geen enkele winkel, en dan
                  komt alles categorieloos binnen — waarna je elke boeking apart
                  moet openen. Eén categorie voor de rest lost dat in één keer op. */}
              {zonderVoorstel > 0 && (
                <div className="veldgroep">
                  <span className="label-caps">
                    {t('Categorie voor de {n} regels zonder voorstel (optioneel)', { n: zonderVoorstel })}
                  </span>
                  <CategorieKiezer
                    waarde={restCategorie || undefined}
                    onKies={(id) => setRestCategorie(id ?? '')}
                    gebruikerCategorieen={categorieen}
                  />
                </div>
              )}

              <ul className="lijst">
                {zichtbaar.map((k) => (
                  <ImportRij
                    key={k.sleutel}
                    kandidaat={k}
                    aan={aan(k)}
                    categorieNaam={catNaamVan.get(k.sleutel)}
                    onSchakel={schakel}
                    t={t}
                  />
                ))}
              </ul>

              {/* Een venster op de lijst. Vijfduizend regels tekenen kost op een
                  telefoon seconden per vinkje, en niemand leest ze toch één voor
                  één na. */}
              {bruikbaar.length > zichtbaar.length && (
                <div className="knoprij">
                  <button type="button" className="knop knop-secundair knop-klein" onClick={() => setToon((n) => n + VENSTER)}>
                    {t('Toon {n} regels meer ({rest} nog niet getoond)', {
                      n: Math.min(VENSTER, bruikbaar.length - zichtbaar.length),
                      rest: bruikbaar.length - zichtbaar.length,
                    })}
                  </button>
                </div>
              )}
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('{gekozen} van {totaal} geselecteerd', { gekozen: gekozen.length, totaal: bruikbaar.length })}
                {bruikbaar.length > zichtbaar.length
                  ? ` · ${t('de eerste {n} zijn zichtbaar, maar alles wat aanstaat wordt ingelezen', { n: zichtbaar.length })}`
                  : ''}
              </p>

              {/* Regels die niet gelezen konden worden noemen we bij naam. Ze stil
                  weglaten zou betekenen dat je uittreksel en je app verschillen
                  zonder dat iemand het merkt. */}
              {stuk.length > 0 && (
                <p className="rij-meta" style={{ margin: 0 }}>
                  {redenTekst(t, stuk)}
                </p>
              )}
            </>
          )}
        </Kaart>
      )}
    </div>
  )
}
