import { useState } from 'react'
import type {
  Categorie,
  Dossier,
  DossierDocument,
  GedeeldeKost,
  Kind,
  Overboeking,
  Rekening,
  Streepjescode,
  TerugkerendePost,
  Transactie,
} from '../data/schema'
import { Dialoog } from '../ui/Dialoog'
import { TransactieFormulier } from './TransactieFormulier'
import { TerugkerendePostFormulier } from './TerugkerendePostFormulier'
import { OverboekingFormulier } from './OverboekingFormulier'
import type { HandelaarIndex } from '../utils/categorieVoorstel'
import { useT } from '../i18n'

// Eén plek om iets in te boeken, waar je ook staat in de app.
//
// Waarom dit er komt: tot nu toe was "iets toevoegen" een navigatie. De ➕ bracht je
// naar de Transacties-pagina, waar het formulier bovenaan (of op desktop in een
// kolom rechts) stond. Wilde je een vaste last inboeken, dan moest je naar Budget;
// wilde je sparen, dan naar Rekeningen en daar naar beneden scrollen. Drie plekken
// voor wat in je hoofd één handeling is: "er is geld bewogen".
//
// Nu opent één popup, en kies je bovenaan wélke soort. Dat is niet louter cosmetisch:
// er zitten drie verschillende soorten records achter, en die kende je vroeger alleen
// als je wist waar ze woonden.
//
//  - **Uitgave** en **Inkomst** maken een `Transactie` (met minteken, of niet).
//  - **Vaste last** maakt een `TerugkerendePost` — een afspraak die elke maand
//    terugkomt, geen eenmalige boeking.
//  - **Sparen** maakt een `Overboeking` — geld dat van de ene eigen rekening naar
//    de andere schuift, en dus géén uitgave is en nergens in een budget meetelt.
//
// De formulieren zelf zijn de bestaande, ongewijzigde formulieren. Deze popup kiest
// er één en geeft door wanneer er opgeslagen is; ze kent de invoerlogica niet. Zo
// blijft er precies één versie van "hoe boek je een transactie" bestaan.

export type Boekingsoort = 'uitgave' | 'inkomst' | 'vast' | 'sparen'

type Soortknop = { soort: Boekingsoort; label: string; teken: string; titel: string }

// Volgorde is bewust: de twee die je dagelijks gebruikt eerst.
export const SOORTEN: Soortknop[] = [
  { soort: 'uitgave', label: 'Uitgave', teken: '−', titel: 'Uitgave toevoegen' },
  { soort: 'inkomst', label: 'Inkomst', teken: '+', titel: 'Inkomst toevoegen' },
  { soort: 'vast', label: 'Vaste last', teken: '↻', titel: 'Vaste last toevoegen' },
  { soort: 'sparen', label: 'Sparen', teken: '⇄', titel: 'Sparen' },
]

export function BoekingDialoog({
  open,
  onSluiten,
  beginSoort = 'uitgave',
  rekeningen,
  categorieen,
  handelaars,
  handelaarIndex,
  streepjescodes = [],
  onOnthoudStreepjescode,
  onNieuweSubcategorie,
  gezinsleden = [],
  overboekingen,
  transacties,
  dossiers = [],
  onTransactie,
  onVastePost,
  onOverboeking,
  onDossierKost,
  onBon,
}: {
  open: boolean
  onSluiten: () => void
  beginSoort?: Boekingsoort
  rekeningen: Rekening[]
  categorieen: Categorie[]
  handelaars: string[]
  handelaarIndex?: HandelaarIndex
  streepjescodes?: Streepjescode[]
  onOnthoudStreepjescode?: (s: Streepjescode) => Promise<void> | void
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
  gezinsleden?: Kind[]
  overboekingen: Overboeking[]
  transacties: Transactie[]
  /** De dossiers waarin een uitgave meteen gedeeld kan worden. */
  dossiers?: Dossier[]
  onTransactie: (t: Transactie) => Promise<void> | void
  onVastePost: (p: TerugkerendePost) => Promise<void> | void
  onOverboeking: (o: Overboeking) => Promise<void> | void
  /** De gedeelde kost die bij de zonet geboekte uitgave hoort (of null). */
  onDossierKost?: (kost: GedeeldeKost | null) => Promise<void> | void
  /** De bon/factuur die bij de zonet geboekte transactie hoort (of null). */
  onBon?: (document: DossierDocument | null) => Promise<void> | void
}) {
  const { t } = useT()
  const [soort, setSoort] = useState<Boekingsoort>(beginSoort)

  // Bij elke nieuwe opening opnieuw beginnen bij de soort waarmee ze geopend werd.
  // Zonder dit onthoudt de popup je vorige keuze, en boek je bij de volgende ➕
  // ongemerkt een inkomst.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSoort(beginSoort)
  }

  const huidig = SOORTEN.find((s) => s.soort === soort) ?? SOORTEN[0]

  // Na het opslaan: sluiten, tenzij je op "Opslaan + volgende" duwde. Dat tweede
  // geval is voor wie een stapel bonnetjes van de week zit in te tikken — dan is
  // elke keer opnieuw de popup openen vier klikken te veel.
  const naOpslaan = ({ blijfOpen }: { blijfOpen: boolean }) => {
    if (!blijfOpen) onSluiten()
  }

  return (
    <Dialoog titel={t(huidig.titel)} open={open} onSluiten={onSluiten}>
      <div className="soortrij" role="group" aria-label={t('Wat wil je boeken?')}>
        {SOORTEN.map((s) => (
          <button
            key={s.soort}
            type="button"
            className={`soortknop${s.soort === soort ? ' soortknop-actief' : ''}`}
            aria-pressed={s.soort === soort}
            onClick={() => setSoort(s.soort)}
          >
            <span className="soortknop-teken" aria-hidden>
              {s.teken}
            </span>
            {t(s.label)}
          </button>
        ))}
      </div>

      {(soort === 'uitgave' || soort === 'inkomst') && (
        <TransactieFormulier
          soort={soort}
          onOpslaan={onTransactie}
          onOpgeslagen={naOpslaan}
          rekeningen={rekeningen}
          categorieen={categorieen}
          handelaars={handelaars}
          handelaarIndex={handelaarIndex}
          streepjescodes={streepjescodes}
          onOnthoudStreepjescode={onOnthoudStreepjescode}
          onNieuweSubcategorie={onNieuweSubcategorie}
          gezinsleden={gezinsleden}
          dossiers={dossiers}
          onDossierKost={onDossierKost}
          onBon={onBon}
        />
      )}

      {soort === 'vast' && (
        <>
          <p className="leeg" style={{ padding: '0 0 12px', textAlign: 'left' }}>
            {t('Een vaste last komt elke maand terug. Je boekt ze per maand in, ze wordt niet automatisch afgeschreven.')}
          </p>
          <TerugkerendePostFormulier
            rekeningen={rekeningen}
            categorieen={categorieen}
            onOpslaan={onVastePost}
            onOpgeslagen={naOpslaan}
          />
        </>
      )}

      {soort === 'sparen' && (
        <>
          <p className="leeg" style={{ padding: '0 0 12px', textAlign: 'left' }}>
            {t('Sparen is geld verschuiven tussen je eigen rekeningen. Het is geen uitgave en telt nergens in een budget mee.')}
          </p>
          <OverboekingFormulier
            rekeningen={rekeningen}
            overboekingen={overboekingen}
            transacties={transacties}
            onOpslaan={onOverboeking}
            onOpgeslagen={naOpslaan}
          />
        </>
      )}
    </Dialoog>
  )
}
