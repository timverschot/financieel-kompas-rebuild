import { useId } from 'react'
import { PAGINAS, type Pagina } from './navigatie'
import { ALLEEN_DE_BASIS, APP_ONDERDELEN } from '../utils/appOnderdelen'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// "Wat wil je zien?" — de plek waar je onderdelen van de app aan- en uitzet
// (ronde 75, "Minder tegelijk").
//
// ⚠ WAAROM DIT GEEN CHIPRIJ IS, zoals bij de dossieronderdelen. Daar zijn acht
// korte labels genoeg, want je staat al ín een dossier en je weet waar het over
// gaat. Hier gaat het over negen pagina's van de app, en de afspraak met Timothy
// was uitdrukkelijk: verbergen mag, **met een zin die zegt wat het is**. Een chip
// met alleen "Fiscaal" erop is een schakelaar waarvan je niet weet wat hij doet, en
// dan durf je hem niet aan te raken. Eén regel per onderdeel, met het icoon uit de
// navigatie zodat je het herkent, en de uitleg eronder.

/** De naam en het icoon van een pagina, uit dezelfde lijst als de navigatie zelf. */
function paginaLabel(pagina: Pagina): { icoon: string; label: string } {
  const p = PAGINAS.find((x) => x.id === pagina)
  return { icoon: p?.icoon ?? '•', label: p?.label ?? pagina }
}

export function OnderdelenKaart({
  verborgen,
  onWissel,
  onZetAlles,
  gegevens = {},
}: {
  verborgen: Pagina[]
  onWissel: (pagina: Pagina) => void
  onZetAlles: (verborgen: Pagina[]) => void
  /**
   * Hoeveel er in een onderdeel zit, per pagina (ronde 60-regel, hier hergebruikt).
   *
   * ⚠ Een uitgezet onderdeel waar tóch iets in staat, hoort dat te zeggen. Anders
   * verdwijnt Dossiers uit je menu terwijl er drie dossiers in zitten, en lijkt het
   * alsof je gegevens weg zijn. Ontbreekt een pagina in deze lijst, dan zegt de
   * regel gewoon niets — dat is beter dan een verzonnen "0".
   */
  gegevens?: Partial<Record<Pagina, number>>
}) {
  const { t } = useT()
  const standId = useId()
  const uit = new Set(verborgen)
  const aantalUit = APP_ONDERDELEN.filter((o) => uit.has(o.pagina)).length

  return (
    <Kaart
      titel={t('Wat wil je zien?')}
      bijschrift={t('Zet uit wat je niet gebruikt. Het verdwijnt alleen uit je menu — er gaat niets verloren, en je kan het hier altijd terugzetten.')}
    >
      {/* ⚠ `role="status"` (ronde 75, doorlichting). Dit regeltje is het ANTWOORD op
          een handeling: één tik op "Toon me alleen de basis" verandert negen vinkjes
          tegelijk, en de knop waarop je stond wordt op datzelfde moment uitgezet. Zonder
          live-rol hoort wie met een schermlezer werkt helemaal niets gebeuren. (Bij de
          losse vinkjes zou zo'n rol juist dubbel praten: die kondigen hun eigen stand al
          aan.) Het draagt ook de REDEN waarom een knop niets te doen heeft — dat is de
          tweede helft van de huisregel van ronde 41, die hier eerst ontbrak. */}
      <p id={standId} className="rij-meta" role="status" style={{ margin: 0 }}>
        {aantalUit === 0
          ? t('Alle pagina\'s staan aan.')
          : aantalUit === 1
            ? t('Eén pagina staat uit.')
            : t('{n} pagina\'s staan uit.', { n: aantalUit })}
      </p>

      <div className="knoprij">
        {/* ⚠ "Alleen de basis" is een KNOP en geen standaardwaarde (zie
            `ALLEEN_DE_BASIS`). Wie de app al gebruikt, mag niet wakker worden met
            negen verdwenen pagina's; dat is dezelfde regel als bij de
            dossieronderdelen van ronde 60. Dit is één tik die je zelf zet, en de
            zin eronder zegt wat er dan weggaat. */}
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-disabled={aantalUit === APP_ONDERDELEN.length}
          aria-describedby={aantalUit === APP_ONDERDELEN.length ? standId : undefined}
          onClick={() => {
            if (aantalUit === APP_ONDERDELEN.length) return
            onZetAlles([...ALLEEN_DE_BASIS])
          }}
        >
          {t('Toon me alleen de basis')}
        </button>
        <button
          type="button"
          className="knop knop-ghost knop-klein"
          aria-disabled={aantalUit === 0}
          aria-describedby={aantalUit === 0 ? standId : undefined}
          onClick={() => {
            if (aantalUit === 0) return
            onZetAlles([])
          }}
        >
          {t('Zet alles weer aan')}
        </button>
      </div>

      <ul className="lijst">
        {APP_ONDERDELEN.map((o) => {
          const { icoon, label } = paginaLabel(o.pagina)
          const aan = !uit.has(o.pagina)
          const inhoud = gegevens[o.pagina]
          const toonInhoud = !aan && inhoud !== undefined && inhoud > 0
          const uitlegId = `${standId}-${o.pagina}-uitleg`
          const inhoudId = `${standId}-${o.pagina}-inhoud`
          return (
            <li key={o.pagina} className="rij" style={{ alignItems: 'flex-start' }}>
              <span className="rij-teken" aria-hidden="true">
                {icoon}
              </span>
              <div className="rij-midden">
                {/* Het vinkje draagt de naam, zodat er precies ÉÉN bedienbaar ding per
                    regel staat en de toegankelijke naam de pagina noemt. `raak-label`
                    maakt het raakvlak 44 px (regel sinds ronde 61).

                    ⚠ `aria-describedby` naar de UITLEG (ronde 75, doorlichting). Wie met
                    een schermlezer door de bedienbare elementen tabt, hoorde anders
                    alleen "Analyse, selectievakje, aangevinkt" — en nooit de zin die
                    zegt wát Analyse is. Dat is precies de zin die deze hele ronde "de
                    kern van de afspraak" noemt; voor wie de app hóórt was die belofte
                    niet ingelost. De "hier staat nog iets in"-regel hangt er ook aan,
                    want dat is het enige wat je nog moet weten vóór je uitzet. */}
                <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={aan}
                    aria-describedby={toonInhoud ? `${uitlegId} ${inhoudId}` : uitlegId}
                    onChange={() => onWissel(o.pagina)}
                  />
                  <span className="rij-titel">{t(label)}</span>
                </label>
                <span id={uitlegId} className="rij-meta">
                  {t(o.uitleg)}
                </span>
                {/* ⚠ De regel van ronde 60: een uitgezet onderdeel waar tóch iets in
                    staat, zegt dat. Zonder haar lijkt het alsof je gegevens weg zijn.
                    ⚠ En met een EIGEN opmaak (`foutregel`, net als in ronde 60), niet
                    hetzelfde grijs als de uitlegzin erboven: twee identieke grijze
                    regels onder elkaar, waarvan de tweede de waarschuwing is, laat die
                    waarschuwing verdwijnen in de ruis. */}
                {toonInhoud && (
                  <span id={inhoudId} className="foutregel">
                    {inhoud === 1
                      ? t('Hier staat nog 1 ding in. Het blijft bewaard.')
                      : t('Hier staan nog {n} dingen in. Ze blijven bewaard.', { n: inhoud })}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* ⚠ Deze zin hoort erbij: wie iets uitzet, moet weten dat het niet ONBEREIKBAAR
          wordt. Verbergen is opruimen, geen slot.
          ⚠ Ze belooft bewust GEEN knop elders (ronde 75, doorlichting). De eerste versie
          zei "een link of een knop die je erheen stuurt, doet dat gewoon" — waar, maar
          ze suggereerde dat zo'n knop bestaat. Voor vijf van de negen pagina's
          (Spaardoelen, Categorieën, Rekenhulpen, Fiscaal, Wat kost elk gezinslid) wijst
          er nergens in de app iets naartoe. Wat WEL altijd waar is: het blijft bestaan,
          en hier zet je het met één tik terug. */}
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('Een uitgezette pagina verdwijnt uit je menu, maar blijft bestaan: alles wat erin staat blijft bewaard, en hier zet je haar met één tik terug.')}
      </p>
    </Kaart>
  )
}
