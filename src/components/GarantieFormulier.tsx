import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Garantie, Transactie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { STANDAARD_GARANTIE_MAANDEN } from '../utils/garantie'
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

// Formulier om een aankoop met garantie toe te voegen of te bewerken. Een aankoop
// kan optioneel aan een bestaande transactie gekoppeld worden; bij het kiezen
// worden product, prijs en datum voorgevuld (maar blijven aanpasbaar).
export function GarantieFormulier({
  transacties,
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  transacties: Transactie[]
  onOpslaan: (g: Garantie) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Garantie | null
}) {
  const { t } = useT()
  const [product, setProduct] = useState('')
  const [winkel, setWinkel] = useState('')
  const [aankoopdatum, setAankoopdatum] = useState(vandaag())
  const [prijs, setPrijs] = useState('')
  const [maanden, setMaanden] = useState(String(STANDAARD_GARANTIE_MAANDEN))
  const [transactieId, setTransactieId] = useState('')
  const [notitie, setNotitie] = useState('')
  const [bonnetje, setBonnetje] = useState('')
  const [bezigBon, setBezigBon] = useState(false)

  useEffect(() => {
    if (bewerken) {
      setProduct(bewerken.product)
      setWinkel(bewerken.winkel ?? '')
      setAankoopdatum(bewerken.aankoopdatum)
      setPrijs(typeof bewerken.prijs === 'number' ? centenNaarInvoer(bewerken.prijs) : '')
      setMaanden(String(bewerken.garantieMaanden))
      setTransactieId(bewerken.transactieId ?? '')
      setNotitie(bewerken.notitie ?? '')
      setBonnetje(bewerken.bonnetje ?? '')
    } else {
      setProduct('')
      setWinkel('')
      setAankoopdatum(vandaag())
      setPrijs('')
      setMaanden(String(STANDAARD_GARANTIE_MAANDEN))
      setTransactieId('')
      setNotitie('')
      setBonnetje('')
    }
  }, [bewerken])

  const maandenGetal = Number.parseInt(maanden, 10)
  const prijsCenten = invoerNaarCenten(prijs)
  const geldig = product.trim().length > 0 && Number.isFinite(maandenGetal) && maandenGetal > 0

  // Transacties, nieuwste eerst, voor de optionele koppeling.
  const gesorteerdeTx = [...transacties].sort((a, b) => (a.datum < b.datum ? 1 : -1))

  function kiesTransactie(id: string) {
    setTransactieId(id)
    const tx = transacties.find((x) => x.id === id)
    if (tx) {
      setProduct(tx.omschrijving)
      setAankoopdatum(tx.datum)
      setPrijs(centenNaarInvoer(Math.abs(tx.bedrag)))
    }
  }

  async function kiesBon(bestand: File) {
    setBezigBon(true)
    try {
      setBonnetje(await verkleinAfbeelding(bestand))
    } catch {
      // stil negeren.
    } finally {
      setBezigBon(false)
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      product: product.trim(),
      aankoopdatum,
      garantieMaanden: maandenGetal,
      ...(winkel.trim() ? { winkel: winkel.trim() } : {}),
      ...(Number.isFinite(prijsCenten) && prijsCenten > 0 ? { prijs: prijsCenten } : {}),
      ...(transactieId ? { transactieId } : {}),
      ...(notitie.trim() ? { notitie: notitie.trim() } : {}),
      ...(bonnetje ? { bonnetje } : {}),
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      {gesorteerdeTx.length > 0 && (
        <div style={rij}>
          <label htmlFor="gar-tx">{t('Koppel aan transactie (optioneel)')}</label>
          <select id="gar-tx" style={veld} value={transactieId} onChange={(e) => kiesTransactie(e.target.value)}>
            <option value="">{t('Niet gekoppeld')}</option>
            {gesorteerdeTx.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.datum} · {tx.omschrijving} · {formatEuro(Math.abs(tx.bedrag))}
              </option>
            ))}
          </select>
        </div>
      )}
      <div style={rij}>
        <label htmlFor="gar-product">{t('Product')}</label>
        <input id="gar-product" style={veld} value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t('bv. Wasmachine')} />
      </div>
      <div style={rij}>
        <label htmlFor="gar-winkel">{t('Winkel (optioneel)')}</label>
        <input id="gar-winkel" style={veld} value={winkel} onChange={(e) => setWinkel(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 120 }}>
          <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Aankoopdatum')}</span>
          <input type="date" style={veld} value={aankoopdatum} onChange={(e) => setAankoopdatum(e.target.value)} />
        </label>
        <label style={{ flex: 1, minWidth: 120 }}>
          <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Prijs € (optioneel)')}</span>
          <input style={veld} inputMode="decimal" placeholder="0,00" value={prijs} onChange={(e) => setPrijs(e.target.value)} />
        </label>
      </div>
      <div style={{ ...rij, marginTop: '0.4rem' }}>
        <label htmlFor="gar-maanden">{t('Garantie in maanden')}</label>
        <input id="gar-maanden" style={veld} inputMode="numeric" value={maanden} onChange={(e) => setMaanden(e.target.value)} />
        <span style={{ color: '#888', fontSize: '0.8rem' }}>{t('24 = wettelijk (2 jaar); tweedehands minstens 12; langere commerciële garantie mag ook.')}</span>
      </div>
      <div style={rij}>
        <label htmlFor="gar-notitie">{t('Notitie (optioneel)')}</label>
        <input id="gar-notitie" style={veld} value={notitie} onChange={(e) => setNotitie(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="gar-bon">{t('Bon/factuur (optioneel)')}</label>
        {bonnetje ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 2 }}>
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Bon/factuur')} style={{ maxHeight: 60, borderRadius: 6, border: '1px solid #eee' }} />
            )}
            <a href={bonnetje} target="_blank" rel="noreferrer" style={{ color: '#2c6cb0' }}>{t('bekijken')}</a>
            <button type="button" onClick={() => setBonnetje('')} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer' }}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="gar-bon"
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
        {bewerken ? t('Garantie wijzigen') : t('Garantie toevoegen')}
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
