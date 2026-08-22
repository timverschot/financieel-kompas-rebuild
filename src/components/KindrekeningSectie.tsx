import { useEffect, useState } from 'react'
import type { Categorie, Dossier, Kind, Kindrekening, Kindrekeningpost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { potSaldo, standPerOuder, geindexeerdeBijdrage, teltVerledenZonderIndex, type OuderStand } from '../utils/kindrekening'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { KindrekeningpostFormulier } from './KindrekeningpostFormulier'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'
import { dagKort, vandaag } from '../utils/datum'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { Bonknop } from '../ui/Bonknop'
import { indexOpmerking, keurIndexcijfer, keurIndexpaar } from '../utils/indexinvoer'
import { basisjaarWaarschuwing } from '../utils/onderhoudsbijdrageTekst'


// Leesbare tekst voor het verschil tussen gestort en verwacht.
function standTekst(t: Vertaler, stand: OuderStand): string {
  if (stand.verwacht <= 0) return t('gestort: {bedrag}', { bedrag: formatEuro(stand.gestort) })
  if (stand.verschil < 0) return t('gestort {gestort}, loopt {achter} achter', { gestort: formatEuro(stand.gestort), achter: formatEuro(-stand.verschil) })
  if (stand.verschil > 0) return t('gestort {gestort}, {voor} vooruit', { gestort: formatEuro(stand.gestort), voor: formatEuro(stand.verschil) })
  return t('gestort {gestort}, precies bij', { gestort: formatEuro(stand.gestort) })
}

// De kindrekening-sectie voor één dossier: de gezamenlijke pot. Toont het saldo,
// wie hoeveel stortte en of iemand achterloopt, laat de maandbijdrage-afspraak
// (met indexatie) instellen, en beheert de bewegingen (stortingen/uitgaven).
export function KindrekeningSectie({
  dossier,
  kindrekening,
  posten,
  kinderen,
  categorieen,
  onOpslaan,
  onVerwijderen,
  onPostOpslaan,
  onPostVerwijderen,
  onNieuweSubcategorie,
}: {
  dossier: Dossier
  kindrekening: Kindrekening | null
  posten: Kindrekeningpost[]
  kinderen: Kind[]
  categorieen: Categorie[]
  onOpslaan: (kr: Kindrekening) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onPostOpslaan: (p: Kindrekeningpost) => Promise<void> | void
  onPostVerwijderen: (id: string) => Promise<void> | void
  /** Maakt ter plekke een nieuwe subcategorie aan en geeft het nieuwe id terug. */
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
}) {
  const { t } = useT()
  const [bewerkPost, setBewerkPost] = useState<Kindrekeningpost | null>(null)
  const [toonAfspraak, setToonAfspraak] = useState(false)

  // Lokale invoer voor de maandbijdrage-afspraak, geïnitialiseerd uit de rekening.
  const [bijJij, setBijJij] = useState('')
  const [bijPartner, setBijPartner] = useState('')
  const [start, setStart] = useState('')
  const [aanvang, setAanvang] = useState('')
  const [huidig, setHuidig] = useState('')
  // Ronde 65: de twee indexvelden slikten élk getal, en gooiden onleesbare invoer
  // stil weg. Nu weigeren ze wat rekenkundig onmogelijk is, en MERKEN ze een cijfer
  // OP dat uit een ander basisjaar lijkt te komen — weigeren kan niet, want een paar
  // dat volledig in een andere basis staat, is even juist.
  const [indexFout, setIndexFout] = useState('')

  useEffect(() => {
    if (!kindrekening) return
    setBijJij(typeof kindrekening.maandbijdrageJij === 'number' ? centenNaarInvoer(kindrekening.maandbijdrageJij) : '')
    setBijPartner(typeof kindrekening.maandbijdragePartner === 'number' ? centenNaarInvoer(kindrekening.maandbijdragePartner) : '')
    setStart(kindrekening.bijdrageStart ?? '')
    setAanvang(typeof kindrekening.aanvangsindex === 'number' ? String(kindrekening.aanvangsindex) : '')
    setHuidig(typeof kindrekening.huidigeIndex === 'number' ? String(kindrekening.huidigeIndex) : '')
  }, [kindrekening])

  async function zetAan() {
    await onOpslaan({ id: nieuwId(), dossierId: dossier.id, naam: t('Kindrekening'), beginsaldo: 0 })
  }

  async function bewaarAfspraak() {
    if (!kindrekening) return
    const jij = invoerNaarCenten(bijJij)
    const partner = invoerNaarCenten(bijPartner)

    // ⚠ Eerst keuren, dan pas bewaren. Tot deze ronde werd onleesbare invoer stil
    // weggegooid: het veld bleef staan, de afspraak werd bewaard zónder index, en
    // je dacht dat je geïndexeerd had.
    const keurAanvang = keurIndexcijfer(t, aanvang)
    const keurHuidig = keurIndexcijfer(t, huidig)
    const fout = keurIndexpaar(t, keurAanvang, keurHuidig)
    if (fout !== null) {
      setIndexFout(fout)
      return
    }
    setIndexFout('')

    await onOpslaan({
      ...kindrekening,
      ...(Number.isFinite(jij) && jij > 0 ? { maandbijdrageJij: jij } : { maandbijdrageJij: undefined }),
      ...(Number.isFinite(partner) && partner > 0 ? { maandbijdragePartner: partner } : { maandbijdragePartner: undefined }),
      ...(start ? { bijdrageStart: start } : { bijdrageStart: undefined }),
      ...(keurAanvang.soort === 'goed' ? { aanvangsindex: keurAanvang.waarde } : { aanvangsindex: undefined }),
      ...(keurHuidig.soort === 'goed' ? { huidigeIndex: keurHuidig.waarde } : { huidigeIndex: undefined }),
    })
    setToonAfspraak(false)
  }

  async function postOpslaan(p: Kindrekeningpost) {
    await onPostOpslaan(p)
    setBewerkPost(null)
  }

  const kindNamen = (ids?: string[]) =>
    (ids ?? []).map((id) => kinderen.find((k) => k.id === id)?.naam).filter(Boolean).join(', ')

  if (!kindrekening) {
    return (
      <Kaart
        titel={t('Kindrekening (gezamenlijke pot)')}
        bijschrift={t('Een gezamenlijke pot waarop beide ouders storten en waaruit kosten rechtstreeks betaald worden. Een tweede manier van afrekenen naast het verschil-model.')}
      >
        <div className="knoprij">
          <button type="button" className="knop knop-secundair" onClick={zetAan}>
            {t('Kindrekening aanzetten')}
          </button>
        </div>
      </Kaart>
    )
  }

  const saldo = potSaldo(kindrekening, posten)
  const stand = standPerOuder(kindrekening, posten, vandaag())
  const bewegingen = gesorteerdNieuwsteEerst(posten)
  const geindexeerdJij = geindexeerdeBijdrage(kindrekening, kindrekening.maandbijdrageJij)
  const geindexeerdPartner = geindexeerdeBijdrage(kindrekening, kindrekening.maandbijdragePartner)
  const heeftIndex = !!(kindrekening.aanvangsindex && kindrekening.huidigeIndex)

  // De opmerking bij het huidige cijfer, live terwijl je typt.
  const opmerking = indexOpmerking(t, keurIndexcijfer(t, huidig))

  // Live voorbeeld van de geïndexeerde bijdrage terwijl je de afspraak bewerkt.
  const voorbeeldJij = (() => {
    const basis = invoerNaarCenten(bijJij)
    if (!Number.isFinite(basis) || basis <= 0) return null
    // ⚠ Door DEZELFDE keuring als het opslaan. Anders toonde het voorbeeld een
    // keurig bedrag op grond van invoer die "Afspraak bewaren" vervolgens afwijst.
    const a = keurIndexcijfer(t, aanvang)
    const n = keurIndexcijfer(t, huidig)
    if (a.soort !== 'goed' || n.soort !== 'goed') return null
    return geindexeerdeBijdrage({ ...kindrekening, aanvangsindex: a.waarde, huidigeIndex: n.waarde }, basis)
  })()

  return (
    <Kaart
      titel={t('Kindrekening (gezamenlijke pot)')}
      actie={
        <button
          className="knop knop-kaal knop-gevaar"
          aria-label={t('Kindrekening uitzetten')}
          onClick={() => onVerwijderen(kindrekening.id)}
        >
          ×
        </button>
      }
    >
      <div className="stat">
        <span className="label-caps">{t('Saldo van de pot')}</span>
        <Bedrag centen={saldo} groot />
      </div>

      <ul className="lijst">
        <li className="rij">
          <span className="rij-midden">
            <span className="rij-titel">{t('Jij')}</span>
            <span className="rij-meta">{standTekst(t, stand.jij)}</span>
          </span>
        </li>
        <li className="rij">
          <span className="rij-midden">
            <span className="rij-titel">{t('Partner')}</span>
            <span className="rij-meta">{standTekst(t, stand.partner)}</span>
          </span>
        </li>
      </ul>

      {/* Eén regel die zegt hoe de achterstand geteld wordt zodra er geïndexeerd
          wordt. De app weet niet vanaf welke maand de huidige index gold, dus
          telt ze de eerdere maanden aan de niet-geïndexeerde bijdrage in plaats
          van de indexatie met terugwerkende kracht toe te passen. */}
      {teltVerledenZonderIndex(kindrekening, vandaag()) && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('De eerdere maanden tellen aan de niet-geïndexeerde bijdrage; enkel de lopende maand telt geïndexeerd. Zo weegt de indexatie niet met terugwerkende kracht.')}
        </p>
      )}

      {/* Maandbijdrage-afspraak (met indexatie) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        {(kindrekening.maandbijdrageJij || kindrekening.maandbijdragePartner) && !toonAfspraak && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Maandbijdrage')}: {t('jij {jij}', { jij: formatEuro(geindexeerdJij) })}, {t('partner {partner}', { partner: formatEuro(geindexeerdPartner) })}
            {heeftIndex && ` · ${t('geïndexeerd')}`}
          </p>
        )}
        <button type="button" className="knop knop-ghost knop-klein" onClick={() => setToonAfspraak((v) => !v)}>
          {toonAfspraak ? t('Afspraak verbergen') : t('Maandbijdrage-afspraak instellen')}
        </button>
      </div>

      {toonAfspraak && (
        <Kaart compact style={{ backgroundColor: 'var(--surface-2)' }}>
          <p className="kaart-bijschrift" style={{ margin: 0 }}>
            {t('De afgesproken maandelijkse storting per ouder. Vul een aanvangs- en huidige index in om de bijdrage te indexeren (Belgische formule).')}
          </p>
          <div className="veldrij">
            <label className="veldgroep">
              <span className="label-caps">{t('Bijdrage jij (€/maand)')}</span>
              <input inputMode="decimal" placeholder="0,00" value={bijJij} onChange={(e) => setBijJij(e.target.value)} />
            </label>
            <label className="veldgroep">
              <span className="label-caps">{t('Bijdrage partner (€/maand)')}</span>
              <input inputMode="decimal" placeholder="0,00" value={bijPartner} onChange={(e) => setBijPartner(e.target.value)} />
            </label>
          </div>
          <label className="veldgroep">
            <span className="label-caps">{t('Startdatum afspraak')}</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          {/* ⚠ RONDE 65. Deze twee velden hadden geen enkele controle, terwijl de
              onderhoudsbijdrage één kaart hoger hetzelfde soort getal tegen de
              reeks, het basisjaar én een marge van tien procent houdt. Nu dragen ze
              dezelfde uitleg en dezelfde marge — maar daar weigert ze, hier merkt ze
              alleen op. Zie `utils/indexinvoer.ts` voor waarom. */}
          <div className="veldrij">
            <label className="veldgroep">
              <span className="label-caps">{t('Aanvangsindex (optioneel)')}</span>
              <input
                inputMode="decimal"
                placeholder={t('het cijfer uit je akte')}
                value={aanvang}
                onChange={(e) => {
                  setAanvang(e.target.value)
                  setIndexFout('')
                }}
              />
            </label>
            <label className="veldgroep">
              <span className="label-caps">{t('Huidige index (optioneel)')}</span>
              <input
                inputMode="decimal"
                placeholder={t('het cijfer van nu')}
                value={huidig}
                onChange={(e) => {
                  setHuidig(e.target.value)
                  setIndexFout('')
                }}
              />
            </label>
          </div>
          <p className="rij-meta" style={{ margin: 0 }}>
            {basisjaarWaarschuwing(t)}
          </p>
          {/* Altijd aanwezig, leeg wanneer er niets op te merken valt: een
              `role="status"` die pas MÉT zijn tekst verschijnt, wordt door sommige
              schermlezers overgeslagen. Dit is een OPMERKING, geen weigering — de
              app kan een consistent paar uit een ander basisjaar niet van een
              verwisseld paar onderscheiden, dus ze zegt wat ze ziet en laat jou
              beslissen. */}
          <p className="rij-meta" role="status" style={{ margin: 0, color: opmerking ? 'var(--negative)' : undefined }}>
            {opmerking ?? ''}
          </p>
          {indexFout !== '' && (
            <p className="foutregel" role="alert" style={{ margin: 0 }}>
              {indexFout}
            </p>
          )}
          {voorbeeldJij !== null && (
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Geïndexeerde bijdrage jij: {bedrag}', { bedrag: formatEuro(voorbeeldJij) })}
            </p>
          )}
          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={bewaarAfspraak}>
              {t('Afspraak bewaren')}
            </button>
          </div>
        </Kaart>
      )}

      {/* Bewegingen */}
      {/* ⚠ RONDE 66, slotronde: ook hier een lege toestand. Zette je de kindrekening
          aan, dan zag je saldo € 0,00, twee keer "gestort: € 0,00" en meteen daarna het
          invoerformulier — zonder één woord dat er nog niets in staat. Elke andere
          lijst in de app zegt dat wél. */}
      {bewegingen.length === 0 && (
        <Leeg>{t('Nog geen bewegingen op deze rekening. Voeg er hieronder een toe.')}</Leeg>
      )}
      {bewegingen.length > 0 && (
        <ul className="lijst">
          {bewegingen.map((p) => (
            <li key={p.id} className="rij">
              <span className="rij-midden">
                <span className="rij-titel">
                  <span style={{ color: p.soort === 'storting' ? 'var(--positive)' : 'var(--negative)' }}>
                    {p.soort === 'storting' ? '▲' : '▼'}
                  </span>{' '}
                  {p.omschrijving || (p.soort === 'storting' ? t('Storting') : t('Uitgave'))}
                </span>
                <span className="rij-meta">
                  {p.datum}
                  {p.soort === 'storting' && ` · ${t('door {wie}', { wie: p.door === 'partner' ? t('partner') : t('jou') })}`}
                  {p.categorieId && ` · ${labelVanCategorie(p.categorieId, categorieen) ?? ''}`}
                  {p.kindIds && p.kindIds.length > 0 && ` · ${t('voor {namen}', { namen: kindNamen(p.kindIds) })}`}
                </span>
              </span>
              <span className="rij-acties">
                <span className={p.soort === 'storting' ? 'bedrag bedrag-positief' : 'bedrag bedrag-negatief'}>
                  {p.soort === 'storting' ? '+' : '−'}{formatEuro(p.bedrag)}
                </span>
                {p.bonnetje && (
                  <Bonknop bestand={p.bonnetje} naam={p.omschrijving} label={t('bon')} />
                )}
                {/* ⚠ RONDE 66, slotronde: de omschrijving en de datum in de naam. Deze
                    twee knoppen staan er één paar per beweging en heetten allemaal
                    "Bewerk beweging" / "Verwijder beweging" — geen enkel verschil, in
                    een lijst die een gezamenlijke pot bijhoudt. Eén verkeerde × wist
                    dan een storting van de andere ouder. */}
                <button
                  className="knop knop-kaal"
                  aria-label={t('Bewerk beweging {naam} van {datum}', { naam: p.omschrijving ?? t('beweging'), datum: dagKort(p.datum) })}
                  onClick={() => setBewerkPost(p)}
                >
                  ✎
                </button>
                <button
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder beweging {naam} van {datum}', { naam: p.omschrijving ?? t('beweging'), datum: dagKort(p.datum) })}
                  onClick={() => onPostVerwijderen(p.id)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <KindrekeningpostFormulier
        kindrekeningId={kindrekening.id}
        kinderen={kinderen}
        categorieen={categorieen}
        onOpslaan={postOpslaan}
        onAnnuleer={() => setBewerkPost(null)}
        onNieuweSubcategorie={onNieuweSubcategorie}
        bewerken={bewerkPost}
      />
    </Kaart>
  )
}
