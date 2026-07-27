import { useState } from 'react'
import type { CSSProperties } from 'react'
import { indexatie, tekstNaarGetal, formatProcent, type IndexatieSoort } from '../utils/rekenhulp'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// De uitkomst krijgt een zacht amberen vlak: het is het antwoord van de rekenhulp,
// niet zomaar een regel tekst. De andere rekenhulpen gebruiken hetzelfde vlak,
// daarom staat het hier één keer en wordt het geëxporteerd.
export const uitkomstVlak: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--accent-soft)',
  color: 'var(--accent-ink)',
  fontWeight: 600,
}

// Kleine bijregel binnen dat amberen vlak (de toelichting onder het hoofdcijfer).
export const uitkomstBijregel: CSSProperties = { margin: '6px 0 0', fontSize: 'var(--tekst-s)', fontWeight: 500 }

/**
 * Rekenhulp voor de Belgische indexatie. Alimentatie en huur gebruiken exact
 * dezelfde formule (basisbedrag × nieuwe index / aanvangsindex); enkel de uitleg
 * en de gebruikte indexreeks verschillen. Rekent live mee; bewaart niets.
 */
export function IndexatieCalculator() {
  const { t } = useT()
  const [soort, setSoort] = useState<IndexatieSoort>('alimentatie')
  const [basis, setBasis] = useState('')
  const [aanvang, setAanvang] = useState('')
  const [nieuw, setNieuw] = useState('')

  const uitkomst = indexatie(invoerNaarCenten(basis), tekstNaarGetal(aanvang), tekstNaarGetal(nieuw))
  // Zolang er nog niets ingevuld is, tonen we geen foutmelding — dat zou de
  // gebruiker beknorren voor een leeg formulier.
  const ingevuld = basis.trim() !== '' && aanvang.trim() !== '' && nieuw.trim() !== ''

  return (
    <Kaart
      // Ronde 32: één vaste titel. De titel wisselde mee met de gekozen tab
      // ("Huurindexatie" / "Alimentatie-indexatie"), terwijl de tabs er vlak onder
      // al staan — de kop herhaalde dus wat je zelf net had aangeklikt. "Indexatie-
      // tools" zegt wat de kaart IS; de tabs zeggen welke je gebruikt.
      titel={t('Indexatie-tools')}
      bijschrift={
        soort === 'huur'
          ? t('Geïndexeerde huur = basishuur × nieuwe index / aanvangsindex (Belgische formule).')
          : t('Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).')
      }
    >
      <div className="knoprij" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={soort === 'alimentatie' ? 'chip chip-actief' : 'chip'}
          aria-pressed={soort === 'alimentatie'}
          onClick={() => setSoort('alimentatie')}
        >
          {t('Alimentatie')}
        </button>
        <button
          type="button"
          className={soort === 'huur' ? 'chip chip-actief' : 'chip'}
          aria-pressed={soort === 'huur'}
          onClick={() => setSoort('huur')}
        >
          {t('Huur')}
        </button>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }}>
        {soort === 'huur'
          ? t('Voor huur gebruik je de gezondheidsindex: de aanvangsindex is die van de maand vóór de ondertekening van het huurcontract.')
          : t('Voor onderhoudsgeld is de aanvangsindex die van de maand waarin het bedrag werd vastgelegd.')}
      </p>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="basisbedrag">
            {t('Basisbedrag (€)')}
          </label>
          <input id="basisbedrag" inputMode="decimal" value={basis} onChange={(e) => setBasis(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="aanvangsindex">
            {t('Aanvangsindex')}
          </label>
          <input id="aanvangsindex" inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="nieuweindex">
            {t('Nieuwe index')}
          </label>
          <input id="nieuweindex" inputMode="decimal" value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        </div>
      </div>

      {uitkomst.ok && (
        <div style={{ ...uitkomstVlak, marginTop: 14 }}>
          <p style={{ margin: 0 }}>{t('Geïndexeerd bedrag: {bedrag}', { bedrag: formatEuro(uitkomst.waarde.nieuwBedragCenten) })}</p>
          <p style={uitkomstBijregel}>
            {uitkomst.waarde.verschilCenten === 0
              ? t('Het bedrag blijft gelijk.')
              : uitkomst.waarde.verschilCenten > 0
                ? t('Dat is {verschil} meer ({procent}).', {
                    verschil: formatEuro(uitkomst.waarde.verschilCenten),
                    procent: formatProcent(uitkomst.waarde.stijgingProcent, 2),
                  })
                : t('Dat is {verschil} minder ({procent}).', {
                    verschil: formatEuro(Math.abs(uitkomst.waarde.verschilCenten)),
                    procent: formatProcent(Math.abs(uitkomst.waarde.stijgingProcent), 2),
                  })}
          </p>
        </div>
      )}

      {!uitkomst.ok && ingevuld && (
        <p style={{ margin: '14px 0 0', fontSize: 'var(--tekst-s)', color: 'var(--negative-ink)' }}>
          {uitkomst.fout === 'index-ongeldig'
            ? t('Vul twee indexcijfers groter dan nul in.')
            : t('Vul een basisbedrag groter dan nul in.')}
        </p>
      )}
    </Kaart>
  )
}
