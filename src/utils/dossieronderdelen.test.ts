import { describe, it, expect } from 'vitest'
import {
  DOSSIER_ONDERDELEN,
  verborgenBijNieuwDossier,
  verborgenMetInhoud,
  volgendeVerborgenLijst,
} from '../utils/dossieronderdelen'

// Ronde 60. Een nieuw dossier begint met minder kaarten. Dat is prettiger, maar het
// brengt één risico mee dat deze tests bewaken: gegevens die in een uitgezet
// onderdeel belanden en die je dan nergens meer ziet.

const leeg = { verrekeningen: [], kindrekeningen: [] }

describe('verborgenBijNieuwDossier', () => {
  it('laat de kern staan en verbergt de rest', () => {
    const verborgen = verborgenBijNieuwDossier()
    expect(verborgen).not.toContain('verrekeningen')
    expect(verborgen).not.toContain('afrekening-detail')
    expect(verborgen).toContain('documentkluis')
    expect(verborgen).toContain('gezamenlijke-pot')
  })

  it('blijft in de pas lopen met de lijst zelf', () => {
    // Komt er ooit een onderdeel bij zonder dat iemand aan deze functie denkt, dan
    // hoort het gewoon verborgen te beginnen — niet stilletjes te verdwijnen.
    const verborgen = verborgenBijNieuwDossier()
    const zichtbaar = DOSSIER_ONDERDELEN.filter((o) => o.standaard).map((o) => o.id)
    expect([...verborgen, ...zichtbaar].sort()).toEqual(DOSSIER_ONDERDELEN.map((o) => o.id).sort())
  })
})

describe('verborgenMetInhoud', () => {
  it('zwijgt wanneer er niets in een uitgezet onderdeel staat', () => {
    expect(verborgenMetInhoud('d1', ['documentkluis', 'gezamenlijke-pot'], leeg)).toEqual([])
  })

  it('meldt een uitgezet onderdeel waar wél iets in staat', () => {
    // ⚠ Dit gebeurt echt: de rekenhulp "Indexatie" bewaart een onderhoudsbijdrage
    // rechtstreeks in een dossier. Stond dat onderdeel uit, dan zag je die regeling
    // nergens meer — zonder dat iets je dat vertelde.
    const regels = verborgenMetInhoud('d1', ['onderhoudsbijdrage'], {
      ...leeg,
      onderhoudsbijdragen: [
        { id: 'b1', dossierId: 'd1', richting: 'jij-betaalt', basisbedrag: 25000, datumRegeling: '2021-09-15' },
      ] as never,
    })
    expect(regels).toEqual(['onderhoudsbijdrage'])
  })

  it('kijkt alleen naar DIT dossier', () => {
    const regels = verborgenMetInhoud('d1', ['documentkluis'], {
      ...leeg,
      documenten: [
        { id: 'x', dossierId: 'd2', naam: 'a.pdf', soort: 'bon', bestand: 'data:', toegevoegdOp: '2026-01-01' },
      ] as never,
    })
    expect(regels).toEqual([])
  })

  it('zwijgt over een onderdeel dat gewoon aanstaat', () => {
    const regels = verborgenMetInhoud('d1', [], {
      ...leeg,
      kindrekeningen: [{ id: 'kr1', dossierId: 'd1', naam: 'Kind 1' }] as never,
    })
    expect(regels).toEqual([])
  })

  it('houdt de volgorde van de lijst aan, niet die van het uitzetten', () => {
    // Anders hangt de volgorde op het scherm af van de volgorde waarin je ooit
    // dingen uitzette, en springt ze bij elke wijziging rond.
    const gegevens = {
      verrekeningen: [{ id: 'v1', dossierId: 'd1', datum: '2026-01-01', bedrag: 100, richting: 'jij-ontvangt' }],
      kindrekeningen: [{ id: 'kr1', dossierId: 'd1', naam: 'Kind 1' }],
      documenten: [{ id: 'x', dossierId: 'd1', naam: 'a.pdf', soort: 'bon', bestand: 'data:', toegevoegdOp: '2026-01-01' }],
    } as never
    const regels = verborgenMetInhoud('d1', ['documentkluis', 'verrekeningen', 'gezamenlijke-pot'], gegevens)
    expect(regels).toEqual(['verrekeningen', 'gezamenlijke-pot', 'documentkluis'])
  })

  it('struikelt niet over een sleutel die deze versie niet kent', () => {
    // Een oud logboekbestand van een ander toestel kan er een dragen.
    expect(verborgenMetInhoud('d1', ['onzin-uit-2024'], leeg)).toEqual([])
  })
  it('meldt een uitgezette verdeling waarin nog een sleutel staat', () => {
    // ⚠ Dit is de gevaarlijkste van allemaal: een verdeelsleutel die uitstaat, deelt
    // je geld gewoon verder. Je ziet dan een afrekening waarvan de cijfers niet
    // kloppen met wat er op het scherm staat, zonder één aanwijzing waarom.
    const regels = verborgenMetInhoud('d1', ['verdeling-categorie', 'verdeling-kostensoort'], {
      ...leeg,
      categorieAandelen: { voeding: 70 },
      typeAandelen: { gewoon: 60 },
    })
    expect(regels).toEqual(['verdeling-categorie', 'verdeling-kostensoort'])
  })

  it('zwijgt over een uitgezette verdeling zonder sleutels', () => {
    const regels = verborgenMetInhoud('d1', ['verdeling-categorie', 'verdeling-kostensoort'], {
      ...leeg,
      categorieAandelen: {},
    })
    expect(regels).toEqual([])
  })
})

// De rekensom achter één tik op een chip. Ze staat hier apart omdat ze zuiver is:
// zo valt ze na te rekenen zonder scherm, zonder klok en zonder wedloop — en dat is
// nodig, want de fout die ze oplost viel in een componenttest maar één keer op de
// drie om (ronde 60).
describe('volgendeVerborgenLijst', () => {
  it('zet een onderdeel uit', () => {
    expect(volgendeVerborgenLijst([], 'documentkluis', false)).toEqual(['documentkluis'])
  })

  it('zet een onderdeel weer aan', () => {
    expect(volgendeVerborgenLijst(['documentkluis', 'uitwisseling'], 'documentkluis', true)).toEqual(['uitwisseling'])
  })

  it('ontdubbelt bij twee tikken vlak na elkaar', () => {
    // De tweede tik ziet nog de oude lijst — de opslag is dan nog onderweg — en vraagt
    // dus opnieuw om verbergen. Zonder deze regel stond de sleutel er twee keer in,
    // in het logboek en al.
    const een = volgendeVerborgenLijst([], 'documentkluis', false)
    const twee = volgendeVerborgenLijst(een, 'documentkluis', false)
    expect(twee).toEqual(['documentkluis'])
  })

  it('laat de lijst waarmee ze rekent ongemoeid', () => {
    // De oproeper houdt de vorige lijst bij om op terug te vallen als het opslaan
    // mislukt; die mag dus niet stiekem mee veranderen.
    const basis = ['documentkluis']
    volgendeVerborgenLijst(basis, 'uitwisseling', false)
    expect(basis).toEqual(['documentkluis'])
  })
})

// ---------------------------------------------------------------------------
// Ronde 93 — de chipnamen van de dossierpagina
// ---------------------------------------------------------------------------
//
// ⚠ WAAROM DEZE REEKS BESTAAT. De chiprij bovenaan een dossier besloeg in Chromium op een
// scherm van 360 px **306 px in ACHT rijen chips**, met een blok van 459 px eromheen — twee
// derde van een telefoonscherm, bovenaan élk dossier, elke keer. De oorzaak was dat elke chip
// de volledige kaarttitel droeg. Ingekort is dat 150 px in vier rijen.
//
// De prijs van inkorten is dat een chip iets ánders kan gaan heten dan het blok dat ze
// bedient — en dan weet je bij het uitzetten niet meer wat er verdwijnt. Vandaar deze reeks.
//
// ⚠ Via `import.meta.glob` en niet via `node:fs`: met `node:fs` moet je zelf uitrekenen waar
// de broncode staat, en een misrekening laat de test stil slagen op nul bestanden.
const BRON_RUW = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>
const BRONBESTANDEN = Object.entries(BRON_RUW).filter(([pad]) => !/\.test\.tsx$/.test(pad))

/** Elke `titel={t('…')}` die ergens in de app op een kaart staat. */
function kaarttitels(): string[] {
  const alles = BRONBESTANDEN.map(([, tekst]) => tekst).join('\n')
  return [...alles.matchAll(/titel=\{t\('([^']+)'\)\}/g)].map((m) => m[1])
}

describe('DOSSIER_ONDERDELEN — de chipnamen (ronde 93)', () => {
  it('leest de broncode écht', () => {
    // ⚠ Het vangnet vóór het vangnet: vindt de glob niets, dan slaagt alles hieronder stil.
    expect(BRONBESTANDEN.length).toBeGreaterThan(50)
    expect(kaarttitels().length).toBeGreaterThan(20)
  })

  // ⚠ WAT DEZE CONTROLE WÉL EN NIET DOET (doorlichting ronde 93). Ze zoekt élke
  // `titel={t('…')}` in de app, en dat is meer dan alleen kaarttitels: de helper
  // `Uitsplitsing` in de opbouw van een afrekening gebruikt dezelfde prop. Ze toetst dus dat
  // een chipnaam ergens in de app als titel bestaat, niet dat het de titel is van precies de
  // kaart die deze chip bedient. Een titel die geen letterlijke tekst is
  // (`titel={richting === 'uitgave' ? … : …}`) ziet ze evenmin. Ze vangt de gewone
  // hernoeming; ze is geen bewijs.
  it('noemt elke chip naar een titel die de app ergens toont', () => {
    // ⚠ 'afrekening-detail' is de enige uitzondering, en met reden: die schakelaar bedient
    // geen eigen kaart maar de OPBOUW binnen de afrekeningenkaart. Zie de kopregels bij
    // DOSSIER_ONDERDELEN.
    const titels = kaarttitels().map((s) => s.toLowerCase())
    const fouten: string[] = []
    for (const o of DOSSIER_ONDERDELEN) {
      if (o.id === 'afrekening-detail') continue
      const naam = o.label.toLowerCase()
      if (!titels.some((titel) => titel.includes(naam))) fouten.push(`${o.id}: "${o.label}"`)
    }
    expect(fouten).toEqual([])
  })

  it('zou een chip die nergens op slaat ook écht aanwijzen', () => {
    // ⚠ Zonder deze proef kan de zoeker stilletjes niets meer vinden en blijft alles groen.
    const titels = kaarttitels().map((s) => s.toLowerCase())
    expect(titels.some((titel) => titel.includes('een naam die nergens bestaat'))).toBe(false)
    expect(titels.some((titel) => titel.includes('documentkluis'))).toBe(true)
  })

  // ⚠ De twee die met opzet voluit blijven, mét de reden erbij — zoals de uitzonderingen in
  // `index.css.test.ts` en `i18nBotsing.test.ts`. Zo kunnen ze niet stil groeien.
  const VOLUIT_MET_REDEN: Record<string, string> = {
    'verdeling-categorie':
      'Ingekort tot "Per categorie" zou de chip botsen met het gelijknamige kopje in de opbouw ' +
      'van een afrekening — dat deze chip NIET uitzet. En "Per categorie staat uit, maar er ' +
      'staat wel iets in" is geen Nederlands.',
    'verdeling-kostensoort': 'Zelfde reden als bij de verdeling per categorie hierboven.',
  }

  /** Welke namen te lang zijn en niet in de uitzonderingenlijst staan. Zuiver, dus zelf te
   * beproeven — een controle die alleen kán falen wanneer er al iets fout staat, bewijst
   * niets (les uit ronde 91). */
  function teLang(lijst: readonly { id: string; label: string }[], uitzonderingen: Record<string, string>) {
    return lijst.filter((o) => !(o.id in uitzonderingen) && o.label.length > 20).map((o) => o.id)
  }

  /** En de andere richting: uitzonderingen die niet meer nodig zijn. */
  function overbodigeUitzonderingen(
    lijst: readonly { id: string; label: string }[],
    uitzonderingen: Record<string, string>,
  ) {
    return Object.keys(uitzonderingen).filter((id) => {
      const o = lijst.find((x) => x.id === id)
      return !o || o.label.length <= 20
    })
  }

  it('zou een te lange naam en een verouderde uitzondering ook écht aanwijzen', () => {
    // ⚠ Deze test bestaat door twee mutatietesten: zowel de lengtecontrole als de controle op
    // verouderde uitzonderingen bleef groen toen ze uitgeschakeld werd — niet omdat ze niets
    // doet, maar omdat er vandaag toevallig niets fout staat.
    const verzonnen = [
      { id: 'kort', label: 'Kort' },
      { id: 'lang', label: 'Een heel erg lange naam die niet past' },
      { id: 'toegestaan', label: 'Ook een behoorlijk lange naam' },
    ]
    expect(teLang(verzonnen, { toegestaan: 'reden' })).toEqual(['lang'])
    expect(teLang(verzonnen, {})).toEqual(['lang', 'toegestaan'])
    expect(overbodigeUitzonderingen(verzonnen, { kort: 'reden' })).toEqual(['kort'])
    expect(overbodigeUitzonderingen(verzonnen, { weg: 'reden' })).toEqual(['weg'])
    expect(overbodigeUitzonderingen(verzonnen, { toegestaan: 'reden' })).toEqual([])
  })

  it('houdt de namen kort, op twee na die met opzet voluit blijven', () => {
    // ⚠ WAT HIER GEMETEN IS, en wat niet. In Chromium op 360 px besloeg de chiprij met alle
    // acht de volledige kaarttitels 306 px in ACHT rijen, met een blok van 459 px eromheen.
    // Met vijf namen ingekort is dat 189 px in VIJF rijen en een blok van 300 px; dichtgeklapt
    // 46 px. Twintig tekens is de grens waar de vijf ingekorte namen onder blijven — een
    // afspraak, geen natuurwet, maar wel eentje die aan een gemeten toestand hangt.
    //
    // ⚠ En ze meet alleen het NEDERLANDS. De chip toont `t(o.label)`, en in het Engels is
    // "Onderhoudsbijdrage" bijvoorbeeld "Maintenance contribution" (24 tekens). De gemeten
    // winst geldt dus voor het Nederlands; deze grens dwingt in EN en FR niets af.
    expect(teLang(DOSSIER_ONDERDELEN, VOLUIT_MET_REDEN)).toEqual([])
  })

  it('houdt geen uitzondering staan die niet meer nodig is', () => {
    // ⚠ De andere richting: kort iemand zo'n naam later alsnog in, dan hoort de uitzondering
    // mee te verdwijnen in plaats van stil te blijven staan.
    expect(overbodigeUitzonderingen(DOSSIER_ONDERDELEN, VOLUIT_MET_REDEN)).toEqual([])
  })

  it('geeft elke uitzondering een reden die iets zegt', () => {
    for (const [id, reden] of Object.entries(VOLUIT_MET_REDEN)) {
      expect(reden.length, id).toBeGreaterThan(40)
    }
  })

  it('geeft geen twee onderdelen dezelfde naam', () => {
    const namen = DOSSIER_ONDERDELEN.map((o) => o.label)
    expect(new Set(namen).size).toBe(namen.length)
  })
})
