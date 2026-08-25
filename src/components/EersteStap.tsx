import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// De wegwijzer bij een gloednieuwe (of net gewiste) app. De app start bewust
// helemaal leeg — geen voorbeeldrekening, geen verzonnen boekingen — zodat je
// cijfers vanaf de eerste dag van jou zijn. Maar dan moet wel duidelijk zijn wat
// je als eerste doet, anders sta je voor een leeg scherm met een uitgeschakelde
// knop. Deze kaart verschijnt alleen zolang er nog geen enkele rekening is.
//
// ⚠ RONDE 66. Deze kaart stond ALLEEN op Overzicht — terwijl een gloednieuwe app
// je juist op "Je situatie" laat landen (zie `beginpagina` in App.tsx). De beste
// onboardingtekst van de app, met de belofte "na tien minuten weet je wat er elke
// maand vastligt", kreeg de nieuwe gebruiker dus nooit te zien. Ze staat nu op
// allebei de plekken, met een knop die zich aanpast: op Overzicht brengt hij je
// naar Je situatie, en stá je daar al, dan wijst hij naar het eerste blok.
export function EersteStap({
  onNaarRekeningen,
  hier = false,
}: {
  onNaarRekeningen: () => void
  /** Staat de kaart op de pagina waar je toch al moet zijn? Dan wijst de knop naar het eerste blok. */
  hier?: boolean
}) {
  const { t } = useT()
  return (
    <Kaart
      titel={t('Welkom bij Kompal')}
      bijschrift={t('De app is nog helemaal leeg — alles wat er straks in staat, is van jou.')}
    >
      <p className="rij-meta" style={{ margin: 0 }}>
        {/* Noem het scherm bij de naam die er ook echt op staat ("Je situatie"), niet
            bij zijn werktitel. En beloof alleen wat het altijd waarmaakt: "hoelang je
            toekomt" heeft een spaarrekening of cash nodig, en die heeft niet
            iedereen. */}
        {hier
          ? t('Loop de blokken hieronder door: je rekeningen, je vaste lasten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.')
          : t('Loop "Je situatie" door: je rekeningen, je vaste lasten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.')}
      </p>
      <div className="knoprij">
        {/* ⚠ Op de pagina waar je toch al staat is dit NIET de gevulde knop: het
            invulformulier eronder draagt die, en DESIGN.md laat er maar één per
            scherm toe. Op Overzicht staat er geen formulier, dus daar wél. */}
        <button type="button" className={hier ? 'knop knop-secundair' : 'knop knop-primair'} onClick={onNaarRekeningen}>
          {/* ⚠ De eerste stap is een REKENING. Zonder rekening kan de app niets
              uitrekenen, en dat stond tot deze ronde als losse tip helemaal onderaan
              deze pagina — voorbij alle acht blokken. */}
          {hier ? t('Begin bij "Je geld"') : t('Breng je situatie in kaart')}
        </button>
      </div>
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.')}
      </p>
    </Kaart>
  )
}
