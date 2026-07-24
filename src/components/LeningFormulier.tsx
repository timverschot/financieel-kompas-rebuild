import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Lening, LeningRichting } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

function getal(waarde: string): number {
  return Number.parseFloat(waarde.replace(',', '.'))
}

// Formulier om een lening of krediet toe te voegen of te bewerken. De richting-
// schakelaar bepaalt de betekenis: 'uitgeleend' (iemand is jou verschuldigd) of
// 'geleend' (jij betaalt af). Bij 'geleend' verschijnen optionele krediet-velden.
export function LeningFormulier({
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  onOpslaan: (l: Lening) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Lening | null
}) {
  const { t } = useT()
  const [richting, setRichting] = useState<LeningRichting>('uitgeleend')
  const [naam, setNaam] = useState('')
  const [hoofdsom, setHoofdsom] = useState('')
  const [startdatum, setStartdatum] = useState(vandaag())
  const [tegenpartij, setTegenpartij] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [rentevoet, setRentevoet] = useState('')
  const [maandbedrag, setMaandbedrag] = useState('')
  const [einddatum, setEinddatum] = useState('')
  const [bonnetje, setBonnetje] = useState('')
  const [bezigBon, setBezigBon] = useState(false)

  useEffect(() => {
    if (bewerken) {
      setRichting(bewerken.richting)
      setNaam(bewerken.naam)
      setHoofdsom(centenNaarInvoer(bewerken.hoofdsom))
      setStartdatum(bewerken.startdatum)
      setTegenpartij(bewerken.tegenpartij ?? '')
      setOmschrijving(bewerken.omschrijving ?? '')
      setRentevoet(typeof bewerken.rentevoet === 'number' ? String(bewerken.rentevoet) : '')
      setMaandbedrag(typeof bewerken.maandbedrag === 'number' ? centenNaarInvoer(bewerken.maandbedrag) : '')
      setEinddatum(bewerken.einddatum ?? '')
      setBonnetje(bewerken.bonnetje ?? '')
    } else {
      setRichting('uitgeleend')
      setNaam('')
      setHoofdsom('')
      setStartdatum(vandaag())
      setTegenpartij('')
      setOmschrijving('')
      setRentevoet('')
      setMaandbedrag('')
      setEinddatum('')
      setBonnetje('')
    }
  }, [bewerken])

  const hoofdsomCenten = invoerNaarCenten(hoofdsom)
  const geldig = naam.trim().length > 0 && Number.isFinite(hoofdsomCenten) && hoofdsomCenten > 0

  async function kiesBon(bestand: File) {
    setBezigBon(true)
    try {
      setBonnetje(await verkleinAfbeelding(bestand))
    } catch {
      // stil negeren; een mislukt bestand mag het toevoegen niet blokkeren.
    } finally {
      setBezigBon(false)
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const r = getal(rentevoet)
    const m = invoerNaarCenten(maandbedrag)
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      naam: naam.trim(),
      richting,
      hoofdsom: hoofdsomCenten,
      startdatum,
      ...(tegenpartij.trim() ? { tegenpartij: tegenpartij.trim() } : {}),
      ...(omschrijving.trim() ? { omschrijving: omschrijving.trim() } : {}),
      ...(richting === 'geleend' && Number.isFinite(r) && r >= 0 ? { rentevoet: r } : {}),
      ...(richting === 'geleend' && Number.isFinite(m) && m > 0 ? { maandbedrag: m } : {}),
      ...(richting === 'geleend' && einddatum ? { einddatum } : {}),
      ...(bonnetje ? { bonnetje } : {}),
      ...(bewerken?.afgesloten ? { afgesloten: true } : {}),
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="lening-richting">{t('Soort')}</label>
        <select id="lening-richting" style={veld} value={richting} onChange={(e) => setRichting(e.target.value as LeningRichting)}>
          <option value="uitgeleend">{t('Ik leende uit (iemand is mij verschuldigd)')}</option>
          <option value="geleend">{t('Ik leende / een krediet (ik betaal af)')}</option>
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="lening-naam">{t('Naam')}</label>
        <input id="lening-naam" style={veld} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t('bv. Lening aan broer of Autolening')} />
      </div>
      <div style={rij}>
        <label htmlFor="lening-hoofdsom">{t('Startbedrag / openstaand kapitaal (€)')}</label>
        <input id="lening-hoofdsom" style={veld} inputMode="decimal" placeholder="0,00" value={hoofdsom} onChange={(e) => setHoofdsom(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="lening-tegenpartij">{richting === 'geleend' ? t('Kredietgever (optioneel)') : t('Wie (optioneel)')}</label>
        <input id="lening-tegenpartij" style={veld} value={tegenpartij} onChange={(e) => setTegenpartij(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="lening-start">{t('Startdatum')}</label>
        <input id="lening-start" type="date" style={veld} value={startdatum} onChange={(e) => setStartdatum(e.target.value)} />
      </div>
      {richting === 'geleend' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 110 }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Rentevoet % (optioneel)')}</span>
              <input style={veld} inputMode="decimal" value={rentevoet} onChange={(e) => setRentevoet(e.target.value)} />
            </label>
            <label style={{ flex: 1, minWidth: 110 }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Maandbedrag € (optioneel)')}</span>
              <input style={veld} inputMode="decimal" placeholder="0,00" value={maandbedrag} onChange={(e) => setMaandbedrag(e.target.value)} />
            </label>
          </div>
          <div style={{ ...rij, marginTop: '0.4rem' }}>
            <label htmlFor="lening-eind">{t('Einddatum / termijn (optioneel)')}</label>
            <input id="lening-eind" type="date" style={veld} value={einddatum} onChange={(e) => setEinddatum(e.target.value)} />
          </div>
        </>
      )}
      <div style={rij}>
        <label htmlFor="lening-omschrijving">{t('Notitie (optioneel)')}</label>
        <input id="lening-omschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="lening-bon">{t('Contract/bewijs (optioneel)')}</label>
        {bonnetje ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 2 }}>
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Contract/bewijs')} style={{ maxHeight: 60, borderRadius: 6, border: '1px solid #eee' }} />
            )}
            <a href={bonnetje} target="_blank" rel="noreferrer" style={{ color: '#2c6cb0' }}>{t('bekijken')}</a>
            <button type="button" onClick={() => setBonnetje('')} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer' }}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="lening-bon"
            type="file"
            accept="image/*,application/pdf"
            style={{ marginTop: 2 }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void kiesBon(f)
              e.target.value = ''
            }}
          />
        )}
        {bezigBon && <span style={{ color: '#888', fontSize: '0.85rem' }}> {t('bezig…')}</span>}
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef7ee' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        {bewerken ? t('Lening wijzigen') : t('Lening toevoegen')}
      </button>
      {bewerken && onAnnuleer && (
        <button
          type="button"
          onClick={onAnnuleer}
          style={{ marginLeft: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          {t('Annuleer')}
        </button>
      )}
    </form>
  )
}
