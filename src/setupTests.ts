// Laadt de extra test-hulpmiddelen (bv. toBeInTheDocument) voor elke test.
import '@testing-library/jest-dom'

// Geeft de tests een nagebootste IndexedDB, zodat de database-laag getest kan
// worden zonder echte browser.
import 'fake-indexeddb/auto'

// Bootst window.matchMedia na, zodat ook de desktopweergave getest kan worden.
// Standaard doet de app alsof het scherm smal is (telefoon); een test kan dat
// wijzigen met zetSchermbreedte() uit test/schermbreedte.
import { installeerMatchMedia } from './test/schermbreedte'
installeerMatchMedia()
