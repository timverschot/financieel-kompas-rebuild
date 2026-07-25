import { useEffect, useState } from 'react'
import type { Categorie, Dossier, Kind, Kindrekening, Kindrekeningpost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { potSaldo, standPerOuder, geindexeerdeBijdrage, teltVerledenZonderIndex, type OuderStand } from '../utils/kindrekening'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { KindrekeningpostFormulier } from './KindrekeningpostFormulier'
import { Bedrag, Kaart } from '../ui/basis'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'
import { vandaag } from '../utils/datum'


function getal(waarde: string): number {
  return Number.parseFloat(waarde.replace(',', '.'))
}

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
    const a = getal(aanvang)
    const n = getal(huidig)
    await onOpslaan({
      ...kindrekening,
      ...(Number.isFinite(jij) && jij > 0 ? { maandbijdrageJij: jij } : { maandbijdrageJij: undefined }),
      ...(Number.isFinite(partner) && partner > 0 ? { maandbijdragePartner: partner } : { maandbijdragePartner: undefined }),
      ...(start ? { bijdrageStart: start } : { bijdrageStart: undefined }),
      ...(Number.isFinite(a) && a > 0 ? { aanvangsindex: a } : { aanvangsindex: undefined }),
      ...(Number.isFinite(n) && n > 0 ? { huidigeIndex: n } : { huidigeIndex: undefined }),
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
  const bewegingen = [...posten].sort((a, b) => (a.datum < b.datum ? 1 : -1))
  const geindexeerdJij = geindexeerdeBijdrage(kindrekening, kindrekening.maandbijdrageJij)
  const geindexeerdPartner = geindexeerdeBijdrage(kindrekening, kindrekening.maandbijdragePartner)
  const heeftIndex = !!(kindrekening.aanvangsindex && kindrekening.huidigeIndex)

  // Live voorbeeld van de geïndexeerde bijdrage terwijl je de afspraak bewerkt.
  const voorbeeldJij = (() => {
    const basis = invoerNaarCenten(bijJij)
    if (!Number.isFinite(basis) || basis <= 0) return null
    const a = getal(aanvang)
    const n = getal(huidig)
    if (!(a > 0 && n > 0)) return null
    return geindexeerdeBijdrage({ ...kindrekening, aanvangsindex: a, huidigeIndex: n }, basis)
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
        <Kaart compact style={{ background: 'var(--surface-2)' }}>
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
          <div className="veldrij">
            <label className="veldgroep">
              <span className="label-caps">{t('Aanvangsindex (optioneel)')}</span>
              <input inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} />
            </label>
            <label className="veldgroep">
              <span className="label-caps">{t('Huidige index (optioneel)')}</span>
              <input inputMode="decimal" value={huidig} onChange={(e) => setHuidig(e.target.value)} />
            </label>
          </div>
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
                  <a href={p.bonnetje} target="_blank" rel="noreferrer">
                    {t('bon')}
                  </a>
                )}
                <button className="knop knop-kaal" aria-label={t('Bewerk beweging')} onClick={() => setBewerkPost(p)}>
                  ✎
                </button>
                <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder beweging')} onClick={() => onPostVerwijderen(p.id)}>
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
        bewerken={bewerkPost}
      />
    </Kaart>
  )
}
