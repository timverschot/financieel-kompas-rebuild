// Laadt de extra test-hulpmiddelen (bv. toBeInTheDocument) voor elke test.
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// Testing Library wacht standaard 1 seconde op iets dat nog moet verschijnen. Met
// meer dan honderd testbestanden die tegelijk draaien, is dat op een trage machine
// (zoals de bouwmachine van GitHub Actions) soms net te kort: een test die op je
// eigen pc altijd slaagt, wordt dan af en toe rood zonder dat er iets mis is.
// Twee seconden haalt die valse rode uitslag weg zonder een echte fout te
// verbergen — die faalt nog steeds, alleen een seconde later.
configure({ asyncUtilTimeout: 2000 })

// Geeft de tests een nagebootste IndexedDB, zodat de database-laag getest kan
// worden zonder echte browser.
import 'fake-indexeddb/auto'

// Bootst window.matchMedia na, zodat ook de desktopweergave getest kan worden.
// Standaard doet de app alsof het scherm smal is (telefoon); een test kan dat
// wijzigen met zetSchermbreedte() uit test/schermbreedte.
import { installeerMatchMedia } from './test/schermbreedte'
installeerMatchMedia()
