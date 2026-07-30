import { useMemo, useRef, useState } from 'react'
import type {
  Aflossing,
  Dossier,
  Frequentie,
  Gezinsrol,
  Kind,
  Lening,
  Overboeking,
  Rekening,
  TerugkerendePost,
  Transactie,
  Waardering,
} from '../data/schema'
import { KLASSIEKE_VASTE_KOSTEN, SLUIPENDE_KOSTEN, type Kostvoorstel } from '../data/opstelling'
import { nieuwId } from '../data/sync/id'
import { Balk, Kaart, Leeg, PaginaKop, Stat } from '../ui/basis'
import { Subtabs, type Subtab } from '../ui/Subtabs'
import { RekeningFormulier } from './RekeningFormulier'
import { LeningFormulier } from './LeningFormulier'
import { KinderenSectie } from './KinderenSectie'
import { DossierFormulier } from './DossierFormulier'
import { bepaalBuffer } from '../utils/buffer'
import { nettoVermogen } from '../utils/vermogen'
import { openstaandKapitaal } from '../utils/lening'
import { saldoVanRekening, totaalSaldoVan } from '../utils/saldo'
import { isGestopt, maandbedrag, verschuifMaand, intervalVan } from '../utils/vastelast'
import { kaartbedragUitOpslag } from '../utils/kredietkaart'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { standaardRekening } from '../utils/rekening'
import { huidigeMaand, vandaag } from '../utils/datum'
import { TALEN, useT, vertaal } from '../i18n'
import type { Vertaler } from '../i18n'

// DE OPSTELLING (ronde 39) — één begeleid scherm dat je hele situatie opneemt.
//
// Het doel is NIET je installeren. Het doel is dat je binnen tien minuten één
// concreet, verrassend feit ziet — en dat feit mag géén transacties nodig hebben.
// Wie eerst drie maanden boekingen moet ingeven vóór er iets zinnigs op het scherm
// verschijnt, komt niet terug. Daarom staat de kaart "Dit is je situatie" BOVENAAN
// en groeit ze live mee terwijl je invult: je ziet je eigen beeld ontstaan.
//
// Drie regels waaraan dit scherm zich houdt:
//
//  1. GEEN EENMALIGE WIZARD. In maand drie ontdek je een vergeten abonnement; dan
//     moet dit scherm gewoon opnieuw opengaan, met alles wat je al hebt.
//  2. ELK BLOK IS OVERSLAANBAAR. De kaart bovenaan zegt wat je mist; ze houdt je
//     nergens tegen.
//  3. HET DIRIGEERT, HET DUPLICEERT NIET. Elk blok gebruikt hetzelfde formulier en
//     dezelfde rekenkern als het gewone scherm. Er komt geen tweede waarheid bij.

export type OpstellingBlok =
  | 'rekeningen'
  | 'openstaand'
  | 'later'
  | 'vast'
  | 'sluipend'
  | 'gezin'
  | 'delen'

/** De rekeningtypes die bij elk blok horen. Eén plek, zodat de tellingen kloppen. */
const TYPES_GELD: Rekening['type'][] = ['betaal', 'spaar', 'cash']
const TYPES_LATER: Rekening['type'][] = ['effecten', 'termijn']

/** De categorieën van de sluipende kosten, om ze in je vaste lasten terug te vinden. */
const SLUIPENDE_CATEGORIEEN = new Set(SLUIPENDE_KOSTEN.map((k) => k.categorieId))

function isSluipend(post: TerugkerendePost): boolean {
  return post.categorieId !== undefined && SLUIPENDE_CATEGORIEEN.has(post.categorieId)
}

/**
 * Eén regel uit een aanvinklijst: naam, bedrag, en klaar.
 *
 * Bewust zo weinig mogelijk velden. De dag, de rekening en de categorie vult de app
 * in; wie ze wil bijstellen doet dat later op de Budget-pagina. Vraag je hier alles,
 * dan is het geen aanvinklijst meer maar twintig keer hetzelfde formulier.
 */
function KostRegel({
  voorstel,
  t,
  alToegevoegd,
  bezig,
  fout,
  velden,
  volgende,
  onToevoegen,
}: {
  voorstel: Kostvoorstel
  t: Vertaler
  alToegevoegd: boolean
  bezig: boolean
  onToevoegen: (voorstel: Kostvoorstel, centen: number) => Promise<boolean>
  fout: string | null
  velden: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  volgende: string | null
}) {
  const [bedrag, setBedrag] = useState('')
  const centen = invoerNaarCenten(bedrag)
  const geldig = bedrag.trim().length > 0 && Number.isFinite(centen) && centen > 0
  const veldId = `opstelling-${voorstel.sleutel}`

  async function verzend() {
    if (!geldig || bezig) return
    const gelukt = await onToevoegen(voorstel, centen)
    // Alleen leegmaken wanneer het écht gelukt is. Wiste je het veld ook bij een
    // mislukking, dan tikt iemand zonder rekening twintig bedragen in en ziet ze
    // allemaal verdampen zonder te weten waarom.
    if (!gelukt) return
    setBedrag('')
    // De rij verdwijnt niet uit beeld, maar het veld wordt uitgeschakeld — dus de
    // focus zou naar <body> vallen en je zou na élke regel opnieuw van bovenaf naar
    // beneden moeten tabben. Ga daarom door naar het volgende bedragveld.
    if (volgende) velden.current[volgende]?.focus()
  }

  return (
    // `rij-kost` breekt op een telefoon af: naam op de eerste regel, bedrag en knop
    // op de tweede. Naast elkaar houdt de naamkolom op 393 px maar zo'n 55 px over,
    // en dan loopt "Hospitalisatieverzekering" dwars over het invoerveld. De
    // gebruikelijke controle op zijwaarts scrollen ziet dat NIET, want `.lijst`
    // heeft `overflow: hidden` — de tekst wordt afgekapt in plaats van de pagina te
    // verbreden.
    <li className="rij rij-kost">
      <span className="rij-teken" aria-hidden="true">
        {voorstel.icoon}
      </span>
      <div className="rij-midden">
        <label className="rij-titel" htmlFor={veldId}>
          {t(voorstel.naam)}
        </label>
        {voorstel.toelichting && <span className="rij-meta">{t(voorstel.toelichting)}</span>}
        {voorstel.frequentie === 'jaar' && <span className="rij-meta">{t('meestal één keer per jaar')}</span>}
        {fout && (
          <span className="rij-meta" role="alert" style={{ color: 'var(--negative)' }}>
            {fout}
          </span>
        )}
      </div>
      <span className="rij-acties">
        {/* Het veld blijft bestaan wanneer de post er al is — uitgeschakeld. Haalden
            we het weg, dan wees het label naar niets meer en verloor je de focus. */}
        <input
          id={veldId}
          ref={(el) => {
            velden.current[voorstel.sleutel] = el
          }}
          inputMode="decimal"
          placeholder={t('bedrag')}
          className="kost-bedrag"
          disabled={alToegevoegd}
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
          onKeyDown={(e) => {
            // Enter is hier het natuurlijke gebaar: je tikt twintig bedragen na
            // elkaar in en wil daar niet twintig keer voor naar een knop.
            if (e.key === 'Enter') {
              e.preventDefault()
              void verzend()
            }
          }}
        />
        {alToegevoegd ? (
          <span className="badge badge-ok">{t('toegevoegd')}</span>
        ) : (
          <button
            type="button"
            className="knop knop-secundair knop-klein"
            aria-disabled={!geldig || bezig}
            aria-label={t('Voeg {naam} toe', { naam: t(voorstel.naam) })}
            onClick={() => void verzend()}
          >
            {t('Toevoegen')}
          </button>
        )}
      </span>
    </li>
  )
}

/** Een aanvinklijst met een korte uitleg erboven. */
function KostenLijst({
  titel,
  uitleg,
  voorstellen,
  posten,
  t,
  bezig,
  fout,
  onToevoegen,
  onNaarBudget,
}: {
  titel: string
  uitleg: string
  voorstellen: Kostvoorstel[]
  /**
   * De LOPENDE vaste lasten — dezelfde verzameling als de tegels bovenaan gebruiken.
   * Bewust niet álle terugkerende posten: een opgezegd Netflix-abonnement en een
   * terugkerende ínkomst met de omschrijving "Huur" (kotgeld, onderverhuur) zetten
   * anders een regel op "toegevoegd" terwijl de tegel er niets van meetelt — en je
   * kan je huur of je nieuwe abonnement dan niet meer via dit scherm ingeven.
   */
  posten: TerugkerendePost[]
  t: Vertaler
  bezig: boolean
  fout: { sleutel: string; tekst: string } | null
  onToevoegen: (voorstel: Kostvoorstel, centen: number) => Promise<boolean>
  onNaarBudget: () => void
}) {
  const velden = useRef<Record<string, HTMLInputElement | null>>({})
  // Wat is er al? We vergelijken op de OMSCHRIJVING, niet op de categorie: vier
  // streamingdiensten delen dezelfde categorie, dus die zou ze niet uit elkaar
  // houden.
  //
  // En we vergelijken met de naam in ÉLKE taal. De omschrijving die weggeschreven
  // wordt is de vertaalde naam, dus wie de app op Frans zet zag "Huur" niet meer
  // terug onder "Loyer" — en voegde zijn huur een tweede keer toe. Dan staat je
  // huur dubbel in je vaste lasten, zonder één waarschuwing.
  const bestaande = useMemo(
    () => new Set(posten.map((p) => p.omschrijving.trim().toLowerCase())),
    [posten],
  )
  const alToegevoegd = (v: Kostvoorstel) =>
    TALEN.some((taal) => bestaande.has(vertaal(taal.waarde, v.naam).trim().toLowerCase()))

  const gedaan = voorstellen.filter(alToegevoegd).length

  return (
    <Kaart
      titel={titel}
      bijschrift={`${uitleg} ${t('{gedaan} van {totaal} aangevinkt.', { gedaan, totaal: voorstellen.length })}`}
    >
      <ul className="lijst">
        {voorstellen.map((v, i) => {
          // Na een geslaagde toevoeging springt de focus naar het eerstvolgende veld
          // ONDER deze rij dat nog leeg is. Let op de `slice(i + 1)`: zocht je in de
          // hele lijst, dan kwam je altijd bovenaan uit. Wie geen huur betaalt en bij
          // Hypotheek begint, sprong dan terug naar Huur en tikte zijn volgende
          // bedrag dus in het huurveld — een vaste last die hij niet heeft.
          //
          // Staat er niets meer onder, dan blijft de focus waar hij is; van onderaf
          // terugspringen naar boven is even verwarrend.
          const volgende = voorstellen.slice(i + 1).find((o) => !alToegevoegd(o))?.sleutel ?? null
          return (
            <KostRegel
              key={v.sleutel}
              voorstel={v}
              t={t}
              alToegevoegd={alToegevoegd(v)}
              bezig={bezig}
              fout={fout?.sleutel === v.sleutel ? fout.tekst : null}
              velden={velden}
              volgende={volgende}
              onToevoegen={onToevoegen}
            />
          )
        })}
      </ul>
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('Staat het er niet bij? Je kan altijd zelf iets toevoegen op de Budget-pagina.')}{' '}
        <button type="button" className="knop knop-ghost knop-klein" onClick={onNaarBudget}>
          {t('Naar Budget')}
        </button>
      </p>
    </Kaart>
  )
}

export function OpstellingSectie({
  rekeningen,
  transacties,
  overboekingen,
  waarderingen,
  terugkerendePosten,
  leningen,
  aflossingen,
  gezinsleden,
  dossiers,
  onRekening,
  onLening,
  onVastePost,
  onKindToevoegen,
  onKindWijzigen,
  onKindVerwijderen,
  onDossier,
  onNaarPagina,
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  waarderingen: Waardering[]
  terugkerendePosten: TerugkerendePost[]
  leningen: Lening[]
  aflossingen: Aflossing[]
  gezinsleden: Kind[]
  dossiers: Dossier[]
  onRekening: (r: Rekening) => Promise<void> | void
  onLening: (l: Lening) => Promise<void> | void
  onVastePost: (p: TerugkerendePost) => Promise<void> | void
  onKindToevoegen: (naam: string, rol?: Gezinsrol) => void
  onKindWijzigen: (lid: Kind) => void
  onKindVerwijderen: (id: string) => void
  onDossier: (d: Dossier) => Promise<void> | void
  onNaarPagina: (p: 'budget' | 'dossiers' | 'overzicht' | 'rekeningen') => void
}) {
  const { t } = useT()
  const [blok, setBlok] = useState<OpstellingBlok>('rekeningen')
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)
  const [fout, setFout] = useState<{ sleutel: string; tekst: string } | null>(null)

  // Gearchiveerde rekeningen horen niet in de keuzes en niet in de tellingen; ze
  // tellen wél gewoon mee in het vermogen, want dat geld bestaat nog.
  const actieveRekeningen = rekeningen.filter((r) => !r.gearchiveerd)
  const geldRekeningen = actieveRekeningen.filter((r) => TYPES_GELD.includes(r.type ?? 'betaal'))
  const kredietRekeningen = actieveRekeningen.filter((r) => r.type === 'krediet')
  const laterRekeningen = actieveRekeningen.filter((r) => r.type !== undefined && TYPES_LATER.includes(r.type))
  // Een afbetaalde en afgesloten lening staat niet meer "open". `leningstand()` slaat
  // ze over, dus telde het blok Openstaand ze wél mee, dan noemde de tegel Netto
  // vermogen er niets van terwijl het blok "1" toonde — twee definities op één kaart.
  const openLeningen = leningen.filter((l) => !l.afgesloten)

  // De regels in de lijstjes tonen wat er NU staat, niet wat er ooit begon. Toonden
  // we `beginsaldo` en `hoofdsom`, dan sprak een rij van € 20.000 openstaande lening
  // de tegel Netto vermogen tegen bij iemand die er al € 15.000 van afbetaald heeft.
  const saldoNu = (r: Rekening) => saldoVanRekening(r, transacties, overboekingen, waarderingen, vandaag())
  // Gestopte posten tellen nergens meer mee — `bepaalBuffer` doet dat ook, en twee
  // tegels op dezelfde kaart met een verschillende definitie is erger dan geen
  // tegel: "waarvan sluipend" zou dan een bedrag noemen dat niet in het totaal
  // erboven zit.
  const dezeMaand = huidigeMaand()
  const lasten = terugkerendePosten.filter((p) => p.bedrag < 0 && !isGestopt(p, dezeMaand))
  const sluipend = lasten.filter(isSluipend)
  const klassiek = lasten.filter((p) => !isSluipend(p))

  // De cijfers van het slotscherm. Alle vier komen uit bestaande rekenkernen, en
  // geen enkele heeft een transactie nodig — dat is het hele punt.
  const buffer = bepaalBuffer(rekeningen, transacties, overboekingen, terugkerendePosten, waarderingen, vandaag())
  const bezit = totaalSaldoVan(rekeningen, transacties, overboekingen, waarderingen, vandaag())
  const vermogen = nettoVermogen(bezit, leningen, aflossingen)
  const sluipendPerMaand = sluipend.reduce((som, p) => som + -maandbedrag(p), 0)
  // Het jaarbedrag uit de ORIGINELE bedragen, niet uit het afgeronde maandbedrag.
  // Een jaarabonnement van € 100 werd anders € 8,33 × 12 = € 99,96 — vier cent te
  // weinig, en dat is precies het soort cijfer dat nageteld wordt.
  const sluipendPerJaar = sluipend.reduce((som, p) => som + (-p.bedrag * 12) / intervalVan(p), 0)

  const blokken: { id: OpstellingBlok; teken: string; label: string; klaar: boolean; telling: number }[] = [
    { id: 'rekeningen', teken: '🏦', label: t('Je geld'), klaar: geldRekeningen.length > 0, telling: geldRekeningen.length },
    {
      id: 'openstaand',
      teken: '💳',
      label: t('Openstaand'),
      klaar: kredietRekeningen.length + openLeningen.length > 0,
      telling: kredietRekeningen.length + openLeningen.length,
    },
    { id: 'later', teken: '📈', label: t('Voor later'), klaar: laterRekeningen.length > 0, telling: laterRekeningen.length },
    { id: 'vast', teken: '🏠', label: t('Vaste kosten'), klaar: klassiek.length > 0, telling: klassiek.length },
    { id: 'sluipend', teken: '📺', label: t('Sluipende kosten'), klaar: sluipend.length > 0, telling: sluipend.length },
    { id: 'gezin', teken: '👨‍👧', label: t('Je gezin'), klaar: gezinsleden.length > 0, telling: gezinsleden.length },
    { id: 'delen', teken: '🧾', label: t('Delen'), klaar: dossiers.length > 0, telling: dossiers.length },
  ]
  const klaar = blokken.filter((b) => b.klaar).length
  const tabs: Subtab<OpstellingBlok>[] = blokken.map((b) => ({
    id: b.id,
    teken: b.teken,
    label: b.label,
    telling: b.telling,
  }))

  async function voegKostToe(voorstel: Kostvoorstel, centen: number): Promise<boolean> {
    setBezig(true)
    setFout(null)
    setMelding(null)
    try {
      // Alleen ACTIEVE rekeningen: een vaste last aan een afgesloten rekening hangen
      // betekent dat ze nooit als betaald herkend wordt en elke maand achterstallig
      // blijft staan.
      //
      // En bij voorkeur een BETAALrekening. `standaardRekening` geeft de rekening
      // terug waarop je het laatst boekte; deed je dat toevallig op je spaarrekening,
      // dan hingen hier je twintig vaste lasten aan je spaarboekje. Vaste lasten gaan
      // van een betaalrekening (of contant), niet van je spaargeld of je effecten.
      const betaalRekeningen = actieveRekeningen.filter(
        (r) => (r.type ?? 'betaal') === 'betaal' || r.type === 'cash',
      )
      const rekeningId = standaardRekening(betaalRekeningen.length > 0 ? betaalRekeningen : actieveRekeningen)
      if (!rekeningId) {
        setFout({
          sleutel: voorstel.sleutel,
          tekst: t('Maak eerst een rekening aan bij "Je geld" — een vaste kost moet ergens vanaf gaan.'),
        })
        return false
      }
      const frequentie: Frequentie = voorstel.frequentie ?? 'maand'
      await onVastePost({
        id: nieuwId(),
        omschrijving: t(voorstel.naam),
        bedrag: -centen,
        rekeningId,
        // De dag van vandaag, niet de 1e. Met dag 1 stond élke post die je hier
        // invult meteen als ACHTERSTALLIG in je vooruitblik en in het belletje —
        // je doet deze opstelling immers zelden op de eerste van de maand.
        //
        // Eerlijk over de grens: het schema laat hoogstens dag 28 toe (anders bestaat
        // de datum niet in februari). Vul je de opstelling in op de 29e, 30e of 31e,
        // dan ligt dag 28 een paar dagen achter je en telt de vooruitblik de post wél
        // als achterstallig. Dat is dan ook waar: er staat voor deze maand nog geen
        // boeking tegenover.
        dag: Math.min(Number(vandaag().slice(8, 10)), 28),
        categorieId: voorstel.categorieId,
        // Een jaarlijkse post begint pas VOLGENDE maand. We weten de echte
        // vervaldag niet (die vragen we hier bewust niet), en zetten we hem op deze
        // maand, dan valt het volle jaarbedrag meteen in je lopende maand — een
        // autoverzekering van € 620 die er nooit is geweest.
        ...(frequentie !== 'maand'
          ? { frequentie, startMaand: verschuifMaand(huidigeMaand(), 1) }
          : {}),
      })
      // De rekening staat erbij: dit scherm vraagt ze bewust niet, dus zonder deze
      // regel wist je niet waar de app je vaste last aan gehangen heeft.
      const rekeningNaam = actieveRekeningen.find((r) => r.id === rekeningId)?.naam ?? ''
      setMelding(
        t('{naam} toegevoegd: {bedrag}, van {rekening}.', {
          naam: t(voorstel.naam),
          bedrag: formatEuro(centen),
          rekening: rekeningNaam,
        }),
      )
      return true
    } catch {
      setFout({ sleutel: voorstel.sleutel, tekst: t('Toevoegen is niet gelukt. Probeer het opnieuw.') })
      return false
    } finally {
      setBezig(false)
    }
  }

  return (
    <section className="stapel">
      <PaginaKop
        titel={t('Je situatie')}
        bijschrift={t('Breng in kaart wat er vastligt. Loop de blokken door die op jou van toepassing zijn — je mag er elk overslaan en later terugkomen.')}
      />

      {/* Het slotscherm staat BOVENAAN en groeit live mee. Zo zie je je eigen beeld
          ontstaan terwijl je invult, in plaats van pas aan het eind — en geen van
          deze vier cijfers heeft één transactie nodig. */}
      <Kaart titel={t('Dit is je situatie')} data-situatie>
        <div className="tegelrij">
          <Stat label={t('Vaste lasten per maand')}>
            {buffer.vasteLastenPerMaand > 0 ? formatEuro(buffer.vasteLastenPerMaand) : '—'}
          </Stat>
          <Stat label={t('Waarvan sluipend')}>{sluipendPerMaand > 0 ? formatEuro(sluipendPerMaand) : '—'}</Stat>
          <Stat label={t('Zo lang kom je toe')}>
            {buffer.bruikbaar && buffer.maanden !== null
              ? t('{n} maanden', { n: (Math.floor(buffer.maanden * 10) / 10).toString().replace('.', ',') })
              : '—'}
          </Stat>
          <Stat label={t('Netto vermogen')}>
            {rekeningen.length > 0 || leningen.length > 0 ? formatEuro(vermogen) : '—'}
          </Stat>
        </div>

        {/* Een streepje bij "Zo lang kom je toe" is geen fout, maar zonder uitleg
            lijkt het er wel op: het cijfer heeft een spaarrekening of cash nodig (zie
            BUFFERTYPES in utils/buffer.ts). Wie alleen een zichtrekening heeft, zag
            daar anders voor altijd een streepje zonder te weten waarom. */}
        {!buffer.bruikbaar && buffer.vasteLastenPerMaand > 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig. Voeg er een toe bij "Je geld".')}
          </p>
        )}

        {sluipendPerMaand > 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Je sluipende kosten zijn {maand} per maand, oftewel {jaar} per jaar.', {
              maand: formatEuro(sluipendPerMaand),
              jaar: formatEuro(Math.round(sluipendPerJaar)),
            })}
          </p>
        )}

        <Balk label={t('Ingevulde blokken')} fractie={klaar / blokken.length} nu={klaar} max={blokken.length} />
        <p className="rij-meta" style={{ margin: 0 }} role="status">
          {klaar === blokken.length
            ? t('Je hebt alle blokken ingevuld. Je kan hier altijd terugkomen om iets bij te werken.')
            : t('{klaar} van {totaal} blokken ingevuld. Wat je overslaat, kan je later nog aanvullen.', {
                klaar,
                totaal: blokken.length,
              })}
        </p>
        {rekeningen.length > 0 && (
          <div className="knoprij">
            <button type="button" className="knop knop-secundair" onClick={() => onNaarPagina('overzicht')}>
              {t('Naar je overzicht')}
            </button>
          </div>
        )}
      </Kaart>

      {melding && (
        <p className="rij-meta" role="status" style={{ margin: 0 }}>
          {melding}
        </p>
      )}

      <Subtabs naam="opstelling" tabs={tabs} actief={blok} onKies={setBlok} label={t('Onderdeel')}>
        {blok === 'rekeningen' && (
          <Kaart
            titel={t('Waar staat je geld?')}
            bijschrift={t('Je betaalrekening, je spaarrekening, je portemonnee. Voeg ze één voor één toe; het formulier blijft staan.')}
          >
            {geldRekeningen.length === 0 ? (
              <Leeg>{t('Nog geen rekeningen. Begin met de rekening waar je loon op komt.')}</Leeg>
            ) : (
              <ul className="lijst">
                {geldRekeningen.map((r) => (
                  <li key={r.id} className="rij">
                    <span className="rij-midden rij-titel">{r.naam}</span>
                    <span className="rij-acties">{formatEuro(saldoNu(r))}</span>
                  </li>
                ))}
              </ul>
            )}
            <hr className="scheiding" />
            <RekeningFormulier onOpslaan={onRekening} />
          </Kaart>
        )}

        {blok === 'openstaand' && (
          <div className="stapel">
            <Kaart
              titel={t('Een kredietkaart of kredietopening?')}
              bijschrift={t('Kies bij Type "Kredietkaart". Vul bij het bedrag in wat er nog openstaat, als een gewoon positief getal, en bij de limiet hoeveel je maximaal mag opnemen.')}
            >
              {kredietRekeningen.length === 0 ? (
                <Leeg>{t('Nog geen kredietkaart ingegeven.')}</Leeg>
              ) : (
                <ul className="lijst">
                  {kredietRekeningen.map((r) => (
                    <li key={r.id} className="rij">
                      <span className="rij-midden rij-titel">{r.naam}</span>
                      {/* Een kaart toont wat er OPENSTAAT, niet een negatief saldo. */}
                      <span className="rij-acties">{formatEuro(kaartbedragUitOpslag(saldoNu(r)))}</span>
                    </li>
                  ))}
                </ul>
              )}
              <hr className="scheiding" />
              {/* Het formulier begint hier op "Kredietkaart": wie het keuzemenu
                  overslaat, zag zijn kaart anders stil bij "Je geld" opduiken. */}
              <RekeningFormulier onOpslaan={onRekening} beginType="krediet" />
            </Kaart>

            <Kaart
              titel={t('Een lening, hypotheek of autofinanciering?')}
              bijschrift={t('Wat je nog moet terugbetalen, gaat af van je vermogen. Wat je hebt uitgeleend, komt erbij.')}
            >
              {openLeningen.length === 0 ? (
                <Leeg>{t('Nog geen leningen ingegeven.')}</Leeg>
              ) : (
                <ul className="lijst">
                  {openLeningen.map((l) => (
                    <li key={l.id} className="rij">
                      <span className="rij-midden rij-titel">{l.naam}</span>
                      <span className="rij-acties">{formatEuro(openstaandKapitaal(l, aflossingen))}</span>
                    </li>
                  ))}
                </ul>
              )}
              <hr className="scheiding" />
              {/* Twee formulieren op één scherm, dus maar één gevulde knop: de
                  rekening hierboven houdt de gevulde, de lening krijgt de omlijnde.
                  Zie DESIGN.md, regel 2. */}
              <LeningFormulier onOpslaan={onLening} gezinsleden={gezinsleden} secundaireKnop />
            </Kaart>
          </div>
        )}

        {blok === 'later' && (
          <Kaart
            titel={t('Wat staat er voor later?')}
            bijschrift={t('Beleggingen, een termijnrekening, pensioensparen. Kies bij Type "Effectenrekening" of "Termijnrekening"; je kan de waarde later bijwerken bij de rekening zelf.')}
          >
            {laterRekeningen.length === 0 ? (
              <Leeg>{t('Nog niets voor later ingegeven.')}</Leeg>
            ) : (
              <ul className="lijst">
                {laterRekeningen.map((r) => (
                  <li key={r.id} className="rij">
                    <span className="rij-midden rij-titel">{r.naam}</span>
                    <span className="rij-acties">{formatEuro(saldoNu(r))}</span>
                  </li>
                ))}
              </ul>
            )}
            <hr className="scheiding" />
            {/* Begint op "Effectenrekening"; wie een termijnrekening heeft, zet het
                keuzemenu één stap verder. */}
            <RekeningFormulier onOpslaan={onRekening} beginType="effecten" />
          </Kaart>
        )}

        {blok === 'vast' && (
          <KostenLijst
            titel={t('Je vaste kosten')}
            uitleg={t('Vink aan wat je betaalt en tik het bedrag in. Herkennen gaat sneller dan bedenken.')}
            voorstellen={KLASSIEKE_VASTE_KOSTEN}
            posten={lasten}
            t={t}
            bezig={bezig}
            fout={fout}
            onToevoegen={voegKostToe}
            onNaarBudget={() => onNaarPagina('budget')}
          />
        )}

        {blok === 'sluipend' && (
          <KostenLijst
            titel={t('Je sluipende kosten')}
            uitleg={t('De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt.')}
            voorstellen={SLUIPENDE_KOSTEN}
            posten={lasten}
            t={t}
            bezig={bezig}
            fout={fout}
            onToevoegen={voegKostToe}
            onNaarBudget={() => onNaarPagina('budget')}
          />
        )}

        {blok === 'gezin' && (
          <KinderenSectie
            kinderen={gezinsleden}
            onToevoegen={onKindToevoegen}
            onWijzigen={onKindWijzigen}
            onVerwijderen={onKindVerwijderen}
          />
        )}

        {blok === 'delen' && (
          <Kaart
            titel={t('Deel je kosten met iemand?')}
            bijschrift={t('Bijvoorbeeld met de andere ouder van je kinderen. Kompal houdt dan bij wie wat betaalde en rekent het voor je af.')}
          >
            {dossiers.length === 0 ? (
              <Leeg>{t('Nog geen dossiers. Maak er hieronder een aan, of sla dit blok over.')}</Leeg>
            ) : (
              <ul className="lijst">
                {dossiers.map((d) => (
                  <li key={d.id} className="rij">
                    <span className="rij-midden rij-titel">{d.naam}</span>
                    <span className="rij-acties">{t('{n}% voor jou', { n: d.aandeelJij })}</span>
                  </li>
                ))}
              </ul>
            )}
            <hr className="scheiding" />
            <DossierFormulier onOpslaan={onDossier} />
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Uitgeleend geld en aankopen met garantie horen ook bij Dossiers.')}{' '}
              <button type="button" className="knop knop-ghost knop-klein" onClick={() => onNaarPagina('dossiers')}>
                {t('Naar Dossiers')}
              </button>
            </p>
          </Kaart>
        )}
      </Subtabs>

      {/* Wie hier komt zonder ook maar één rekening, heeft nog geen enkel cijfer.
          Dan is één duidelijke wegwijzer nuttiger dan een knop naar een leeg
          overzicht. */}
      {rekeningen.length === 0 && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('Tip: begin bij "Je geld". Zonder rekening kan de app nog niets uitrekenen.')}
        </p>
      )}
    </section>
  )
}
