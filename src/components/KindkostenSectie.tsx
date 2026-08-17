import { useMemo, useState } from 'react'
import type { Dossier, GedeeldeKost, Kind, Transactie } from '../data/schema'
import type { TxFilter } from '../utils/transactieFilter'
import { beschikbareKindjaren, kindkostenVanJaar, magDoorklikken, type KindkostenRegel } from '../utils/kindkosten'
import { formatEuro } from '../utils/format'
import { vandaag } from '../utils/datum'
import { Bedrag, Kaart, Leeg, PaginaKop, Stat } from '../ui/basis'
import { useT } from '../i18n'

// Wat kost elk gezinslid mij per jaar? (ronde 53)
//
// WAT DIT SCHERM BELOOFT, en dat is smaller dan de titel klinkt: wat JIJ dit jaar
// uitgaf dat aan een gezinslid hangt. Twee bronnen — je eigen boekingen, en jouw
// aandeel in de gedeelde kosten van je dossiers.
//
// WAT HET NIET MEETELT staat er even groot bij: de onderhoudsbijdrage en de
// gezamenlijke pot. Dat zijn allebei bewuste keuzes (zie `utils/kindkosten.ts`), en
// het zijn allebei bedragen die makkelijk groter zijn dan alles wat hier wél staat.
// Een cijfer dat die stilzwijgend weglaat, leest als een volledig antwoord en is er
// geen — precies de fout die het fiscale jaaroverzicht ook niet mag maken.
//
// DESIGN.md: hoogstens één gevulde knop per scherm. Dit scherm heeft er geen enkele;
// het toont alleen.

export function KindkostenSectie({
  transacties,
  gedeeldeKosten = [],
  dossiers = [],
  gezinsleden = [],
  onGaNaarTransacties,
  vandaagISO = vandaag(),
}: {
  transacties: Transactie[]
  gedeeldeKosten?: GedeeldeKost[]
  dossiers?: Dossier[]
  gezinsleden?: Kind[]
  /** Van één regel naar de boekingen erachter — alleen waar dat exact klopt. */
  onGaNaarTransacties?: (filter: TxFilter) => void
  /** Alleen om te kunnen testen. */
  vandaagISO?: string
}) {
  const { t } = useT()
  const jaren = useMemo(
    () => beschikbareKindjaren(transacties, gedeeldeKosten, vandaagISO),
    [transacties, gedeeldeKosten, vandaagISO],
  )
  // Het LOPENDE jaar als beginwaarde, niet het nieuwste uit de lijst. Eén boeking met
  // een typfout in het jaartal (2062) zou het scherm anders standaard op dat jaar
  // openen, met een bijna leeg cijfer en zonder de "loopt nog"-zin.
  const [jaar, setJaar] = useState(Number(vandaagISO.slice(0, 4)))

  const overzicht = useMemo(
    () =>
      kindkostenVanJaar({
        jaar,
        transacties,
        gedeeldeKosten,
        dossiers,
        gezinsleden,
        labels: { gezin: t('Het gezin'), onbekend: t('Onbekend gezinslid') },
      }),
    [jaar, transacties, gedeeldeKosten, dossiers, gezinsleden, t],
  )

  const loopendJaar = overzicht.jaar === Number(vandaagISO.slice(0, 4))

  /** Het filter achter één regel: dat gezinslid, in dat jaar, enkel uitgaven. */
  function filterVan(regel: KindkostenRegel): TxFilter {
    return {
      ...(regel.id === null ? { zonderPersoon: true } : { persoonId: regel.id }),
      van: `${overzicht.jaar}-01-01`,
      tot: `${overzicht.jaar}-12-31`,
      richting: 'uit',
    }
  }

  return (
    <>
      <PaginaKop
        titel={t('Wat kost elk gezinslid?')}
        bijschrift={t('Wat jij dat jaar uitgaf voor elk gezinslid: je eigen boekingen plus jouw aandeel in de gedeelde kosten.')}
        actie={
          jaren.length > 1 ? (
            <label className="veldgroep" style={{ maxWidth: 140 }}>
              <span className="label-caps">{t('Jaar')}</span>
              <select value={jaar} onChange={(e) => setJaar(Number(e.target.value))}>
                {jaren.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      />

      <Kaart data-kindkop>
        <Stat label={t('Samen in {jaar}', { jaar: overzicht.jaar })}>
          <Bedrag centen={overzicht.totaal} groot />
        </Stat>
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('{n} boeking(en) en {m} gedeelde kost(en)', {
            n: overzicht.aantalBoekingen,
            m: overzicht.aantalDossierkosten,
          })}
        </p>
        {loopendJaar && (
          <p className="rij-meta" style={{ margin: 0 }} data-loopendjaar>
            {t('{jaar} loopt nog: dit bedrag groeit nog aan tot 31 december.', { jaar: overzicht.jaar })}
          </p>
        )}
      </Kaart>

      {overzicht.regels.length === 0 ? (
        <Kaart>
          <Leeg>
            {t('In {jaar} staat er nog niets op naam van een gezinslid. Zet een gezinslid bij een boeking, of hang een kost in een dossier aan een kind.', {
              jaar: overzicht.jaar,
            })}
          </Leeg>
        </Kaart>
      ) : (
        <Kaart
          titel={t('Per gezinslid')}
          bijschrift={t('Een rij met een aandeel uit een gedeelde kost klikt niet door: zo’n aandeel is een berekening en bestaat nergens als losse boeking.')}
          data-perlid
        >
          <ul className="lijst">
            {overzicht.regels.map((regel) => {
              const kanDoor = Boolean(onGaNaarTransacties) && magDoorklikken(regel, gezinsleden)
              const inhoud = (
                <>
                  <span className="rij-midden">
                    <span className="rij-titel">{regel.naam}</span>
                    <span className="rij-meta">{bronTekst(t, regel)}</span>
                  </span>
                  <Bedrag centen={regel.bedrag} />
                  {/* Het pijltje staat er ALTIJD, maar alleen zichtbaar waar de rij
                      ergens heen gaat. In deze lijst klikt de ene rij wel en de
                      andere niet — een rij met een aandeel uit een dossier bestaat
                      nergens als boeking. Zonder teken lijkt de app willekeurig te
                      reageren; met `visibility` blijft de bedragkolom op zijn plek. */}
                  <span className="rij-chevron" aria-hidden style={kanDoor ? undefined : { visibility: 'hidden' }}>
                    ›
                  </span>
                </>
              )
              return (
                <li key={regel.id ?? 'gezin'} className="rij" data-lid={regel.id ?? 'gezin'}>
                  {kanDoor ? (
                    <button
                      type="button"
                      className="rij-knop"
                      aria-label={t('{naam} {bedrag} — bekijk de boekingen', {
                        naam: regel.naam,
                        bedrag: formatEuro(regel.bedrag),
                      })}
                      onClick={() => onGaNaarTransacties?.(filterVan(regel))}
                    >
                      {inhoud}
                    </button>
                  ) : (
                    inhoud
                  )}
                </li>
              )
            })}
          </ul>
        </Kaart>
      )}

      {/* De grens van dit scherm, even groot als de cijfers erboven. Allebei deze
          posten kunnen groter zijn dan alles wat hier wél staat. */}
      <Kaart titel={t('Wat hier NIET in zit')} data-nietin>
        <ul className="lijst">
          <li className="rij">
            <span className="rij-midden">
              <span className="rij-titel">{t('De onderhoudsbijdrage')}</span>
              <span className="rij-meta">
                {t('Die is niet per kind toe te wijzen zonder een verdeling te verzinnen die in geen enkele akte staat. Je vindt ze op het dossier zelf.')}
              </span>
            </span>
          </li>
          <li className="rij">
            <span className="rij-midden">
              <span className="rij-titel">{t('De gezamenlijke pot')}</span>
              <span className="rij-meta">
                {t('Daar zit ook geld van de andere ouder in. Meetellen zou "wat kost het mij" te hoog maken.')}
              </span>
            </span>
          </li>
        </ul>
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('Een gedeelde kost telt hier voor JOUW aandeel, ook wanneer de andere ouder ze betaalde — dat aandeel ben je verschuldigd. Betaalde jij ze zelf, dan telt ze ook maar voor jouw aandeel, want de rest komt terug via de afrekening.')}
        </p>
        {/* De app KAN dit niet zeker weten — twee uitstappen van € 90 op dezelfde dag
            zijn niet uitgesloten — dus beslist ze niet en telt ze allebei mee. Ze
            zegt wel dat er iets verdachts staat, en hoe je het oplost. Zelfde houding
            als bij het inlezen van een uitwisselbestand. */}
        {overzicht.mogelijkeDubbels > 0 && (
          <p className="statusregel" style={{ margin: 0 }} data-dubbels>
            {t('Let op: {n} gedeelde kost(en) vallen op dezelfde dag en op hetzelfde bedrag samen met een losse boeking. Staat dezelfde uitgave hier twee keer, dan is dit bedrag te hoog. Koppel zo’n boeking aan het dossier in het invoervenster, dan telt ze maar één keer.', {
              n: overzicht.mogelijkeDubbels,
            })}
          </p>
        )}
        {overzicht.aantalOvergeslagen > 0 && (
          <p className="rij-meta" style={{ margin: 0 }} data-overgeslagen>
            {t('{n} boeking(en) staan hier als gedeelde kost en niet als boeking, omdat je ze aan een dossier koppelde. Zo telt dezelfde uitgave maar één keer.', {
              n: overzicht.aantalOvergeslagen,
            })}
          </p>
        )}
      </Kaart>
    </>
  )
}

/** "€ 120,00 uit je boekingen · € 54,00 uit gedeelde kosten" — waar het uit bestaat. */
function bronTekst(t: (s: string, p?: Record<string, string | number>) => string, regel: KindkostenRegel): string {
  const delen: string[] = []
  if (regel.uitBoekingen > 0) delen.push(t('{bedrag} uit je boekingen', { bedrag: formatEuro(regel.uitBoekingen) }))
  if (regel.uitDossiers > 0) delen.push(t('{bedrag} uit gedeelde kosten', { bedrag: formatEuro(regel.uitDossiers) }))
  return delen.join(' · ')
}
