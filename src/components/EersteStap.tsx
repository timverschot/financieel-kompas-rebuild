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
        {t('Begin met een rekening: je betaalrekening, je spaarrekening, of gewoon je portemonnee. Daarna kan je transacties ingeven.')}
      </p>
      <div className="knoprij">
        <button type="button" className="knop knop-primair" onClick={onNaarRekeningen}>
          {t('Maak je eerste rekening aan')}
        </button>
      </div>
      <p className="rij-meta" style={{ margin: 0 }}>
        {t('Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.')}
      </p>
    </Kaart>
  )
}
