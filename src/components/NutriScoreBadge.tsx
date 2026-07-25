// Een klein gekleurd Nutri-Score-label (A groen … E rood). De score is een letter
// 'a'..'e' (van Open Food Facts); onbekende waarden krijgen een neutrale kleur.
//
// LET OP: dit zijn de officiële Nutri-Score-kleuren. Ze liggen inhoudelijk vast
// (net zoals een verkeerslicht) en zijn dus bewust géén designtokens: ze mogen
// niet meeveranderen met het thema, anders klopt de betekenis niet meer.
const NUTRI_KLEUREN: Record<string, string> = {
  a: '#038141',
  b: '#85bb2f',
  c: '#fecb02',
  d: '#ee8100',
  e: '#e63e11',
}
// Witte letter op die vaste kleuren — hoort bij dezelfde vaste beeldtaal.
const NUTRI_LETTERKLEUR = '#ffffff'

export function NutriScoreBadge({ score }: { score: string }) {
  const s = score.toLowerCase()
  const bekend = NUTRI_KLEUREN[s]
  return (
    <span
      className="badge"
      aria-label={`Nutri-Score ${s.toUpperCase()}`}
      style={
        bekend
          ? { background: bekend, color: NUTRI_LETTERKLEUR, fontWeight: 700 }
          : { background: 'var(--surface-2)', color: 'var(--text-muted)', fontWeight: 700 }
      }
    >
      {s.toUpperCase()}
    </span>
  )
}
