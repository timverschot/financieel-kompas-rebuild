import type { CSSProperties } from 'react'

// Het Kompal-merkteken, CSS-gerenderd (geen afbeelding, dus overal scherp en
// thema-onafhankelijk). Een ronde munt: een amber → blauw → amber ring, een
// donkere kern met een witte custom-K (Bricolage Grotesque) en een gloeiende
// amberkern-stip ernaast. Naar het Claude Design-systeem ("V2 · Amberrand").
// Alle maten schalen mee met `grootte`, zodat hetzelfde teken klopt in de
// bovenbalk (klein) en op grotere plaatsen.
export function Merkteken({ grootte = 32, titel = 'Kompal' }: { grootte?: number; titel?: string }) {
  const s = grootte
  const kern = Math.round(s * 0.8)
  const kFont = Math.round(s * 0.5)
  const stip = Math.max(3, Math.round(s * 0.11))

  const buiten: CSSProperties = {
    width: s,
    height: s,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    background:
      'conic-gradient(from 208deg, #F0A63C 0%, #F0A63C 30%, #4A6E9B 50%, #F0A63C 70%, #F0A63C 100%)',
    boxShadow: '0 2px 8px rgba(201,118,26,0.35)',
  }
  const munt: CSSProperties = {
    width: kern,
    height: kern,
    borderRadius: '50%',
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    background: 'radial-gradient(130% 130% at 28% 18%, #2E3846 0%, #161C24 55%, #0B0F14 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
  }
  const kLetter: CSSProperties = {
    fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Grotesque', sans-serif",
    fontWeight: 800,
    fontSize: kFont,
    lineHeight: 1,
    color: '#F4EFE6',
    letterSpacing: '-0.04em',
    transform: `translateX(-${Math.round(s * 0.055)}px)`,
  }
  const kern2: CSSProperties = {
    position: 'absolute',
    width: stip,
    height: stip,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #FFD08A, #F0A63C 60%, #C97A15)',
    boxShadow: '0 0 8px rgba(240,166,60,0.75)',
    transform: `translate(-${Math.round(s * 0.22)}px, ${Math.round(s * 0.02)}px)`,
  }

  return (
    <span role="img" aria-label={titel} style={buiten}>
      <span style={munt} aria-hidden>
        <span style={kLetter}>K</span>
        <span style={kern2} />
      </span>
    </span>
  )
}
