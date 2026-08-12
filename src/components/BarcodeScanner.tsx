import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
import { zoekProductenOpNaam, geldigeStreepjescode, ZOEK_VANAF_LETTERS, type OFFTreffer } from '../utils/openFoodFacts'
import { NutriScoreBadge } from './NutriScoreBadge'
import { useT } from '../i18n'

// "Product opzoeken" — drie wegen naar dezelfde gegevens (ronde 45).
//
// Tot deze ronde was er maar één weg: de camera. Die is op een iPhone de zwakste
// schakel — Safari heeft geen ingebouwde streepjescodelezer, dus de app moet elk
// beeld zelf ontcijferen. Lukte dat niet, dan stond je vast: de modaal had alleen
// een knop "Sluiten" en geen enkel alternatief.
//
// Nu staan de drie wegen onder elkaar in dezelfde modaal, want dat is precies waar
// je bent op het moment dat het scannen niet lukt:
//   1. de camera;
//   2. de streepjescode zelf intypen (die staat gewoon onder de streepjes);
//   3. zoeken op productnaam — dan heb je de camera helemaal niet nodig.
//
// Wat er aan de camera zelf verbeterd is:
//   - `BrowserMultiFormatOneDReader` in plaats van `BrowserMultiFormatReader`. De
//     eerste kent alleen streepjescodes; de tweede probeerde op élk beeld ook QR,
//     Aztec, PDF417 en DataMatrix. Dat is per beeld vier keer werk dat een
//     winkelproduct nooit oplevert, en op een telefoon zie je dat als traagheid.
//   - een scherper beeld gevraagd (1920 breed). De standaard is vaak 640×480, en
//     daarin zijn de dunne streepjes van een EAN-code simpelweg niet te
//     onderscheiden. Dit is 'ideal', dus een camera die het niet kan, weigert niet.
//   - continu scherpstellen waar de browser dat ondersteunt.

// LET OP: deze drie kleuren zijn bewust géén designtokens. Een camerabeeld leest
// enkel goed op een bijna-zwarte achtergrond met witte tekst, in licht én donker
// thema. Ze mogen dus niet met het thema meeveranderen.
const SCHERM_ACHTERGROND = 'rgba(0, 0, 0, 0.88)'
const VIDEO_ACHTERGROND = '#000000'
const SCHERM_TEKST = '#ffffff'

/** Wat de dialoog teruggeeft: ofwel enkel een code (dan zoekt de aanroeper zelf
 *  op), ofwel een volledig product dat al gevonden is. */
export type Productkeuze = { code?: string; naam?: string; nutriScore?: string }

export function BarcodeScanner({
  onGevonden,
  onSluiten,
}: {
  onGevonden: (keuze: Productkeuze) => void
  onSluiten: () => void
}) {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const onGevondenRef = useRef(onGevonden)
  onGevondenRef.current = onGevonden
  const [fout, setFout] = useState('')
  const [code, setCode] = useState('')
  const [zoek, setZoek] = useState('')
  const [treffers, setTreffers] = useState<OFFTreffer[]>([])
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    let controls: IScannerControls | null = null
    let gestopt = false
    // Alleen 1D-streepjescodes: dat is wat er op een winkelproduct staat.
    const reader = new BrowserMultiFormatOneDReader(undefined, {
      // Iets meer tijd tussen twee pogingen dan de standaard: op een telefoon is
      // het ontcijferen zwaar, en te vaak proberen maakt het beeld schokkerig
      // zonder dat het sneller leest.
      delayBetweenScanAttempts: 120,
    })
    void (async () => {
      try {
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              // Zonder deze twee levert de browser vaak 640×480, en daarin zijn de
              // dunne streepjes van een EAN-code niet te onderscheiden.
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              // Best effort: niet elke browser kent dit, en dan wordt het genegeerd.
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            },
          },
          videoRef.current!,
          (result) => {
            if (result && !gestopt) {
              gestopt = true
              onGevondenRef.current({ code: result.getText() })
            }
          },
        )
      } catch (e) {
        setFout(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      gestopt = true
      controls?.stop()
    }
  }, [])

  // De naamzoeker. Bewust met een korte pauze na de laatste toetsaanslag: anders
  // vertrekt er een verzoek per letter en staat er een lijst die drie keer per
  // seconde verspringt.
  useEffect(() => {
    const term = zoek.trim()
    if (term.length < ZOEK_VANAF_LETTERS) {
      setTreffers([])
      setBezig(false)
      return
    }
    setBezig(true)
    // `levend` is geen overdaad naast het afbreken. `zoekProductenOpNaam` vangt de
    // afbreekfout zélf op en geeft een lege lijst terug, dus het antwoord van een
    // AFGEBROKEN verzoek kwam gewoon binnen en zette "Niets gevonden" op het scherm
    // terwijl het nieuwe verzoek nog onderweg was.
    let levend = true
    const afbreken = new AbortController()
    const wacht = setTimeout(() => {
      void zoekProductenOpNaam(term, 8, afbreken.signal).then((uit) => {
        if (!levend) return
        setTreffers(uit)
        setBezig(false)
      })
    }, 350)
    return () => {
      levend = false
      clearTimeout(wacht)
      afbreken.abort()
    }
  }, [zoek])

  // Escape hoort de scanner te sluiten, niet de boeking eronder. De boekingspopup
  // luistert zelf ook op Escape, en zij stond er eerst — zonder deze handler in de
  // OPVANGFASE (met stopPropagation) gooide één druk op Escape je hele boeking weg,
  // met alles wat je al ingevuld had. De focus gaat bij het openen naar het
  // codeveld, zodat je meteen kan typen als het scannen niet lukt.
  const sluitRef = useRef(onSluiten)
  sluitRef.current = onSluiten
  useEffect(() => {
    function opToets(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      sluitRef.current()
    }
    document.addEventListener('keydown', opToets, true)
    return () => document.removeEventListener('keydown', opToets, true)
  }, [])

  const codeGeldig = geldigeStreepjescode(code)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Product opzoeken')}
      style={{
        position: 'fixed',
        inset: 0,
        background: SCHERM_ACHTERGROND,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        // De modaal is nu langer dan het scherm op een telefoon: drie wegen onder
        // elkaar. Zonder dit kan je er niet bij.
        overflowY: 'auto',
      }}
    >
      <p className="label-caps" style={{ color: SCHERM_TEKST, margin: 0 }}>
        {fout ? t('De camera doet het niet') : t('Richt de camera op de streepjescode')}
      </p>
      {/* Het beeldvlak blijft ALTIJD in de boom staan — ZXing heeft het element
          nodig — maar zodra de camera niet werkt, verdwijnt het uit beeld. Een
          zwart blok van een halve telefoonhoogte laten staan waar niets in te zien
          is, duwt precies datgene weg wat je op dat moment nodig hebt: de twee
          wegen zonder camera. */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 'var(--radius-lg)',
          background: VIDEO_ACHTERGROND,
          display: fout ? 'none' : 'block',
        }}
        muted
        playsInline
      />
      {fout ? (
        <p style={{ color: 'var(--negative)', maxWidth: 420, textAlign: 'center', margin: 0 }}>
          {t('Camera niet beschikbaar: {fout}', { fout })}
        </p>
      ) : (
        <p style={{ color: SCHERM_TEKST, opacity: 0.75, maxWidth: 420, textAlign: 'center', margin: 0, fontSize: 'var(--tekst-sm)' }}>
          {t('Houd de code een handbreedte van de lens en zorg voor licht. Lukt het niet? Typ de code of zoek op naam.')}
        </p>
      )}

      {/* De twee wegen zonder camera. Ze staan hier en niet op een ander scherm,
          want dit is precies waar je bent op het moment dat het scannen niet lukt. */}
      <div className="kaart" style={{ width: '100%', maxWidth: 420 }}>
        <label className="label-caps" htmlFor="scan-code">
          {t('Of typ de streepjescode')}
        </label>
        <div className="veldrij" style={{ marginTop: 6 }}>
          <input
            id="scan-code"
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('bijv. 5410041001008')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (codeGeldig) onGevonden({ code: code.replace(/\s/g, '') })
            }}
          />
          <button
            type="button"
            // `aria-disabled` en niet `disabled` (huisregel sinds ronde 41): een
            // uitgeschakelde knop is voor voorleessoftware onvindbaar, en dan hoor
            // je nooit waarom er niets gebeurt. De gedimde stand maakt het zichtbaar.
            className={'knop knop-secundair' + (codeGeldig ? '' : ' knop-uit')}
            aria-disabled={!codeGeldig}
            onClick={() => {
              if (!codeGeldig) return
              onGevonden({ code: code.replace(/\s/g, '') })
            }}
          >
            {t('Opzoeken')}
          </button>
        </div>
        {code.trim() !== '' && !codeGeldig && (
          <p className="rij-meta" style={{ margin: '4px 0 0' }}>
            {t('Een streepjescode heeft 8, 12, 13 of 14 cijfers.')}
          </p>
        )}

        <hr className="scheiding" />

        <label className="label-caps" htmlFor="scan-naam">
          {t('Of zoek op productnaam')}
        </label>
        <input
          id="scan-naam"
          style={{ display: 'block', width: '100%', marginTop: 6 }}
          autoComplete="off"
          placeholder={t('bijv. choco of volle melk')}
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
        />
        <p className="rij-meta" role="status" style={{ margin: '4px 0 0' }}>
          {bezig
            ? t('Zoeken…')
            : zoek.trim().length >= ZOEK_VANAF_LETTERS && treffers.length === 0
              ? t('Niets gevonden. Probeer een ander woord, of typ de omschrijving zelf.')
              : ''}
        </p>
        {treffers.length > 0 && (
          <ul className="lijst">
            {treffers.map((p) => (
              <li key={p.code} className="rij">
                <button
                  type="button"
                  className="rij-knop"
                  onClick={() => onGevonden({ code: p.code, naam: p.naam, nutriScore: p.nutriScore })}
                >
                  <span className="rij-midden">
                    <span className="rij-titel">{p.naam}</span>
                    <span className="rij-meta">{p.code}</span>
                  </span>
                  {p.nutriScore && <NutriScoreBadge score={p.nutriScore} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="knoprij">
        <button type="button" className="knop knop-primair" onClick={onSluiten}>
          {t('Sluiten')}
        </button>
      </div>
    </div>
  )
}

export default BarcodeScanner
