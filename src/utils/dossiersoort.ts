// De drie soorten dossiers die de app kent.
//
// Waarom dit een eigen mini-module is en geen type in een component: de soort
// wordt op drie plaatsen gebruikt die niets met elkaar te maken hebben — de
// subtabs op de Dossiers-pagina, de wegwijzer voor een lege app, en het belletje
// (een aflopende garantie moet je naar de juiste subtab brengen). Zou het type in
// een component wonen, dan zou `utils/meldingen.ts` een component moeten
// importeren, en dat is precies de knoop die we nergens willen.
//
// Belangrijk: dit zijn INTERNE waarden. Ze staan los van de taal en veranderen
// nooit mee met een vertaling; alleen het label op het scherm wordt vertaald.
//
// Merk op dat er bewust GEEN 'soort'-veld op het dossierrecord staat. Een lening
// en een garantie zijn al eigen records met een eigen tabel (`LeningSchema`,
// `GarantieSchema`); ze in het dossiermodel persen zou een datamigratie vragen
// zonder dat er iets mee gewonnen wordt. De soort is hier dus puur een
// navigatiebegrip: in welke lade kijk je?

export const DOSSIER_SOORTEN = ['coouderschap', 'lening', 'garantie'] as const

export type DossierSoort = (typeof DOSSIER_SOORTEN)[number]
