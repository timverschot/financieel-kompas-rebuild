import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { zetSchermbreedte, herstelSchermbreedte } from '../test/schermbreedte'
import { SpaardoelSectie } from './SpaardoelSectie'
import type { Overboeking, Rekening, Spaardoel, Transactie } from '../data/schema'
import { vandaag } from '../utils/datum'
import { voegMaandenToe } from '../utils/rekenhulp'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

describe('SpaardoelSectie', () => {
  it('voegt een manueel spaardoel toe met bedragen in centen', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Buffer')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '3000')
    await user.type(screen.getByLabelText('Huidig bedrag (€)'), '1500')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }),
    )
  })

  it('zet de lijst vóór het formulier in de leesvolgorde', () => {
    // ⚠ Ronde 61. Tot die ronde stond de formulierkolom EERST in de code en zette een
    // CSS-regel (`order`) haar op een smal scherm naar onderen. Wat je ZAG klopte dus,
    // maar de tab-toets en een schermlezer volgen de code: je zag bovenaan je lijst
    // spaardoelen, maar Tab landde eerst in "Nieuw spaardoel · naam · bedrag · kleur".
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )
    const lijst = document.querySelector('.kolom-lijst') as HTMLElement
    const formulier = document.querySelector('.kolom-formulier') as HTMLElement
    expect(lijst).toBeInTheDocument()
    expect(formulier).toBeInTheDocument()
    expect(lijst.compareDocumentPosition(formulier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('toont een voortgangsbalk voor een bestaand doel', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }
    render(
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )
    expect(screen.getByRole('progressbar', { name: 'Buffer' })).toBeInTheDocument()
  })

  it('toont het gekozen icoon, en anders de beginletter van het doel', () => {
    const metIcoon: Spaardoel = { id: 'd1', naam: 'Reis', doelbedrag: 100000, huidigBedrag: 0, icoon: '\u2708\ufe0f' }
    const zonder: Spaardoel = { id: 'd2', naam: 'Buffer', doelbedrag: 100000, huidigBedrag: 0 }
    const { container } = render(
      <SpaardoelSectie
        spaardoelen={[metIcoon, zonder]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
    // Scopen op de lijst: de icoonkiezer in het formulier bevat dezelfde emoji.
    const tekens = [...container.querySelectorAll('.lijst .rij-teken')].map((e) => e.textContent)
    expect(tekens).toEqual(['\u2708\ufe0f', 'B'])
  })

  it('laat een icoon en een kleur kiezen bij een nieuw doel', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Reis')
    await user.type(screen.getByLabelText('Doelbedrag (\u20ac)'), '2000')
    await user.click(screen.getByRole('button', { name: 'Kies icoon Reizen' }))
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Reis', icoon: expect.any(String) }),
    )
  })

  it('opent een doel in het formulier wanneer je de regel aanklikt', async () => {
    const user = userEvent.setup()
    const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }
    render(
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
    )

    // Vooraf staat het formulier klaar voor een NIEUW doel.
    expect(screen.getByRole('button', { name: 'Doel toevoegen' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bewerk doel Buffer' }))

    // Nu staat het doel in het formulier en verandert de knop mee.
    expect(screen.getByLabelText('Doelnaam')).toHaveValue('Buffer')
    expect(screen.getByRole('button', { name: 'Doel wijzigen' })).toBeInTheDocument()
  })

  it('zet lijst en formulier naast elkaar op desktop', () => {
    zetSchermbreedte(1440)
    try {
      const { container } = render(
        <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} waarderingen={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
      )
      const raster = container.querySelector('.raster-lijst-formulier')
      expect(raster).not.toBeNull()
      expect(raster?.querySelector('.kolom-formulier')).not.toBeNull()
      expect(raster?.querySelector('.kolom-lijst')).not.toBeNull()
    } finally {
      herstelSchermbreedte()
    }
  })
})

// Ronde 18: elk doel zegt nu zelf of je het haalt.
describe('SpaardoelSectie — haal ik het?', () => {
  const spaarRekeningen: Rekening[] = [{ id: 'sp', naam: 'Spaar', beginsaldo: 0, type: 'spaar' }]

  function toonDoel(doel: Spaardoel, transacties: Transactie[] = [], overboekingen: Overboeking[] = []) {
    render(
      <SpaardoelSectie
        spaardoelen={[doel]}
        rekeningen={spaarRekeningen}
        transacties={transacties}
        waarderingen={[]}
        overboekingen={overboekingen}
        onOpslaan={vi.fn()}
        onVerwijderen={vi.fn()}
      />,
    )
  }

  it('legt uit wat er ontbreekt bij een doel zonder datum en zonder tempo', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0 })
    expect(screen.getByText('Koppel een rekening of zet een doeldatum om te zien of je op schema zit.')).toBeInTheDocument()
  })

  it('meldt een bereikt doel', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 600000 })
    expect(screen.getByText('Doel gehaald')).toBeInTheDocument()
  })

  // De doeldatum wordt uit de dag van vandaag afgeleid, zodat de test niet
  // vastzit aan de maand waarin ze gedraaid wordt.
  const overDrieMaanden = voegMaandenToe(vandaag(), 3)

  it('zegt bij een streefbedrag dat te laag is dat je achterloopt', () => {
    // € 6.000 te gaan in ongeveer drie maanden: dat is zo'n € 2.000 per maand.
    // Met een streefbedrag van € 10 per maand haal je dat nooit.
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: overDrieMaanden, maandbedrag: 1000 })
    expect(screen.getByText('Achter op schema')).toBeInTheDocument()
    expect(screen.getByText(/jouw streefbedrag: € 10,00/)).toBeInTheDocument()
  })

  it('meldt "Op schema" wanneer het streefbedrag volstaat', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: overDrieMaanden, maandbedrag: 500000 })
    expect(screen.getByText('Op schema')).toBeInTheDocument()
  })

  it('waarschuwt wanneer de doeldatum verstreken is', () => {
    toonDoel({ id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 10000, doeldatum: '2020-01-01' })
    expect(screen.getByText('Datum voorbij')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Ronde 68 — de sectie mag de fout van het FORMULIER niet opvangen.
//
// ⚠ Dit ging in deze ronde eerst mis en is door de doorlichting gevonden: de sectie
// ving de mislukking op, het formulier zag daardoor "gelukt", maakte zichzelf leeg,
// en je invoer was tóch weg — mét een melding erbij. Precies de fout die deze ronde
// moest uitroeien.
// ---------------------------------------------------------------------------
describe('SpaardoelSectie — een mislukte opslag van het formulier', () => {
  it('laat de mislukking dóór naar het formulier, dat je invoer vasthoudt', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn().mockRejectedValue(new Error('geweigerd'))
    render(
      <SpaardoelSectie
        spaardoelen={[]}
        rekeningen={rekeningen}
        transacties={[]}
        waarderingen={[]}
        overboekingen={[]}
        onOpslaan={onOpslaan}
        onVerwijderen={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Buffer')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '3000')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalled()
    // De velden staan er nog: leegmaken hoort ná een GESLAAGDE opslag.
    expect((screen.getByLabelText('Doelnaam') as HTMLInputElement).value).toBe('Buffer')
    expect((screen.getByLabelText('Doelbedrag (€)') as HTMLInputElement).value).toBe('3000')
    expect(await screen.findByRole('alert')).toHaveTextContent('Je invoer staat er nog')
  })
})

