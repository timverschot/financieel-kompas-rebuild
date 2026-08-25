import type { Budget, Spaardoel, TerugkerendePost } from '../data/schema'
import { formatEuro } from '../utils/format'
import { isGestopt, opzijPerMaand, plancijfers, valtInMaand } from '../utils/vastelast'
import { opzijVolgensSpaardoelen } from '../utils/spaardoel'
import { geldendeBudgetten } from '../utils/budget'
import { vasteLastenInEenBudget } from '../utils/teverdelen'
import { EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { Herkomstregel } from '../ui/Herkomstregel'
import { namenlijst } from '../utils/namenlijst'
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
// hoort te zetten; waar dat geld staat, weet ze niet.
//
// ⚠ Hier stond tot ronde 80: "een koppeling met een spaardoel zou dat gat dichten,
// maar dat is een eigen ronde waard". Die ronde is er sinds ronde 74 en staat vijftig
// regels lager in dit bestand (`opzijVolgensSpaardoelen`). De app houdt nog altijd
// geen pot bij, maar hangt er een spaardoel aan een vaste last, dan bepaalt dát doel
// het bedrag onder "Opzij voor later" in plaats van een deling van het jaarbedrag.

export function PlanRegels({
  posten,
  budgetten,
  maand,
  verwachteInkomsten,
  geboekteInkomsten,
  onGaNaarTransacties,
  onNaarVast,
  spaardoelen = [],
}: {
  posten: TerugkerendePost[]
  budgetten: Budget[]
  /** 'JJJJ-MM' */
  maand: string
  /** Uit `maandVooruitblik`: geboekt + wat deze maand nog binnenkomt. */
  verwachteInkomsten: number
  /** Uit `maandVooruitblik`: wat er deze maand effectief al binnengekomen is. */
  geboekteInkomsten: number
  /**
   * Naar de boekingen achter een cijfer (ronde 48).
   *
   * Alleen de regel "er kwam deze maand X binnen" krijgt een doorklik, en dat is
   * geen willekeurige keuze. `verwachteInkomsten` bovenaan telt óók vaste posten
   * mee die nog NIET geboekt zijn — daar bestaat geen transactie voor. Wie op 3
   * augustus op € 3.200 klikt, zou dus een lege lijst krijgen. `geboekteInkomsten`
   * telt regel voor regel exact hetzelfde op als de lijst zelf.
   */
  onGaNaarTransacties?: (filter: { maand: string; richting: 'in' }) => void
  /**
   * Naar het tabblad "Vast", waar je je inkomsten invult (ronde 66, slotronde).
   *
   * ⚠ De zin hieronder zei "Vul HIERONDER je vaste inkomsten in", maar deze kaart
   * staat op het tabblad "Te verdelen" en het inkomstenformulier op "Vast". Onder
   * deze regel stond dus niets. Wie alleen vaste lasten had ingevuld — en dus niet
   * de welkomstkaart van dit tabblad kreeg — bleef daar staan.
   */
  onNaarVast?: () => void
  /**
   * De spaardoelen, alleen om te weten welke vaste last er al een heeft (ronde 74).
   *
   * ⚠ Optioneel en standaard leeg, zodat elke bestaande aanroep zich gedraagt zoals
   * vóór deze ronde. Hangt er een doel aan een vaste last, dan vraagt "Opzij voor
   * later" er niet meer om: dat geld zet je al weg in die pot.
   */
  spaardoelen?: Spaardoel[]
}) {
  const { t } = useT()
  const opzijViaDoel = opzijVolgensSpaardoelen(spaardoelen, posten)
  const cijfers = plancijfers(posten, maand, opzijViaDoel)
  // Welke posten hun bedrag deze maand ÉCHT uit een spaardoel halen. Alleen om het
  // te kunnen zeggen; het bedrag zit gewoon in `opzij`.
  //
  // ⚠ De laatste voorwaarde telt: staat er hetzelfde bedrag als vroeger, dan is er
  // niets veranderd en hoort er ook niets uitgelegd te worden. Zonder haar verscheen de
  // zin boven een regel die er altijd al zo stond — of, erger, boven een plan waarin
  // die kost nooit iets vroeg.
  const viaDoel = posten.filter(
    (p) =>
      opzijViaDoel.has(p.id) &&
      !isGestopt(p, maand) &&
      !valtInMaand(p, maand) &&
      (opzijViaDoel.get(p.id) as number) > 0 &&
      opzijViaDoel.get(p.id) !== opzijPerMaand(p),
  )
  const teVerdelen = verwachteInkomsten - cijfers.vastDezeMaand - cijfers.opzij
  // ⚠ `geldendeBudgetten` en niet de kale lijst (ronde 62). Dit is de ENIGE plek die
  // budgetten OPTELT. Sinds een budget een eigen maand kan hebben, zou een categorie
  // met zowel een standaardbudget als een uitzondering hier tweemaal meetellen — en
  // dan staat er gewoon een te hoog getal in "je budgetten vragen samen …", zonder
  // dubbele regel die je erop wijst. Precies het soort fout dat maanden meegaat.
  const geldend = geldendeBudgetten(budgetten, maand)
  const gebudgetteerd = geldend.reduce((som, b) => som + b.bedrag, 0)
  // ⚠ RONDE 80 — het getal waar je op stuurt, en dat nergens stond.
  // De kaart zei wat er te verdelen viel, en zei daarna los daarvan dat je budgetten
  // er samen zoveel van vroegen. De aftrekking daartussen — wat er van je inkomen
  // deze maand nog nergens in zit — moest je zelf maken.
  //
  // Als VASTSTELLING geformuleerd, en dat is een bewuste keuze. Bij YNAB is dit
  // bedrag een probleem dat je moet oplossen tot het op nul staat; hier mag je geld
  // gewoon vrij houden. De app zegt wat ze ziet, ze geeft je geen opdracht.
  const nogNergens = teVerdelen - gebudgetteerd
  // Welke vaste last deze maand óók binnen een budget valt, en dus mogelijk twee keer
  // van het cijfer hierboven afgaat. Zie utils/teverdelen.ts voor waarom de app dat
  // meldt in plaats van corrigeert.
  const dubbel = vasteLastenInEenBudget(posten, geldend, maand)
  // Zonder vaste inkomst weet de app niet waarop je plan gebaseerd is. Dan een
  // groot rood negatief bedrag tonen is erger dan niets: het lijkt een oordeel
  // over je situatie, terwijl het gewoon betekent dat er nog niets ingevuld is.
  const kentInkomsten = cijfers.vasteInkomsten > 0 || verwachteInkomsten > 0

  // Zonder inkomsten én zonder vaste lasten valt er niets te plannen; dan is een
  // rij nullen alleen maar ruis op een lege app.
  // ⚠ GEEN extra voorwaarde op `viaDoel` (ronde 74). Ik heb die er eerst bij gezet uit
  // vrees dat de kaart met de uitlegzin erin zou verdwijnen — maar een mutatietest beet
  // niet, en terecht: elke post in `viaDoel` draagt per definitie een bedrag GROTER DAN
  // NUL bij aan `opzij` hieronder, dus die kan hier nooit nul zijn terwijl `viaDoel`
  // gevuld is. Een controle die niets kan uitsluiten is dode code (les van ronde 73).
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

      {/* ⚠ Deze zin bestaat omdat het bedrag hierboven anders onverklaard verandert
          (ronde 74). Wie gewend is dat zijn autoverzekering hier € 51,67 vroeg en er
          plots € 75,00 ziet staan, moet kunnen zien waar dat vandaan komt. */}
      {viaDoel.length > 0 && (
        <p className="rij-meta" style={{ margin: '4px 0 0' }}>
          {t('Voor {namen} rekent dit met je spaardoel, niet met een deling van het jaarbedrag.', {
            namen: viaDoel.map((p) => p.omschrijving).join(', '),
          })}
        </p>
      )}

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
        <div data-geen-inkomsten>
          <Leeg
            actie={onNaarVast ? <EersteStapKnop onClick={onNaarVast}>{t('Vul je vaste inkomsten in')}</EersteStapKnop> : undefined}
          >
            {t('De app kent je vaste inkomsten nog niet — je loon bijvoorbeeld. Vul je die in bij "Vast", dan berekent ze wat er te verdelen valt.')}
          </Leeg>
        </div>
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

      {/* ⚠ RONDE 80 — DE BRUG NAAR JE BUDGETTEN, NU MÉT HAAR UITKOMST.
          Hier stond één grijze zin: "je budgetten vragen samen € 400 hiervan". Waar
          en nuttig, maar het rekensommetje eronder — wat blijft er dan over? — moest
          je zelf maken, terwijl dat net het getal is waarop je stuurt.

          Als `Herkomstregel` (het patroon van ronde 69): de uitkomst in de badge, de
          verantwoording ernaast.

          ⚠ DE ZIN NOEMT ALLE DRIE DE BEDRAGEN, en dat is geen breedsprakigheid. De
          eerste versie zei alleen "je budgetten vragen samen € 400 van wat er te
          verdelen valt". Wie dan zelf narekende, kwam op inkomsten min vaste lasten
          min budgetten uit — en miste "Opzij voor later", een derde bak die er óók af
          gaat. De badge en de zin verantwoordden dus twee verschillende getallen. Nu
          staat de hele aftrekking er: {teverdelen} − {gebudgetteerd} = de badge.

          BEWUST GEEN OPDRACHT. Bij YNAB is dit bedrag iets wat naar nul moet; hier
          mag je geld gewoon vrij houden, en dat staat er met zoveel woorden bij. */}
      {gebudgetteerd > 0 &&
        (kentInkomsten ? (
          <Herkomstregel
            badge={
              nogNergens > 0
                ? t('{bedrag} nog nergens ondergebracht', { bedrag: formatEuro(nogNergens) })
                : nogNergens === 0
                  ? t('Alles ondergebracht')
                  : t('{bedrag} te veel ondergebracht', { bedrag: formatEuro(-nogNergens) })
            }
            /* ⚠ Valt er een vaste last binnen een budget, dan is dit cijfer onzeker en
               mag de badge geen oordeel dragen — geen groene "alles in orde" en geen
               rode "je zit te hoog", want allebei kunnen ze puur uit de dubbeltelling
               komen. Dan blijft het bij de neutrale toon en zegt de zin waarom. */
            toon={dubbel.length > 0 ? 'info' : nogNergens < 0 ? 'let-op' : nogNergens === 0 ? 'ok' : 'info'}
            /* ⚠ NIET `kaal`, en dat is gemeten. Op 320 px valt de zin onder de badge,
               en dan staat ze tussen twee andere grijze `.rij-meta`-regels in dezelfde
               kleur en maat — met 12 px tussen badge en zin en 14 px tussen de blokken
               van de kaart. Niets zei dan nog welke grijze tekst bij welk cijfer hoort.
               Het eigen kaartvlak maakt van badge en zin één blok. */
            data-nog-nergens="1"
          >
            {nogNergens > 0
              ? t('Er viel {teverdelen} te verdelen. Daarvan vragen je budgetten samen {gebudgetteerd}. De rest gaf je nog aan niets: geen vaste last, geen budget. Dat hoeft ook niet — je mag geld vrij houden.', {
                  teverdelen: formatEuro(teVerdelen),
                  gebudgetteerd: formatEuro(gebudgetteerd),
                })
              : nogNergens === 0
                ? t('Er viel {teverdelen} te verdelen, en je budgetten vragen samen precies dat.', {
                    teverdelen: formatEuro(teVerdelen),
                  })
                : t('Er viel {teverdelen} te verdelen. Je budgetten vragen samen {gebudgetteerd}, en dat is meer.', {
                    teverdelen: formatEuro(teVerdelen),
                    gebudgetteerd: formatEuro(gebudgetteerd),
                  })}
            {/* ⚠ Zonder deze zin kan het cijfer hierboven te laag staan, en dat is de
                belangrijkste regel van deze ronde. Zie utils/teverdelen.ts: een vaste
                last die óók binnen een van je budgetten valt, gaat er mogelijk twee
                keer af — "mogelijk", want of je dat budget mét of zonder die kost
                bedoeld hebt, kan de app niet weten.

                ⚠ Enkelvoud én meervoud, net als bij `BufferRegel` (ronde 69). De eerste
                versie plakte de namen met een komma aan elkaar in een enkelvoudszin, en
                dan stond er letterlijk "Huur, Elektriciteit valt ook onder een van je
                budgetten. Die kost gaat …". En `namenlijst` en geen kale `join`, zodat
                acht vaste lasten hier geen alinea van worden. */}
            {dubbel.length > 0 &&
              ' ' +
                (dubbel.length === 1
                  ? t('Let op: {naam} valt ook onder een van je budgetten. Dan zit die kost hier mogelijk twee keer in — één keer als vaste last, één keer via dat budget.', {
                      naam: dubbel[0].omschrijving,
                    })
                  : t('Let op: {namen} vallen ook onder je budgetten. Dan zitten die kosten hier mogelijk twee keer in — één keer als vaste last, één keer via een budget.', {
                      namen: namenlijst(t, dubbel.map((p) => p.omschrijving)),
                    }))}
          </Herkomstregel>
        ) : (
          /* ⚠ Kent de app je inkomsten niet, dan bestaat "te verdelen" niet en mag er
             ook niets mee vergeleken worden. De oude zin deed dat wél: ze zei
             "dat is meer dan er te verdelen valt" tegen iemand die alleen nog maar
             vaste lasten had ingevuld. Dan is er niets te veel — er is nog niets
             ingevuld. */
          <p className="rij-meta" style={{ margin: 0 }} data-budgetten-zonder-inkomsten>
            {t('Je budgetten vragen samen {gebudgetteerd}.', { gebudgetteerd: formatEuro(gebudgetteerd) })}
          </p>
        ))}

      {/* De knop staat ONDER de zinnen en is een gewone knop, geen tekstknop middenin
          de regel: een raakvlak van 44 px in een lopende tekstregel duwt die regel
          uit elkaar (zie `.badge-knop` in index.css voor hetzelfde probleem). En je
          leest eerst waar het over gaat, dan pas wat je ermee kan.

          ⚠ RONDE 80 — DE KNOP STAAT NU ONDERAAN. Ze stond tussen de inkomstenzin en
          de regel die zegt wat er nog nergens ondergebracht staat. Wie klikte, zag dat
          cijfer dus nooit, en wie met Tab van knop naar knop springt evenmin. Dezelfde
          redenering als hierboven — eerst lezen waar het over gaat, dan pas wat je
          ermee kan — maar dan toegepast op de hele kaart in plaats van op één zin. */}
      {cijfers.vasteInkomsten > 0 && geboekteInkomsten > 0 && onGaNaarTransacties && (
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-ghost knop-klein"
            aria-label={t('Bekijk die boekingen — er kwam deze maand {gekregen} binnen', {
              gekregen: formatEuro(geboekteInkomsten),
            })}
            onClick={() => onGaNaarTransacties({ maand, richting: 'in' })}
          >
            {t('Bekijk die boekingen')}
          </button>
        </div>
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
