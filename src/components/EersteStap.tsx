import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// De wegwijzer bij een gloednieuwe (of net gewiste) app. De app start bewust
// helemaal leeg — geen voorbeeldrekening, geen verzonnen boekingen — zodat je
// cijfers vanaf de eerste dag van jou zijn. Maar dan moet wel duidelijk zijn wat
// je als eerste doet, anders sta je voor een leeg scherm met een uitgeschakelde
// knop. Deze kaart verschijnt alleen zolang er nog geen enkele rekening is.
export function EersteStap({ onNaarRekeningen }: { onNaarRekeningen: () => void }) {
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
        {t('Loop "Je situatie" door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.')}
      </p>
      <div className="knoprij">
        <button type="button" className="knop knop-primair" onClick={onNaarRekeningen}>
          {t('Breng je situatie in kaart')}
        </button>
      </div>
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.')}
      </p>
    </Kaart>
  )
}
