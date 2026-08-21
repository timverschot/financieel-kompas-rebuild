/**
 * De drie onderdelen van de Budget-pagina (ronde 64).
 *
 * ⚠ WAAROM DIT ER KOMT. Timothy, na echt gebruik: *"Ik begrijp niet goed hoe het
 * tabblad Budget in elkaar zit. Alles staat wat bij elkaar, weinig uitleg erbij hoe
 * alles werkt en wat er verwacht wordt."* Hij had gelijk. De pagina zette vijf
 * kaarten onder elkaar — het plan, je vaste inkomsten, je budgetten, je vaste
 * lasten, en helemaal onderaan het formulier om een budget in te stellen — zonder
 * één regel die zei waarvoor de pagina dient. Dat zijn geen vijf onderdelen van één
 * taak maar DRIE TAKEN: uitrekenen wat er overblijft, vastleggen wat elke maand
 * terugkomt, en een grens zetten op wat je vrij uitgeeft.
 *
 * Erger nog was de afstand tussen een lijst en haar formulier. Op een telefoon is
 * `.raster-lijst-formulier` één kolom, dus "Budget instellen" stond ná de vaste
 * lasten — het vijfde blok. Een knop elders in de app die zei "je kan altijd zelf
 * iets toevoegen op de Budget-pagina" zette je bovenaan, en daar zag je het niet.
 *
 * De indeling volgt de VRAAG die je stelt, net als bij Analyse in ronde 60:
 *  - `plan` — wat blijft er over? (inkomsten min wat vastligt)
 *  - `vast` — wat ligt vast? (vaste inkomsten en vaste lasten, en ze inboeken)
 *  - `budgetten` — wat wil ik beperken? (je grenzen per categorie)
 *
 * Taal-onafhankelijke sleutels, zoals overal: ze staan in het adres
 * (`#/budget/vast`), en dat adres mag niet met de taal meeveranderen. De keuze wordt
 * verder nérgens bewaard — sluit je de app, dan open je weer op het eerste tabblad.
 */
export const BUDGET_TABS = ['plan', 'vast', 'budgetten'] as const
export type BudgetTab = (typeof BUDGET_TABS)[number]
