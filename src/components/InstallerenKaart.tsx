import { useEffect, useState } from 'react'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'
import { bepaalPlatform, type Platform } from '../utils/installeren'

// De gebeurtenis die Chrome/Edge afvuurt wanneer de app installeerbaar is. Ze staat
// niet in de standaard-typedefinities, dus we beschrijven alleen wat we gebruiken.
type InstallVoorstel = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

// Kaart in Instellingen die uitlegt hoe je de app op je beginscherm zet.
//
// Op Android vangt ze het installatievoorstel van de browser op en zet er een knop
// bij. Op een iPhone bestaat zo'n voorstel niet: daar staat de weg met de hand
// beschreven, want sinds iOS 26 zit het deelmenu achter de drie puntjes en staat
// "Zet op beginscherm" ver naar onder in de lijst, met een schakelaar die bepaalt of
// je een echte app of een gewone bladwijzer krijgt.
//
// Draait de app al als app, dan zegt de kaart dat en houdt ze het kort.
export function InstallerenKaart() {
  const { t } = useT()
  const [voorstel, setVoorstel] = useState<InstallVoorstel | null>(null)
  const [platform, setPlatform] = useState<Platform>('onbekend')
  const [melding, setMelding] = useState<string | null>(null)

  useEffect(() => {
    function meet(heeftVoorstel: boolean) {
      const nav = window.navigator as Navigator & { standalone?: boolean }
      setPlatform(
        bepaalPlatform({
          userAgent: nav.userAgent,
          maxTouchPoints: nav.maxTouchPoints,
          standalone:
            (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
            nav.standalone === true,
          heeftVoorstel,
        }),
      )
    }

    meet(false)

    function opVoorstel(e: Event) {
      // Het eigen voorstel van de browser tegenhouden, zodat wij het moment kiezen.
      e.preventDefault()
      setVoorstel(e as InstallVoorstel)
      meet(true)
    }
    window.addEventListener('beforeinstallprompt', opVoorstel)
    return () => window.removeEventListener('beforeinstallprompt', opVoorstel)
  }, [])

  async function installeer() {
    if (!voorstel) return
    await voorstel.prompt()
    const keuze = await voorstel.userChoice
    // Een voorstel kan maar één keer gebruikt worden.
    setVoorstel(null)
    setMelding(keuze.outcome === 'accepted' ? t('De app staat nu op je beginscherm.') : t('Niet toegevoegd. Je kan het later opnieuw proberen.'))
  }

  if (platform === 'alGeinstalleerd') {
    return (
      <Kaart titel={t('Op je beginscherm')} bijschrift={t('Je gebruikt Kompal al als app. Zo werkt ze ook zonder internet.')} />
    )
  }

  return (
    <Kaart
      titel={t('Op je beginscherm zetten')}
      bijschrift={t('Zet Kompal bij je andere apps: ze opent dan zonder browserbalken en werkt ook zonder internet.')}
    >
      {platform === 'installeerbaar' && (
        <div className="knoprij">
          <button type="button" className="knop knop-secundair" onClick={installeer}>
            {t('Zet op beginscherm')}
          </button>
        </div>
      )}

      {platform === 'ios' && (
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li className="rij-meta">{t('Open deze pagina in Safari (niet in een andere browser).')}</li>
          <li className="rij-meta">{t('Tik op de drie puntjes rechts van de adresbalk en kies "Deel".')}</li>
          <li className="rij-meta">{t('Scroll in die lijst naar onder tot "Zet op beginscherm".')}</li>
          <li className="rij-meta">{t('Zet de schakelaar "Open as Web App" AAN — anders krijg je enkel een bladwijzer.')}</li>
          <li className="rij-meta">{t('Tik op "Voeg toe".')}</li>
        </ol>
      )}

      {platform === 'onbekend' && (
        <p className="rij-meta" style={{ margin: 0 }}>
          {t(
            'Je browser biedt hier nu niets aan. Op een telefoon lukt het meestal via het menu van je browser, met een keuze als "Toevoegen aan beginscherm" of "App installeren".',
          )}
        </p>
      )}

      {melding && (
        <p role="status" className="rij-meta" style={{ margin: 0 }}>
          {melding}
        </p>
      )}
    </Kaart>
  )
}
