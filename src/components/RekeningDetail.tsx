import { useMemo, useState } from 'react'
import type { Categorie, Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { groepenVanTransactie, isGesplitstOverCategorieen } from '../utils/transactie'
import { tekenVanTransactie, uitsplitsingTekst, zachteAchtergrond } from './TransactieLijst'
import { REKENING_TYPE_LABEL } from './RekeningFormulier'
import { geldendeWaardering, saldoVanRekening } from '../utils/saldo'
import { dagJaar, huidigeMaand, vandaag } from '../utils/datum'
import { centenNaarInvoer, formatEuro, invoerNaarCenten } from '../utils/format'
import { Bedrag, Kaart, Leeg, Stat } from '../ui/basis'
import { useT } from '../i18n'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { nieuwId } from '../data/sync/id'

// Hoeveel recente regels het detail toont vóór het afkapt met "+ nog n". Bewust
// klein: dit scherm is een samenvatting, de volledige historiek staat in de
// transactielijst.
const MAX_TRANSACTIES = 8
const MAX_OVERBOEKINGEN = 5

// Nieuwste eerst. De datum is tekst in het formaat JJJJ-MM-DD, dus gewoon
// omgekeerd alfabetisch sorteren geeft de juiste volgorde.
function nieuwsteEerst<T extends { datum: string }>(rijen: T[]): T[] {
  return gesorteerdNieuwsteEerst(rijen)
}

/**
 * "Waarde bijwerken" — een waardering vastleggen voor deze rekening.
 *
 * Waarom dit geen gewone transactie is: de waarde van een effectenrekening of een
 * pensioenspaarplan verandert zonder dat er geld binnenkomt. Boekte je het verschil
 * als transactie, dan stond die winst als INKOMST in je maandoverzicht en in je
 * donut — en dat is ze niet. Paste je het beginsaldo aan, dan verschoof je met
 * terugwerkende kracht je volledige geschiedenis.
 *
 * Een waardering zegt alleen: op deze dag stond er dit. Vanaf daar telt de app
 * gewoon verder met je boekingen.
 */
function WaardeBijwerken({
  rekening,
  waarderingen,
  transacties,
  overboekingen,
  saldoNu,
  vandaagISO,
  onWaardering,
  onWaarderingVerwijderen,
}: {
  rekening: Rekening
  waarderingen: Waardering[]
  /** Alleen om te kunnen zeggen wat er ná deze waardering niet meer apart meetelt. */
  transacties: Transactie[]
  overboekingen: Overboeking[]
  saldoNu: number
  vandaagISO: string
  onWaardering: (w: Waardering) => Promise<void> | void
  onWaarderingVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [datum, setDatum] = useState(vandaagISO)
  const [saldo, setSaldo] = useState('')
  const [notitie, setNotitie] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [gelukt, setGelukt] = useState<string | null>(null)

  const geldendId = geldendeWaardering(rekening.id, waarderingen, vandaagISO)?.id

  const eigen = useMemo(
    () =>
      waarderingen
        .filter((w) => w.rekeningId === rekening.id)
        .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : a.id < b.id ? 1 : -1)),
    [waarderingen, rekening.id],
  )

  const centen = invoerNaarCenten(saldo)
  const geldig = saldo.trim().length > 0 && Number.isFinite(centen) && /^\d{4}-\d{2}-\d{2}$/.test(datum)

  // Staat er al een waardering op precies deze dag? Dan vervángen we die in plaats
  // van er een tweede naast te zetten. Zonder deze regel besliste bij twee
  // waarderingen op dezelfde dag de id wie won — en die is willekeurig, dus je
  // correctie kwam er maar de helft van de keren door.
  const bestaandeVandaag = eigen.find((w) => w.datum === datum)

  // Hoeveel geboekte regels vallen straks binnen de waardering? Ze verdwijnen niet,
  // maar ze tellen niet meer apart mee — dat is precies het soort stille verandering
  // dat je hoort te zien vóór je op de knop duwt.
  const binnenWaardering = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return 0
    const tx = transacties.filter((x) => x.rekeningId === rekening.id && x.datum <= datum).length
    const ob = overboekingen.filter(
      (o) => (o.vanRekeningId === rekening.id || o.naarRekeningId === rekening.id) && o.datum <= datum,
    ).length
    return tx + ob
  }, [transacties, overboekingen, rekening.id, datum])

  async function bewaar() {
    if (!geldig || bezig) return
    setBezig(true)
    setFout(null)
    setGelukt(null)
    try {
      const n = notitie.trim()
      await onWaardering({
        id: bestaandeVandaag ? bestaandeVandaag.id : nieuwId(),
        rekeningId: rekening.id,
        datum,
        saldo: centen,
        ...(n ? { notitie: n } : {}),
      })
      setSaldo('')
      setNotitie('')
      setGelukt(t('Vastgelegd: op {datum} stond er {bedrag}.', { datum: dagJaar(datum), bedrag: formatEuro(centen) }))
    } catch {
      // De invoer blijft staan: een mislukte opslag mag je je werk niet kosten.
      setFout(t('Bijwerken is niet gelukt. Probeer het opnieuw.'))
    } finally {
      setBezig(false)
    }
  }

  return (
    <details>
      <summary className="rij-titel" style={{ cursor: 'pointer' }}>
        {t('Waarde bijwerken')}
      </summary>
      <div className="stapel" style={{ gap: 12, marginTop: 12 }}>
        <p className="rij-meta" style={{ margin: 0 }}>
          {t(
            'Voor rekeningen die van waarde veranderen zonder boeking, zoals beleggingen of pensioensparen. Je geschiedenis blijft staan; de app rekent vanaf deze dag verder met het bedrag dat je hier invult.',
          )}
        </p>
        <div className="veldrij">
          <div className="veldgroep">
            <label className="label-caps" htmlFor={`waardering-datum-${rekening.id}`}>
              {t('Op welke dag?')}
            </label>
            <input
              id={`waardering-datum-${rekening.id}`}
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
                setGelukt(null)
              }}
            />
          </div>
          <div className="veldgroep">
            <label className="label-caps" htmlFor={`waardering-saldo-${rekening.id}`}>
              {t('Werkelijke waarde (€)')}
            </label>
            <input
              id={`waardering-saldo-${rekening.id}`}
              inputMode="decimal"
              placeholder={centenNaarInvoer(saldoNu)}
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
            />
          </div>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`waardering-notitie-${rekening.id}`}>
            {t('Notitie')}
          </label>
          <input
            id={`waardering-notitie-${rekening.id}`}
            placeholder={t('optioneel')}
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
          />
        </div>
        {binnenWaardering > 0 && (
          <p className="rij-meta" role="status" style={{ margin: 0, color: 'var(--warn-tekst)' }}>
            {t(
              'De {n} boeking(en) van vóór en op deze dag tellen daarna niet meer apart mee — ze zitten al in dit bedrag. Ze blijven wel gewoon in je lijst staan.',
              { n: binnenWaardering },
            )}
          </p>
        )}
        {bestaandeVandaag && (
          <p className="rij-meta" role="status" style={{ margin: 0 }}>
            {t('Er staat al een waarde voor deze dag ({bedrag}). Die wordt vervangen.', {
              bedrag: formatEuro(bestaandeVandaag.saldo),
            })}
          </p>
        )}
        {fout && (
          <p className="rij-meta" role="alert" style={{ margin: 0, color: 'var(--negative)' }}>
            {fout}
          </p>
        )}
        <div className="knoprij">
          <button
            type="button"
            className="knop knop-secundair"
            aria-disabled={!geldig || bezig}
            aria-busy={bezig}
            aria-describedby={!geldig ? `waardering-reden-${rekening.id}` : undefined}
            onClick={bewaar}
          >
            {bezig ? t('Bewaren…') : t('Waarde vastleggen')}
          </button>
        </div>
        {!geldig && (
          <p className="rij-meta" role="status" id={`waardering-reden-${rekening.id}`} style={{ margin: 0 }}>
            {t('Vul een datum en een bedrag in.')}
          </p>
        )}
        {gelukt && (
          <p className="rij-meta" role="status" style={{ margin: 0 }}>
            {gelukt}
          </p>
        )}

        {eigen.length > 0 && (
          <>
            <hr className="scheiding" />
            <h4 className="label-caps" id={`waardering-lijst-${rekening.id}`} style={{ margin: 0 }}>
              {t('Eerder vastgelegd')}
            </h4>
            <ul className="lijst" aria-labelledby={`waardering-lijst-${rekening.id}`}>
              {eigen.map((w) => (
                <li key={w.id} className="rij">
                  <div className="rij-midden">
                    <span className="rij-titel">
                      {dagJaar(w.datum)}
                      {/* Twee toestellen kunnen op dezelfde dag elk een waardering
                          maken. Dan telt er maar één, en dat hoort niet stil te
                          gebeuren — anders staan er twee bedragen en weet je niet
                          welk van de twee de app gebruikt. */}
                      {geldendId === w.id && (
                        <>
                          {' '}
                          <span className="badge badge-info badge-mini">{t('geldt nu')}</span>
                        </>
                      )}
                    </span>
                    {w.notitie && <span className="rij-meta">{w.notitie}</span>}
                  </div>
                  <span className="rij-acties">
                    <Bedrag centen={w.saldo} />
                    <button
                      type="button"
                      className="knop knop-kaal knop-gevaar"
                      aria-label={t('Verwijder waardering van {datum}', { datum: dagJaar(w.datum) })}
                      onClick={() => onWaarderingVerwijderen(w.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  )
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
  waarderingen,
  categorieen,
  rekeningNaam,
  onBewerk,
  onArchiveer,
  onVerwijder,
  onWaardering,
  onWaarderingVerwijderen,
}: {
  rekening: Rekening
  /** Alle transacties; dit component filtert zelf op deze rekening. */
  transacties: Transactie[]
  /** Alle overboekingen; dit component filtert zelf op deze rekening. */
  overboekingen: Overboeking[]
  /** Alle waarderingen; dit component filtert zelf op deze rekening. */
  waarderingen: Waardering[]
  categorieen: Categorie[]
  rekeningNaam: (id: string) => string | undefined
  onBewerk: (r: Rekening) => void
  onArchiveer: (r: Rekening, archiveer: boolean) => void
  onVerwijder: (id: string) => void
  onWaardering: (w: Waardering) => Promise<void> | void
  onWaarderingVerwijderen: (id: string) => Promise<void> | void
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

  // Het saldo van vandaag: het beginsaldo — of de laatste waardering, als die er is —
  // plus alle transacties en overboekingen t.e.m. vandaag.
  // Een boeking met een datum in de toekomst telt bewust nog niet mee.
  const saldoNu = saldoVanRekening(rekening, transacties, overboekingen, waarderingen, dag)
  const geldend = geldendeWaardering(rekening.id, waarderingen, dag)

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
          {/* Het vertrekpunt erbij, zodat het verschil met het saldo navolgbaar is.
              Geldt er een waardering, dan is HAAR bedrag het vertrekpunt — het
              beginsaldo doet dan niet meer mee, en het tonen zou misleiden. */}
          <p className="kaart-bijschrift" style={{ margin: 0 }}>
            {geldend
              ? t('sinds de waarde van {datum}: {saldo}', {
                  datum: dagJaar(geldend.datum),
                  saldo: formatEuro(geldend.saldo),
                })
              : t('startsaldo {saldo}', { saldo: formatEuro(rekening.beginsaldo) })}
          </p>
          {/* Bij een kredietkaart is niet het saldo de vraag, maar hoeveel je nog
              mag opnemen. Zonder deze regel vroegen we een limiet die nergens
              terugkwam. */}
          {rekening.type === 'krediet' && rekening.kredietlimiet !== undefined && (
            <p className="kaart-bijschrift" style={{ margin: 0 }}>
              {t('nog {bedrag} van je limiet van {limiet} beschikbaar', {
                bedrag: formatEuro(Math.max(0, rekening.kredietlimiet + Math.min(0, saldoNu))),
                limiet: formatEuro(rekening.kredietlimiet),
              })}
              {rekening.afrekendag !== undefined
                ? t(' · wordt afgerekend op dag {dag}', { dag: rekening.afrekendag })
                : ''}
            </p>
          )}
        </div>

        <hr className="scheiding" />

        <span className="label-caps">{t('Deze maand')}</span>
        {/* Valt een deel van deze maand vóór de geldende waardering, dan tellen die
            boekingen wél in de cijfers hieronder maar NIET meer in het saldo
            hierboven. Zonder deze regel staan er twee getallen op één kaart die niet
            bij elkaar optellen, en dat is precies het soort stille tegenspraak dat
            een gebruiker zijn vertrouwen kost. */}
        {geldend && geldend.datum >= `${maand}-01` && (
          <p className="rij-meta" style={{ margin: 0, color: 'var(--warn-tekst)' }}>
            {t('Let op: de boekingen tot en met {datum} zitten al in de waarde die je toen hebt vastgelegd. Ze tellen hieronder wel mee, maar niet meer in het saldo bovenaan.', { datum: dagJaar(geldend.datum) })}
          </p>
        )}
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
        <WaardeBijwerken
          rekening={rekening}
          waarderingen={waarderingen}
          transacties={transacties}
          overboekingen={overboekingen}
          saldoNu={saldoNu}
          vandaagISO={dag}
          onWaardering={onWaardering}
          onWaarderingVerwijderen={onWaarderingVerwijderen}
        />
      </Kaart>

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
