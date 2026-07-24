import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Dossier, Kind, Kindrekening, Kindrekeningpost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { potSaldo, standPerOuder, geindexeerdeBijdrage, type OuderStand } from '../utils/kindrekening'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { KindrekeningpostFormulier } from './KindrekeningpostFormulier'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const blok: CSSProperties = { background: 'var(--positive-soft)', border: '1px solid var(--positive-soft)', borderRadius: 8, padding: '0.6rem', marginBottom: '0.75rem' }

const vandaag = () => new Date().toISOString().slice(0, 10)

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
      <div style={{ ...blok, marginTop: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.15rem' }}>{t('Kindrekening (gezamenlijke pot)')}</h3>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
          {t('Een gezamenlijke pot waarop beide ouders storten en waaruit kosten rechtstreeks betaald worden. Een tweede manier van afrekenen naast het verschil-model.')}
        </p>
        <button type="button" onClick={zetAan} style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--positive-soft)', cursor: 'pointer' }}>
          {t('Kindrekening aanzetten')}
        </button>
      </div>
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
    <div style={{ ...blok, marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', margin: 0 }}>{t('Kindrekening (gezamenlijke pot)')}</h3>
        <button
          aria-label={t('Kindrekening uitzetten')}
          onClick={() => onVerwijderen(kindrekening.id)}
          style={{ border: 'none', background: 'none', color: 'var(--negative)', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ×
        </button>
      </div>

      <p style={{ fontWeight: 'bold', margin: '0.25rem 0' }}>
        {t('Saldo van de pot')}: {formatEuro(saldo)}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
        <li>{t('Jij')} — {standTekst(t, stand.jij)}</li>
        <li>{t('Partner')} — {standTekst(t, stand.partner)}</li>
      </ul>

      {/* Maandbijdrage-afspraak (met indexatie) */}
      <div style={{ marginBottom: '0.5rem' }}>
        {(kindrekening.maandbijdrageJij || kindrekening.maandbijdragePartner) && !toonAfspraak && (
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('Maandbijdrage')}: {t('jij {jij}', { jij: formatEuro(geindexeerdJij) })}, {t('partner {partner}', { partner: formatEuro(geindexeerdPartner) })}
            {heeftIndex && ` · ${t('geïndexeerd')}`}
          </p>
        )}
        <button type="button" onClick={() => setToonAfspraak((v) => !v)} style={{ border: 'none', background: 'none', color: 'var(--info)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}>
          {toonAfspraak ? t('Afspraak verbergen') : t('Maandbijdrage-afspraak instellen')}
        </button>
      </div>

      {toonAfspraak && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem', marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
            {t('De afgesproken maandelijkse storting per ouder. Vul een aanvangs- en huidige index in om de bijdrage te indexeren (Belgische formule).')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 110 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('Bijdrage jij (€/maand)')}</span>
              <input style={veld} inputMode="decimal" placeholder="0,00" value={bijJij} onChange={(e) => setBijJij(e.target.value)} />
            </label>
            <label style={{ flex: 1, minWidth: 110 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('Bijdrage partner (€/maand)')}</span>
              <input style={veld} inputMode="decimal" placeholder="0,00" value={bijPartner} onChange={(e) => setBijPartner(e.target.value)} />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('Startdatum afspraak')}</span>
            <input type="date" style={veld} value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <label style={{ flex: 1, minWidth: 110 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('Aanvangsindex (optioneel)')}</span>
              <input style={veld} inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} />
            </label>
            <label style={{ flex: 1, minWidth: 110 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('Huidige index (optioneel)')}</span>
              <input style={veld} inputMode="decimal" value={huidig} onChange={(e) => setHuidig(e.target.value)} />
            </label>
          </div>
          {voorbeeldJij !== null && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
              {t('Geïndexeerde bijdrage jij: {bedrag}', { bedrag: formatEuro(voorbeeldJij) })}
            </p>
          )}
          <button type="button" onClick={bewaarAfspraak} style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--positive-soft)', cursor: 'pointer' }}>
            {t('Afspraak bewaren')}
          </button>
        </div>
      )}

      {/* Bewegingen */}
      {bewegingen.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {bewegingen.map((p) => (
            <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--positive-soft)' }}>
              <span style={{ fontSize: '0.9rem' }}>
                <span style={{ color: p.soort === 'storting' ? 'var(--positive)' : 'var(--negative)' }}>
                  {p.soort === 'storting' ? '▲' : '▼'}
                </span>{' '}
                {p.omschrijving || (p.soort === 'storting' ? t('Storting') : t('Uitgave'))}
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                  {' '}· {p.datum}
                  {p.soort === 'storting' && ` · ${t('door {wie}', { wie: p.door === 'partner' ? t('partner') : t('jou') })}`}
                  {p.categorieId && ` · ${labelVanCategorie(p.categorieId, categorieen) ?? ''}`}
                  {p.kindIds && p.kindIds.length > 0 && ` · ${t('voor {namen}', { namen: kindNamen(p.kindIds) })}`}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: p.soort === 'storting' ? 'var(--positive)' : 'var(--negative)' }}>
                  {p.soort === 'storting' ? '+' : '−'}{formatEuro(p.bedrag)}
                </span>
                {p.bonnetje && (
                  <a href={p.bonnetje} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontSize: '0.85rem' }}>
                    {t('bon')}
                  </a>
                )}
                <button aria-label={t('Bewerk beweging')} onClick={() => setBewerkPost(p)} style={{ border: 'none', background: 'none', color: 'var(--info)', cursor: 'pointer' }}>
                  ✎
                </button>
                <button aria-label={t('Verwijder beweging')} onClick={() => onPostVerwijderen(p.id)} style={{ border: 'none', background: 'none', color: 'var(--negative)', cursor: 'pointer', fontSize: '1.1rem' }}>
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
    </div>
  )
}
