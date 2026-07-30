import { useState } from 'react'
import type { Categorie, Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'
import { jaarVan, periodeLabel } from '../utils/datum'
import { exporteerPeriodePDF } from '../utils/periodePdf'

// De exportknoppen van het maandoverzicht (ronde 41).
//
// Waarom een eigen kaart en niet een knop in de kop van het maandblok: er zijn drie
// acties (deze maand, dit jaar, printen) en er hoort één regel uitleg bij over wat
// er in het document komt. Dat past niet naast een titel op een telefoon, en een
// verzamelknop die eerst een menu opent maakt van één tik drie.
//
// De PDF zelf wordt in `periodePdf.ts` gebouwd, de cijfers in
// `periodeOverzicht.ts`. Dit component doet niets anders dan de knop, de
// wachttoestand en de foutmelding.
export function RapportKaart({
  maand,
  transacties,
  categorieen,
  rekeningen,
  overboekingen = [],
  waarderingen = [],
}: {
  /** De maand die de pagina toont, als 'JJJJ-MM'. */
  maand: string
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  overboekingen?: Overboeking[]
  waarderingen?: Waardering[]
}) {
  const { t } = useT()
  // Welke export loopt er nu? Leeg = geen. Een PDF van een heel jaar met duizenden
  // boekingen kan een seconde duren; zonder deze toestand tik je drie keer omdat er
  // niets lijkt te gebeuren, en krijg je drie bestanden.
  const [bezig, setBezig] = useState('')
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState('')
  const jaar = jaarVan(maand)

  async function exporteer(periode: string) {
    // De knoppen blijven met `aria-disabled` bereikbaar voor een toetsenbord, dus ze
    // kunnen echt nog aangeklikt worden. Deze regel houdt een tweede tik tegen.
    if (bezig !== '') return
    setBezig(periode)
    setFout('')
    setKlaar('')
    try {
      await exporteerPeriodePDF(t, periode, transacties, categorieen, rekeningen, overboekingen, waarderingen)
      // Bij een download gebeurt er op het scherm niets. Zonder deze regel weet wie
      // met een schermlezer werkt niet of het bestand er komt.
      setKlaar(t('Het rapport van {periode} is gedownload.', { periode: periodeLabel(periode) }))
    } catch {
      // Bewust zichtbaar. Een stille mislukking laat je in het ongewisse of het
      // bestand er komt of niet.
      setFout(t('Het rapport kon niet gemaakt worden. Probeer het opnieuw.'))
    } finally {
      setBezig('')
    }
  }

  return (
    <Kaart
      titel={t('Rapport en print')}
      bijschrift={t('De kengetallen, de uitsplitsing per categorie en de volledige boekingenlijst — cijfers en lijsten, geen grafieken.')}
      // Deze kaart bestaat uit knoppen. Print je de pagina, dan zouden die
      // verdwijnen en bleef er een leeg kader met een bijschrift over dat inhoud
      // belooft die niet op dat blad staat.
      data-geen-print
    >
      <div className="knoprij">
        {/* `aria-disabled` en niet `disabled`: dat laatste haalt de knop die je net
            aanraakte uit de tab-volgorde, en dan valt de focus naar de pagina en moet
            je je terugtabben. Zie de uitleg bij `.knop[aria-disabled]` in index.css.
            Het label noemt de wachttoestand ook: een tekstwissel op een knop wordt
            niet aangekondigd. */}
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-disabled={bezig !== ''}
          aria-label={
            bezig === maand
              ? t('{periode} als PDF — bezig…', { periode: periodeLabel(maand) })
              : t('{periode} als PDF', { periode: periodeLabel(maand) })
          }
          onClick={() => exporteer(maand)}
        >
          {bezig === maand ? t('Bezig…') : t('{periode} als PDF', { periode: periodeLabel(maand) })}
        </button>
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-disabled={bezig !== ''}
          aria-label={bezig === jaar ? t('Heel {jaar} als PDF — bezig…', { jaar }) : t('Heel {jaar} als PDF', { jaar })}
          onClick={() => exporteer(jaar)}
        >
          {bezig === jaar ? t('Bezig…') : t('Heel {jaar} als PDF', { jaar })}
        </button>
        {/* Printen doet de browser zelf. De app zorgt er via de printopmaak in
            index.css enkel voor dat de navigatie en de knoppen niet meegeprint
            worden — anders krijg je een blad met een menubalk erop. */}
        <button type="button" className="knop knop-ghost knop-klein" onClick={() => window.print()}>
          {t('Print deze pagina')}
        </button>
      </div>
      {fout !== '' && (
        <p className="foutregel" role="alert">
          {fout}
        </p>
      )}
      {/* Altijd aanwezig, leeg wanneer er niets te melden is: een `role="status"` die
          pas mét de melding in het document verschijnt, wordt door sommige
          schermlezers niet voorgelezen. */}
      <p className="rij-meta" role="status">
        {klaar}
      </p>
    </Kaart>
  )
}
