import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// Waar zet je wat? Een dossier voor gedeelde kosten (co-ouderschap), geld dat je
// uitleende of leende, of een aankoop met garantie — het zijn drie verschillende
// soorten, maar dat was tot nu toe nergens te zien: leningen en garanties stonden
// op een andere pagina zonder dat iets je daarheen wees.
//
// Bewuste keuze: we voegen de opslag NIET samen. Een lening en een garantie hebben
// een eigen vorm die goed werkt; ze samenpersen in één dossiermodel zou de
// validatie van de verdeelsleutel verzwakken en een datamigratie vragen. Wat we
// wél verenigen is het BEGIN van de flow: hier kies je de soort, en de app brengt
// je naar de juiste plek.

export type DossierSoort = 'coouderschap' | 'lening' | 'garantie'

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
