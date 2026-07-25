import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { useT } from '../i18n'

// Cameramodaal om een streepjescode te scannen (ZXing). Werkt op iOS én Android
// (via getUserMedia, met de achtercamera). De camera wordt netjes gestopt zodra de
// modaal sluit. Deze component wordt lui geladen, zodat de scanbibliotheek de
// app-start niet belast.

// LET OP: deze drie kleuren zijn bewust géén designtokens. Een camerabeeld leest
// enkel goed op een bijna-zwarte achtergrond met witte tekst, in licht én donker
// thema. Ze mogen dus niet met het thema meeveranderen.
const SCHERM_ACHTERGROND = 'rgba(0, 0, 0, 0.88)'
const VIDEO_ACHTERGROND = '#000000'
const SCHERM_TEKST = '#ffffff'

export function BarcodeScanner({
  onGevonden,
  onSluiten,
}: {
  onGevonden: (code: string) => void
  onSluiten: () => void
}) {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const onGevondenRef = useRef(onGevonden)
  onGevondenRef.current = onGevonden
  const [fout, setFout] = useState('')

  useEffect(() => {
    let controls: IScannerControls | null = null
    let gestopt = false
    const reader = new BrowserMultiFormatReader()
    void (async () => {
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result) => {
            if (result && !gestopt) {
              gestopt = true
              onGevondenRef.current(result.getText())
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

  return (
    <div
      role="dialog"
      aria-label={t('Streepjescode scannen')}
      style={{
        position: 'fixed',
        inset: 0,
        background: SCHERM_ACHTERGROND,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 20,
      }}
    >
      <p className="label-caps" style={{ color: SCHERM_TEKST, margin: 0 }}>
        {t('Richt de camera op de streepjescode')}
      </p>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 'var(--radius-lg)',
          background: VIDEO_ACHTERGROND,
        }}
        muted
        playsInline
      />
      {fout && (
        <p style={{ color: 'var(--negative)', maxWidth: 420, textAlign: 'center', margin: 0 }}>
          {t('Camera niet beschikbaar: {fout}', { fout })}
        </p>
      )}
      <div className="knoprij">
        <button type="button" className="knop knop-primair" onClick={onSluiten}>
          {t('Sluiten')}
        </button>
      </div>
    </div>
  )
}

export default BarcodeScanner
