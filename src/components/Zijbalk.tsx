import type { CSSProperties } from 'react'
import { PAGINAS, type Pagina } from './OnderNavigatie'
import { Merkteken } from './Merkteken'
import { VERSIE } from '../config'
import { THEMAKEUZES, useThema } from '../thema'
import { useT } from '../i18n'

// Vast zijpaneel voor brede schermen (desktop/laptop), naar de V1-logica: merk
// bovenaan, de volledige navigatie eronder, en onderaan een rustige voetregel met
// de sync-status, de licht/donker-schakelaar en het versienummer. Op smalle
// schermen wordt dit niet getoond (dan is er de onderbalk); App.tsx beslist dat.
//
// De kleuren komen uit de --sidebar-*-tokens. Die staan in index.css apart voor
// licht en donker, zodat het paneel in donkere modus mee verduistert in plaats van
// als een warm bruin blok naast een donkere pagina te blijven staan.
const paneel: CSSProperties = {
  width: 240,
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--sidebar-bg)',
  color: 'var(--sidebar-text)',
  borderRight: '1px solid var(--border)',
}
// Hairline tussen kop, navigatie en voetregel, in dezelfde amberzweem als de
// actieve staat — zo blijft alles binnen de tokens.
const hairline = '1px solid var(--sidebar-active-bg)'

// Kleur van het sync-bolletje. Vier toestanden, zoals in V1: bezig, fout,
// opgeslagen, of niet verbonden.
function statusKleur(verbonden: boolean, bezig: boolean, fout: boolean): string {
  if (bezig) return 'var(--accent-dot)'
  if (fout) return 'var(--negative)'
  if (verbonden) return 'var(--positive)'
  return 'var(--sidebar-muted)'
}

export function Zijbalk({
  actief,
  onKies,
  verbonden = false,
  bezig = false,
  statusTekst = null,
}: {
  actief: Pagina
  onKies: (p: Pagina) => void
  verbonden?: boolean
  bezig?: boolean
  statusTekst?: string | null
}) {
  const { t } = useT()
  const { keuze, zetKeuze } = useThema()

  const fout = statusTekst !== null && /mislukt|fout/i.test(statusTekst)
  const statusLabel = bezig
    ? t('Bezig met synchroniseren…')
    : fout
      ? t('Synchronisatie mislukt')
      : verbonden
        ? t('Opgeslagen')
        : t('Niet verbonden')

  return (
    <aside style={paneel} aria-label={t('Hoofdnavigatie')}>
      {/* De kop begint bewust op 1,3rem van links, zodat het merkteken optisch
          uitlijnt met de icoontjes in de navigatie eronder. */}
      {/* Ronde 32: het merk is een knop naar Overzicht geworden. Dat is wat een
          logo linksboven overal doet, en het was hier de enige plek waar erop
          klikken niets deed. Het uiterlijk verandert niet — zie `.merkknop`. */}
      <button
        type="button"
        className="merkknop"
        aria-label={t('Naar Overzicht')}
        onClick={() => onKies('overzicht')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '1.7rem 1rem 1.15rem 1.3rem',
          borderBottom: hairline,
          width: '100%',
        }}
      >
        <Merkteken grootte={38} />
        <span style={{ minWidth: 0 }}>
          <strong
            style={{
              color: 'var(--sidebar-active-text)',
              display: 'block',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Kompal
          </strong>
          <span style={{ fontSize: '0.7rem', color: 'var(--sidebar-muted)' }}>{t('je financieel kompas')}</span>
        </span>
      </button>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.5rem' }}>
        {PAGINAS.map((p) => {
          const aan = p.id === actief
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onKies(p.id)}
              aria-current={aan ? 'page' : undefined}
              aria-label={t(p.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                width: '100%',
                minHeight: 44,
                padding: '0.55rem 0.8rem',
                marginBottom: 2,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: aan ? 'var(--sidebar-active-bg)' : 'transparent',
                color: aan ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                fontFamily: 'inherit',
                fontWeight: aan ? 600 : 400,
                fontSize: '0.92rem',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1.35rem', width: 26, textAlign: 'center', lineHeight: 1 }} aria-hidden>
                {p.icoon}
              </span>
              {t(p.label)}
            </button>
          )
        })}
      </nav>

      {/* Voetregel: geen nep-profiel meer, maar de informatie die je echt af en toe
          wil zien — synchronisatie, licht/donker en welke versie je draait. */}
      <div style={{ padding: '0.85rem 1rem 1rem 1.3rem', borderTop: hairline, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--sidebar-muted)' }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              background: statusKleur(verbonden, bezig, fout),
            }}
          />
          {statusLabel}
        </span>

        <span style={{ display: 'flex', gap: 4 }} role="group" aria-label={t('Weergave')}>
          {THEMAKEUZES.map((k) => {
            const aan = k.waarde === keuze
            return (
              <button
                key={k.waarde}
                type="button"
                onClick={() => zetKeuze(k.waarde)}
                aria-pressed={aan}
                aria-label={t(k.label)}
                style={{
                  flex: 1,
                  minHeight: 30,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.72rem',
                  fontWeight: aan ? 600 : 400,
                  background: aan ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: aan ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)',
                }}
              >
                {t(k.label)}
              </button>
            )
          })}
        </span>

        <span style={{ fontSize: '0.68rem', color: 'var(--sidebar-muted)' }}>{t('Versie {v}', { v: VERSIE })}</span>
      </div>
    </aside>
  )
}
