import { useCallback, useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Garantie, Kind, Transactie } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { GezinslidKiezer } from './GezinslidKiezer'
import { heeftKiesbareLeden } from '../utils/persoon'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { STANDAARD_GARANTIE_MAANDEN } from '../utils/garantie'
import { vandaag } from '../utils/datum'
import { useT } from '../i18n'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { Bonknop } from '../ui/Bonknop'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
function beginwaarden() {
  return {
    product: '',
    winkel: '',
    aankoopdatum: vandaag(),
    prijs: '',
    maanden: String(STANDAARD_GARANTIE_MAANDEN),
    transactieId: '',
    notitie: '',
    bonnetje: '',
    persoonId: '',
  }
}

// Formulier om een aankoop met garantie toe te voegen of te bewerken. Een aankoop
// kan optioneel aan een bestaande transactie gekoppeld worden; bij het kiezen
// worden product, prijs en datum voorgevuld (maar blijven aanpasbaar).
export function GarantieFormulier({
  transacties,
  onOpslaan,
  onAnnuleer,
  bewerken,
  gezinsleden = [],
}: {
  transacties: Transactie[]
  onOpslaan: (g: Garantie) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Garantie | null
  // Optioneel: zolang deze lijst leeg is, verschijnt het gezinslid-veld niet. Zo
  // blijven bestaande aanroepen ongewijzigd werken.
  gezinsleden?: Kind[]
}) {
  const { t } = useT()
  const [product, setProduct] = useState(() => beginwaarden().product)
  const [winkel, setWinkel] = useState(() => beginwaarden().winkel)
  const [aankoopdatum, setAankoopdatum] = useState(() => beginwaarden().aankoopdatum)
  const [prijs, setPrijs] = useState(() => beginwaarden().prijs)
  const [maanden, setMaanden] = useState(() => beginwaarden().maanden)
  const [transactieId, setTransactieId] = useState(() => beginwaarden().transactieId)
  const [notitie, setNotitie] = useState(() => beginwaarden().notitie)
  const [bonnetje, setBonnetje] = useState(() => beginwaarden().bonnetje)
  const [persoonId, setPersoonId] = useState(() => beginwaarden().persoonId)
  const [bezigBon, setBezigBon] = useState(false)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    const b = beginwaarden()
    setProduct(b.product)
    setWinkel(b.winkel)
    setAankoopdatum(b.aankoopdatum)
    setPrijs(b.prijs)
    setMaanden(b.maanden)
    setTransactieId(b.transactieId)
    setNotitie(b.notitie)
    setBonnetje(b.bonnetje)
    setPersoonId(b.persoonId)
  }, [])

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
      setPersoonId(bewerken.persoonId ?? '')
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  const maandenGetal = Number.parseInt(maanden, 10)
  const prijsCenten = invoerNaarCenten(prijs)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig = product.trim().length > 0 && Number.isFinite(maandenGetal) && maandenGetal > 0

  // Transacties, nieuwste eerst, voor de optionele koppeling.
  const gesorteerdeTx = gesorteerdNieuwsteEerst(transacties)

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
      // Ook bewaren als het veld niet zichtbaar is (bv. het gekoppelde lid werd
      // intussen gearchiveerd): een koppeling mag nooit stil verdwijnen.
      ...(persoonId ? { persoonId } : {}),
    })
    // Bij een NIEUWE aankoop blijft 'bewerken' null, dus de useEffect hierboven
    // draait niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en
    // maakt een tweede klik dezelfde garantie nog eens aan.
    if (!bewerken) leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel">
      {gesorteerdeTx.length > 0 && (
        <div className="veldgroep">
          <label className="label-caps" htmlFor="gar-tx">
            {t('Koppel aan transactie (optioneel)')}
          </label>
          <select id="gar-tx" value={transactieId} onChange={(e) => kiesTransactie(e.target.value)}>
            <option value="">{t('Niet gekoppeld')}</option>
            {gesorteerdeTx.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.datum} · {tx.omschrijving} · {formatEuro(Math.abs(tx.bedrag))}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="gar-product">
            {t('Product')}
          </label>
          <input id="gar-product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t('bv. Wasmachine')} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="gar-winkel">
            {t('Winkel (optioneel)')}
          </label>
          <input id="gar-winkel" value={winkel} onChange={(e) => setWinkel(e.target.value)} />
        </div>
      </div>
      <div className="veldrij">
        <label className="veldgroep">
          <span className="label-caps">{t('Aankoopdatum')}</span>
          <input type="date" value={aankoopdatum} onChange={(e) => setAankoopdatum(e.target.value)} />
        </label>
        <label className="veldgroep">
          <span className="label-caps">{t('Prijs € (optioneel)')}</span>
          <input inputMode="decimal" placeholder="0,00" value={prijs} onChange={(e) => setPrijs(e.target.value)} />
        </label>
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="gar-maanden">
          {t('Garantie in maanden')}
        </label>
        <input id="gar-maanden" inputMode="numeric" value={maanden} onChange={(e) => setMaanden(e.target.value)} />
        <span className="rij-meta">{t('24 = wettelijk (2 jaar); tweedehands minstens 12; langere commerciële garantie mag ook.')}</span>
      </div>
      {heeftKiesbareLeden(gezinsleden, persoonId) && (
        <GezinslidKiezer
          label={t('Van wie is dit?')}
          waarde={persoonId}
          onKies={setPersoonId}
          gezinsleden={gezinsleden}
        />
      )}
      <div className="veldgroep">
        <label className="label-caps" htmlFor="gar-notitie">
          {t('Notitie (optioneel)')}
        </label>
        <input id="gar-notitie" value={notitie} onChange={(e) => setNotitie(e.target.value)} />
      </div>
      <div className="veldgroep">
        <label className="label-caps" htmlFor="gar-bon">
          {t('Bon/factuur (optioneel)')}
        </label>
        {bonnetje ? (
          <div className="knoprij">
            {bonnetje.startsWith('data:image') && (
              <img src={bonnetje} alt={t('Bon/factuur')} style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            )}
            <Bonknop bestand={bonnetje} naam={t('Bon of factuur')} />
            <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => setBonnetje('')}>
              {t('verwijderen')}
            </button>
          </div>
        ) : (
          <input
            id="gar-bon"
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
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className="knop knop-primair"
        >
          {bewerken ? t('Garantie wijzigen') : t('Garantie toevoegen')}
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
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Geef een productnaam en een garantieduur in maanden om op te slaan.')}
      </p>
    </form>
  )
}
