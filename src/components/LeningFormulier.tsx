import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Lening, LeningRichting } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

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
    <form onSubmit={verzend} className="stapel">
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-richting">
          {t('Soort')}
        </label>
        <select id="lening-richting" value={richting} onChange={(e) => setRichting(e.target.value as LeningRichting)}>
          <option value="uitgeleend">{t('Ik leende uit (iemand is mij verschuldigd)')}</option>
          <option value="geleend">{t('Ik leende / een krediet (ik betaal af)')}</option>
        </select>
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-naam">
          {t('Naam')}
        </label>
        <input id="lening-naam" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t('bv. Lening aan broer of Autolening')} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-hoofdsom">
          {t('Startbedrag / openstaand kapitaal (€)')}
        </label>
        <input id="lening-hoofdsom" inputMode="decimal" placeholder="0,00" value={hoofdsom} onChange={(e) => setHoofdsom(e.target.value)} />
      </div>
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-tegenpartij">
            {richting === 'geleend' ? t('Kredietgever (optioneel)') : t('Wie (optioneel)')}
          </label>
          <input id="lening-tegenpartij" value={tegenpartij} onChange={(e) => setTegenpartij(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-start">
            {t('Startdatum')}
          </label>
          <input id="lening-start" type="date" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} />
        </div>
      </div>
      {richting === 'geleend' && (
        <>
          <div className="veldrij">
            <label className="veldgroep">
              <span className="label-caps">{t('Rentevoet % (optioneel)')}</span>
              <input inputMode="decimal" value={rentevoet} onChange={(e) => setRentevoet(e.target.value)} />
            </label>
            <label className="veldgroep">
              <span className="label-caps">{t('Maandbedrag € (optioneel)')}</span>
              <input inputMode="decimal" placeholder="0,00" value={maandbedrag} onChange={(e) => setMaandbedrag(e.target.value)} />
            </label>
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor="lening-eind">
              {t('Einddatum / termijn (optioneel)')}
            </label>
            <input id="lening-eind" type="date" value={einddatum} onChange={(e) => setEinddatum(e.target.value)} />
          </div>
        </>
      )}
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-omschrijving">
          {t('Notitie (optioneel)')}
        </label>
        <input id="lening-omschrijving" value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="lening-bon">
          {t('Contract/bewijs (optioneel)')}
        </label>
        {bonnetje ? (
          <div className="knoprij">
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Contract/bewijs')} style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            )}
            <a href={bonnetje} target="_blank" rel="noreferrer">
              {t('bekijken')}
            </a>
            <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => setBonnetje('')}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="lening-bon"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void kiesBon(f)
              e.target.value = ''
            }}
          />
        )}
        {bezigBon && <span className="rij-meta"> {t('bezig…')}</span>}
      </div>
      <div className="knoprij">
        <button type="submit" disabled={!geldig} className="knop knop-primair">
          {bewerken ? t('Lening wijzigen') : t('Lening toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-secundair" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>
    </form>
  )
}
