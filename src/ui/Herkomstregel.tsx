// Eén regel die zegt wat een cijfer betekent: een badge met de uitkomst, en
// ernaast één zin die verantwoordt waar ze vandaan komt (ronde 69).
//
// WAAROM DIT EEN COMPONENT IS. BalansRegel, BufferRegel en VermogenRegel hadden
// alle drie dezelfde acht regels opmaak staan — met dezelfde inline stijl, tot en
// met de opmerking waarom `flexDirection: 'row'` erbij moet. Drie kopieën betekent
// dat een verbetering aan de vorm er twee vergeet, en dat een vierde regel die er
// later bij komt de kopie overneemt inclusief wat er intussen aan mankeerde.
//
// De componenten zelf houden wat écht van hen is: welk cijfer, welke drempel en
// welke zin. Alleen de vorm zit hier.

import type { ReactNode } from 'react'

/** Welke betekenis de badge draagt. De klassenamen staan in index.css. */
export type Herkomsttoon = 'ok' | 'let-op' | 'info' | 'neutraal'

const TOONKLASSE: Record<Herkomsttoon, string> = {
  ok: 'badge badge-ok',
  'let-op': 'badge badge-laat',
  info: 'badge badge-info',
  neutraal: 'badge badge-neutraal',
}

export function Herkomstregel({
  badge,
  toon,
  kaal = false,
  children,
  ...rest
}: {
  /** De korte uitkomst, links: "Overschot", "3 maanden buffer", "Netto vermogen € …". */
  badge: ReactNode
  toon: Herkomsttoon
  /** Zonder eigen kaartvlak, voor gebruik binnen een groter blok. */
  kaal?: boolean
  /** De zin ernaast: waar het cijfer vandaan komt en wat er niet in zit. */
  children: ReactNode
} & { [sleutel: `data-${string}`]: string | boolean | undefined }) {
  return (
    // LET OP: `.kaart` is in index.css een flex-KOLOM. Zonder `flexDirection: 'row'`
    // blijft die kolomrichting staan, en dan centreert `alignItems: 'center'`
    // horizontaal — de badge kwam bovenop de tekst te staan in plaats van ernaast.
    <div
      className={kaal ? undefined : 'kaart kaart-compact'}
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
      {...rest}
    >
      <span className={TOONKLASSE[toon]}>{badge}</span>
      {/* `minWidth` dwingt de zin naar een eigen regel zodra ze naast de badge te
          smal zou worden. Eén waarde voor alle drie: ze stonden op 200 en 220, en
          dat verschil was geen keuze maar een kopieerfout. */}
      <span className="rij-meta" style={{ flex: 1, minWidth: 220 }}>
        {children}
      </span>
    </div>
  )
}
