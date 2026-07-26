import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { zetSchermbreedte, herstelSchermbreedte } from '../test/schermbreedte'
import { SpaardoelSectie } from './SpaardoelSectie'
import type { Spaardoel } from '../data/schema'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

describe('SpaardoelSectie', () => {
  it('voegt een manueel spaardoel toe met bedragen in centen', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
    )

    await user.type(screen.getByLabelText('Doelnaam'), 'Buffer')
    await user.type(screen.getByLabelText('Doelbedrag (€)'), '3000')
    await user.type(screen.getByLabelText('Huidig bedrag (€)'), '1500')
    await user.click(screen.getByRole('button', { name: 'Doel toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }),
    )
  })

  it('toont een voortgangsbalk voor een bestaand doel', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 300000, huidigBedrag: 150000 }
    render(
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
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
      <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} onOpslaan={onOpslaan} onVerwijderen={vi.fn()} />,
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
      <SpaardoelSectie spaardoelen={[doel]} rekeningen={rekeningen} transacties={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
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
        <SpaardoelSectie spaardoelen={[]} rekeningen={rekeningen} transacties={[]} onOpslaan={vi.fn()} onVerwijderen={vi.fn()} />,
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
