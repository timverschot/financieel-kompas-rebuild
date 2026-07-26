import { createContext, useContext, type ReactNode } from 'react'

// De volgorde van de hoofdcategorieën, beschikbaar voor elk scherm dat ze toont.
//
// Waarom een context en geen prop: de kiezer met de hoofdcategorieën zit diep —
// App → formulier → CategorieKiezer/ItemZoeker → HoofdcategorieChips — en op vier
// verschillende plaatsen (transactie, gedeelde kost, kindrekeningpost, dossier).
// Die volgorde als prop door elke laag rijgen zou vier bestanden raken die er
// verder niets mee te maken hebben, en elke nieuwe kiezer zou de prop opnieuw
// kunnen vergeten — met een lijst in de verkeerde volgorde als stil gevolg.
//
// Dit past bij wat de app al doet: taal (i18n), thema en instellingen lopen ook
// via een context.
//
// De standaardwaarde is een LEGE lijst, en dat betekent "de standaardvolgorde"
// (zie utils/categorieVolgorde.ts). Een component die buiten de provider gerenderd
// wordt — zoals in een losse test — werkt dus gewoon, zonder opzet.

const Context = createContext<string[]>([])

export function CategorieVolgordeProvider({ volgorde, children }: { volgorde: string[]; children: ReactNode }) {
  return <Context.Provider value={volgorde}>{children}</Context.Provider>
}

/** De id's van de hoofdcategorieën op volgorde. Leeg = de standaardvolgorde. */
export function useHoofdvolgorde(): string[] {
  return useContext(Context)
}
