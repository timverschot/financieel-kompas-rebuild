// Laadt de extra test-hulpmiddelen (bv. toBeInTheDocument) voor elke test.
import '@testing-library/jest-dom'

// Geeft de tests een nagebootste IndexedDB, zodat de database-laag getest kan
// worden zonder echte browser.
import 'fake-indexeddb/auto'
