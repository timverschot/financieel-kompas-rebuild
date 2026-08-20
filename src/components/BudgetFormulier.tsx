import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Budget, Categorie } from '../data/schema'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { STANDAARD_CATEGORIE_ID } from './CategorieSelect'
import { CategorieNiveauKiezer } from './CategorieNiveauKiezer'
import { useT } from '../i18n'
import { budgetId } from '../utils/budget'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen. Sinds ronde 62 hoort
// het geheugentje van het voorvullen (`gezien`) daar ook bij — zie `leegmaken`.
const BEGIN = { categorieId: STANDAARD_CATEGORIE_ID, bedrag: '' }

// Formulier om een budget voor een categorie in te stellen. Staat al binnen een Kaart
// (budgetpagina), dus zonder eigen kaartomlijsting.
export function BudgetFormulier({
  categorieen,
  budgetten,
  maand,
  maandLabel,
  onOpslaan,
}: {
  categorieen: Categorie[]
  /** Alle budgetten, om te kunnen voorvullen wat er al staat. */
  budgetten?: Budget[]
  /** De maand die je bekijkt ('JJJJ-MM'), waarvoor je een uitzondering kan zetten. */
  maand?: string
  /** Diezelfde maand, leesbaar ("augustus 2026"). Al vertaald door de oproeper. */
  maandLabel?: string
  onOpslaan: (b: Budget) => Promise<void> | void
}) {
  const { t } = useT()
  const [categorieId, setCategorieId] = useState(BEGIN.categorieId)
  const [bedrag, setBedrag] = useState(BEGIN.bedrag)
  // Geldt dit bedrag elke maand (de standaard), of alleen voor de maand die je
  // bekijkt? Standaard: elke maand — dat is wat de app vóór ronde 62 deed.
  const [alleenDezeMaand, setAlleenDezeMaand] = useState(false)

  // Wat er AL staat voor deze keuze, zodat het veld dat toont in plaats van leeg te
  // blijven. Zonder dit tik je bij een uitzondering een bedrag in zonder te zien
  // waarvan je afwijkt — en overschrijf je bij een gewone wijziging je oude bedrag
  // met een getal dat je uit je hoofd deed.
  const bestaand = (budgetten ?? []).find(
    (b) => b.categorieId === categorieId && b.maand === (alleenDezeMaand ? maand : undefined),
  )
  // Valt er niets in te vullen voor een uitzondering, dan is je standaard het
  // vertrekpunt: "deze maand mag Voeding wat meer" begint bij wat het normaal is.
  const vertrekpunt =
    bestaand ?? (alleenDezeMaand ? (budgetten ?? []).find((b) => b.categorieId === categorieId && b.maand === undefined) : undefined)

  // ⚠ Alleen voorvullen wanneer je van CATEGORIE of van SOORT wisselt — niet bij elke
  // hertekening. Anders overschrijft de app het bedrag dat je net aan het typen bent
  // zodra er iets anders op het scherm verandert. Dezelfde val als bij de chips van
  // een dossier in ronde 60.
  const gezien = useRef('')
  useEffect(() => {
    const sleutel = `${categorieId}|${alleenDezeMaand ? maand : ''}`
    if (gezien.current === sleutel) return
    gezien.current = sleutel
    setBedrag(vertrekpunt ? centenNaarInvoer(vertrekpunt.bedrag) : BEGIN.bedrag)
  }, [categorieId, alleenDezeMaand, maand, vertrekpunt])

  // Zet alle velden terug op hun beginwaarde.
  //
  // ⚠ `gezien` gaat NIET op leeg maar op de sleutel die bij die beginwaarden hoort
  // (nakijkronde ronde 62). Met een lege waarde liepen de twee uit de pas: het
  // formulier stond op de begincategorie, maar het geheugentje zei "die heb ik nog
  // niet gezien". De eerstvolgende keer dat de app haar gegevens opnieuw inlas — na
  // élke opslag ergens in de app, en vanzelf om de 45 seconden bij het synchroniseren
  // — sprong het voorvullen alsnog aan en gooide het weg wat je net getikt had. Je
  // tikte 250, er stond plots weer 400, en dat bewaarde je dan ook.
  function leegmaken() {
    setCategorieId(BEGIN.categorieId)
    setBedrag(BEGIN.bedrag)
    setAlleenDezeMaand(false)
    gezien.current = `${BEGIN.categorieId}|`
  }

  const bedragCenten = invoerNaarCenten(bedrag)
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
  const geldig = categorieId.length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const voorMaand = alleenDezeMaand ? maand : undefined
    await onOpslaan({
      id: budgetId(categorieId, voorMaand),
      categorieId,
      bedrag: bedragCenten,
      ...(voorMaand ? { maand: voorMaand } : {}),
    })
    // Pas ná een geslaagde opslag leegmaken, zodat het formulier klaar staat voor een
    // volgend budget. (Twee keer hetzelfde instellen kan niet: de id ligt vast, dus
    // opnieuw opslaan werkt je bestaande budget bij.)
    leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel">
      {/* De categoriekiezer op een eigen regel: met een zoekveld én een lijst
          erin is een halve kolom te smal om iets als "Huishouden en Verzorging ›
          Persoonlijke verzorging" te lezen. */}
      <div className="veldgroep">
          <label className="label-caps" htmlFor="budgetcategorie">
            {t('Budgetcategorie')}
          </label>
          {/* Sinds ronde 25 mag een budget ook op een subcategorie of op één
              product staan (zie utils/budget.ts), en dan is een gewone keuzelijst
              met duizend regels onbruikbaar. */}
          <CategorieNiveauKiezer id="budgetcategorie" waarde={categorieId} onKies={setCategorieId} categorieen={categorieen} />
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="maandbudget">
            {t('Maandbudget (€)')}
          </label>
          <input
            id="maandbudget"
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
        </div>
      </div>

      {/* ⚠ Geldt dit elke maand, of alleen deze ene? (ronde 62)
          Standaard "elke maand": dat is wat de app hiervóór deed, en het is ook wat je
          in negen van de tien gevallen bedoelt. De keuze staat er alleen wanneer de
          pagina weet welke maand je bekijkt — anders zou "alleen deze maand" naar niets
          verwijzen. */}
      {maand !== undefined && (
        <div className="veldgroep">
          <span className="label-caps" id="budget-geldigheid-kop">
            {t('Voor welke maanden geldt dit?')}
          </span>
          <div className="chiprooster" role="group" aria-labelledby="budget-geldigheid-kop">
            <button
              type="button"
              aria-pressed={!alleenDezeMaand}
              className={!alleenDezeMaand ? 'chip chip-actief' : 'chip'}
              onClick={() => setAlleenDezeMaand(false)}
            >
              {t('Elke maand')}
            </button>
            <button
              type="button"
              aria-pressed={alleenDezeMaand}
              className={alleenDezeMaand ? 'chip chip-actief' : 'chip'}
              onClick={() => setAlleenDezeMaand(true)}
            >
              {t('Alleen {maand}', { maand: maandLabel ?? maand })}
            </button>
          </div>
          <span className="rij-meta">
            {alleenDezeMaand
              ? t('Je vaste budget blijft staan; deze maand geldt dit bedrag.')
              : t('Dit bedrag geldt elke maand — behalve de maanden waarvoor je een apart budget zette.')}
          </span>
        </div>
      )}

      <div className="knoprij">
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className="knop knop-primair"
        >
          {t('Budget instellen')}
        </button>
      </div>
      {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
          `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
          sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
          knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
          hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Kies een categorie en geef een bedrag.')}
      </p>
    </form>
  )
}
