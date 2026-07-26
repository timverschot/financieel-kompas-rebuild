import { useMemo } from 'react'
import type { Categorie, Overboeking, Rekening, Transactie } from '../data/schema'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { groepenVanTransactie, isGesplitstOverCategorieen } from '../utils/transactie'
import { tekenVanTransactie, uitsplitsingTekst, zachteAchtergrond } from './TransactieLijst'
import { REKENING_TYPE_LABEL } from './RekeningFormulier'
import { saldoVanRekening } from '../utils/saldo'
import { huidigeMaand, vandaag } from '../utils/datum'
import { formatEuro } from '../utils/format'
import { Bedrag, Kaart, Leeg, Stat } from '../ui/basis'
import { useT } from '../i18n'

// Hoeveel recente regels het detail toont vóór het afkapt met "+ nog n". Bewust
// klein: dit scherm is een samenvatting, de volledige historiek staat in de
// transactielijst.
const MAX_TRANSACTIES = 8
const MAX_OVERBOEKINGEN = 5

// Nieuwste eerst. De datum is tekst in het formaat JJJJ-MM-DD, dus gewoon
// omgekeerd alfabetisch sorteren geeft de juiste volgorde.
function nieuwsteEerst<T extends { datum: string }>(rijen: T[]): T[] {
  return [...rijen].sort((a, b) => (a.datum < b.datum ? 1 : -1))
}

/**
 * Het detail van één rekening: wat er nu op staat, wat er deze maand op en af
 * ging, de recentste boekingen en overboekingen, en de acties op de rekening zelf.
 *
 * Alle rekenwerk komt uit de gedeelde helpers (saldoVanRekening, vandaag,
 * huidigeMaand), zodat dit scherm nooit een ander saldo toont dan de rest van de
 * app. De kengetallen rekenen op TRANSACTIENIVEAU: het bedrag van een transactie
 * hoort bij één rekening, ook wanneer het ticket over meerdere categorieën
 * gesplitst is. Uitsplitsen hoort bij categorie-analyses, niet hier.
 */
export function RekeningDetail({
  rekening,
  transacties,
  overboekingen,
  categorieen,
  rekeningNaam,
  onBewerk,
  onArchiveer,
  onVerwijder,
}: {
  rekening: Rekening
  /** Alle transacties; dit component filtert zelf op deze rekening. */
  transacties: Transactie[]
  /** Alle overboekingen; dit component filtert zelf op deze rekening. */
  overboekingen: Overboeking[]
  categorieen: Categorie[]
  rekeningNaam: (id: string) => string | undefined
  onBewerk: (r: Rekening) => void
  onArchiveer: (r: Rekening, archiveer: boolean) => void
  onVerwijder: (id: string) => void
}) {
  const { t } = useT()

  const dag = vandaag()
  const maand = huidigeMaand()

  // De boekingen van deze rekening, nieuwste eerst.
  const eigenTransacties = useMemo(
    () => nieuwsteEerst(transacties.filter((tx) => tx.rekeningId === rekening.id)),
    [transacties, rekening.id],
  )

  // Elke overboeking waar deze rekening aan de ene of de andere kant staat.
  const eigenOverboekingen = useMemo(
    () =>
      nieuwsteEerst(
        overboekingen.filter((o) => o.vanRekeningId === rekening.id || o.naarRekeningId === rekening.id),
      ),
    [overboekingen, rekening.id],
  )

  // Het saldo van vandaag: beginsaldo + transacties + overboekingen t.e.m. vandaag.
  // Een boeking met een datum in de toekomst telt bewust nog niet mee.
  const saldoNu = saldoVanRekening(rekening, transacties, overboekingen, dag)

  // De maandcijfers. Overboekingen zitten hier bewust NIET in: die verschuiven
  // enkel geld tussen je eigen rekeningen en zijn dus geen inkomst of uitgave.
  const dezeMaand = eigenTransacties.filter((tx) => tx.datum.slice(0, 7) === maand)
  const binnen = dezeMaand.reduce((som, tx) => (tx.bedrag > 0 ? som + tx.bedrag : som), 0)
  const eraf = dezeMaand.reduce((som, tx) => (tx.bedrag < 0 ? som + tx.bedrag : som), 0)
  const verschil = binnen + eraf

  // Type, rubriek en rekeningnummer, elk enkel wanneer ingevuld.
  const kenmerken = [
    rekening.type ? t(REKENING_TYPE_LABEL[rekening.type]) : undefined,
    rekening.rubriek,
    rekening.rekeningnummer,
  ].filter(Boolean)

  const zichtbareTransacties = eigenTransacties.slice(0, MAX_TRANSACTIES)
  const meerTransacties = eigenTransacties.length - zichtbareTransacties.length
  const zichtbareOverboekingen = eigenOverboekingen.slice(0, MAX_OVERBOEKINGEN)
  const meerOverboekingen = eigenOverboekingen.length - zichtbareOverboekingen.length

  // Staat er nog helemaal niets op deze rekening, dan is één zin vriendelijker dan
  // twee lege kaarten onder elkaar.
  const nogNiets = eigenTransacties.length === 0 && eigenOverboekingen.length === 0

  return (
    <section className="stapel">
      <Kaart
        titel={rekening.naam}
        bijschrift={kenmerken.length > 0 ? kenmerken.join(' · ') : undefined}
        actie={rekening.gearchiveerd ? <span className="badge badge-neutraal">{t('gearchiveerd')}</span> : undefined}
      >
        <div>
          <span className="label-caps">{t('Saldo vandaag')}</span>
          <div>
            <Bedrag centen={saldoNu} groot />
          </div>
          {/* Het startbedrag erbij, zodat het verschil met het saldo navolgbaar is. */}
          <p className="kaart-bijschrift" style={{ margin: 0 }}>
            {t('startsaldo {saldo}', { saldo: formatEuro(rekening.beginsaldo) })}
          </p>
        </div>

        <hr className="scheiding" />

        <span className="label-caps">{t('Deze maand')}</span>
        <div className="stat-rij">
          <Stat label={t('Binnengekomen')}>{formatEuro(binnen)}</Stat>
          <Stat label={t('Eraf gegaan')}>{formatEuro(Math.abs(eraf))}</Stat>
          <Stat label={t('Verschil')}>{formatEuro(verschil)}</Stat>
        </div>
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {t('Overboekingen tellen hier niet mee: die verschuiven enkel geld tussen je eigen rekeningen.')}
        </p>
      </Kaart>

      {nogNiets && (
        <Kaart>
          <Leeg>{t('Nog geen boekingen op deze rekening.')}</Leeg>
        </Kaart>
      )}

      {!nogNiets && eigenTransacties.length > 0 && (
        <Kaart titel={t('Laatste transacties')}>
          <ul className="lijst">
            {zichtbareTransacties.map((tx) => {
              const groepen = groepenVanTransactie(tx, categorieen)
              const gesplitst = isGesplitstOverCategorieen(tx, categorieen)
              const { teken, kleur } = tekenVanTransactie(tx, groepen, gesplitst)
              const cat = gesplitst ? uitsplitsingTekst(groepen) : labelVanCategorie(tx.categorieId, categorieen)
              return (
                <li key={tx.id} className="rij">
                  {/* Decoratief: wat het icoon zegt, staat ook in de meta-regel eronder. */}
                  <span className="rij-teken" aria-hidden="true" style={{ backgroundColor: zachteAchtergrond(kleur) }}>
                    {teken}
                  </span>
                  <span className="rij-midden">
                    <span className="rij-titel">{tx.omschrijving}</span>
                    <span className="rij-meta tx-meta">
                      <span>{tx.datum}</span>
                      {cat && <span>{cat}</span>}
                    </span>
                  </span>
                  <Bedrag centen={tx.bedrag} richting="auto" />
                </li>
              )
            })}
          </ul>
          {meerTransacties > 0 && (
            <p className="kaart-bijschrift" style={{ margin: 0 }}>
              {t('+ nog {n}', { n: meerTransacties })}
            </p>
          )}
        </Kaart>
      )}

      {!nogNiets && eigenOverboekingen.length > 0 && (
        <Kaart titel={t('Overboekingen')}>
          <ul className="lijst">
            {zichtbareOverboekingen.map((o) => {
              // Komt het geld binnen of gaat het weg? Dat bepaalt het teken, de
              // kleur van het bedrag én welke andere rekening we benoemen.
              const binnenkomend = o.naarRekeningId === rekening.id
              const andereId = binnenkomend ? o.vanRekeningId : o.naarRekeningId
              const andere = rekeningNaam(andereId) ?? t('onbekende rekening')
              return (
                <li key={o.id} className="rij">
                  <span className="rij-teken" aria-hidden="true">
                    {binnenkomend ? '↓' : '↑'}
                  </span>
                  <span className="rij-midden">
                    <span className="rij-titel">
                      {binnenkomend ? t('van {naam}', { naam: andere }) : t('naar {naam}', { naam: andere })}
                    </span>
                    <span className="rij-meta tx-meta">
                      <span>{o.datum}</span>
                      {o.omschrijving && <span>{o.omschrijving}</span>}
                    </span>
                  </span>
                  <Bedrag centen={binnenkomend ? o.bedrag : -o.bedrag} richting="auto" />
                </li>
              )
            })}
          </ul>
          {meerOverboekingen > 0 && (
            <p className="kaart-bijschrift" style={{ margin: 0 }}>
              {t('+ nog {n}', { n: meerOverboekingen })}
            </p>
          )}
        </Kaart>
      )}

      <Kaart>
        {/* Hoogstens één gevulde knop per scherm: bewerken is de hoofdactie. */}
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-primair"
            aria-label={t('Bewerk rekening {naam}', { naam: rekening.naam })}
            onClick={() => onBewerk(rekening)}
          >
            {t('Bewerken')}
          </button>
          <button
            type="button"
            className="knop knop-secundair"
            aria-label={
              rekening.gearchiveerd
                ? t('Herstel rekening {naam}', { naam: rekening.naam })
                : t('Archiveer rekening {naam}', { naam: rekening.naam })
            }
            onClick={() => onArchiveer(rekening, !rekening.gearchiveerd)}
          >
            {rekening.gearchiveerd ? t('Heropenen') : t('Archiveren')}
          </button>
          <button
            type="button"
            className="knop knop-secundair knop-gevaar"
            aria-label={t('Verwijder rekening {naam}', { naam: rekening.naam })}
            onClick={() => onVerwijder(rekening.id)}
          >
            {t('Verwijderen')}
          </button>
        </div>
      </Kaart>
    </section>
  )
}
