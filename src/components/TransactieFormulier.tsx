import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { Categorie, Kind, Rekening, Streepjescode, Transactie, TransactieRegel } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { zoekProduct } from '../utils/openFoodFacts'
import { CategorieKiezer } from './CategorieKiezer'
import { HandelaarVeld } from './HandelaarVeld'
import { voorstelCategorie, type HandelaarIndex } from '../utils/categorieVoorstel'
import { ItemZoeker } from './ItemZoeker'
import { NutriScoreBadge } from './NutriScoreBadge'
import { Kaart } from '../ui/basis'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { useT } from '../i18n'
import { vandaag } from '../utils/datum'

// De scanner (en de ZXing-bibliotheek) worden pas geladen wanneer je effectief scant.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))


// Onthoud de laatst gebruikte rekening als standaard (ook na een herlaad).
const LAATSTE_REKENING_SLEUTEL = 'fk_laatste_rekening'

function standaardRekening(rekeningen: Rekening[]): string {
  try {
    const opgeslagen = localStorage.getItem(LAATSTE_REKENING_SLEUTEL)
    if (opgeslagen && rekeningen.some((r) => r.id === opgeslagen)) return opgeslagen
  } catch {
    // localStorage niet beschikbaar: stil terugvallen.
  }
  return rekeningen[0]?.id ?? ''
}

function onthoudRekening(id: string): void {
  try {
    localStorage.setItem(LAATSTE_REKENING_SLEUTEL, id)
  } catch {
    // stil negeren
  }
}

// Eén kassaticketregel (lokale invoer). 'code'/'nutriScore' zijn optioneel en
// worden ingevuld bij het scannen van een streepjescode.
type KassaRegel = { sleutel: string; categorieId: string; omschrijving: string; bedrag: string; code?: string; nutriScore?: string }
function nieuweKassaRegel(): KassaRegel {
  return { sleutel: nieuwId(), categorieId: '', omschrijving: '', bedrag: '' }
}

// Invoerformulier voor een transactie. 'Handelaar' is de winkel; het bedrag is het
// totaal. Met 'Kassaticket splitsen' verdeel je dat totaal over item-regels; het
// niet-verdeelde restbedrag telt als 'Zonder categorie'.
export function TransactieFormulier({
  onOpslaan,
  onAnnuleer,
  rekeningen,
  categorieen,
  handelaars,
  bewerken,
  streepjescodes = [],
  onOnthoudStreepjescode,
  onNieuweSubcategorie,
  gezinsleden = [],
  handelaarIndex,
}: {
  onOpslaan: (t: Transactie) => Promise<void> | void
  onAnnuleer?: () => void
  rekeningen: Rekening[]
  categorieen: Categorie[]
  handelaars: string[]
  bewerken?: Transactie | null
  streepjescodes?: Streepjescode[]
  onOnthoudStreepjescode?: (s: Streepjescode) => Promise<void> | void
  // Bewaart een nieuwe subcategorie onder een bestaande (midden)categorie en
  // geeft het nieuwe id terug, zodat de regel er meteen op getagd kan worden.
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
  // Optioneel: voor of door welke gezinsleden was deze uitgave?
  gezinsleden?: Kind[]
  // Optioneel: welke categorie deze handelaar de vorige keer kreeg. Zonder deze
  // index blijft het formulier zich exact gedragen zoals voorheen.
  handelaarIndex?: HandelaarIndex
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [persoonIds, setPersoonIds] = useState<string[]>([])
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>('uitgave')
  const [rekeningId, setRekeningId] = useState(() => standaardRekening(rekeningen))
  const [categorieId, setCategorieId] = useState('')
  const [gesplitst, setGesplitst] = useState(false)
  const [kassaRegels, setKassaRegels] = useState<KassaRegel[]>(() => [nieuweKassaRegel()])
  const zoekRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [scanVoor, setScanVoor] = useState<string | null>(null)

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setDatum(bewerken.datum)
      setRekeningId(bewerken.rekeningId)
      setPersoonIds(bewerken.persoonIds ?? [])
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      if (bewerken.regels && bewerken.regels.length > 0) {
        setGesplitst(true)
        setCategorieId('')
        setKassaRegels(
          bewerken.regels.map((r) => ({
            sleutel: nieuwId(),
            categorieId: r.categorieId ?? '',
            omschrijving: r.omschrijving ?? (r.categorieId ? labelVanCategorie(r.categorieId, categorieen) ?? '' : ''),
            bedrag: centenNaarInvoer(Math.abs(r.bedrag)),
          })),
        )
      } else {
        setGesplitst(false)
        setCategorieId(bewerken.categorieId ?? '')
        setKassaRegels([nieuweKassaRegel()])
      }
    } else {
      setOmschrijving('')
      setBedrag('')
      setSoort('uitgave')
      setDatum(vandaag())
      setPersoonIds([])
      setCategorieId('')
      setGesplitst(false)
      setKassaRegels([nieuweKassaRegel()])
    }
  }, [bewerken, categorieen])

  const teken = soort === 'uitgave' ? -1 : 1
  const bedragCenten = invoerNaarCenten(bedrag)
  const totaalCenten = Number.isFinite(bedragCenten) && bedragCenten > 0 ? bedragCenten : 0

  const verdeeld = kassaRegels.reduce((s, r) => {
    const c = invoerNaarCenten(r.bedrag)
    return Number.isFinite(c) && c > 0 ? s + c : s
  }, 0)
  const verschil = totaalCenten - verdeeld

  const geldig =
    omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0 && rekeningId.length > 0

  function wijzigRegel(sleutel: string, velden: Partial<KassaRegel>) {
    setKassaRegels((rs) => rs.map((r) => (r.sleutel === sleutel ? { ...r, ...velden } : r)))
  }
  function verwijderRegel(sleutel: string) {
    setKassaRegels((rs) => (rs.length > 1 ? rs.filter((r) => r.sleutel !== sleutel) : rs))
  }
  function voegRegelToe(): string {
    const r = nieuweKassaRegel()
    setKassaRegels((rs) => [...rs, r])
    return r.sleutel
  }

  // Verwerkt een gescande streepjescode voor één regel: eerst kijken of we ze al
  // onthouden hebben (meteen, ook offline), anders online opzoeken via Open Food
  // Facts. De code blijft aan de regel hangen zodat ze bij het opslaan (met de
  // uiteindelijke naam + categorie) onthouden wordt.
  async function verwerkScan(sleutel: string, code: string) {
    setScanVoor(null)
    const onthouden = streepjescodes.find((s) => s.id === code)
    if (onthouden) {
      wijzigRegel(sleutel, { omschrijving: onthouden.naam, categorieId: onthouden.categorieId ?? '', code, nutriScore: onthouden.nutriScore })
      return
    }
    const gevonden = await zoekProduct(code)
    wijzigRegel(sleutel, { omschrijving: gevonden?.naam ?? '', categorieId: '', code, nutriScore: gevonden?.nutriScore })
  }

  function opBedragToets(e: KeyboardEvent<HTMLInputElement>, sleutel: string) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const idx = kassaRegels.findIndex((r) => r.sleutel === sleutel)
    if (idx < kassaRegels.length - 1) {
      // Niet de laatste regel: spring naar het zoekveld van de volgende regel.
      zoekRefs.current[kassaRegels[idx + 1].sleutel]?.focus()
    } else {
      // Laatste regel: alleen een nieuwe toevoegen als deze zinvol ingevuld is.
      const r = kassaRegels[idx]
      const c = invoerNaarCenten(r.bedrag)
      if ((r.omschrijving.trim() || r.categorieId) && Number.isFinite(c) && c > 0) {
        const nieuwSleutel = voegRegelToe()
        setTimeout(() => zoekRefs.current[nieuwSleutel]?.focus(), 0)
      }
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return

    let t: Transactie
    if (gesplitst) {
      const regels: TransactieRegel[] = kassaRegels
        .map((r) => ({ r, centen: invoerNaarCenten(r.bedrag) }))
        .filter(({ r, centen }) => Number.isFinite(centen) && centen > 0 && (r.omschrijving.trim() || r.categorieId))
        .map(({ r, centen }) => ({
          ...(r.categorieId ? { categorieId: r.categorieId } : {}),
          ...(r.omschrijving.trim() ? { omschrijving: r.omschrijving.trim() } : {}),
          bedrag: teken * centen,
        }))
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(regels.length > 0 ? { regels } : {}),
        ...(persoonIds.length > 0 ? { persoonIds } : {}),
      }
    } else {
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(categorieId ? { categorieId } : {}),
        ...(persoonIds.length > 0 ? { persoonIds } : {}),
      }
    }

    await onOpslaan(t)
    onthoudRekening(rekeningId)

    // Onthoud elke gescande regel (barcode -> naam + categorie + Nutri-Score), zodat
    // een volgende scan van hetzelfde product meteen werkt, ook offline.
    if (gesplitst && onOnthoudStreepjescode) {
      for (const r of kassaRegels) {
        if (r.code && r.omschrijving.trim()) {
          await onOnthoudStreepjescode({
            id: r.code,
            naam: r.omschrijving.trim(),
            ...(r.categorieId ? { categorieId: r.categorieId } : {}),
            ...(r.nutriScore ? { nutriScore: r.nutriScore } : {}),
          })
        }
      }
    }

    if (!bewerken) {
      setOmschrijving('')
      setBedrag('')
      setCategorieId('')
      setGesplitst(false)
      setKassaRegels([nieuweKassaRegel()])
    }
  }

  // Het voorstel wordt enkel getoond zolang je zelf nog niets gekozen hebt, en
  // nooit bij een gesplitst kassaticket (daar heeft elke regel zijn eigen categorie).
  const voorsteldId = !gesplitst && !categorieId && handelaarIndex ? voorstelCategorie(omschrijving, handelaarIndex) : null
  const voorstelNaam = voorsteldId ? labelVanCategorie(voorsteldId, categorieen) : undefined
  const voorstel = voorsteldId && voorstelNaam ? { id: voorsteldId, naam: voorstelNaam } : null

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldrij">
        <div className="veldgroep" style={{ flex: '2 1 220px' }}>
          <label className="label-caps" htmlFor="handelaar">{t('Handelaar / winkel')}</label>
          <HandelaarVeld id="handelaar" waarde={omschrijving} onWijzig={setOmschrijving} suggestiesBron={handelaars} />
        </div>

        <div className="veldgroep">
          <label className="label-caps" htmlFor="bedrag">{t('Bedrag (€)')}{gesplitst ? t(' — totaal van het ticket') : ''}</label>
          <input
            id="bedrag"
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
        </div>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
        <input type="checkbox" checked={gesplitst} onChange={(e) => setGesplitst(e.target.checked)} /> {t('Kassaticket splitsen')}
      </label>

      {!gesplitst ? (
        <>
          <CategorieKiezer
            waarde={categorieId || undefined}
            onKies={(id) => setCategorieId(id ?? '')}
            gebruikerCategorieen={categorieen}
            onNieuweSubcategorie={onNieuweSubcategorie}
          />

          {/* Boekte je deze handelaar eerder, dan stellen we die categorie voor.
              Bewust een voorstel en geen stille invulling: een verkeerd geraden
              categorie die je niet ziet, vervuilt je analyses maanden later. */}
          {voorstel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="rij-meta">{t('Vorige keer bij deze handelaar:')}</span>
              <button
                type="button"
                className="chip"
                aria-label={t('Gebruik {naam}, zoals de vorige keer', { naam: voorstel.naam })}
                onClick={() => setCategorieId(voorstel.id)}
              >
                {voorstel.naam}
              </button>
            </div>
          )}
        </>
      ) : (
        <Kaart compact style={{ background: 'var(--surface-2)' }}>
          {kassaRegels.map((r, i) => (
            <div key={r.sleutel} className="rij" style={{ flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <ItemZoeker
                  waarde={r.omschrijving}
                  onTekst={(tekst) => wijzigRegel(r.sleutel, { omschrijving: tekst, categorieId: '' })}
                  onKiesItem={(item) => wijzigRegel(r.sleutel, { categorieId: item.id, omschrijving: item.naam })}
                  categorieId={r.categorieId}
                  eigenCategorieen={categorieen}
                  // Breed taggen: een regel "diversen" zet je zo op 'Huishouden'.
                  // Stond er nog geen omschrijving, dan nemen we de naam van de
                  // hoofdcategorie over.
                  onKiesHoofdcategorie={(hoofdId, hoofdNaam) =>
                    wijzigRegel(r.sleutel, {
                      categorieId: hoofdId,
                      omschrijving: r.omschrijving.trim() || hoofdNaam,
                    })
                  }
                  onNieuweSubcategorie={onNieuweSubcategorie}
                  registerInput={(el) => {
                    zoekRefs.current[r.sleutel] = el
                  }}
                />
              </div>
              <button
                type="button"
                className="knop knop-icoon"
                aria-label={t('Scan streepjescode voor regel {n}', { n: i + 1 })}
                onClick={() => setScanVoor(r.sleutel)}
                title={t('Streepjescode scannen')}
              >
                📷
              </button>
              <input
                aria-label={t('Deelbedrag')}
                style={{ width: 96, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                inputMode="decimal"
                placeholder="0,00"
                value={r.bedrag}
                onChange={(e) => wijzigRegel(r.sleutel, { bedrag: e.target.value })}
                onKeyDown={(e) => opBedragToets(e, r.sleutel)}
              />
              {kassaRegels.length > 1 && (
                <button
                  type="button"
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder regel {n}', { n: i + 1 })}
                  onClick={() => verwijderRegel(r.sleutel)}
                >
                  ×
                </button>
              )}
              {r.nutriScore && (
                <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="label-caps">{t('Nutri-Score')}</span>
                  <NutriScoreBadge score={r.nutriScore} />
                </div>
              )}
            </div>
          ))}

          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={() => voegRegelToe()}>
              {t('+ Regel toevoegen')}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            {t('Verdeeld:')} <strong className="bedrag">{formatEuro(verdeeld)}</strong> {t('van')}{' '}
            <strong className="bedrag">{formatEuro(totaalCenten)}</strong>{' '}
            {Math.abs(verschil) < 1 ? (
              <span style={{ color: 'var(--positive)' }}>✓</span>
            ) : (
              <span className="bedrag" style={{ color: verschil < 0 ? 'var(--negative)' : 'var(--warn)' }}>
                {t('(nog {bedrag})', { bedrag: formatEuro(verschil) })}
              </span>
            )}
          </p>
        </Kaart>
      )}

      {/* Voor of door wie was deze uitgave? Verschijnt enkel als er gezinsleden
          ingesteld zijn, en is altijd optioneel. */}
      <GezinsledenKiezer
        label={t('Voor wie? (optioneel)')}
        waarden={persoonIds}
        onWijzig={setPersoonIds}
        gezinsleden={gezinsleden}
      />

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="datum">{t('Datum')}</label>
          <input id="datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="rekening">{t('Rekening')}</label>
          <select id="rekening" value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
            {rekeningen.map((r) => (
              <option key={r.id} value={r.id}>
                {r.naam}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="veldrij" style={{ gap: 18 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="radio" name="soort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> {t('Uitgave')}
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="radio" name="soort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> {t('Inkomst')}
        </label>
      </div>

      <div className="knoprij">
        <button type="submit" className="knop knop-primair" disabled={!geldig}>
          {bewerken ? t('Wijzigen') : t('Toevoegen')}
        </button>
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-secundair" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>

      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt.
          Zonder rekening kan een transactie nergens op geboekt worden, en dat is
          bij een gloednieuwe app het allereerste wat je moet doen. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {rekeningen.length === 0
            ? t('Maak eerst een rekening aan — een transactie moet ergens op geboekt worden.')
            : t('Geef een handelaar en een bedrag om op te slaan.')}
        </p>
      )}

      {scanVoor && (
        <Suspense fallback={null}>
          <BarcodeScanner onGevonden={(code) => void verwerkScan(scanVoor, code)} onSluiten={() => setScanVoor(null)} />
        </Suspense>
      )}
    </form>
  )
}
