import { Kaart } from '../ui/basis'
import { useT } from '../i18n'
import type { DossierSoort } from '../utils/dossiersoort'

// De wegwijzer voor een lege Dossiers-pagina: wat kan je hier eigenlijk bijhouden?
//
// Deze kaart ontstond toen leningen en garanties nog op een eigen, verborgen pagina
// woonden en je maar moest raden dat ze bestonden. Nu de drie soorten als subtabs
// bovenaan de pagina staan, doet de tabstrook dat werk — en zou deze kaart er bij
// élk bezoek bij staan zonder nog iets toe te voegen.
//
// Daarom verschijnt ze alleen zolang je nog NIETS hebt: geen dossier, geen lening
// en geen aankoop met garantie. App.tsx beslist dat; deze component toont enkel wat
// ze krijgt. Klik je een soort aan, dan springt de app naar die subtab — vroeger
// gebeurde er bij 'Gedeelde kosten' letterlijk niets.
//
// Bewuste keuze die blijft gelden: we voegen de OPSLAG niet samen. Een lening en een
// garantie hebben een eigen recordvorm die goed werkt; ze in één dossiermodel persen
// zou de validatie van de verdeelsleutel verzwakken en een datamigratie vragen.

export type { DossierSoort }

export function NieuwDossierKiezer({ onKies }: { onKies: (soort: DossierSoort) => void }) {
  const { t } = useT()

  const soorten: { soort: DossierSoort; icoon: string; titel: string; uitleg: string }[] = [
    {
      soort: 'coouderschap',
      icoon: '👨‍👧',
      titel: t('Gedeelde kosten'),
      uitleg: t('Kosten verdelen met een co-ouder of ex-partner, met een verdeelsleutel en afrekeningen.'),
    },
    {
      soort: 'lening',
      icoon: '📄',
      titel: t('Lening of krediet'),
      uitleg: t('Geld dat jij uitleende of zelf leende, met terugbetalingen en openstaand kapitaal.'),
    },
    {
      soort: 'garantie',
      icoon: '🧾',
      titel: t('Aankoop met garantie'),
      uitleg: t('Een aankoop met bon of factuur, waarvan de app de garantieperiode bewaakt.'),
    },
  ]

  return (
    <Kaart titel={t('Nieuw dossier')} bijschrift={t('Wat wil je bijhouden?')}>
      <div className="veldrij">
        {soorten.map((s) => (
          <button
            key={s.soort}
            type="button"
            className="knop knop-secundair"
            onClick={() => onKies(s.soort)}
            style={{
              flex: '1 1 200px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              textAlign: 'left',
              padding: '14px 16px',
              minWidth: 0,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden style={{ fontSize: '1.2rem' }}>
                {s.icoon}
              </span>
              {s.titel}
            </span>
            <span className="rij-meta" style={{ fontWeight: 400, whiteSpace: 'normal' }}>
              {s.uitleg}
            </span>
          </button>
        ))}
      </div>
    </Kaart>
  )
}
