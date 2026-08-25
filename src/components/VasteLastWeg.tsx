import type { TerugkerendePost } from '../data/schema'
import type { Gebruiksregel } from '../utils/vastelastverwijdering'
import { Dialoog } from '../ui/Dialoog'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { useT } from '../i18n'
import { postKenmerk } from '../utils/postkenmerk'

// "Water verwijderen?" — de vraag vóór het kruisje wist (ronde 76).
//
// ⚠ WAAROM ÉÉN GEDEELD VENSTER EN NIET TWEE. Je kan een vaste last op twee plaatsen
// weghalen: in de lijst op Budget → Vast (het kruisje) en op "Je situatie" (de knop
// "Verwijderen" onder een voorstel). Ronde 73 heeft net laten zien wat er gebeurt
// wanneer twee schermen hetzelfde record met hun eigen regels bewerken: ze lopen uit
// elkaar en de strengste regel wint niet vanzelf. Dus staat de vraag hier één keer.
//
// Het venster gaat ALLEEN open wanneer er echt iets aan de post hangt — zie
// `hangtErIetsAan` in `utils/vastelastverwijdering.ts`, die allebei de schermen
// gebruiken. Hangt er niets aan, dan wist het kruisje meteen, precies zoals
// voorheen, met de ongedaan-balk als vangnet.
//
// ⚠ Dat is een BEWUSTE afwijking van het gezinslid- en het categorievenster (ronde
// 65), die altijd vragen. Twee redenen:
//  - Bij een gezinslid en een categorie blijven er ná het verwijderen naamloze
//    verwijzingen achter die je nooit meer kan herstellen. Bij een vaste last blijft
//    er niets kapot: de app is sinds ronde 64 bestand tegen een verwijzing naar een
//    post die niet meer bestaat, en "Ongedaan maken" zet de post mét al zijn
//    koppelingen terug (de boekingen en de doelen zijn zelf niet aangeraakt).
//  - Vaste lasten voeg je in BULK toe via de aanvinklijst op "Je situatie", en daar
//    haal je er ook meteen weer een paar weg. Een venster bij elk van die tien
//    kruisjes zou de aanvinklijst onbruikbaar maken — precies het soort wrijving dat
//    ronde 75 net heeft weggehaald.
export function VasteLastWeg({
  post,
  onSluiten,
  onVerwijderen,
  onOpzeggen,
  telGebruik,
  alle = [],
}: {
  /** De post waarover de vraag gaat, of `null` wanneer het venster dicht hoort. */
  post: TerugkerendePost | null
  onSluiten: () => void
  onVerwijderen: (id: string) => Promise<void> | void
  /**
   * De ZACHTE weg: het bewerkformulier openen om "Loopt tot en met" in te vullen.
   *
   * Bestaat sinds ronde 38 en is bijna altijd wat je bedoelt bij een abonnement dat
   * je stopzet: de post blijft in je historiek staan en telt alleen niet meer mee
   * vanaf die maand. Ontbreekt deze prop, dan staat de knop er gewoon niet.
   */
  onOpzeggen?: (post: TerugkerendePost) => void
  /**
   * Wat hangt er aan deze post? Optioneel, zodat het venster ook los te tonen is;
   * ontbreekt ze, dan zegt het venster dat het niet kon nakijken in plaats van te
   * beweren dat er niets hangt.
   */
  telGebruik?: (id: string) => Gebruiksregel[]
  /**
   * De posten waar deze naast staat, om te weten of er een naamgenoot bij is
   * (ronde 82). Optioneel en standaard leeg: dan gedraagt het venster zich zoals
   * vóór die ronde en zegt het niets extra.
   */
  alle?: readonly TerugkerendePost[]
}) {
  const { t } = useT()
  const opslag = useOpslagpoging()

  // ⚠ Alleen zinvol zolang de post nog dóórloopt. Staat er al een einddatum op, dan
  // is de zachte weg al genomen en zou de knop je naar een veld sturen dat je zelf
  // al ingevuld hebt. Bewust een toets op het RECORD en niet op `isGestopt`: die
  // laatste heeft de dag van vandaag nodig, en dan zou dit venster zelf een klok
  // moeten raadplegen.
  // ⚠ Leeg zolang er geen naamgenoot is; zie `postKenmerk`. `alle` is bewust een
  // prop en geen vaste lijst: alleen de aanroeper weet naast welke posten deze staat.
  const kenmerk = post ? postKenmerk(t, post, alle) : ''

  const toonOpzegzin = post !== null && post.eindMaand === undefined
  const kanOpzeggen = toonOpzegzin && onOpzeggen !== undefined

  return (
    <Dialoog
      /* ⚠ RONDE 82 — de titel houdt de vorm van de twee andere verwijdervensters van
         de app (een gezinslid, een categorie): een KOP stelt de vraag, ze draagt geen
         gegevens. Mijn eerste opzet zette het kenmerk hier tussen haakjes achter, en
         dan staat het vraagteken middenin een kop die op 320 px van twee naar vier
         regels groeit. Het kenmerk staat nu in de eerste regel van de body — en
         alleen wanneer er iets te onderscheiden valt. */
      titel={post ? t('{naam} verwijderen?', { naam: post.omschrijving }) : t('Vaste last verwijderen?')}
      open={post !== null}
      onSluiten={() => {
        opslag.wis()
        onSluiten()
      }}
      voet={
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-secundair"
            onClick={() => {
              opslag.wis()
              onSluiten()
            }}
          >
            {t('Nee, behouden')}
          </button>
          {kanOpzeggen && (
            <button
              type="button"
              className="knop knop-secundair"
              onClick={() => {
                if (!post) return
                opslag.wis()
                onOpzeggen(post)
              }}
            >
              {t('Liever opzeggen')}
            </button>
          )}
          <button
            type="button"
            className="knop knop-secundair knop-gevaar"
            aria-busy={opslag.bezig}
            // ⚠ Het venster gaat pas dicht wanneer het wegschrijven GELUKT is —
            // dezelfde fout als in ronde 68, waar het venster wegviel en het record
            // er gewoon nog stond.
            onClick={() => {
              if (!post) return
              const id = post.id
              void opslag.probeer(() => onVerwijderen(id)).then((gelukt) => {
                if (gelukt) onSluiten()
              })
            }}
          >
            {t('Ja, verwijder')}
          </button>
        </div>
      }
    >
      {post && (
        <div className="stapel" style={{ gap: 10 }}>
          {/* ⚠ RONDE 82 — WÉLKE van de twee. Heet er een andere post net zo, dan zegt
              deze regel welke je op het punt staat te wissen. Heet er niets anders zo,
              dan staat er niets: dan is de naam in de kop al ondubbelzinnig, en een
              bedrag erbij zou de gewone gevallen — de overgrote meerderheid — met
              gegevens opzadelen die niets toevoegen. Zie `postKenmerk`. */}
          {kenmerk !== '' && <p style={{ margin: 0 }}>{t('Het gaat over de kost van {details}.', { details: kenmerk })}</p>}
          {/* ⚠ Zonder telfunctie mag hier geen "er hangt niets aan" staan: dat is een
              bewering, en het venster weet het dan niet. Niet weten en niets vinden
              zijn twee verschillende dingen (ronde 65). */}
          {(() => {
            if (!telGebruik) {
              return <p style={{ margin: 0 }}>{t('De app kan hier niet nakijken wat er aan deze kost hangt.')}</p>
            }
            const regels = telGebruik(post.id)
            // De kop wisselt mee met wat er staat: zo leest het scherm nooit "Hier
            // hangt nog dit aan: • er hangt niets aan".
            if (regels.length === 0) {
              return <p style={{ margin: 0 }}>{t('Er hangt niets aan deze kost.')}</p>
            }
            return (
              <>
                <p style={{ margin: 0 }}>{t('Hier hangt nog dit aan:')}</p>
                <ul className="lijst">
                  {regels.map((regel) => (
                    <li key={regel.kop} className="rij">
                      <span className="rij-midden">
                        <span className="rij-titel">{regel.kop}</span>
                        <span className="rij-meta">{regel.uitleg}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )
          })()}
          {/* ⚠ De ZIN hangt aan de post en niet aan de knop (doorlichting ronde 76).
              Eerst deelden ze één voorwaarde, en dan verdween de hele zachte weg uit
              beeld zodra het scherm de knop niet kon aanbieden — terwijl opzeggen
              gewoon mogelijk blijft. Ze noemt daarom ook geen knop.
              ⚠ En ze zegt "de laatste keer" en niet "vanaf die maand": het veld heet
              "Loopt tot en met", dus de maand die je invult telt nog wél mee. Het
              formulier zelf zegt het al zo ("De laatste keer is …"); twee schermen
              over hetzelfde veld horen niet iets anders te zeggen. */}
          {toonOpzegzin && (
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Zet je hem stop? Vul dan "Loopt tot en met" in — de maand die je daar kiest, is de laatste keer dat hij meetelt. De kost blijft in je historiek staan.')}
            </p>
          )}
          {/* ⚠ Deze zin is nagerekend en geen troostwoord: "Ongedaan maken" bewaart de
              post opnieuw met hetzelfde id, en de boekingen en spaardoelen die ernaar
              wijzen zijn bij het verwijderen niet aangeraakt. De koppelingen komen dus
              écht terug. */}
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Bedenk je je meteen, dan zet "Ongedaan maken" onderaan het scherm de kost terug — mét al deze koppelingen.')}
          </p>
          <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />
        </div>
      )}
    </Dialoog>
  )
}
