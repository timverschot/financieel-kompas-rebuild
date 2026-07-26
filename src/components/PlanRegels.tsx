import type { Budget, TerugkerendePost } from '../data/schema'
import { formatEuro } from '../utils/format'
import { plancijfers } from '../utils/vastelast'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// "Wat ligt al vast, en wat blijft er over om te verdelen?"
//
// Dit cijfer bestond nergens, en het is voor wie maandelijks betaald wordt het
// nuttigste getal van de app. Je kon wel een budget van € 400 op Voeding zetten,
// maar niets vertelde je dat er van je inkomen al € 1.850 vergeven was aan huur,
// verzekeringen en abonnementen. Budgetten en vaste lasten beantwoorden dezelfde
// vraag van twee kanten — waar gaat mijn geld heen dat ik nog niet uitgegeven heb —
// en stonden tot nu toe als twee losse lijstjes onder elkaar.
//
// De rekenwijze, expliciet omdat ze makkelijk fout gaat:
//  - **Verwachte inkomsten** komen uit de vooruitblik: al geboekt plus de vaste
//    inkomsten die deze maand nog moeten komen. Zouden we alleen het geboekte
//    nemen, dan stond er op de eerste van de maand een negatief bedrag.
//  - **Deze maand vast** is het volle bedrag van de posten die déze maand
//    vervallen. Dat is wat er effectief van je rekening gaat.
//  - **Opzij** is het maandelijkse deel van de posten die je wil opbouwen en die
//    deze maand níét vervallen. Die twee overlappen nooit: in de maand dat de
//    jaarrekening valt, betaal je ze — dan zet je er niet ook nog voor opzij.
//
// Wat de app bewust NIET doet: een echte pot bijhouden. Ze zegt hoeveel je opzij
// hoort te zetten; waar dat geld staat, weet ze niet. Een koppeling met een
// spaardoel zou dat gat dichten, maar dat is een eigen ronde waard.

export function PlanRegels({
  posten,
  budgetten,
  maand,
  verwachteInkomsten,
  geboekteInkomsten,
}: {
  posten: TerugkerendePost[]
  budgetten: Budget[]
  /** 'JJJJ-MM' */
  maand: string
  /** Uit `maandVooruitblik`: geboekt + wat deze maand nog binnenkomt. */
  verwachteInkomsten: number
  /** Uit `maandVooruitblik`: wat er deze maand effectief al binnengekomen is. */
  geboekteInkomsten: number
}) {
  const { t } = useT()
  const cijfers = plancijfers(posten, maand)
  const teVerdelen = verwachteInkomsten - cijfers.vastDezeMaand - cijfers.opzij
  const gebudgetteerd = budgetten.reduce((som, b) => som + b.bedrag, 0)
  // Zonder vaste inkomst weet de app niet waarop je plan gebaseerd is. Dan een
  // groot rood negatief bedrag tonen is erger dan niets: het lijkt een oordeel
  // over je situatie, terwijl het gewoon betekent dat er nog niets ingevuld is.
  const kentInkomsten = cijfers.vasteInkomsten > 0 || verwachteInkomsten > 0

  // Zonder inkomsten én zonder vaste lasten valt er niets te plannen; dan is een
  // rij nullen alleen maar ruis op een lege app.
  if (verwachteInkomsten === 0 && cijfers.vastDezeMaand === 0 && cijfers.opzij === 0) return null

  return (
    <Kaart
      titel={t('Wat ligt vast, wat blijft over')}
      bijschrift={t('Op basis van je vaste lasten en je verwachte inkomsten deze maand.')}
    >
      <ul className="lijst">
        <Regel label={t('Verwachte inkomsten')} bedrag={verwachteInkomsten} teken="+" />
        <Regel label={t('Vaste lasten deze maand')} bedrag={cijfers.vastDezeMaand} teken="−" />
        {cijfers.opzij > 0 && <Regel label={t('Opzij voor later')} bedrag={cijfers.opzij} teken="−" />}
      </ul>

      {kentInkomsten ? (
        <div
          className="rij"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'none' }}
          data-te-verdelen
        >
          <span className="rij-titel">{t('Te verdelen')}</span>
          <strong
            className="bedrag bedrag-groot"
            style={{ color: teVerdelen < 0 ? 'var(--negative)' : 'var(--text)' }}
          >
            {formatEuro(teVerdelen)}
          </strong>
        </div>
      ) : (
        <p className="leeg" style={{ padding: 0, textAlign: 'left' }} data-geen-inkomsten>
          {t('Vul hieronder je vaste inkomsten in — je loon bijvoorbeeld — dan berekent de app wat er te verdelen valt.')}
        </p>
      )}

      {/* Wat er werkelijk binnenkwam tegenover wat je verwachtte. Nuttig zodra er
          iets geboekt is: een maand met een dertiende maand of een onverwacht
          lager loon zie je hier meteen, zonder zelf te vergelijken. */}
      {cijfers.vasteInkomsten > 0 && geboekteInkomsten > 0 && (
        <p className="rij-meta" style={{ margin: 0 }} data-inkomstenvergelijking>
          {geboekteInkomsten === cijfers.vasteInkomsten
            ? t('Er kwam deze maand {gekregen} binnen — precies je vaste inkomsten.', {
                gekregen: formatEuro(geboekteInkomsten),
              })
            : geboekteInkomsten > cijfers.vasteInkomsten
              ? t('Er kwam deze maand {gekregen} binnen — {verschil} meer dan je vaste inkomsten.', {
                  gekregen: formatEuro(geboekteInkomsten),
                  verschil: formatEuro(geboekteInkomsten - cijfers.vasteInkomsten),
                })
              : t('Er kwam deze maand {gekregen} binnen — {verschil} minder dan je vaste inkomsten.', {
                  gekregen: formatEuro(geboekteInkomsten),
                  verschil: formatEuro(cijfers.vasteInkomsten - geboekteInkomsten),
                })}
        </p>
      )}

      {/* De brug naar de budgetten eronder: eisen ze samen meer op dan er is? */}
      {gebudgetteerd > 0 && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {gebudgetteerd > teVerdelen
            ? t('Je budgetten vragen samen {gebudgetteerd} — dat is meer dan er te verdelen valt.', {
                gebudgetteerd: formatEuro(gebudgetteerd),
              })
            : t('Je budgetten vragen samen {gebudgetteerd} hiervan.', { gebudgetteerd: formatEuro(gebudgetteerd) })}
        </p>
      )}

      {/* Een ander soort getal, en daarom apart: niet "deze maand", maar "gemiddeld".
          Wie een jaarpremie heeft, ziet in elf maanden een laag cijfer en in één
          maand een hoog cijfer; dit is wat het je werkelijk kost. */}
      {cijfers.gemiddeldPerMaand > 0 && cijfers.gemiddeldPerMaand !== cijfers.vastDezeMaand && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t('Over het hele jaar kosten je vaste lasten gemiddeld {bedrag} per maand.', {
            bedrag: formatEuro(cijfers.gemiddeldPerMaand),
          })}
        </p>
      )}
    </Kaart>
  )
}

function Regel({ label, bedrag, teken }: { label: string; bedrag: number; teken: '+' | '−' }) {
  return (
    <li className="rij" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span className="bedrag" style={{ color: 'var(--text-muted)' }}>
        {teken} {formatEuro(bedrag)}
      </span>
    </li>
  )
}
