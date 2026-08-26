/// <reference types="vite/client" />

// `dom-accessibility-api` is de bibliotheek waarmee Testing Library zelf toegankelijke
// namen uitrekent; de bewaking van ronde 95 gebruikt haar rechtstreeks. Ze levert typen
// mee in `dist/index.d.ts`, maar wijst die niet aan in het `exports`-veld van haar
// `package.json` — en dan vindt TypeScript ze onder deze moduleresolutie niet. Dit is
// precies de handtekening die wij aanroepen, niets meer.
declare module 'dom-accessibility-api' {
  export function computeAccessibleName(element: Element): string
}
