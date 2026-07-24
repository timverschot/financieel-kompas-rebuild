import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { useT } from '../i18n'

// Cameramodaal om een streepjescode te scannen (ZXing). Werkt op iOS én Android
// (via getUserMedia, met de achtercamera). De camera wordt netjes gestopt zodra de
// modaal sluit. Deze component wordt lui geladen, zodat de scanbibliotheek de
// app-start niet belast.
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
        background: 'rgba(0,0,0,0.85)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <p style={{ color: '#fff', marginTop: 0 }}>{t('Richt de camera op de streepjescode')}</p>
      <video ref={videoRef} style={{ width: '100%', maxWidth: 420, borderRadius: 12, background: '#000' }} muted playsInline />
      {fout && <p style={{ color: '#ffb4b4', maxWidth: 420, textAlign: 'center' }}>{t('Camera niet beschikbaar: {fout}', { fout })}</p>}
      <button
        type="button"
        onClick={onSluiten}
        style={{ marginTop: '1rem', padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: '#fff', cursor: 'pointer' }}
      >
        {t('Sluiten')}
      </button>
    </div>
  )
}

export default BarcodeScanner
