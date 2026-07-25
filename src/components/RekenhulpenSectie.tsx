import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  datumVoorDoel,
  extraAflossing,
  formatProcent,
  maandbedragVoorDoel,
  maandlast,
  tekstNaarGetal,
  vergelijkPrijzen,
  type Aanbieding,
  type Basiseenheid,
  type Eenheid,
  type Rekenfout,
} from '../utils/rekenhulp'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { vandaag } from '../utils/datum'
import { Kaart, PaginaKop, Stat } from '../ui/basis'
import { IndexatieCalculator, uitkomstVlak, uitkomstBijregel } from './IndexatieCalculator'
import { useT } from '../i18n'

// Pagina "Rekenhulpen": vier kleine rekenmachines die niets bewaren. Ze rekenen
// live mee terwijl je typt, dus er is geen enkele knop nodig om iets te berekenen.
// Alle rekenwerk zelf staat in utils/rekenhulp.ts; hier staat enkel het scherm.

// ---------------------------------------------------------------------------
// Gedeelde stukjes
// ---------------------------------------------------------------------------

const hulpregel: CSSProperties = { margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)' }
const foutregel: CSSProperties = { margin: '14px 0 0', fontSize: 13, color: 'var(--negative-ink)' }
const resultaatVlak: CSSProperties = { ...uitkomstVlak, marginTop: 14 }

// Elke foutcode uit de rekenkern krijgt hier één begrijpelijke zin. De sleutel is
// de Nederlandse tekst zelf (zie i18n.tsx), dus t() vertaalt ze mee.
const FOUTTEKST: Record<Rekenfout, string> = {
  'bedrag-ontbreekt': 'Vul een bedrag in.',
  'bedrag-nul': 'Vul een bedrag groter dan nul in.',
  'index-ongeldig': 'Vul twee indexcijfers groter dan nul in.',
  'rente-ongeldig': 'Vul een rentevoet van nul of meer in.',
  'looptijd-ongeldig': 'Vul een looptijd in hele maanden in (minstens 1).',
  'extra-ontbreekt': 'Vul een extra bedrag groter dan nul in.',
  'aflossing-te-klein': 'Deze maandlast dekt de interest niet: zo raakt de lening nooit afbetaald.',
  'datum-ongeldig': 'Kies een geldige datum.',
  'datum-verleden': 'Kies een streefdatum in de toekomst.',
  'inleg-ontbreekt': 'Vul een maandbedrag groter dan nul in.',
  'duurt-te-lang': 'Zo duurt het langer dan honderd jaar. Verhoog het maandbedrag.',
  'hoeveelheid-ongeldig': 'Vul bij elke aanbieding een hoeveelheid groter dan nul in.',
  'gemengde-eenheden': 'Vergelijk gewicht met gewicht, inhoud met inhoud, of stuks met stuks.',
  'te-weinig-aanbiedingen': 'Vul minstens twee aanbiedingen in om te vergelijken.',
}

/** Is dit tekstveld ingevuld? Zolang alles leeg is, tonen we geen foutmelding. */
function ingevuld(...velden: string[]): boolean {
  return velden.every((v) => v.trim() !== '')
}

// ---------------------------------------------------------------------------
// 2. Lening en aflossing
// ---------------------------------------------------------------------------

function LeningRekenhulp() {
  const { t } = useT()
  const [bedrag, setBedrag] = useState('')
  const [rente, setRente] = useState('')
  const [looptijd, setLooptijd] = useState('')
  const [extra, setExtra] = useState('')

  const hoofdsomCenten = invoerNaarCenten(bedrag)
  const jaarrente = tekstNaarGetal(rente)
  const maanden = tekstNaarGetal(looptijd)

  const basis = maandlast(hoofdsomCenten, jaarrente, maanden)
  const winst = extra.trim() === '' ? null : extraAflossing(hoofdsomCenten, jaarrente, maanden, invoerNaarCenten(extra))

  return (
    <Kaart
      titel={t('Lening en aflossing')}
      bijschrift={t('Wat kost een lening per maand, en wat levert extra aflossen op?')}
    >
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-bedrag">
            {t('Geleend bedrag (€)')}
          </label>
          <input id="lening-bedrag" inputMode="decimal" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-rente">
            {t('Jaarlijkse rentevoet (%)')}
          </label>
          <input id="lening-rente" inputMode="decimal" value={rente} onChange={(e) => setRente(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-looptijd">
            {t('Looptijd (maanden)')}
          </label>
          <input id="lening-looptijd" inputMode="numeric" value={looptijd} onChange={(e) => setLooptijd(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="lening-extra">
            {t('Extra per maand (€)')}
          </label>
          <input id="lening-extra" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
        </div>
      </div>

      {basis.ok && (
        <div style={resultaatVlak}>
          <div className="stat-rij">
            <Stat label={t('Maandlast')}>{formatEuro(basis.waarde.maandlastCenten)}</Stat>
            <Stat label={t('Totale interest')}>{formatEuro(basis.waarde.totaleInterestCenten)}</Stat>
            <Stat label={t('Totaal terugbetaald')}>{formatEuro(basis.waarde.totaalBetaaldCenten)}</Stat>
          </div>

          {winst !== null && winst.ok && (
            <p style={uitkomstBijregel}>
              {winst.waarde.maandenKorter > 0
                ? t('Met {extra} extra per maand ben je {maanden} maanden vroeger klaar en bespaar je {interest} interest.', {
                    extra: formatEuro(invoerNaarCenten(extra)),
                    maanden: winst.waarde.maandenKorter,
                    interest: formatEuro(winst.waarde.interestBespaardCenten),
                  })
                : t('Met {extra} extra per maand bespaar je {interest} interest.', {
                    extra: formatEuro(invoerNaarCenten(extra)),
                    interest: formatEuro(winst.waarde.interestBespaardCenten),
                  })}
            </p>
          )}
        </div>
      )}

      {!basis.ok && ingevuld(bedrag, rente, looptijd) && <p style={foutregel}>{t(FOUTTEKST[basis.fout])}</p>}
      {basis.ok && winst !== null && !winst.ok && <p style={foutregel}>{t(FOUTTEKST[winst.fout])}</p>}
    </Kaart>
  )
}

// ---------------------------------------------------------------------------
// 3. Spaardoel
// ---------------------------------------------------------------------------

type SpaarVraag = 'per-maand' | 'wanneer'

function SpaardoelRekenhulp() {
  const { t } = useT()
  const [vraag, setVraag] = useState<SpaarVraag>('per-maand')
  const [doel, setDoel] = useState('')
  const [gespaard, setGespaard] = useState('')
  const [streefdatum, setStreefdatum] = useState('')
  const [perMaand, setPerMaand] = useState('')

  const nu = vandaag()
  const doelCenten = invoerNaarCenten(doel)
  // Een leeg "al gespaard" betekent gewoon nul, geen fout.
  const gespaardCenten = gespaard.trim() === '' ? 0 : invoerNaarCenten(gespaard)

  const plan = maandbedragVoorDoel(doelCenten, gespaardCenten, streefdatum, nu)
  const duur = datumVoorDoel(doelCenten, gespaardCenten, invoerNaarCenten(perMaand), nu)

  return (
    <Kaart titel={t('Spaardoel')} bijschrift={t('Hoeveel per maand, of wanneer haal je het?')}>
      <div className="knoprij" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={vraag === 'per-maand' ? 'chip chip-actief' : 'chip'}
          aria-pressed={vraag === 'per-maand'}
          onClick={() => setVraag('per-maand')}
        >
          {t('Hoeveel per maand?')}
        </button>
        <button
          type="button"
          className={vraag === 'wanneer' ? 'chip chip-actief' : 'chip'}
          aria-pressed={vraag === 'wanneer'}
          onClick={() => setVraag('wanneer')}
        >
          {t('Wanneer haal ik het?')}
        </button>
      </div>

      <p style={hulpregel}>{t('Zonder rente gerekend, net zoals de spaardoelen in de app.')}</p>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="spaar-doel">
            {t('Doelbedrag (€)')}
          </label>
          <input id="spaar-doel" inputMode="decimal" value={doel} onChange={(e) => setDoel(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="spaar-gespaard">
            {t('Al gespaard (€)')}
          </label>
          <input id="spaar-gespaard" inputMode="decimal" value={gespaard} onChange={(e) => setGespaard(e.target.value)} />
        </div>
        {vraag === 'per-maand' ? (
          <div className="veldgroep">
            <label className="label-caps" htmlFor="spaar-datum">
              {t('Streefdatum')}
            </label>
            <input id="spaar-datum" type="date" value={streefdatum} onChange={(e) => setStreefdatum(e.target.value)} />
          </div>
        ) : (
          <div className="veldgroep">
            <label className="label-caps" htmlFor="spaar-permaand">
              {t('Bedrag per maand (€)')}
            </label>
            <input id="spaar-permaand" inputMode="decimal" value={perMaand} onChange={(e) => setPerMaand(e.target.value)} />
          </div>
        )}
      </div>

      {vraag === 'per-maand' && plan.ok && (
        <div style={resultaatVlak}>
          {plan.waarde.alBereikt ? (
            <p style={{ margin: 0 }}>{t('Je doel is al bereikt.')}</p>
          ) : (
            <>
              <div className="stat-rij">
                <Stat label={t('Per maand opzijzetten')}>{formatEuro(plan.waarde.perMaandCenten)}</Stat>
                <Stat label={t('Nog nodig')}>{formatEuro(plan.waarde.resterendCenten)}</Stat>
                <Stat label={t('Aantal maanden')}>{plan.waarde.maanden}</Stat>
              </div>
              <p style={uitkomstBijregel}>
                {t('{maanden} stortingen van {bedrag} tot {datum}.', {
                  maanden: plan.waarde.maanden,
                  bedrag: formatEuro(plan.waarde.perMaandCenten),
                  datum: streefdatum,
                })}
              </p>
            </>
          )}
        </div>
      )}

      {vraag === 'wanneer' && duur.ok && (
        <div style={resultaatVlak}>
          {duur.waarde.alBereikt ? (
            <p style={{ margin: 0 }}>{t('Je doel is al bereikt.')}</p>
          ) : (
            <>
              <div className="stat-rij">
                <Stat label={t('Klaar op')}>{duur.waarde.datumISO}</Stat>
                <Stat label={t('Aantal maanden')}>{duur.waarde.maanden}</Stat>
                <Stat label={t('Nog nodig')}>{formatEuro(duur.waarde.resterendCenten)}</Stat>
              </div>
              <p style={uitkomstBijregel}>
                {t('Vanaf vandaag ({vandaag}) duurt dat nog {maanden} maanden.', {
                  vandaag: nu,
                  maanden: duur.waarde.maanden,
                })}
              </p>
            </>
          )}
        </div>
      )}

      {vraag === 'per-maand' && !plan.ok && ingevuld(doel, streefdatum) && <p style={foutregel}>{t(FOUTTEKST[plan.fout])}</p>}
      {vraag === 'wanneer' && !duur.ok && ingevuld(doel, perMaand) && <p style={foutregel}>{t(FOUTTEKST[duur.fout])}</p>}
    </Kaart>
  )
}

// ---------------------------------------------------------------------------
// 4. Prijs per eenheid
// ---------------------------------------------------------------------------

type PrijsRegel = { id: string; naam: string; prijs: string; hoeveelheid: string; eenheid: Eenheid }

function nieuweRegel(nummer: number): PrijsRegel {
  return { id: 'regel-' + nummer, naam: '', prijs: '', hoeveelheid: '', eenheid: 'g' }
}

// De naam van de basiseenheid waarop vergeleken wordt.
const BASISLABEL: Record<Basiseenheid, string> = { kg: 'per kilo', l: 'per liter', stuk: 'per stuk' }

function PrijsPerEenheidRekenhulp() {
  const { t } = useT()
  const [regels, setRegels] = useState<PrijsRegel[]>([nieuweRegel(1), nieuweRegel(2)])
  // Doorlopende teller voor nieuwe regels: zo krijgt een toegevoegde regel nooit
  // hetzelfde id als een regel die de gebruiker eerder verwijderde.
  const [teller, setTeller] = useState(3)

  function wijzig(id: string, aanpassing: Partial<PrijsRegel>) {
    setRegels((huidig) => huidig.map((r) => (r.id === id ? { ...r, ...aanpassing } : r)))
  }

  const eenheden: { waarde: Eenheid; label: string }[] = [
    { waarde: 'g', label: t('gram (g)') },
    { waarde: 'kg', label: t('kilogram (kg)') },
    { waarde: 'ml', label: t('milliliter (ml)') },
    { waarde: 'l', label: t('liter (l)') },
    { waarde: 'stuk', label: t('stuks') },
  ]

  // Enkel volledig ingevulde regels doen mee; halve invoer laat de rekenhulp stil.
  const ingevuldeRegels = regels.filter((r) => r.prijs.trim() !== '' && r.hoeveelheid.trim() !== '')
  const aanbiedingen: Aanbieding[] = ingevuldeRegels.map((r) => ({
    id: r.id,
    naam: r.naam.trim() !== '' ? r.naam.trim() : t('Aanbieding {n}', { n: regels.indexOf(r) + 1 }),
    prijsCenten: invoerNaarCenten(r.prijs),
    hoeveelheid: tekstNaarGetal(r.hoeveelheid),
    eenheid: r.eenheid,
  }))
  const vergelijking = vergelijkPrijzen(aanbiedingen)
  const toonFout = ingevuldeRegels.length >= 2 && !vergelijking.ok

  return (
    <Kaart titel={t('Prijs per eenheid')} bijschrift={t('Welke verpakking is echt het voordeligst?')}>
      <p style={hulpregel}>{t('Gram en milliliter worden omgerekend, zodat 750 g en 1 kg eerlijk vergelijken.')}</p>

      <div className="stapel" style={{ gap: 12 }}>
        {regels.map((r, i) => (
          <div key={r.id} className="veldrij">
            <div className="veldgroep">
              <label className="label-caps" htmlFor={r.id + '-naam'}>
                {t('Naam (optioneel)')}
              </label>
              <input
                id={r.id + '-naam'}
                value={r.naam}
                placeholder={t('Aanbieding {n}', { n: i + 1 })}
                onChange={(e) => wijzig(r.id, { naam: e.target.value })}
              />
            </div>
            <div className="veldgroep">
              <label className="label-caps" htmlFor={r.id + '-prijs'}>
                {t('Prijs (€)')}
              </label>
              <input id={r.id + '-prijs'} inputMode="decimal" value={r.prijs} onChange={(e) => wijzig(r.id, { prijs: e.target.value })} />
            </div>
            <div className="veldgroep">
              <label className="label-caps" htmlFor={r.id + '-hoeveelheid'}>
                {t('Hoeveelheid')}
              </label>
              <input
                id={r.id + '-hoeveelheid'}
                inputMode="decimal"
                value={r.hoeveelheid}
                onChange={(e) => wijzig(r.id, { hoeveelheid: e.target.value })}
              />
            </div>
            <div className="veldgroep">
              <label className="label-caps" htmlFor={r.id + '-eenheid'}>
                {t('Eenheid')}
              </label>
              <select id={r.id + '-eenheid'} value={r.eenheid} onChange={(e) => wijzig(r.id, { eenheid: e.target.value as Eenheid })}>
                {eenheden.map((e) => (
                  <option key={e.waarde} value={e.waarde}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            {regels.length > 2 && (
              <div className="veldgroep" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder aanbieding {n}', { n: i + 1 })}
                  onClick={() => setRegels((huidig) => huidig.filter((x) => x.id !== r.id))}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="knoprij" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          onClick={() => {
            setRegels((huidig) => [...huidig, nieuweRegel(teller)])
            setTeller(teller + 1)
          }}
        >
          {t('Nog een aanbieding')}
        </button>
      </div>

      {vergelijking.ok && (
        <div style={resultaatVlak}>
          {vergelijking.waarde.map((v) => (
            <div
              key={v.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.naam}</span>
                {v.goedkoopste ? (
                  <span className="badge badge-ok badge-mini">{t('goedkoopste')}</span>
                ) : (
                  <span className="badge badge-neutraal badge-mini">
                    {t('{procent} duurder', { procent: formatProcent(v.procentDuurder, 1) })}
                  </span>
                )}
              </span>
              <span className="stat-waarde">
                {formatEuro(v.perEenheidCenten)} {t(BASISLABEL[v.basis])}
              </span>
            </div>
          ))}
        </div>
      )}

      {toonFout && !vergelijking.ok && <p style={foutregel}>{t(FOUTTEKST[vergelijking.fout])}</p>}
    </Kaart>
  )
}

// ---------------------------------------------------------------------------
// De pagina zelf
// ---------------------------------------------------------------------------

export function RekenhulpenSectie() {
  const { t } = useT()
  return (
    <div className="stapel">
      <PaginaKop titel={t('Rekenhulpen')} bijschrift={t('Vier kleine rekenmachines. Ze rekenen live mee en bewaren niets.')} />
      <IndexatieCalculator />
      <LeningRekenhulp />
      <SpaardoelRekenhulp />
      <PrijsPerEenheidRekenhulp />
    </div>
  )
}
