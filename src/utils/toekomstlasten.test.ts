import { describe, it, expect } from 'vitest'
import type { TerugkerendePost } from '../data/schema'
import {
  heeftToekomstlasten,
  isPlaatsbaar,
  kanVooruit,
  onplaatsbareLasten,
  slotreden,
  toekomsthorizon,
  toekomstlasten,
  VENSTER_MAANDEN,
  zwaarsteMaanden,
} from './toekomstlasten'

const NU = '2026-08'

function post(extra: Partial<TerugkerendePost> = {}): TerugkerendePost {
  return { id: 'p', omschrijving: 'Post', bedrag: -10000, rekeningId: 'bt', dag: 5, ...extra }
}

const huur = post({ id: 'huur', omschrijving: 'Huur', bedrag: -95000 })
const premie = post({
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -62000,
  frequentie: 'jaar',
  startMaand: '2027-03',
})

/** Het bedrag van één maand uit de reeks; werpt wanneer die maand er niet in staat. */
function inMaand(reeks: ReturnType<typeof toekomstlasten>, maand: string): number {
  const gevonden = reeks.find((m) => m.maand === maand)
  if (!gevonden) throw new Error(`maand ${maand} staat niet in de reeks`)
  return gevonden.bedrag
}

describe('toekomstlasten', () => {
  it('geeft altijd twaalf maanden terug, ook wanneer er niets valt', () => {
    const reeks = toekomstlasten([], NU)
    expect(reeks).toHaveLength(VENSTER_MAANDEN)
    expect(reeks[0].maand).toBe('2026-08')
    expect(reeks[11].maand).toBe('2027-07')
    expect(reeks.every((m) => m.bedrag === 0)).toBe(true)
  })

  it('zet een maandelijkse post in elke maand met haar volle bedrag', () => {
    const reeks = toekomstlasten([huur], NU)
    expect(reeks.every((m) => m.bedrag === 95000)).toBe(true)
  })

  it('zet een jaarpost ALLEEN in haar eigen maand, met het volle bedrag', () => {
    // ⚠ Dit is het hele punt van deze module. `maandbedrag()` zou hier € 51,67 per
    // maand van maken — het juiste antwoord op een ándere vraag. Wie wil weten
    // wanneer de klap komt, heeft aan een gladgestreken cijfer niets.
    const reeks = toekomstlasten([premie], NU)
    expect(inMaand(reeks, '2027-03')).toBe(62000)
    expect(reeks.filter((m) => m.bedrag > 0)).toHaveLength(1)
  })

  it('volgt het ritme vanaf de eerste betaling, niet vanaf het kalenderkwartaal', () => {
    const kwartaal = post({ id: 'kw', bedrag: -30000, frequentie: 'kwartaal', startMaand: '2026-09' })
    const reeks = toekomstlasten([kwartaal], NU)
    const maanden = reeks.filter((m) => m.bedrag > 0).map((m) => m.maand)
    expect(maanden).toEqual(['2026-09', '2026-12', '2027-03', '2027-06'])
  })

  it('telt de posten van één maand bij elkaar op en noemt ze', () => {
    const reeks = toekomstlasten([huur, premie], NU)
    expect(inMaand(reeks, '2027-03')).toBe(95000 + 62000)
    expect(reeks.find((m) => m.maand === '2027-03')?.postIds).toEqual(['huur', 'prem'])
    expect(reeks.find((m) => m.maand === '2027-04')?.postIds).toEqual(['huur'])
  })

  it('laat terugkerende INKOMSTEN erbuiten', () => {
    // Timothy koos deze ronde bewust voor alleen de lasten. Een loon dat meetelt zou
    // van de staaf een saldo maken, en dan betekent "hoog" ineens iets goeds.
    const loon = post({ id: 'loon', bedrag: 240000 })
    expect(toekomstlasten([loon], NU).every((m) => m.bedrag === 0)).toBe(true)
  })

  it('telt een opgezegde post niet meer mee vanaf haar eindmaand', () => {
    const gestopt = post({ id: 'fit', bedrag: -3000, eindMaand: '2026-11' })
    const reeks = toekomstlasten([gestopt], NU)
    expect(inMaand(reeks, '2026-10')).toBe(3000)
    expect(inMaand(reeks, '2026-11')).toBe(0)
  })

  it('telt een post die nog niet begonnen is niet mee vóór haar startmaand', () => {
    const reeks = toekomstlasten([premie], NU)
    expect(inMaand(reeks, '2026-08')).toBe(0)
    expect(inMaand(reeks, '2027-02')).toBe(0)
  })

  it('laat een post zonder eerste betaalmaand buiten de grafiek', () => {
    // ⚠ DE GEVAARLIJKSTE VAN ALLEMAAL. `valtInMaand` geeft voor zo'n post ELKE maand
    // `true` terug — een bewuste terugval daar, rampzalig hier: € 1.200 zou twaalf
    // keer getekend worden, dus € 14.400 in plaats van € 1.200.
    const zonderStart = post({ id: 'zwerver', bedrag: -120000, frequentie: 'jaar' })
    expect(isPlaatsbaar(zonderStart)).toBe(false)
    expect(toekomstlasten([zonderStart], NU).every((m) => m.bedrag === 0)).toBe(true)
    expect(onplaatsbareLasten([zonderStart], NU).map((p) => p.id)).toEqual(['zwerver'])
  })

  it('noemt een LEGE startmaand net zo onplaatsbaar als een ontbrekende', () => {
    // ⚠ `valtInMaand` valt terug bij een lege tekst, niet bij `undefined`. Zouden de
    // twee controles uiteenlopen, dan gold zo'n post hier als plaatsbaar en daar als
    // ritmeloos — en dan tekende de grafiek € 1.200 twaalf keer: € 14.400.
    const leeg = post({ id: 'leeg', bedrag: -120000, frequentie: 'jaar', startMaand: '' })
    expect(isPlaatsbaar(leeg)).toBe(false)
    expect(toekomstlasten([leeg], NU).every((m) => m.bedrag === 0)).toBe(true)
    expect(onplaatsbareLasten([leeg], NU).map((p) => p.id)).toEqual(['leeg'])
  })

  it('meldt een terugkerende INKOMST nooit als ontbrekende vaste last', () => {
    // Een jaarlijkse bonus zonder startmaand hoort niet in een grafiek over lasten, en
    // dus ook niet in de zin die zegt wat er uit die grafiek weggelaten is.
    const bonus = post({ id: 'bonus', bedrag: 100000, frequentie: 'jaar' })
    expect(onplaatsbareLasten([huur, bonus], NU)).toEqual([])
  })

  it('noemt een maandelijkse post zonder startmaand NIET onplaatsbaar', () => {
    // Een maandelijkse post valt elke maand; haar startmaand is een dood veld. Zou
    // ze hier opduiken, dan meldde het scherm bij bijna elke gebruiker dat er posten
    // ontbraken die er gewoon in staan.
    expect(isPlaatsbaar(huur)).toBe(true)
    expect(onplaatsbareLasten([huur], NU)).toEqual([])
  })

  it('noemt een onplaatsbare post die al gestopt is niet meer', () => {
    const weg = post({ id: 'weg', frequentie: 'jaar', eindMaand: '2026-07' })
    expect(onplaatsbareLasten([weg], NU)).toEqual([])
  })
})

describe('heeftToekomstlasten (ronde 90)', () => {
  // ⚠ Dezelfde vraag als de widget zelf stelt, uit ÉÉN functie: ronde 90 zet een chip
  // boven die kaart, en een chip die er staat terwijl de kaart eronder zwijgt is een
  // schakelaar die niets lijkt te doen.
  it('zegt nee op een lege app', () => {
    expect(heeftToekomstlasten([], NU)).toBe(false)
  })

  it('zegt ja zodra er een vaste last in het venster valt', () => {
    expect(heeftToekomstlasten([huur], NU)).toBe(true)
  })

  it('zegt ja voor een last die de app niet in de tijd kan plaatsen', () => {
    // ⚠ Die telt niet mee in het TOTAAL, maar de kaart noemt hem wel — onderaan, als
    // een post die buiten de grafiek valt. Zou de chip hier nee zeggen, dan verdween de
    // enige plek waar zo'n post ooit genoemd wordt.
    const ritmeloos = post({ id: 'los', bedrag: -50000, frequentie: 'jaar', startMaand: undefined })
    expect(toekomstlasten([ritmeloos], NU).reduce((som, m) => som + m.bedrag, 0)).toBe(0)
    expect(onplaatsbareLasten([ritmeloos], NU)).toHaveLength(1)
    expect(heeftToekomstlasten([ritmeloos], NU)).toBe(true)
  })

  it('zegt nee voor een plaatsbare last die pas ná het venster valt', () => {
    // ⚠ En dat is GOED: de kaart zwijgt daar zelf ook over, want ze kijkt twaalf maanden
    // vooruit. Chip en kaart stellen dezelfde vraag — dat is de hele reden dat deze
    // functie bestaat.
    const ver = post({ id: 'ver', bedrag: -50000, frequentie: 'jaar', startMaand: '2030-01' })
    expect(onplaatsbareLasten([ver], NU)).toEqual([])
    expect(heeftToekomstlasten([ver], NU)).toBe(false)
  })

  it('zegt nee wanneer alle posten inkomsten zijn die niets kosten', () => {
    // Een vaste INKOMST is geen last; de kaart heet "Wat komt eraan" en gaat over wat
    // je nog moet betalen.
    const loon = post({ id: 'loon', omschrijving: 'Loon', bedrag: 240000 })
    expect(heeftToekomstlasten([loon], NU)).toBe(false)
  })
})

describe('zwaarsteMaanden', () => {
  it('geeft de maand met het hoogste bedrag', () => {
    const reeks = toekomstlasten([huur, premie], NU)
    expect(zwaarsteMaanden(reeks).map((m) => m.maand)).toEqual(['2027-03'])
  })

  it('geeft ÁLLE maanden die even zwaar zijn, oudste eerst', () => {
    // ⚠ Dit is waarom deze functie meervoud heet. Een halfjaarlijkse premie geeft twee
    // even zware maanden; zou de app er één noemen, dan liep je een half jaar later
    // tegen exact hetzelfde bedrag aan zonder dat het ooit gezegd was.
    const semester = post({ id: 'sem', bedrag: -60000, frequentie: 'semester', startMaand: '2026-09' })
    const reeks = toekomstlasten([huur, semester], NU)
    expect(zwaarsteMaanden(reeks).map((m) => m.maand)).toEqual(['2026-09', '2027-03'])
  })

  it('geeft alle twaalf terug wanneer elke maand hetzelfde kost', () => {
    expect(zwaarsteMaanden(toekomstlasten([huur], NU))).toHaveLength(12)
  })

  it('geeft niets wanneer er in de hele reeks niets valt', () => {
    expect(zwaarsteMaanden(toekomstlasten([], NU))).toEqual([])
  })
})

describe('slotreden', () => {
  it('zegt "herhaalt" zolang er iets doorloopt', () => {
    expect(slotreden([huur], NU)).toBe('herhaalt')
    expect(slotreden([huur, premie], NU)).toBe('herhaalt')
  })

  it('zegt "stopt" wanneer élke vaste last een eindmaand heeft', () => {
    const eindigt = post({ id: 'e1', bedrag: -95000, eindMaand: '2027-03' })
    expect(slotreden([eindigt], NU)).toBe('stopt')
  })

  it('kijkt niet naar een post die al gestopt is', () => {
    // ⚠ De opzet telt: ALLE nog lopende lasten moeten een eindmaand hebben, anders
    // valt het antwoord sowieso op "herhaalt" en toetst deze test niets. De post die
    // al gestopt is, mag het antwoord niet meer beïnvloeden.
    const eindigt = post({ id: 'e1', bedrag: -95000, eindMaand: '2027-03' })
    const weg = post({ id: 'weg', eindMaand: '2026-01' })
    expect(slotreden([eindigt, weg], NU)).toBe('stopt')
  })

  it('zegt "herhaalt" zodra ÉÉN van de lasten doorloopt', () => {
    // ⚠ `every` en niet `some`. Met `some` zou één opgezegd abonnement volstaan om te
    // beweren dat er daarna niets meer komt, terwijl je huur gewoon doorloopt.
    const eindigt = post({ id: 'abo', bedrag: -3000, eindMaand: '2027-03' })
    expect(slotreden([huur, eindigt], NU)).toBe('herhaalt')
  })

  it('kijkt alleen naar de posten die de app kan plaatsen', () => {
    // Een post zonder eerste betaalmaand valt buiten deze vraag; het scherm vangt dat
    // geval apart op, want dan kan de app over de verre toekomst niets beweren.
    const eindigt = post({ id: 'e1', bedrag: -95000, eindMaand: '2027-03' })
    const zwerver = post({ id: 'zw', bedrag: -120000, frequentie: 'jaar' })
    expect(slotreden([eindigt, zwerver], NU)).toBe('stopt')
  })

  it('zegt "herhaalt" wanneer alle lasten al gestopt zijn', () => {
    // ⚠ Zonder de gestopte posten weg te filteren zou `every` hier "stopt" zeggen
    // (elke post heeft immers een eindmaand) over een lijst waarin niets meer leeft.
    const weg1 = post({ id: 'w1', bedrag: -95000, eindMaand: '2026-01' })
    const weg2 = post({ id: 'w2', bedrag: -3000, eindMaand: '2026-05' })
    expect(slotreden([weg1, weg2], NU)).toBe('herhaalt')
  })

  it('zegt "herhaalt" wanneer er helemaal geen vaste lasten zijn', () => {
    // `every` op een lege lijst is waar, dus zonder aparte regel zou een lege app
    // antwoorden dat alles ophoudt.
    expect(slotreden([], NU)).toBe('herhaalt')
  })

  it('kijkt niet naar terugkerende inkomsten', () => {
    // Een loon met een einddatum mag de zin over je LASTEN niet bepalen.
    const loonStopt = post({ id: 'loon', bedrag: 240000, eindMaand: '2027-01' })
    const eindigt = post({ id: 'e1', bedrag: -95000, eindMaand: '2027-03' })
    expect(slotreden([eindigt, loonStopt], NU)).toBe('stopt')
  })
})

describe('toekomsthorizon en kanVooruit', () => {
  it('laat je NIET verder bladeren wanneer alles maandelijks doorloopt', () => {
    // Twaalf identieke beelden na elkaar is geen informatie. De horizon valt precies
    // samen met het einde van het eerste venster.
    expect(toekomsthorizon([huur], NU)).toBe('2027-07')
    expect(kanVooruit([huur], NU, NU)).toBe(false)
  })

  it('laat je ook bij een lege app niet bladeren, maar toont wel een vol venster', () => {
    expect(toekomsthorizon([], NU)).toBe('2027-07')
    expect(kanVooruit([], NU, NU)).toBe(false)
  })

  it('rekt de horizon tot een jaar na een post die pas later begint', () => {
    const laat = post({ id: 'laat', bedrag: -50000, frequentie: 'jaar', startMaand: '2029-05' })
    expect(toekomsthorizon([huur, laat], NU)).toBe('2030-05')
  })

  it('laat je door lege jaren heen bladeren naar de maand die je zoekt', () => {
    // ⚠ Hier stond eerst een tweede controle ("valt er in dat venster wel iets?").
    // Ze leek veiliger en sloot precies deze weg af: de vensters van 2027 en 2028
    // zijn leeg, dus je kon nooit bij mei 2029 komen.
    const laat = post({ id: 'laat', bedrag: -50000, frequentie: 'jaar', startMaand: '2029-05' })
    expect(kanVooruit([laat], NU, NU)).toBe(true)
    expect(kanVooruit([laat], NU, '2027-08')).toBe(true)
    expect(toekomstlasten([laat], '2027-08').every((m) => m.bedrag === 0)).toBe(true)
  })

  it('stopt bij de laatste BETALING wanneer alles een keer ophoudt', () => {
    // De post geldt nog t.e.m. augustus 2028, maar vervalt voor het laatst in maart.
    // Zou de horizon op augustus mikken, dan mocht je naar een venster bladeren
    // waarin geen euro meer staat.
    const eindigt = post({ id: 'eind', bedrag: -62000, frequentie: 'jaar', startMaand: '2027-03', eindMaand: '2028-09' })
    expect(toekomsthorizon([eindigt], NU)).toBe('2028-03')
    expect(kanVooruit([eindigt], NU, NU)).toBe(true)
    expect(kanVooruit([eindigt], NU, '2027-08')).toBe(false)
  })

  it('rekent de laatste vervalmaand vanaf de maand VÓÓR de eindmaand', () => {
    // ⚠ De zoeklus is exact één interval lang. Vertrek je van de eindmaand zelf in
    // plaats van de maand ervóór, dan schuift alles één stap op en valt de laatste
    // vervalmaand er precies buiten: de horizon zakt terug naar het eerste venster en
    // je kan nooit bij de enige maand komen waar iets valt.
    const post2029 = post({ id: 'ver', bedrag: -62000, frequentie: 'jaar', startMaand: '2028-03', eindMaand: '2029-03' })
    expect(toekomsthorizon([post2029], NU)).toBe('2028-03')
    expect(kanVooruit([post2029], NU, NU)).toBe(true)
    expect(toekomstlasten([post2029], '2027-08').find((m) => m.maand === '2028-03')?.bedrag).toBe(62000)
  })

  it('laat je nog één VOLLEDIG jaar zien ná de laatste verandering', () => {
    // ⚠ Met elf maanden begon het laatste venster precies op de maand van de
    // verandering: het overgangsjaar zelf. Het scherm zei daaronder "vanaf hier
    // herhaalt elk jaar zich" over een jaar dat zich juist níét herhaalt.
    const abo = post({ id: 'abo', bedrag: -3000, frequentie: 'kwartaal', startMaand: '2026-05', eindMaand: '2028-09' })
    // Laatste betaling augustus 2028; daarna nog één vol jaar erachter.
    expect(toekomsthorizon([huur, abo], NU)).toBe('2029-08')
    expect(kanVooruit([huur, abo], NU, '2028-08')).toBe(true)
    expect(kanVooruit([huur, abo], NU, '2029-08')).toBe(false)
  })

  it('laat je precies tot de horizon bladeren, niet één venster te weinig', () => {
    // De grens ligt op de maand zelf: het venster dat op de horizon begint, mag nog.
    const abo = post({ id: 'abo', bedrag: -3000, eindMaand: '2027-09' })
    expect(toekomsthorizon([huur, abo], NU)).toBe('2028-08')
    expect(kanVooruit([huur, abo], NU, '2027-08')).toBe(true)
    expect(kanVooruit([huur, abo], NU, '2028-08')).toBe(false)
  })

  it('rekent met de laatste BETALING van een opgezegde post, niet met haar eindmaand', () => {
    // ⚠ Een jaarpremie die in maart vervalt en per december opgezegd is, verandert in
    // maart iets — niet in november. Met de kale eindmaand schoof de horizon acht
    // maanden op en kreeg je één venster extra dat tot op de cent gelijk was aan het
    // vorige, mét een actieve knop die nieuws beloofde.
    const premieMetEinde = post({ id: 'auto', bedrag: -60000, frequentie: 'jaar', startMaand: '2026-03', eindMaand: '2027-12' })
    expect(toekomsthorizon([huur, premieMetEinde], NU)).toBe('2028-03')
    expect(kanVooruit([huur, premieMetEinde], NU, NU)).toBe(true)
    expect(kanVooruit([huur, premieMetEinde], NU, '2027-08')).toBe(false)
  })

  it('rekent een post die déze maand begint niet als een verandering', () => {
    // Ze valt vanaf nu elk jaar in augustus; er verandert niets meer, dus valt er ook
    // niets te bladeren.
    const vanafNu = post({ id: 'nu', bedrag: -60000, frequentie: 'jaar', startMaand: NU })
    expect(toekomsthorizon([huur, vanafNu], NU)).toBe('2027-07')
    expect(kanVooruit([huur, vanafNu], NU, NU)).toBe(false)
  })

  it('laat een jaarpost die al jaren loopt de horizon niet oprekken', () => {
    // ⚠ De gewoonste opstelling die er is: een huur die doorloopt en een verzekering
    // die al sinds 2020 elk jaar terugkomt. Er verandert niets, dus valt er niets te
    // bladeren — anders klik je naar een venster dat identiek is aan het eerste.
    const alJaren = post({ id: 'oud', bedrag: -60000, frequentie: 'jaar', startMaand: '2020-03' })
    expect(toekomsthorizon([huur, alJaren], NU)).toBe('2027-07')
    expect(kanVooruit([huur, alJaren], NU, NU)).toBe(false)
  })

  it('ziet een opzegging met "de laatste keer is deze maand" als een verandering', () => {
    // ⚠ De meest gewone opzegging die er is. De verandering valt precies op de lopende
    // maand, en de ondergrens van de zoektocht stond óók op die maand: de kandidaat
    // werd overgeslagen en er leek niets te veranderen. Het getoonde jaar was juist het
    // overgangsjaar — augustus lag hoger dan hij ooit nog wordt — en de knop stond op
    // slot, zodat je het niet kon nakijken.
    const opgezegd = post({ id: 'netflix', bedrag: -1599, eindMaand: '2026-09' })
    expect(toekomsthorizon([huur, opgezegd], NU)).toBe('2027-08')
    expect(kanVooruit([huur, opgezegd], NU, NU)).toBe(true)
    // Het volgende venster is het jaar dat zich wél herhaalt: nergens nog die € 15,99.
    expect(toekomstlasten([huur, opgezegd], '2027-08').every((m) => m.bedrag === 95000)).toBe(true)
  })

  it('laat een post die al gestopt is de horizon niet oprekken, ook niet met rare datums', () => {
    // ⚠ Een post met een eindmaand VÓÓR haar startmaand vervalt nooit. Zonder de
    // gestopte posten weg te filteren zou haar startmaand van 2029 het bladeren toch
    // oprekken: vier lege vensters voor een post die nergens staat.
    const raar = post({ id: 'raar', bedrag: -50000, frequentie: 'jaar', startMaand: '2029-05', eindMaand: '2026-01' })
    expect(toekomsthorizon([huur, raar], NU)).toBe('2027-07')
    expect(kanVooruit([huur, raar], NU, NU)).toBe(false)
  })

  it('houdt een post die al gestopt is helemaal buiten de horizon', () => {
    const weg = post({ id: 'weg', bedrag: -50000, frequentie: 'jaar', startMaand: '2020-01', eindMaand: '2026-01' })
    expect(toekomsthorizon([huur, weg], NU)).toBe('2027-07')
  })

  it('toont altijd een volledig venster, ook als er niets meer valt maar de post nog geldt', () => {
    // Een jaarpremie die in maart vervalt en in december opgezegd is: ze GELDT in
    // augustus nog (de eindmaand is nog niet bereikt), maar ze VALT niet meer — de
    // laatste beurt lag in maart. Zonder ondergrens kwam de horizon dan op augustus
    // te liggen, een maand vóór het einde van het beeld dat je op je scherm hebt.
    const uitgeblust = post({ id: 'uit', bedrag: -62000, frequentie: 'jaar', startMaand: '2026-03', eindMaand: '2026-12' })
    expect(toekomsthorizon([uitgeblust], NU)).toBe('2027-07')
    expect(kanVooruit([uitgeblust], NU, NU)).toBe(false)
    // ⚠ Ook naast een huur die doorloopt. Zonder ondergrens zou die betaling uit MAART
    // — vijf maanden geleden — als "verandering" gelden en het bladeren openzetten naar
    // een venster dat identiek is aan het eerste.
    expect(toekomsthorizon([huur, uitgeblust], NU)).toBe('2027-07')
    expect(kanVooruit([huur, uitgeblust], NU, NU)).toBe(false)
  })

  it('rekt de horizon tot een jaar na een post die OPHOUDT, zolang er iets doorloopt', () => {
    // ⚠ Zonder deze tak kon je nooit naar het jaar bladeren waarin een abonnement
    // verdwijnt: de horizon bleef op het eerste venster staan omdat de huur geen
    // eindmaand heeft en er dus niets "veranderde".
    const stoptOoit = post({ id: 'abo', bedrag: -3000, eindMaand: '2029-07' })
    expect(toekomsthorizon([huur, stoptOoit], NU)).toBe('2030-06')
  })

  it('laat de startmaand van een MAANDELIJKSE post de horizon niet oprekken', () => {
    // Een maandelijkse post valt elke maand; haar startmaand is een dood veld, precies
    // zoals `valtInMaand` en `isNogNietBegonnen` het behandelen. Zou de horizon hem wél
    // lezen, dan bladerde je door vier identieke vensters voor een veld dat nergens
    // anders meetelt.
    const oud = post({ id: 'oud', bedrag: -95000, frequentie: 'maand', startMaand: '2030-01' })
    expect(toekomsthorizon([oud], NU)).toBe('2027-07')
    expect(kanVooruit([oud], NU, NU)).toBe(false)
  })

  it('telt een terugkerende inkomst niet mee voor de horizon', () => {
    const laatLoon = post({ id: 'bonus', bedrag: 100000, frequentie: 'jaar', startMaand: '2029-05' })
    expect(toekomsthorizon([huur, laatLoon], NU)).toBe('2027-07')
  })
})
