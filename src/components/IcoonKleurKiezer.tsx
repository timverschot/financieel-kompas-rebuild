import { useT } from '../i18n'
import { PALET } from '../ui/palet'

// Kiezer voor een icoon (emoji) en een kleur. Bewust los van het
// categorieformulier: een volgende ronde kan hem net zo goed voor spaardoelen of
// dossiers gebruiken. Beide keuzes zijn optioneel — niets kiezen mag.
//
// Waarom een vast roostertje en geen vrij emoji-veld: op een telefoon opent dat
// het emoji-toetsenbord, maar op een computer moet je dan zelf een teken gaan
// zoeken en plakken. Een rooster met bruikbare tekens is op beide sneller. Voor
// wie tóch iets anders wil, staat er een klein invoerveld naast.

export type IcoonKeuze = { icoon: string; naam: string }
export type KleurKeuze = { kleur: string; naam: string }

// Een dertigtal tekens die passen bij een huishoudbudget. De namen zijn er voor
// de schermlezer (en dus vertaalbaar); het teken zelf is taalonafhankelijk.
export const ICOON_KEUZES: IcoonKeuze[] = [
  { icoon: '🍽️', naam: 'Eten' },
  { icoon: '🛒', naam: 'Boodschappen' },
  { icoon: '☕', naam: 'Drank' },
  { icoon: '🏠', naam: 'Huis' },
  { icoon: '💡', naam: 'Energie' },
  { icoon: '🧹', naam: 'Huishouden' },
  { icoon: '🚗', naam: 'Auto' },
  { icoon: '⛽', naam: 'Brandstof' },
  { icoon: '🚆', naam: 'Openbaar vervoer' },
  { icoon: '🚲', naam: 'Fiets' },
  { icoon: '❤️', naam: 'Gezondheid' },
  { icoon: '💊', naam: 'Apotheek' },
  { icoon: '🦷', naam: 'Tandarts' },
  { icoon: '🎓', naam: 'School' },
  { icoon: '📚', naam: 'Boeken' },
  { icoon: '👶', naam: 'Kinderen' },
  { icoon: '⚽', naam: 'Sport' },
  { icoon: '🎬', naam: 'Ontspanning' },
  { icoon: '🎁', naam: 'Cadeau' },
  { icoon: '✈️', naam: 'Reizen' },
  { icoon: '🏖️', naam: 'Vakantie' },
  { icoon: '👕', naam: 'Kleding' },
  { icoon: '💇', naam: 'Verzorging' },
  { icoon: '🐾', naam: 'Huisdier' },
  { icoon: '🔧', naam: 'Gereedschap' },
  { icoon: '🪴', naam: 'Tuin' },
  { icoon: '📱', naam: 'Telefoon' },
  { icoon: '💻', naam: 'Internet' },
  { icoon: '🔁', naam: 'Abonnement' },
  { icoon: '🛡️', naam: 'Verzekering' },
  { icoon: '🏦', naam: 'Bank' },
  { icoon: '🐷', naam: 'Spaarpot' },
  { icoon: '💶', naam: 'Inkomen' },
  { icoon: '📄', naam: 'Administratie' },
]

// Exact de twaalf kleuren die de ingebouwde hoofdcategorieën gebruiken, zodat een
// eigen categorie in de grafieken niet uit de toon valt. Hier staan ze bewust als
// hexcode (het ís de data die we opslaan, geen opmaak van het thema).
// De twaalf kleuren staan sinds ronde 20 in src/ui/palet.ts, samen met het palet
// dat de diagrammen gebruiken. Twee lijsten die uit elkaar konden lopen, zijn nu één.
export const KLEUR_KEUZES: KleurKeuze[] = PALET

const MAX_TEKENS = 8 // zelfde grens als het schema (icoon: max 8 tekens)

// Dezelfde zachte tint als in de transactielijst: 18 % kleur, de rest
// doorzichtig. Zo kleurt het vlakje mee met de kaart eronder en blijft het ook in
// donkere modus rustig. Kent een browser color-mix niet, dan valt de stijl weg en
// blijft de standaardachtergrond van .rij-teken staan.
export function zachteTint(kleur: string | undefined): string | undefined {
  if (!kleur) return undefined
  return `color-mix(in srgb, ${kleur} 18%, transparent)`
}

// Het teken in het voorbeeldvlakje: het gekozen icoon, anders de beginletter van
// de naam, en anders een vraagteken (er is dan nog niets ingevuld).
export function voorbeeldTeken(icoon: string | undefined, naam: string): string {
  const gekozen = (icoon ?? '').trim()
  if (gekozen) return gekozen
  const letter = naam.trim().slice(0, 1).toUpperCase()
  return letter || '?'
}

export function IcoonKleurKiezer({
  icoon,
  kleur,
  onIcoon,
  onKleur,
  naam = '',
  idVoorvoegsel = 'icoonkleur',
  voorbeeldTekst,
}: {
  /** Het gekozen icoon, of undefined wanneer er geen gekozen is. */
  icoon?: string
  /** De gekozen kleur als #rrggbb, of undefined. */
  kleur?: string
  onIcoon: (waarde: string | undefined) => void
  onKleur: (waarde: string | undefined) => void
  /** Naam van het item; enkel voor de beginletter in het voorbeeld. */
  naam?: string
  /** Voorvoegsel voor veld-id's, zodat twee kiezers op één pagina niet botsen. */
  idVoorvoegsel?: string
  /** Uitleg naast het voorbeeld. Standaard: de transactielijst. */
  voorbeeldTekst?: string
}) {
  const { t } = useT()
  const tekenVeldId = `${idVoorvoegsel}-teken`
  const gekozenIcoon = (icoon ?? '').trim()
  const gekozenKleurNaam = KLEUR_KEUZES.find((k) => k.kleur === kleur)?.naam
  const gekozenIcoonNaam = ICOON_KEUZES.find((i) => i.icoon === gekozenIcoon)?.naam

  return (
    <div className="stapel" style={{ gap: 12 }}>
      {/* Voorbeeld: exact het vierkantje zoals de transactielijst het tekent. */}
      <div className="veldgroep">
        <span className="label-caps">{t('Voorbeeld')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="rij-teken" aria-hidden="true" style={{ backgroundColor: zachteTint(kleur) }}>
            {voorbeeldTeken(icoon, naam)}
          </span>
          <span className="rij-meta">{voorbeeldTekst ?? t('Zo verschijnt ze straks in de transactielijst.')}</span>
        </div>
      </div>

      {/* Iconen */}
      <div className="veldgroep">
        <span className="label-caps" id={`${idVoorvoegsel}-icoonlabel`}>
          {t('Icoon')}
        </span>
        <div
          role="group"
          aria-labelledby={`${idVoorvoegsel}-icoonlabel`}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          {ICOON_KEUZES.map((keuze) => {
            const actief = keuze.icoon === gekozenIcoon
            return (
              <button
                key={keuze.icoon}
                type="button"
                className="knop knop-icoon"
                aria-pressed={actief}
                aria-label={t('Kies icoon {icoon}', { icoon: t(keuze.naam) })}
                onClick={() => onIcoon(actief ? undefined : keuze.icoon)}
                style={
                  actief
                    ? { borderColor: 'var(--accent)', borderWidth: 2, background: 'var(--accent-soft)' }
                    : undefined
                }
              >
                <span aria-hidden="true">{keuze.icoon}</span>
              </button>
            )
          })}
        </div>
        <p className="rij-meta" style={{ margin: 0 }}>
          {gekozenIcoon
            ? t('Gekozen icoon: {icoon}', { icoon: gekozenIcoonNaam ? t(gekozenIcoonNaam) : gekozenIcoon })
            : t('Nog geen icoon gekozen.')}
        </p>
      </div>

      {/* Eigen teken, voor wie iets anders wil plakken. */}
      <div className="veldgroep" style={{ maxWidth: 160 }}>
        <label className="label-caps" htmlFor={tekenVeldId}>
          {t('Eigen teken')}
        </label>
        <input
          id={tekenVeldId}
          value={icoon ?? ''}
          maxLength={MAX_TEKENS}
          placeholder={t('bv. 🧺')}
          onChange={(e) => {
            const waarde = e.target.value.slice(0, MAX_TEKENS)
            onIcoon(waarde.trim() ? waarde : undefined)
          }}
        />
      </div>

      {/* Kleuren */}
      <div className="veldgroep">
        <span className="label-caps" id={`${idVoorvoegsel}-kleurlabel`}>
          {t('Kleur')}
        </span>
        <div
          role="group"
          aria-labelledby={`${idVoorvoegsel}-kleurlabel`}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          {KLEUR_KEUZES.map((keuze) => {
            const actief = keuze.kleur === kleur
            return (
              <button
                key={keuze.kleur}
                type="button"
                className="knop knop-icoon"
                aria-pressed={actief}
                aria-label={t('Kies kleur {kleur}', { kleur: t(keuze.naam) })}
                onClick={() => onKleur(actief ? undefined : keuze.kleur)}
                style={{
                  background: keuze.kleur,
                  // De gekozen staal krijgt een dikke donkere rand én een vinkje:
                  // wie kleuren slecht onderscheidt, ziet zo evengoed wat aanstaat.
                  borderColor: actief ? 'var(--text)' : 'var(--border-strong)',
                  borderWidth: actief ? 3 : 1,
                  color: 'var(--on-accent)',
                }}
              >
                <span aria-hidden="true">{actief ? '✓' : ''}</span>
              </button>
            )
          })}
        </div>
        <p className="rij-meta" style={{ margin: 0 }}>
          {kleur
            ? t('Gekozen kleur: {kleur}', { kleur: gekozenKleurNaam ? t(gekozenKleurNaam) : kleur })
            : t('Nog geen kleur gekozen — de grafiek gebruikt dan haar standaardkleur.')}
        </p>
      </div>
    </div>
  )
}
