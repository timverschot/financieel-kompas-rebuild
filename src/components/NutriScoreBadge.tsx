// Een klein gekleurd Nutri-Score-label (A groen … E rood). De score is een letter
// 'a'..'e' (van Open Food Facts); onbekende waarden krijgen een neutrale kleur.
const KLEUREN: Record<string, string> = {
  a: '#038141',
  b: '#85bb2f',
  c: '#fecb02',
  d: '#ee8100',
  e: '#e63e11',
}

export function NutriScoreBadge({ score }: { score: string }) {
  const s = score.toLowerCase()
  const kleur = KLEUREN[s] ?? '#888888'
  return (
    <span
      aria-label={`Nutri-Score ${s.toUpperCase()}`}
      style={{
        display: 'inline-block',
        minWidth: 22,
        height: 22,
        lineHeight: '22px',
        padding: '0 4px',
        textAlign: 'center',
        borderRadius: 5,
        background: kleur,
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '0.8rem',
      }}
    >
      {s.toUpperCase()}
    </span>
  )
}
