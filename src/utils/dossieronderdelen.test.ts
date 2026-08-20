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
