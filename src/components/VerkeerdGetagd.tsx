import { useMemo, useState } from 'react'
import type { Categorie, Subcategorie, Transactie } from '../data/schema'
import { verkeerdGetagdeBoekingen } from '../utils/verkeerdgetagd'
import { formatEuro } from '../utils/format'
import { dagJaar } from '../utils/datum'
import { useT } from '../i18n'
import { Kaart } from '../ui/basis'

/** Hoeveel regels er meteen staan; de rest komt met één tik erbij. */
const EERSTE = 10

/**
 * "Deze ticketregels tellen misschien bij de verkeerde categorie mee" (ronde 87).
 *
 * ⚠ ALLEEN OPSPOREN. Timothy's voorwaarde, en de juiste: de app verandert hier niets en
 * biedt ook geen knop aan die het voor je rechtzet. Ze zegt wat ze ziet en zet er één tik
 * naast die de boeking OPENT — daar staat het gewone invulvenster, met alle velden, en
 * beslis jij. Zie de kopregels van `utils/verkeerdgetagd.ts` voor wanneer ze zwijgt.
 *
 * ⚠ STAAT ER NIETS, DAN STAAT DE KAART ER NIET. Een blok dat op een schoon huishouden
 * "alles in orde" roept, is precies het "te veel op één scherm" waar de rondes 75 en 81
 * vanaf wilden — en het is bovendien een geruststelling die je niet gevraagd hebt.
 *
 * ⚠ EN ZE IS DICHTGEKLAPT TOT JE HAAR OPENT, met hoogstens tien regels tegelijk. Wie er
 * vijftig heeft, kreeg anders vijf schermen tekst bóven zijn eigen boekingenlijst.
 *
 * ⚠ GEEN `aria-controls` OP DE KNOP (huisregel sinds ronde 67). Dat attribuut mag alleen
 * naar een element wijzen dat ECHT bestaat, en de lijst bestaat alleen wanneer ze
 * openstaat. `aria-expanded` zegt al wat er gebeurt, en de lijst staat er meteen onder.
 */
export function VerkeerdGetagd({
  transacties,
  categorieen,
  subcategorieen,
  onBekijk,
}: {
  transacties: Transactie[]
  /**
   * ⚠ ALLEEN OM DE MEMO TE VERVERSEN — deze twee worden niet gelezen.
   *
   * `verkeerdGetagdeBoekingen` leest de ACTUELE categorieboom uit het register van
   * `data/categorieen/zoek.ts`, en dat register staat buiten React. Een kale
   * `useMemo(…, [transacties])` zou de oude boom bevriezen: hernoem je een subcategorie,
   * dan bleef deze lijst het oude antwoord tonen. Dat is letterlijk de les van ronde 78.
   * Dit zijn precies de twee lijsten waarmee `App.tsx` dat register vult.
   */
  categorieen: Categorie[]
  subcategorieen: Subcategorie[]
  /** De boeking openen in het gewone invulvenster. */
  onBekijk: (transactie: Transactie) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [alles, setAlles] = useState(false)
  const vermoedens = useMemo(
    () => verkeerdGetagdeBoekingen(transacties),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transacties, categorieen, subcategorieen],
  )
  if (vermoedens.length === 0) return null

  // ⚠ TWEE GETALLEN, WANT HET ZIJN TWEE DINGEN (doorlichting). Eén kassaticket kan twee
  // foute regels dragen; "2 boekingen" zeggen terwijl er één boeking onder staat is
  // precies de telfout-familie van ronde 69.
  const boekingen = new Set(vermoedens.map((v) => v.transactie.id)).size
  const zichtbaar = alles ? vermoedens : vermoedens.slice(0, EERSTE)

  return (
    <Kaart
      titel={t('Even nakijken')}
      bijschrift={t(
        'Dit komt uit een oudere versie van de app: op een regel van een kassaticket kon één tik je gekozen subcategorie vervangen door een brede hoofdcategorie. Dat kan niet meer gebeuren, maar de boekingen van toen staan er nog. De app verandert er niets aan.',
      )}
      actie={
        <button
          type="button"
          className="knop knop-ghost knop-klein"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('Verberg de lijst') : t('Toon de lijst')}
        </button>
      }
    >
      {/* ⚠ HET LIVE-GEBIED STAAT ER ALTIJD, ook wanneer er niets nieuws is (les van ronde
          56 en huisregel sinds ronde 60). Zet de gebruiker een regel recht, dan verdwijnt
          die rij en zakt dit getal — zonder dit gebied gebeurde dat volkomen geruisloos.
          En het is meteen de zin die zegt wát het kost: dat is het antwoord op Timothy's
          derde struikelblok. */}
      <p className="rij-meta" role="status" style={{ margin: 0 }}>
        {boekingen === 1
          ? t('Eén boeking heeft een ticketregel die precies naar een subcategorie heet maar onder een andere hoofdcategorie staat. Zolang dat zo staat, telt dat bedrag mee bij die andere hoofdcategorie — in je Analyse, in de donut en in elk budget daarop.')
          : t('{n} boekingen hebben een ticketregel die precies naar een subcategorie heet maar onder een andere hoofdcategorie staat. Zolang dat zo staat, telt dat bedrag mee bij die andere hoofdcategorie — in je Analyse, in de donut en in elk budget daarop.', {
              n: boekingen,
            })}{' '}
        {vermoedens.length > boekingen
          ? t('Samen gaat het om {n} regels.', { n: vermoedens.length })
          : ''}
      </p>

      {open && (
        <>
          <ul className="lijst">
            {zichtbaar.map((v) => {
              // ⚠ De sleutel draagt de REGEL mee. Twee regels van hetzelfde ticket kunnen
              // allebei gemeld worden; met alleen het boekings-id zou React ze door elkaar
              // halen.
              const sleutel = `${v.transactie.id}-${v.regelIndex}`
              const bedrag = v.transactie.regels?.[v.regelIndex]?.bedrag ?? 0
              const regelnaam = t('regel {n}', { n: v.regelIndex + 1 })
              return (
                // ⚠ `flexWrap` + een ONDERGRENS op de tekst, en dat is een MEETRESULTAAT
                // (320 px, ronde 87). De toelichting hier is een volzin, en `.rij` is een
                // flexrij zonder wrap: de knop van 118 px hield de tekst op een telefoon
                // in een kolom van vijf woorden breed. Niets werd afgeknipt en niets
                // scrolde — het las alleen slecht. `flex-wrap` alleen hielp niet, want
                // `.rij-midden` heeft `flex: 1` en krimpt liever dan te wrappen; met
                // `minWidth: 200` past de knop er op een telefoon niet meer naast en valt
                // hij op een eigen regel, net zoals "opnieuw kiezen" op een ticketregel
                // (ronde 78). Op 393 px staan ze weer naast elkaar.
                <li key={sleutel} className="rij" style={{ flexWrap: 'wrap' }}>
                  {/* ⚠ `overflow-wrap` erop: `.lijst` heeft `overflow: hidden`, en een lange
                      subcategorienaam wordt daar op 320 px stil afgeknipt in plaats van af
                      te breken — de val die ronde 82 op de vensterkop vond. */}
                  <span className="rij-midden" style={{ overflowWrap: 'anywhere', minWidth: 200 }}>
                    <span className="rij-titel">{v.omschrijving}</span>
                    <span className="rij-meta">
                      {v.isMiddenlaag
                        ? t('Staat nu in de categorie {staat}.', { staat: v.staatOp })
                        : t('Staat nu in de hoofdcategorie {staat}.', { staat: v.staatOp })}{' '}
                      {t('De subcategorie die zo heet, hangt onder {pad}.', {
                        pad: `${v.item.hoofdNaam} › ${v.item.categorieNaam}`,
                      })}
                    </span>
                    <span className="rij-meta">
                      {dagJaar(v.transactie.datum)} · {v.transactie.omschrijving} ·{' '}
                      {formatEuro(Math.abs(bedrag))} · {regelnaam}
                    </span>
                  </span>
                  <span className="rij-acties">
                    {/* ⚠ Mét de REGEL, de datum en de handelaar in de naam. Twee regels van
                        hetzelfde ticket kunnen allebei gemeld worden en delen dan datum én
                        handelaar; zonder het regelnummer droegen die twee knoppen exact
                        dezelfde naam — huisregel sinds ronde 66. De zichtbare tekst staat
                        vooraan, zoals WCAG 2.5.3 vraagt (huisregel sinds ronde 73). */}
                    <button
                      type="button"
                      className="knop knop-ghost knop-klein"
                      aria-label={t('Boeking openen — {naam}, {regel}, {datum}, {winkel}', {
                        naam: v.omschrijving,
                        regel: regelnaam,
                        datum: dagJaar(v.transactie.datum),
                        winkel: v.transactie.omschrijving,
                      })}
                      onClick={() => onBekijk(v.transactie)}
                    >
                      {t('Boeking openen')}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
          {/* ⚠ Geen stille afkapping (huisregel: zeg wat je weglaat). */}
          {!alles && vermoedens.length > EERSTE && (
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Hier staan de eerste {n} van {totaal}.', { n: EERSTE, totaal: vermoedens.length })}{' '}
              <button type="button" className="knop knop-ghost knop-klein" onClick={() => setAlles(true)}>
                {t('Toon alle {n}', { n: vermoedens.length })}
              </button>
            </p>
          )}
        </>
      )}
    </Kaart>
  )
}
