import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { UitlegBlok } from './UitlegBlok'

describe('UitlegBlok', () => {
  it('staat dicht en toont één regel', () => {
    render(
      <UitlegBlok>
        <p>Een budget is een grens.</p>
      </UitlegBlok>,
    )
    const knop = screen.getByText('Zo werkt dit')
    expect(knop).toBeInTheDocument()
    expect(knop.closest('details')).not.toHaveAttribute('open')
  })

  it('klapt open wanneer je erop drukt', async () => {
    const user = userEvent.setup()
    render(
      <UitlegBlok>
        <p>Een budget is een grens.</p>
      </UitlegBlok>,
    )
    await user.click(screen.getByText('Zo werkt dit'))
    expect(screen.getByText('Zo werkt dit').closest('details')).toHaveAttribute('open')
  })

  // ⚠ Een `aria-describedby` naar de inhoud zou een schermlezer bij het DICHTE blok
  // meteen de hele uitleg laten voorlezen — precies wat een uitklapblok vermijdt.
  it('beschrijft zichzelf niet met zijn eigen inhoud', () => {
    render(
      <UitlegBlok>
        <p>Uitleg.</p>
      </UitlegBlok>,
    )
    expect(screen.getByText('Zo werkt dit')).not.toHaveAttribute('aria-describedby')
  })

  it('neemt een eigen titel over', () => {
    render(
      <UitlegBlok titel="Wat blijft er over? — zo werkt dit">
        <p>Uitleg.</p>
      </UitlegBlok>,
    )
    expect(screen.getByText('Wat blijft er over? — zo werkt dit')).toBeInTheDocument()
  })

  it('kan meteen open staan', () => {
    render(
      <UitlegBlok open>
        <p>Uitleg.</p>
      </UitlegBlok>,
    )
    expect(screen.getByText('Zo werkt dit').closest('details')).toHaveAttribute('open')
  })

  // ⚠ Een echte <summary> is met Tab te bereiken en met Enter te openen. Zou dit
  // ooit een <div> met een klikhandler worden, dan is de uitleg voor wie met een
  // toetsenbord werkt onbereikbaar — precies het soort stille regressie dat ronde
  // 61 op negentien knoppen moest rechtzetten.
  it('gebruikt een echte details/summary en is dus focusbaar', () => {
    render(
      <UitlegBlok>
        <p>Uitleg.</p>
      </UitlegBlok>,
    )
    const samenvatting = screen.getByText('Zo werkt dit')
    // ⚠ jsdom doet geen tab-simulatie op een <summary> (het kent geen native
    // focusbaarheid buiten de gewone lijst), dus toetsen we de STRUCTUUR: een
    // <summary> die rechtstreeks in een <details> zit, is in elke browser met Tab
    // te bereiken en met Enter te openen.
    expect(samenvatting.tagName).toBe('SUMMARY')
    expect(samenvatting.parentElement?.tagName).toBe('DETAILS')
    samenvatting.focus()
    expect(document.activeElement).toBe(samenvatting)
  })
})
