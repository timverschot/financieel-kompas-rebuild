// Design-tokens: kleuren, spacing en radii op één centrale plek. Dit is bewust
// géén herontwerp — de waarden zijn dezelfde die eerder overal los ingebakken
// stonden. Door ze hier te bundelen kan de latere visuele pass (en dark mode)
// in één keer gebeuren i.p.v. op honderd plekken.

export const kleur = {
  tekst: '#222',
  zwak: '#888',
  zwakker: '#999',
  lijn: '#f0f0f0',
  lijnSterk: '#eee',
  positief: '#27ae60', // inkomsten / ok
  negatief: '#c0392b', // uitgaven / verwijderen
  waarschuwing: '#e67e22',
  accent: '#2c6cb0', // knoppen/links
  vlak: '#f7f7f7',
  vlakBlauw: '#eef2f7',
  vlakGroen: '#eef7ee',
  foutVlak: '#fff5f5',
  foutLijn: '#f5c6cb',
} as const

export const ruimte = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
} as const

export const radius = {
  sm: 4,
  md: 8,
} as const
