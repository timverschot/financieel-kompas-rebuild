import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { KindkostenSectie } from './KindkostenSectie'
import type { Dossier, GedeeldeKost, Kind, Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { DUBBEL_SPELING_DAGEN } from '../utils/kindkosten'

// Ronde 53. Dit cijfer kan in een gesprek met de andere ouder terechtkomen, dus de
// tests bewaken vooral de GRENS: wat het scherm wél en niet meetelt, en welke rij
// mag doorklikken.

const VANDAAG = '2026-08-17'

const gezinsleden: Kind[] = [
  { id: 'emma', naam: 'Emma' },
  { id: 'noah', naam: 'Noah' },
]
const dossiers: Dossier[] = [{ id: 'd1', naam: 'Kinderen', aandeelJij: 60 }]

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-03-10',
  omschrijving: 'Winkel',
  bedrag: -5000,
  rekeningId: 'r1',
  ...over,
})

const kost = (over: Partial<GedeeldeKost> & { id: string }): GedeeldeKost => ({
  dossierId: 'd1',
  omschrijving: 'Schoolreis',
  bedrag: 9000,
  betaaldDoor: 'jij',
  datum: '2026-05-04',
  ...over,
})

function toon(over: Partial<Parameters<typeof KindkostenSectie>[0]> = {}) {
  const onGaNaarTransacties = vi.fn()
  render(
    <KindkostenSectie
      transacties={[]}
      dossiers={dossiers}
      gezinsleden={gezinsleden}
      vandaagISO={VANDAAG}
      onGaNaarTransacties={onGaNaarTransacties}
      {...over}
    />,
  )
  return { onGaNaarTransacties }
}

const rijVan = (id: string) => document.querySelector(`[data-lid="${id}"]`) as HTMLElement

describe('KindkostenSectie — de cijfers', () => {
  it('zet per gezinslid het jaarbedrag, met de twee bronnen eronder', () => {
    toon({
      transacties: [tx({ id: 'a', bedrag: -2000, persoonIds: ['emma'] })],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
    })
    const rij = rijVan('emma')
    expect(within(rij).getByText('Emma')).toBeInTheDocument()
    expect(rij.textContent).toContain(formatEuro(7400))
    // `formatEuro` en geen letterlijke tekst: er staat een VASTE spatie na de €,
    // en die is in een testbestand niet van een gewone te onderscheiden.
    expect(rij.textContent).toContain(`${formatEuro(2000)} uit je boekingen`)
    expect(rij.textContent).toContain(`${formatEuro(5400)} uit gedeelde kosten`)
  })

  it('telt het totaal boven de lijst', () => {
    toon({ transacties: [tx({ id: 'a', persoonIds: ['emma'] }), tx({ id: 'b', bedrag: -1000 })] })
    const kop = document.querySelector('[data-kindkop]') as HTMLElement
    expect(kop.textContent).toContain(formatEuro(6000))
  })

  it('zegt dat het lopende jaar nog aangroeit', () => {
    toon({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    expect(document.querySelector('[data-loopendjaar]')?.textContent).toMatch(/groeit nog aan/)
  })
})

describe('KindkostenSectie — wat er NIET in zit', () => {
  it('noemt de alimentatie en de gezamenlijke pot met zoveel woorden', () => {
    // Allebei kunnen ze groter zijn dan alles wat hier wél staat. Een cijfer dat ze
    // stilzwijgend weglaat, leest als een volledig antwoord.
    toon({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    const blok = document.querySelector('[data-nietin]') as HTMLElement
    expect(within(blok).getByText('De onderhoudsbijdrage')).toBeInTheDocument()
    expect(within(blok).getByText('De gezamenlijke pot')).toBeInTheDocument()
  })

  it('legt uit waarom een gedeelde kost maar voor jouw aandeel telt', () => {
    toon({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    expect(screen.getByText(/telt hier voor JOUW aandeel/)).toBeInTheDocument()
  })

  it('zegt hoeveel boekingen er als gedeelde kost geteld zijn', () => {
    toon({
      transacties: [tx({ id: 'school', bedrag: -9000, persoonIds: ['emma'] })],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], transactieId: 'school' })],
    })
    expect(document.querySelector('[data-overgeslagen]')?.textContent).toMatch(/maar één keer/)
  })

  it('zwijgt daarover wanneer er niets overgeslagen is', () => {
    toon({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    expect(document.querySelector('[data-overgeslagen]')).toBeNull()
  })
})

describe('KindkostenSectie — welke rij mag doorklikken', () => {
  it('opent de boekingen van dat gezinslid in dat jaar', async () => {
    const gebruiker = userEvent.setup()
    const { onGaNaarTransacties } = toon({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    await gebruiker.click(screen.getByRole('button', { name: /^Emma .* bekijk de boekingen/ }))
    expect(onGaNaarTransacties).toHaveBeenCalledWith({
      persoonId: 'emma',
      van: '2026-01-01',
      tot: '2026-12-31',
      richting: 'uit',
    })
  })

  it('geeft GEEN knop aan een rij met een aandeel uit een dossier', () => {
    // Jouw 60 % van € 90 bestaat nergens als boeking; de lijst zou € 90 tonen.
    toon({ gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })] })
    expect(screen.queryByRole('button', { name: /^Emma .* bekijk de boekingen/ })).toBeNull()
  })

  it('zet een pijltje op de rijen die ergens heen gaan, en niet op de andere', () => {
    toon({
      transacties: [tx({ id: 'a', persoonIds: ['emma'] })],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['noah'] })],
    })
    const zichtbaar = (id: string) =>
      (rijVan(id).querySelector('.rij-chevron') as HTMLElement).style.visibility !== 'hidden'
    expect(zichtbaar('emma')).toBe(true)
    expect(zichtbaar('noah')).toBe(false)
  })

  it('laat "Het gezin" doorklikken naar de boekingen zonder gezinslid', async () => {
    const gebruiker = userEvent.setup()
    const { onGaNaarTransacties } = toon({ transacties: [tx({ id: 'a' })] })
    await gebruiker.click(screen.getByRole('button', { name: /^Het gezin .* bekijk de boekingen/ }))
    expect(onGaNaarTransacties).toHaveBeenCalledWith(expect.objectContaining({ zonderPersoon: true }))
  })
})

describe('KindkostenSectie — een leeg jaar', () => {
  it('legt uit wat je moet doen in plaats van een leeg blad te tonen', () => {
    toon()
    expect(screen.getByText(/staat er nog niets op naam van een gezinslid/)).toBeInTheDocument()
    // De grens blijft wél staan: anders lijkt "niets" het volledige antwoord.
    expect(document.querySelector('[data-nietin]')).not.toBeNull()
  })
})

describe('KindkostenSectie — het jaar kiezen', () => {
  it('rekent het scherm om naar het gekozen jaar', async () => {
    const gebruiker = userEvent.setup()
    toon({
      transacties: [
        tx({ id: 'a', persoonIds: ['emma'] }),
        tx({ id: 'oud', datum: '2025-04-01', bedrag: -1200, persoonIds: ['emma'] }),
      ],
    })
    expect(rijVan('emma').textContent).toContain(formatEuro(5000))
    await gebruiker.selectOptions(screen.getByLabelText('Jaar'), '2025')
    expect(rijVan('emma').textContent).toContain(formatEuro(1200))
  })
})

describe('KindkostenSectie — wat de app niet zeker weet', () => {
  it('waarschuwt wanneer een gedeelde kost samenvalt met een losse boeking', () => {
    // De ontdubbeling werkt via de koppeling in het invoervenster. Lees je je
    // uittreksel in en registreer je dezelfde kost daarnaast in een dossier, dan
    // staat ze hier twee keer — en dan is dit bedrag te hoog.
    toon({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000, persoonIds: ['emma'] })],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
    })
    expect(document.querySelector('[data-dubbels]')?.textContent).toMatch(/dit bedrag te hoog/)
  })

  it('waarschuwt ook wanneer de bank een paar dagen later boekte, en noemt die marge', () => {
    // Ronde 54. De kost staat op 4 mei, de bank boekte op 6 mei. Dat is de gewone
    // vorm van deze fout, en die viel voordien buiten de waarschuwing.
    toon({
      transacties: [tx({ id: 'a', datum: '2026-05-06', bedrag: -9000, persoonIds: ['emma'] })],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], datum: '2026-05-04' })],
    })
    const melding = document.querySelector('[data-dubbels]')?.textContent ?? ''
    expect(melding).toMatch(/dit bedrag te hoog/)
    // Zonder het getal laat "rond dezelfde datum" je raden of drie weken ook meetelt.
    expect(melding).toContain(String(DUBBEL_SPELING_DAGEN))
  })

  it('zwijgt daarover wanneer de kost aan die boeking gekoppeld is', () => {
    toon({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000, persoonIds: ['emma'] })],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], transactieId: 'a' })],
    })
    expect(document.querySelector('[data-dubbels]')).toBeNull()
  })

  it('geeft een verdwenen gezinslid geen knop', () => {
    toon({ transacties: [tx({ id: 'a', persoonIds: ['weg'] })] })
    expect(screen.queryByRole('button', { name: /Onbekend gezinslid/ })).toBeNull()
  })

  it('opent op het lopende jaar, ook met een boeking in de toekomst', () => {
    // Eén typfout in een jaartal mag het scherm niet op een leeg jaar openen.
    toon({
      transacties: [
        tx({ id: 'a', persoonIds: ['emma'] }),
        tx({ id: 'ver', datum: '2062-01-01', bedrag: -100, persoonIds: ['emma'] }),
      ],
    })
    expect((screen.getByLabelText('Jaar') as HTMLSelectElement).value).toBe('2026')
    expect(rijVan('emma').textContent).toContain(formatEuro(5000))
  })
})

// --- Ronde 66, slotronde: geen raad geven die je niet kan opvolgen ---
describe('KindkostenSectie — nog geen gezinsleden', () => {
  it('wijst naar de plek waar je ze aanmaakt', async () => {
    // ⚠ De oude zin zei "zet een gezinslid bij een boeking". Zonder gezinsleden
    // bestaat dat veld niet eens in het boekingsformulier (GezinsledenKiezer geeft
    // dan `null` terug), dus dat was een opdracht die je niet kón uitvoeren.
    const gebruiker = userEvent.setup()
    const onNaarGezinsleden = vi.fn()
    render(
      <KindkostenSectie
        transacties={[]}
        dossiers={dossiers}
        gezinsleden={[]}
        vandaagISO={VANDAAG}
        onGaNaarTransacties={vi.fn()}
        onNaarGezinsleden={onNaarGezinsleden}
      />,
    )
    expect(screen.getByText(/nog geen gezinsleden ingesteld/)).toBeInTheDocument()
    expect(screen.queryByText(/Zet een gezinslid bij een boeking/)).toBeNull()
    await gebruiker.click(screen.getByRole('button', { name: 'Stel je gezinsleden in' }))
    expect(onNaarGezinsleden).toHaveBeenCalledTimes(1)
  })

  it('geeft die raad wél zodra er gezinsleden zijn maar nog geen kosten', () => {
    toon({ transacties: [], gedeeldeKosten: [] })
    expect(screen.getByText(/Zet een gezinslid bij een boeking/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stel je gezinsleden in' })).toBeNull()
  })
})
