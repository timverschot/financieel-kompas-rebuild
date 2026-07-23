// AUTOMATISCH GEGENEREERD uit de oude app (FinancieelKompas_indexatie.html).
// Niet met de hand bewerken; dit is de ingebouwde referentie-categorieboom.
// Drie lagen: hoofdcategorie -> categorie -> item. Vaste (deterministische) id's,
// zodat verwijzingen stabiel blijven. Dit is STATISCHE data (geen event-log):
// enkel aanpassingen die de gebruiker zelf maakt, worden gebeurtenissen.

export type Hoofdtype = 'Vaste Uitgaven' | 'Variabele Uitgaven' | 'Sparen' | 'Inkomsten'

export type IngebouwdItem = { id: string; naam: string; synoniemen: string[]; eenheid: string | null }
export type IngebouwdeCategorie = { id: string; naam: string; items: IngebouwdItem[] }
export type IngebouwdeHoofdcategorie = {
  id: string
  naam: string
  hoofdtype: Hoofdtype
  kleur: string
  icoon: string
  categorieen: IngebouwdeCategorie[]
}

export const INGEBOUWDE_CATEGORIEEN: IngebouwdeHoofdcategorie[] = [
  {
    "id": "ov-voeding",
    "naam": "Voeding",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#F59E0B",
    "icoon": "🛒",
    "categorieen": [
      {
        "id": "cat-broodwaren",
        "naam": "Broodwaren",
        "items": [
          {
            "id": "i-brood--wit-9238",
            "naam": "Brood (wit)",
            "synoniemen": [
              "witbrood"
            ],
            "eenheid": "stuks"
          },
          {
            "id": "i-brood--bruin-6023",
            "naam": "Brood (bruin)",
            "synoniemen": [
              "bruinbrood",
              "volkoren brood"
            ],
            "eenheid": "stuks"
          },
          {
            "id": "i-sandwiches-1736",
            "naam": "Sandwiches",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-pistolets-9968",
            "naam": "Pistolets",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-wraps-2928",
            "naam": "Wraps",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-pitabroodjes-1623",
            "naam": "Pitabroodjes",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-knakbrood-3482",
            "naam": "Knakbrood",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-crackers-2702",
            "naam": "Crackers",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-rijstwafels-171",
            "naam": "Rijstwafels",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-belegde-broodjes-2217",
            "naam": "Belegde broodjes",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-worstenbrood--curryrol-5080",
            "naam": "Worstenbrood (curryrol)",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-worstenbrood-speciaal--curryro-8286",
            "naam": "Worstenbrood speciaal (curryrol)",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-worstenbrood--klassiek-6316",
            "naam": "Worstenbrood (klassiek)",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-appelbol-5409",
            "naam": "Appelbol",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-x-stokbrood",
            "naam": "Stokbrood",
            "synoniemen": [
              "baguette"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ciabatta",
            "naam": "Ciabatta",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-naanbrood",
            "naam": "Naanbrood",
            "synoniemen": [
              "naan"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-bagels",
            "naam": "Bagels",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-toastbrood",
            "naam": "Toastbrood",
            "synoniemen": [
              "toast"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-volkorenbrood",
            "naam": "Volkorenbrood",
            "synoniemen": [
              "volkoren"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-rozijnenbrood",
            "naam": "Rozijnenbrood",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-foccacia",
            "naam": "Foccacia",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-broodwaren--zoet",
        "naam": "Broodwaren (zoet)",
        "items": [
          {
            "id": "i-koffiekoeken-200",
            "naam": "Koffiekoeken",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-croissants-2945",
            "naam": "Croissants",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-taart-5981",
            "naam": "Taart",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-gebak-9917",
            "naam": "Gebak",
            "synoniemen": [],
            "eenheid": "stuks"
          }
        ]
      },
      {
        "id": "cat-zuivel-en-kaas",
        "naam": "Zuivel en Kaas",
        "items": [
          {
            "id": "i-kaas--jong-7320",
            "naam": "Kaas (jong)",
            "synoniemen": [
              "jonge kaas",
              "gouda"
            ],
            "eenheid": "kg"
          },
          {
            "id": "i-kaas--belegen-6167",
            "naam": "Kaas (belegen)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kaas--geraspt-emmentaler-7652",
            "naam": "Kaas (geraspt Emmentaler)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kaas--geraspt-gruy-re-3885",
            "naam": "Kaas (geraspt Gruyère)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kaas--geraspt-parmezaans-8632",
            "naam": "Kaas (geraspt Parmezaans)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kruidenkaas--boursin-etc-1749",
            "naam": "Kruidenkaas (Boursin,etc)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-feta-2686",
            "naam": "Feta",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-halloumi-5332",
            "naam": "Halloumi",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-platte-kaas-kwark--natuur-7808",
            "naam": "Platte kaas/kwark (natuur)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-platte-kaas-kwark--fruit-8421",
            "naam": "Platte kaas/kwark (fruit)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pudding-4120",
            "naam": "Pudding",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rijstpap-8182",
            "naam": "Rijstpap",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-roomijs-5240",
            "naam": "Roomijs",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-eieren-4688",
            "naam": "Eieren",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-smeerkaas-2467",
            "naam": "Smeerkaas",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-melk--mager-247",
            "naam": "Melk (mager)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-melk--halfvol-3583",
            "naam": "Melk (halfvol)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-melk--vol-7674",
            "naam": "Melk (vol)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-room--kookroom-6460",
            "naam": "Room (kookroom)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-room--slagroom-3333",
            "naam": "Room (slagroom)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-room--zure-room-4720",
            "naam": "Room (zure room)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-yoghurt--mager-4807",
            "naam": "Yoghurt (mager)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-yoghurt--halfvol-7930",
            "naam": "Yoghurt (halfvol)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-yoghurt--vol-7784",
            "naam": "Yoghurt (vol)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-yoghurt--grieks-mager-7648",
            "naam": "Yoghurt (Grieks mager)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-yoghurt--grieks-halfvol-3760",
            "naam": "Yoghurt (Grieks halfvol)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-yoghurt--grieks-vol-153",
            "naam": "Yoghurt (Grieks vol)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-boter--bakken-7411",
            "naam": "Boter (bakken)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-boter--smeren-3907",
            "naam": "Boter (smeren)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-x-brie",
            "naam": "Brie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-camembert",
            "naam": "Camembert",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-roquefort",
            "naam": "Roquefort",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-mozzarella",
            "naam": "Mozzarella",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-cheddar",
            "naam": "Cheddar",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-gorgonzola",
            "naam": "Gorgonzola",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-mascarpone",
            "naam": "Mascarpone",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-ricotta",
            "naam": "Ricotta",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-geitenkaas",
            "naam": "Geitenkaas",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-blauwschimmelkaas",
            "naam": "Blauwschimmelkaas",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-ijshoorntjes",
            "naam": "IJshoorntjes",
            "synoniemen": [
              "ijsje"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-waterijsjes",
            "naam": "Waterijsjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sorbet",
            "naam": "Sorbet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-milkshake-poeder",
            "naam": "Milkshake poeder",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-rijstmelk",
            "naam": "Rijstmelk",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-kokosyoghurt",
            "naam": "Kokosyoghurt",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sojayoghurt",
            "naam": "Sojayoghurt",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-vlees--bereid",
        "naam": "Vlees (bereid)",
        "items": [
          {
            "id": "i-gehakt--rund-2904",
            "naam": "Gehakt (rund)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gehakt--varken-529",
            "naam": "Gehakt (varken)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gehakt--kalf-1607",
            "naam": "Gehakt (kalf)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gehakt--kip-8751",
            "naam": "Gehakt (kip)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gehakt--lam-9396",
            "naam": "Gehakt (lam)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gehakt--gemengd-6926",
            "naam": "Gehakt (gemengd)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kipfilet-3546",
            "naam": "Kipfilet",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kip--aan-het-spit-4612",
            "naam": "Kip (aan het spit)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kip-gepaneerd-306",
            "naam": "Kip gepaneerd",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kipschnitzel-9997",
            "naam": "Kipschnitzel",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kalkoen-1844",
            "naam": "Kalkoen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rundvlees--biefstuk--etc-9342",
            "naam": "Rundvlees (biefstuk, etc)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-soepvlees-4029",
            "naam": "Soepvlees",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-varkensvlees--kotelet--etc-66",
            "naam": "Varkensvlees (kotelet, etc)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-spek--varken-8708",
            "naam": "Spek (varken)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-lamsvlees--kotelet--etc-9289",
            "naam": "Lamsvlees (kotelet, etc)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kalfsvlees--kotelet--etc-2162",
            "naam": "Kalfsvlees (kotelet, etc)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kalf-gepaneerd-2982",
            "naam": "Kalf gepaneerd",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rund-gepaneerd-5332",
            "naam": "Rund gepaneerd",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-wild-549",
            "naam": "Wild",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-bbq-7980",
            "naam": "BBQ",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-x-konijn",
            "naam": "Konijn",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-eend-vers",
            "naam": "Eend (vers)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-ganzenlever",
            "naam": "Ganzenlever",
            "synoniemen": [
              "foie gras"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-vlees--beleg",
        "naam": "Vlees (beleg)",
        "items": [
          {
            "id": "i-hesp--gekookt-3327",
            "naam": "Hesp (gekookt)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-hesp--gegrild-4621",
            "naam": "Hesp (gegrild)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-salami--zonder-look-8293",
            "naam": "Salami (zonder look)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-salami--met-look-5297",
            "naam": "Salami (met look)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-salami--gekruid-9651",
            "naam": "Salami (gekruid)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-hespeworst-646",
            "naam": "Hespeworst",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-strassbourg-8703",
            "naam": "Strassbourg",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat-3169",
            "naam": "Paté",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat--veenbessen-7850",
            "naam": "Paté veenbessen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat--appel-3383",
            "naam": "Paté appel",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat--eend-1949",
            "naam": "Paté eend",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat--wild-1055",
            "naam": "Paté wild",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat--peper-1139",
            "naam": "Paté peper",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pat--divers-5175",
            "naam": "Paté divers",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-spek--kalkoen-9249",
            "naam": "Spek (kalkoen)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-mortadella-3823",
            "naam": "Mortadella",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-mosterdgebraad-1203",
            "naam": "Mosterdgebraad",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-droge-worsten-826",
            "naam": "Droge worsten",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-grillworst-6300",
            "naam": "Grillworst",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rookworst-4187",
            "naam": "Rookworst",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kipfilet-natuur-8588",
            "naam": "Kipfilet natuur",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kipfilet-gekruid-164",
            "naam": "Kipfilet gekruid",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-prosciutto-1898",
            "naam": "Prosciutto",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-serrano-5191",
            "naam": "Serrano",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-paardenfilet-5872",
            "naam": "Paardenfilet",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kalkoenfilet-natuur-4614",
            "naam": "Kalkoenfilet natuur",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kalkoenfilet-gekruid-3856",
            "naam": "Kalkoenfilet gekruid",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kalkoenham-5346",
            "naam": "Kalkoenham",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gebraden-gehakt-1468",
            "naam": "Gebraden gehakt",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-filet-de-saxe-8821",
            "naam": "Filet de Saxe",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-filet-d-anvers-9887",
            "naam": "Filet d'Anvers",
            "synoniemen": [],
            "eenheid": "kg"
          }
        ]
      },
      {
        "id": "cat-smeersalades--vlees-en-vis",
        "naam": "Smeersalades (Vlees en Vis)",
        "items": [
          {
            "id": "i-prepar-2192",
            "naam": "Preparé",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-prepar---martino-1734",
            "naam": "Preparé (martino)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kip-curry-6699",
            "naam": "Kip Curry",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-vleessalade-3239",
            "naam": "Vleessalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-boullie-salade-7799",
            "naam": "Boullie salade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kipsalade-andalouse-1221",
            "naam": "Kipsalade andalouse",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pitasalade-5239",
            "naam": "Pitasalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-balletjes-in-tomatensaus-4461",
            "naam": "Balletjes in tomatensaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-balletjes-in-bbq-saus-633",
            "naam": "Balletjes in BBQ saus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kip-samourai-5155",
            "naam": "Kip samourai",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-vitello-tonato-2821",
            "naam": "Vitello tonato",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kipsalade-ananas-8410",
            "naam": "Kipsalade ananas",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-surimisalade-7019",
            "naam": "Surimisalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-krabsalade-9192",
            "naam": "Krabsalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tonijnsalade-6516",
            "naam": "Tonijnsalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tonijn-cocktailsalade-3636",
            "naam": "Tonijn cocktailsalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-garnaalsalade-2511",
            "naam": "Garnaalsalade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zalmsalade-6956",
            "naam": "Zalmsalade",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-vis--bereid",
        "naam": "Vis (bereid)",
        "items": [
          {
            "id": "i-zalmfilet-6661",
            "naam": "Zalmfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kabeljauwfilet-9340",
            "naam": "Kabeljauwfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schelvisfilet-2637",
            "naam": "Schelvisfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-roodbaarsfilet-1153",
            "naam": "Roodbaarsfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sint-jacobsnoten-8397",
            "naam": "Sint-Jacobsnoten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tongfilet-9682",
            "naam": "Tongfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-mosselen-5271",
            "naam": "Mosselen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-scampi-9777",
            "naam": "Scampi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-forelfilet-4306",
            "naam": "Forelfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zeewolffilet-742",
            "naam": "Zeewolffilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zeebaarsfilet-7763",
            "naam": "Zeebaarsfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pladijsfilet-6926",
            "naam": "Pladijsfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-wijtingfilet-6134",
            "naam": "Wijtingfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kibbeling-45",
            "naam": "Kibbeling",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-heilbotfilet-6057",
            "naam": "Heilbotfilet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-makreelfilet-1016",
            "naam": "Makreelfilet",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-vis--beleg",
        "naam": "Vis (beleg)",
        "items": [
          {
            "id": "i-zalm-gerookt-983",
            "naam": "Zalm gerookt",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-surimistaafjes-6780",
            "naam": "Surimistaafjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-makreel-gerookt-8510",
            "naam": "Makreel gerookt",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ansjovis-2061",
            "naam": "Ansjovis",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rolmops-3648",
            "naam": "Rolmops",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-groenten--vers",
        "naam": "Groenten (vers)",
        "items": [
          {
            "id": "i-champignons--wit-4131",
            "naam": "Champignons (wit)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-champignons--bruin-5136",
            "naam": "Champignons (bruin)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-oesterzwammen-681",
            "naam": "Oesterzwammen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-shitake-372",
            "naam": "Shitake",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-portobello-4752",
            "naam": "Portobello",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-paddestoelen--divers-2409",
            "naam": "Paddestoelen (divers)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-prei-1379",
            "naam": "Prei",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aubergine-824",
            "naam": "Aubergine",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-courgette-5534",
            "naam": "Courgette",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-paprika-816",
            "naam": "Paprika",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kerstomaten-9639",
            "naam": "Kerstomaten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aardappelen-4371",
            "naam": "Aardappelen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pijpajuin-4137",
            "naam": "Pijpajuin",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-wortelen-3620",
            "naam": "Wortelen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-witloof-5448",
            "naam": "Witloof",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-broccoli-8358",
            "naam": "Broccoli",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-prinsessenbonen-2967",
            "naam": "prinsessenbonen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bloemkool-8429",
            "naam": "Bloemkool",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-snackgroenten-1972",
            "naam": "Snackgroenten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-radijzen-7904",
            "naam": "Radijzen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sla--krop-2047",
            "naam": "Sla (krop)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sla--rucola-2765",
            "naam": "Sla (rucola)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sla--ijsberg-9533",
            "naam": "Sla (ijsberg)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sla--spitskool-3235",
            "naam": "Sla (spitskool)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sla--romeinse-5767",
            "naam": "Sla (romeinse)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-knolselder-2247",
            "naam": "Knolselder",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-spinazie-1684",
            "naam": "Spinazie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-venkel-5563",
            "naam": "Venkel",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ui--wit-8951",
            "naam": "Ui (wit)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ui--geel-793",
            "naam": "Ui (geel)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ui--rood-1327",
            "naam": "Ui (rood)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-look-4333",
            "naam": "Look",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bieslook-4252",
            "naam": "Bieslook",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sjalotten-7950",
            "naam": "Sjalotten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pastinaak-6690",
            "naam": "Pastinaak",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-puntpaprika-7589",
            "naam": "Puntpaprika",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dille-7158",
            "naam": "Dille",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-peterselie-6957",
            "naam": "Peterselie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bladpeterselie-1533",
            "naam": "Bladpeterselie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rode-pepers-9254",
            "naam": "Rode pepers",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aardappelen--krieltjes-7751",
            "naam": "Aardappelen (krieltjes)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-snijbonen-9064",
            "naam": "Snijbonen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rapen-2026",
            "naam": "Rapen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-munt-6117",
            "naam": "Munt",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tuinkers-884",
            "naam": "Tuinkers",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kervel-8830",
            "naam": "Kervel",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rozemarijn-8333",
            "naam": "Rozemarijn",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-paksoi-9307",
            "naam": "Paksoi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-witte-kool-3168",
            "naam": "Witte kool",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rode-kool-8311",
            "naam": "Rode kool",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dragon-2521",
            "naam": "Dragon",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ma-s-5249",
            "naam": "Maïs",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-salie-8450",
            "naam": "Salie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chinese-kool-3553",
            "naam": "Chinese kool",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pompoen-6964",
            "naam": "Pompoen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-artisjok-4050",
            "naam": "Artisjok",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-andijvie-1665",
            "naam": "Andijvie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rabarber-6508",
            "naam": "Rabarber",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-butternutpompoen-1845",
            "naam": "Butternutpompoen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-basilicum-3122",
            "naam": "Basilicum",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-koolrabi-632",
            "naam": "Koolrabi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-slamix-8216",
            "naam": "Slamix",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-geraspte-wortelen-8148",
            "naam": "Geraspte wortelen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-wokmix-7907",
            "naam": "Wokmix",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-soepgroenten-6059",
            "naam": "Soepgroenten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ovengroenten-7906",
            "naam": "Ovengroenten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schorseneren-3451",
            "naam": "Schorseneren",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-komkommer-1042",
            "naam": "Komkommer",
            "synoniemen": [
              "komkommers"
            ],
            "eenheid": null
          },
          {
            "id": "i-tomaten-1043",
            "naam": "Tomaten",
            "synoniemen": [
              "tomaat"
            ],
            "eenheid": "kg"
          },
          {
            "id": "i-tomaten-trostomaten-1044",
            "naam": "Tomaten (trostomaten)",
            "synoniemen": [
              "trostomaten"
            ],
            "eenheid": null
          },
          {
            "id": "i-selder-1045",
            "naam": "Selder",
            "synoniemen": [
              "bleekselder"
            ],
            "eenheid": null
          },
          {
            "id": "i-erwten-1046",
            "naam": "Erwten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-taugé-1047",
            "naam": "Tauge",
            "synoniemen": [
              "taugé",
              "sojascheuten"
            ],
            "eenheid": null
          },
          {
            "id": "i-boontjes-1048",
            "naam": "Sperziebonen",
            "synoniemen": [
              "boontjes"
            ],
            "eenheid": null
          },
          {
            "id": "i-gember-1049",
            "naam": "Gember",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-limoenblad-1050",
            "naam": "Citroengras",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-spruitjes",
            "naam": "Spruitjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-boerenkool",
            "naam": "Boerenkool",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-raapstelen",
            "naam": "Raapstelen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-snijbiet",
            "naam": "Snijbiet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-aardpeer",
            "naam": "Aardpeer",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-knolvenkel",
            "naam": "Knolvenkel",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-groenten--diepvries",
        "naam": "Groenten (diepvries)",
        "items": [
          {
            "id": "i-broccoli--diepvries-3504",
            "naam": "Broccoli (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-wortelen--diepvries-9759",
            "naam": "Wortelen (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bloemkool--diepvries-5383",
            "naam": "Bloemkool (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-soepgroenten--diepvries-9533",
            "naam": "Soepgroenten (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-edamame--diepvries-1893",
            "naam": "Edamame (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-prei--diepvries-2523",
            "naam": "Prei (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pompoen--diepvries-8644",
            "naam": "Pompoen (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-butternutpompoen--diepvries-1624",
            "naam": "Butternutpompoen (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ovengroenten--diepvries-1485",
            "naam": "Ovengroenten (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-puree--diepvries-1400",
            "naam": "Puree (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-groentenmix--diepvries-8131",
            "naam": "Groentenmix (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ratatouille--diepvries-447",
            "naam": "Ratatouille (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-spinazie--diepvries-9982",
            "naam": "Spinazie (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rode-kool--diepvries-9240",
            "naam": "Rode kool (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-wokmix--diepvries-4717",
            "naam": "Wokmix (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chinese-mix--diepvries-5724",
            "naam": "Chinese mix (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aubergines--diepvries-9951",
            "naam": "Aubergines (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-knolselder--diepvries-2842",
            "naam": "Knolselder (diepvries)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schorseneren--diepvries-4304",
            "naam": "Schorseneren (diepvries)",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-fruit",
        "naam": "Fruit",
        "items": [
          {
            "id": "i-aardbei-8138",
            "naam": "Aardbei",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-aardbei--diepvries-5843",
            "naam": "Aardbei (diepvries)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-citroen-8657",
            "naam": "Citroen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-avocado-4507",
            "naam": "Avocado",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-bananen-711",
            "naam": "Bananen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-mandarijnen-2046",
            "naam": "Mandarijnen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-druiven-wit-403",
            "naam": "Druiven wit",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-druiven-rood-1318",
            "naam": "Druiven rood",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-appelsien-457",
            "naam": "Appelsien",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-appelen-jonagold-3381",
            "naam": "Appelen Jonagold",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-appelen-royal-gala-594",
            "naam": "Appelen Royal Gala",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-appelen-kanzi-8985",
            "naam": "Appelen Kanzi",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-appelen-pink-lady-1275",
            "naam": "Appelen Pink Lady",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-appelen-morgana-4364",
            "naam": "Appelen Morgana",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kiwi-geel-8283",
            "naam": "Kiwi geel",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kiwi-groen-5930",
            "naam": "Kiwi groen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-blauwe-bessen-7210",
            "naam": "Blauwe bessen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-blauwe-bessen--diepvries-1323",
            "naam": "Blauwe bessen (diepvries)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-meloen-charentais-9987",
            "naam": "Meloen Charentais",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-meloen-cantaloupe-8927",
            "naam": "Meloen Cantaloupe",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-meloen-galia-984",
            "naam": "Meloen Galia",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-meloen-honing-4961",
            "naam": "Meloen Honing",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-meloen-water-1634",
            "naam": "Meloen Water",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pompelmoes-9155",
            "naam": "Pompelmoes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pomelo-8402",
            "naam": "Pomelo",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-peren-conf-rence-5754",
            "naam": "Peren Conférence",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-peren-doyenne-6111",
            "naam": "Peren Doyenne",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-limoen-2752",
            "naam": "Limoen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-ananas-5334",
            "naam": "Ananas",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kersen-381",
            "naam": "Kersen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-passievrucht-1847",
            "naam": "Passievrucht",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-braambes-9743",
            "naam": "Braambes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-abrikozen-652",
            "naam": "Abrikozen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-granaatappel-4132",
            "naam": "Granaatappel",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-vijgen-3116",
            "naam": "Vijgen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-nectarines-3401",
            "naam": "Nectarines",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-physalis-4765",
            "naam": "Physalis",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rode-bessen-3965",
            "naam": "Rode bessen",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-mango-4990",
            "naam": "Mango",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-mango--diepvries-2826",
            "naam": "Mango (diepvries)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kokosnoot-6739",
            "naam": "Kokosnoot",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rode-vruchtenmix--diepvries-9174",
            "naam": "Rode vruchtenmix (diepvries)",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-fruitsalades-3340",
            "naam": "Fruitsalades",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-perzik-9540",
            "naam": "Perzik",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-stekelbes-4492",
            "naam": "Stekelbes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-x-kaki",
            "naam": "Kaki",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-lychee",
            "naam": "Lychee",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sterfruit",
            "naam": "Sterfruit",
            "synoniemen": [
              "carambola"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zuurzak",
            "naam": "Zuurzak",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-rambutan",
            "naam": "Rambutan",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-guave",
            "naam": "Guave",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-papaja",
            "naam": "Papaja",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-droogvoeding",
        "naam": "Droogvoeding",
        "items": [
          {
            "id": "i-cashewnoten-999",
            "naam": "Cashewnoten",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pijnboompitnoten-7906",
            "naam": "Pijnboompitnoten",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pistachenoten-9292",
            "naam": "Pistachenoten",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-pecannoten-365",
            "naam": "Pecannoten",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-notenmix-8731",
            "naam": "Notenmix",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-dadels-3028",
            "naam": "Dadels",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-walnoten-3430",
            "naam": "Walnoten",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-granolamix-1730",
            "naam": "Granolamix",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gekonfijt-fruit-1697",
            "naam": "gekonfijt fruit",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gezouten-nootjes-3958",
            "naam": "Gezouten nootjes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-popcorn-2524",
            "naam": "Popcorn",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-spaghetti-4392",
            "naam": "Spaghetti",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-fusilli-7887",
            "naam": "Fusilli",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-linguini-8290",
            "naam": "Linguini",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-penne-313",
            "naam": "Penne",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-capellini-8555",
            "naam": "Capellini",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-macaroni-5864",
            "naam": "Macaroni",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-farfalle-5430",
            "naam": "Farfalle",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gnocchi-7257",
            "naam": "Gnocchi",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-tagliatelle-9320",
            "naam": "Tagliatelle",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rijst-basmati-3637",
            "naam": "Rijst Basmati",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rijst-jasmijn-6703",
            "naam": "Rijst Jasmijn",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-noodles-2382",
            "naam": "Noodles",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-tortelloni-3477",
            "naam": "Tortelloni",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-cappeletti-6374",
            "naam": "Cappeletti",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-bouillonblokjes-3887",
            "naam": "Bouillonblokjes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-vermicelli-6865",
            "naam": "Vermicelli",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-couscous-2852",
            "naam": "Couscous",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-parelcouscous-9543",
            "naam": "Parelcouscous",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-soep-in-brik-3020",
            "naam": "Soep in brik",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-soep-instant-5979",
            "naam": "Soep instant",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-azijn-natuur-8894",
            "naam": "Azijn natuur",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-olijf-1767",
            "naam": "Olie olijf",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-zonnebloem-2596",
            "naam": "Olie zonnebloem",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-frituur-5031",
            "naam": "Olie Frituur",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-balsamico-3965",
            "naam": "Olie balsamico",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-azijn-appel-2043",
            "naam": "Azijn appel",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-azijn-witte-wijn-9028",
            "naam": "Azijn witte wijn",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-arachide-5693",
            "naam": "Olie arachide",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-fondue-9852",
            "naam": "Olie fondue",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-koolzaadolie-7075",
            "naam": "Olie koolzaadolie",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-azijn-rode-wijn-2002",
            "naam": "Azijn rode wijn",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-olie-wok-784",
            "naam": "Olie wok",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-azijn-framboos-4356",
            "naam": "Azijn framboos",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-paprikapoeder-8060",
            "naam": "Paprikapoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-knoflookpoeder-9177",
            "naam": "Knoflookpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-uienpoeder-1693",
            "naam": "Uienpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-oreganopoeder-5580",
            "naam": "Oreganopoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kurkumapoeder-706",
            "naam": "Kurkumapoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kaneelpoeder-1230",
            "naam": "Kaneelpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-nootmuskaatpoeder-4645",
            "naam": "Nootmuskaatpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-chilipoeder-1283",
            "naam": "Chilipoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-chilivlokken-4526",
            "naam": "Chilivlokken",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-komijnzaadpoeder-2979",
            "naam": "Komijnzaadpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gemberpoeder-5144",
            "naam": "Gemberpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-cayennepeperpoeder-9774",
            "naam": "Cayennepeperpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-basilicumpoeder-4370",
            "naam": "Basilicumpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-zout-9873",
            "naam": "Zout",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-peper-zwart-6851",
            "naam": "Peper zwart",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-zout-himalaya-7598",
            "naam": "Zout himalaya",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-tijmpoeder-2280",
            "naam": "Tijmpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-peper-wit-2170",
            "naam": "Peper wit",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-peper-mix-2868",
            "naam": "Peper mix",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-peper-rood-102",
            "naam": "Peper rood",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rozemarijnpoeder-9946",
            "naam": "Rozemarijnpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kruidnagel-6029",
            "naam": "Kruidnagel",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kerriepoeder-4726",
            "naam": "Kerriepoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-sat-kruiden-2684",
            "naam": "Satékruiden",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kipkruiden-2849",
            "naam": "Kipkruiden",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kruidenmix-5180",
            "naam": "Kruidenmix",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-laurierblaadjes-246",
            "naam": "Laurierblaadjes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-proven-aalse-kruiden-2467",
            "naam": "Provençaalse kruiden",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-korianderpoeder-8961",
            "naam": "Korianderpoeder",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-kappertjes-3099",
            "naam": "Kappertjes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-augurken-8870",
            "naam": "Augurken",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-zilveruitjes-3283",
            "naam": "Zilveruitjes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-tabasco-8255",
            "naam": "Tabasco",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-paneermeel-7070",
            "naam": "Paneermeel",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-maizena-3646",
            "naam": "Maizena",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-roux-wit-2342",
            "naam": "Roux wit",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-rouw-bruin-7954",
            "naam": "Rouw bruin",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-gevogeltefond-4064",
            "naam": "Gevogeltefond",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-vleesfond-540",
            "naam": "Vleesfond",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-visbouillon-1474",
            "naam": "Visbouillon",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-pesto-8668",
            "naam": "Pesto",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-ontbijtgranen-cornflakes-3592",
            "naam": "Ontbijtgranen/Cornflakes",
            "synoniemen": [],
            "eenheid": "kg"
          },
          {
            "id": "i-havermout-7034",
            "naam": "Havermout",
            "synoniemen": [],
            "eenheid": "kg"
          }
        ]
      },
      {
        "id": "cat-droogvoeding--snoep",
        "naam": "Droogvoeding (snoep)",
        "items": [
          {
            "id": "i-chips-848",
            "naam": "Chips",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-cocktailnootjes-1836",
            "naam": "Cocktailnootjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-leo-6554",
            "naam": "Leo",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-koeken-divers-809",
            "naam": "Koeken divers",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chocolade-420",
            "naam": "Chocolade",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-wafels-9042",
            "naam": "wafels",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-peperkoek-5434",
            "naam": "Peperkoek",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-madeleines-6338",
            "naam": "Madeleines",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-frangipanes-6985",
            "naam": "Frangipanes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-koeken-prince-8251",
            "naam": "Koeken Prince",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chocoladerepen-1048",
            "naam": "Chocoladerepen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-mergpijpjes-6778",
            "naam": "Mergpijpjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-gevulde-wafels-9068",
            "naam": "Gevulde wafels",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-snoepjes-divers-8408",
            "naam": "Snoepjes divers",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-muffins-1135",
            "naam": "Muffins",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-sauzen",
        "naam": "Sauzen",
        "items": [
          {
            "id": "i-dipsaus-kaas-4122",
            "naam": "Dipsaus Kaas",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dipsaus-guacamole-1007",
            "naam": "Dipsaus Guacamole",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dipsaus-salsa-5025",
            "naam": "Dipsaus Salsa",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sojasaus-9832",
            "naam": "Sojasaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-worcestersaus-135",
            "naam": "Worcestersaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-cockailsaus-6867",
            "naam": "Cockailsaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-andalouse-1979",
            "naam": "Andalouse",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-mayonaise-1697",
            "naam": "Mayonaise",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tomatensaus-4713",
            "naam": "Tomatensaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bolognaisesaus-7360",
            "naam": "Bolognaisesaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-mosterd-9260",
            "naam": "Mosterd",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-currysaus-1550",
            "naam": "Currysaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tartaar-9210",
            "naam": "Tartaar",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ketchup-1456",
            "naam": "Ketchup",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ketchup-curry-4446",
            "naam": "Ketchup curry",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zoetzure-saus-7795",
            "naam": "Zoetzure saus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-samourai-841",
            "naam": "Samourai",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-brazil-7964",
            "naam": "Brazil",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bearnaise-9070",
            "naam": "Bearnaise",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pitasaus-2064",
            "naam": "Pitasaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pickles-5577",
            "naam": "Pickles",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-looksaus-156",
            "naam": "Looksaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-vinaigrette-599",
            "naam": "Vinaigrette",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-joppiesaus-9780",
            "naam": "Joppiesaus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-am-ricainesaus-2055",
            "naam": "Américainesaus",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-zoet-beleg",
        "naam": "Zoet beleg",
        "items": [
          {
            "id": "i-nutella-2937",
            "naam": "Nutella",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chocopasta-puur-8968",
            "naam": "Chocopasta puur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chocopasta-melk-6516",
            "naam": "Chocopasta melk",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-chocopasta-wit-5658",
            "naam": "Chocopasta wit",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-speculoospasta-5452",
            "naam": "Speculoospasta",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-hagelslag-1972",
            "naam": "Hagelslag",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-confituur-3179",
            "naam": "Confituur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-luikse-siroop-8054",
            "naam": "Luikse siroop",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-honing-6459",
            "naam": "Honing",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-bereide-maaltijden",
        "naam": "Bereide maaltijden",
        "items": [
          {
            "id": "i-soep-vers-2466",
            "naam": "Soep vers",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-macaroni-kaas-hesp-9860",
            "naam": "Macaroni kaas hesp",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-lasagne-4146",
            "naam": "Lasagne",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pizza-5328",
            "naam": "Pizza",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-stoofvlees-9487",
            "naam": "Stoofvlees",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-gehaktballen-in-saus-3753",
            "naam": "Gehaktballen in saus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-vogelnestjes-3550",
            "naam": "Vogelnestjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-quiche-1367",
            "naam": "Quiche",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-puree-ovenschotel-7911",
            "naam": "Puree ovenschotel",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-fastfood",
        "naam": "Fastfood",
        "items": [
          {
            "id": "i-hamburger-9468",
            "naam": "Hamburger",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-hot-dog-7741",
            "naam": "Hot dog",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-macdonalds-9764",
            "naam": "Macdonalds",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-frituur-9032",
            "naam": "Frituur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-burger-king-3246",
            "naam": "Burger King",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-quick-4297",
            "naam": "Quick",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pizza-hut-5673",
            "naam": "Pizza Hut",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-restaurant-6497",
            "naam": "Restaurant",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-plantaardig-en-speciaal-dieet",
        "naam": "Plantaardig en speciaal dieet",
        "items": [
          {
            "id": "i-x-vleesvervangers",
            "naam": "Vleesvervangers",
            "synoniemen": [
              "veggie burger",
              "vegan"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tofu",
            "naam": "Tofu",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-tempeh",
            "naam": "Tempeh",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sojadrink",
            "naam": "Sojadrink",
            "synoniemen": [
              "sojamelk"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-havermelk",
            "naam": "Havermelk",
            "synoniemen": [
              "haverdrink"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-amandelmelk",
            "naam": "Amandelmelk",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-glutenvrij-brood",
            "naam": "Glutenvrij brood",
            "synoniemen": [
              "glutenvrij"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-lactosevrije-zuivel",
            "naam": "Lactosevrije zuivel",
            "synoniemen": [
              "lactosevrij"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-prote-nerepen",
            "naam": "Proteïnerepen",
            "synoniemen": [
              "eiwitreep"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sportvoeding",
            "naam": "Sportvoeding",
            "synoniemen": [
              "proteïnepoeder",
              "whey"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-wereldkeuken",
        "naam": "Wereldkeuken",
        "items": [
          {
            "id": "i-x-sushi",
            "naam": "Sushi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-woksaus",
            "naam": "Woksaus",
            "synoniemen": [
              "wok"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tortilla-s",
            "naam": "Tortilla's",
            "synoniemen": [
              "wraps"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-bulgur",
            "naam": "Bulgur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-noedels",
            "naam": "Noedels",
            "synoniemen": [
              "noodles",
              "ramen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-kokosmelk",
            "naam": "Kokosmelk",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-currypasta",
            "naam": "Currypasta",
            "synoniemen": [
              "curry"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-hummus",
            "naam": "Hummus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-falafel",
            "naam": "Falafel",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-quinoa",
            "naam": "Quinoa",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sushi-azijn",
            "naam": "Sushi-azijn",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-miso",
            "naam": "Miso",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-wasabi",
            "naam": "Wasabi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sambal",
            "naam": "Sambal",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-ketjap",
            "naam": "Ketjap",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-teriyakisaus",
            "naam": "Teriyakisaus",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-kruiden-en-specerijen",
        "naam": "Kruiden en specerijen",
        "items": [
          {
            "id": "i-x-verse-kruiden",
            "naam": "Verse kruiden",
            "synoniemen": [
              "basilicum",
              "peterselie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gedroogde-kruiden",
            "naam": "Gedroogde kruiden",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-specerijen",
            "naam": "Specerijen",
            "synoniemen": [
              "kaneel",
              "paprikapoeder"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gist",
            "naam": "Gist",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-noten-en-zaden",
        "naam": "Noten en zaden",
        "items": [
          {
            "id": "i-x-noten",
            "naam": "Noten",
            "synoniemen": [
              "amandelen",
              "walnoten",
              "cashewnoten"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zaden-en-pitten",
            "naam": "Zaden en pitten",
            "synoniemen": [
              "chiazaad",
              "lijnzaad",
              "pompoenpitten"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-notenpasta",
            "naam": "Notenpasta",
            "synoniemen": [
              "pindakaas"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gedroogd-fruit",
            "naam": "Gedroogd fruit",
            "synoniemen": [
              "rozijnen",
              "dadels"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-ontbijt",
        "naam": "Ontbijt",
        "items": [
          {
            "id": "i-x-ontbijtgranen",
            "naam": "Ontbijtgranen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-muesli",
            "naam": "Muesli",
            "synoniemen": [
              "granola"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-cornflakes",
            "naam": "Cornflakes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-pannenkoekenmix",
            "naam": "Pannenkoekenmix",
            "synoniemen": [
              "pannenkoeken"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-notenreep",
            "naam": "Notenreep",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-fruitreep",
            "naam": "Fruitreep",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-ontbijtkoek",
            "naam": "Ontbijtkoek",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-beschuit",
            "naam": "Beschuit",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-krentenbollen",
            "naam": "Krentenbollen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-bakingredi-nten",
        "naam": "Bakingrediënten",
        "items": [
          {
            "id": "i-x-suiker",
            "naam": "Suiker",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-basterdsuiker",
            "naam": "Basterdsuiker",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-poedersuiker",
            "naam": "Poedersuiker",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-kristalsuiker",
            "naam": "Kristalsuiker",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-vanillesuiker",
            "naam": "Vanillesuiker",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-bloem",
            "naam": "Bloem",
            "synoniemen": [
              "meel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zelfrijzend-bakmeel",
            "naam": "Zelfrijzend bakmeel",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-bakpoeder",
            "naam": "Bakpoeder",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-baking-soda",
            "naam": "Baking soda",
            "synoniemen": [
              "zuiveringszout"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-cacaopoeder",
            "naam": "Cacaopoeder",
            "synoniemen": [
              "cacao"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-vanille-extract",
            "naam": "Vanille-extract",
            "synoniemen": [
              "vanille"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-marsepein",
            "naam": "Marsepein",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-amandelspijs",
            "naam": "Amandelspijs",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-kaneelstokjes",
            "naam": "Kaneelstokjes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-bakvet",
            "naam": "Bakvet",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-spuitbus-slagroom",
            "naam": "Spuitbus slagroom",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-conserven-en-ingemaakt",
        "naam": "Conserven en ingemaakt",
        "items": [
          {
            "id": "i-x-bonen-in-blik",
            "naam": "Bonen in blik",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-tomaten-in-blik",
            "naam": "Tomaten in blik",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-ma-s-in-blik",
            "naam": "Maïs in blik",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-tonijn-in-blik",
            "naam": "Tonijn in blik",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-kikkererwten-in-blik",
            "naam": "Kikkererwten in blik",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-linzen-in-blik",
            "naam": "Linzen in blik",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-olijven",
            "naam": "Olijven",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-zuurkool",
            "naam": "Zuurkool",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-traiteur",
        "naam": "Traiteur",
        "items": [
          {
            "id": "i-x-vleeswarenschotel",
            "naam": "Vleeswarenschotel",
            "synoniemen": [
              "charcuterieschotel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-kaasplankje",
            "naam": "Kaasplankje",
            "synoniemen": [
              "kaasschotel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tapaspakket",
            "naam": "Tapaspakket",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-keukenbenodigdheden",
        "naam": "Keukenbenodigdheden",
        "items": [
          {
            "id": "i-x-bakpapier",
            "naam": "Bakpapier",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-aluminiumfolie",
            "naam": "Aluminiumfolie",
            "synoniemen": [
              "alufolie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-plasticfolie",
            "naam": "Plasticfolie",
            "synoniemen": [
              "huishoudfolie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-diepvrieszakjes",
            "naam": "Diepvrieszakjes",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-drank",
    "naam": "Drank",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#C56A1F",
    "icoon": "🍺",
    "categorieen": [
      {
        "id": "cat-water",
        "naam": "Water",
        "items": [
          {
            "id": "i-bruisend-water-6465",
            "naam": "Bruisend water",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-plat-water-4319",
            "naam": "Plat water",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-x-mineraalwater",
            "naam": "Mineraalwater",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-bruisend-water-met-smaak",
            "naam": "Bruisend water met smaak",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-waterfilter",
            "naam": "Waterfilter",
            "synoniemen": [
              "kraanfilter"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-frisdrank",
        "naam": "Frisdrank",
        "items": [
          {
            "id": "i-cola-4554",
            "naam": "Cola",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-sprite-119",
            "naam": "Sprite",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-7up-4591",
            "naam": "7Up",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-ice-tea-6117",
            "naam": "Ice Tea",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-spa-limonade-4580",
            "naam": "Spa Limonade",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-gingerale-1804",
            "naam": "Gingerale",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-schweppes-675",
            "naam": "Schweppes",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-schweppes-agrumes-1333",
            "naam": "Schweppes Agrumes",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-fristi-842",
            "naam": "Fristi",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-fanta-2150",
            "naam": "Fanta",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-aa-drink-7116",
            "naam": "AA drink",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-nalu-5006",
            "naam": "Nalu",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-t-nissteiner-1100",
            "naam": "Tönissteiner",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-taksi-1136",
            "naam": "Taksi",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-kidibul-2213",
            "naam": "Kidibul",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-gingerbeer-4508",
            "naam": "Gingerbeer",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-dubbelfriss-8118",
            "naam": "DubbelFriss",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-orangina-2393",
            "naam": "Orangina",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-aquarius-5745",
            "naam": "Aquarius",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-ah-licht---zonder-prik-8744",
            "naam": "AH Licht & zonder prik",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-mogu-mogu-1930",
            "naam": "Mogu Mogu",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-bundaberg-846",
            "naam": "Bundaberg",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-tropical-aloe-vera-1749",
            "naam": "Tropical Aloe Vera",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-x-pepsi",
            "naam": "Pepsi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-tonic",
            "naam": "Tonic",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-bitter-lemon",
            "naam": "Bitter Lemon",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-vitaminewater",
            "naam": "Vitaminewater",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sportdrank",
            "naam": "Sportdrank",
            "synoniemen": [
              "isotone drank"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ijskoffie",
            "naam": "IJskoffie",
            "synoniemen": [
              "ice coffee"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-drinkyoghurt",
            "naam": "Drinkyoghurt",
            "synoniemen": [
              "yop"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-energiedrank",
        "naam": "Energiedrank",
        "items": [
          {
            "id": "i-red-bull-304",
            "naam": "Red Bull",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-monster-9732",
            "naam": "Monster",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-x-energy-shot",
            "naam": "Energy shot",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-alcoholische-dranken",
        "naam": "Alcoholische dranken",
        "items": [
          {
            "id": "i-bier-6061",
            "naam": "Bier",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-wijn-8363",
            "naam": "Wijn",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-champagne-schuimwijn-4195",
            "naam": "Champagne/schuimwijn",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-whisky-5528",
            "naam": "Whisky",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-jenever-3068",
            "naam": "Jenever",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-vodka-3126",
            "naam": "Vodka",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-rum-4949",
            "naam": "Rum",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-baileys-5951",
            "naam": "Baileys",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-x-pils",
            "naam": "Pils",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-speciaalbier",
            "naam": "Speciaalbier",
            "synoniemen": [
              "streekbier"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ros-wijn",
            "naam": "Rosé wijn",
            "synoniemen": [
              "rosé"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-prosecco",
            "naam": "Prosecco",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-cider",
            "naam": "Cider",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-cognac",
            "naam": "Cognac",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-likeur",
            "naam": "Likeur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-gin",
            "naam": "Gin",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-tequila",
            "naam": "Tequila",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-port",
            "naam": "Port",
            "synoniemen": [
              "portwijn"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sherry",
            "naam": "Sherry",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-vermout",
            "naam": "Vermout",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-absint",
            "naam": "Absint",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-advocaat",
            "naam": "Advocaat",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-eierlikeur",
            "naam": "Eierlikeur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sangria",
            "naam": "Sangria",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-fruitsap",
        "naam": "Fruitsap",
        "items": [
          {
            "id": "i-appelsap-3235",
            "naam": "Appelsap",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-sinaasappelsap-2101",
            "naam": "Sinaasappelsap",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-druivensap-2781",
            "naam": "Druivensap",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-multivitaminesap-3863",
            "naam": "Multivitaminesap",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-smoothies-2016",
            "naam": "Smoothies",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-limonadesiroop-8947",
            "naam": "Limonadesiroop",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-x-groentesap",
            "naam": "Groentesap",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-cranberrysap",
            "naam": "Cranberrysap",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-warme-dranken",
        "naam": "Warme dranken",
        "items": [
          {
            "id": "i-x-koffiebonen",
            "naam": "Koffiebonen",
            "synoniemen": [
              "koffie bonen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gemalen-koffie",
            "naam": "Gemalen koffie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-koffiepads",
            "naam": "Koffiepads",
            "synoniemen": [
              "senseo"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-koffiecapsules",
            "naam": "Koffiecapsules",
            "synoniemen": [
              "nespresso",
              "dolce gusto"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-thee",
            "naam": "Thee",
            "synoniemen": [
              "theezakjes"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-kruidenthee",
            "naam": "Kruidenthee",
            "synoniemen": [
              "muntthee",
              "kamille"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-warme-chocolademelk",
            "naam": "Warme chocolademelk",
            "synoniemen": [
              "cacao",
              "chocomelk"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-oploskoffie",
            "naam": "Oploskoffie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-cafe-nevrije-koffie",
            "naam": "Cafeïnevrije koffie",
            "synoniemen": [
              "decaf"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-koffiemelk",
            "naam": "Koffiemelk",
            "synoniemen": [
              "creamer"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-suikervervangers-voor-koffie-en-thee",
            "naam": "Suikervervangers voor koffie en thee",
            "synoniemen": [
              "stevia",
              "zoetjes"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-groene-thee",
            "naam": "Groene thee",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-zwarte-thee",
            "naam": "Zwarte thee",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-fruitthee",
            "naam": "Fruitthee",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-rooibosthee",
            "naam": "Rooibosthee",
            "synoniemen": [
              "rooibos"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-verse-muntthee",
            "naam": "Verse muntthee",
            "synoniemen": [
              "muntthee"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-speciale-dranken",
        "naam": "Speciale dranken",
        "items": [
          {
            "id": "i-x-kombucha",
            "naam": "Kombucha",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-smoothie",
            "naam": "Smoothie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-verse-fruitsap",
            "naam": "Verse fruitsap",
            "synoniemen": [
              "versgeperst"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-alcoholvrij-bier",
            "naam": "Alcoholvrij bier",
            "synoniemen": [
              "0.0"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-mocktail",
            "naam": "Mocktail",
            "synoniemen": [
              "alcoholvrije cocktail"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-huishouden-en-verzorging",
    "naam": "Huishouden en Verzorging",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#6B7280",
    "icoon": "🧹",
    "categorieen": [
      {
        "id": "cat-huishoudproducten",
        "naam": "Huishoudproducten",
        "items": [
          {
            "id": "i-wasmiddel-kledij-3152",
            "naam": "Wasmiddel kledij",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-wasverzachter-2723",
            "naam": "Wasverzachter",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-afwasmiddel-327",
            "naam": "Afwasmiddel",
            "synoniemen": [
              "vaatwasmiddel",
              "spoelmiddel afwas"
            ],
            "eenheid": "stuks"
          },
          {
            "id": "i-vaatwastabletten-7025",
            "naam": "Vaatwastabletten",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-antikal-2214",
            "naam": "Antikal",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-mr-proper-spray-3079",
            "naam": "Mr Proper spray",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-dettolspray-8925",
            "naam": "Dettolspray",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-keukenrol-8372",
            "naam": "Keukenrol",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-sponsjes-195",
            "naam": "Sponsjes",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-vuilniszakken-2810",
            "naam": "Vuilniszakken",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-vlekkenverwijderaar-1822",
            "naam": "Vlekkenverwijderaar",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-allesreiniger-4989",
            "naam": "Allesreiniger",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-toiletreiniging-7469",
            "naam": "Toiletreiniging",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-glas-en-ruitenreiniger-7253",
            "naam": "Glas en ruitenreiniger",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-poetsdoeken-8346",
            "naam": "Poetsdoeken",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-luchtverfrissers-2885",
            "naam": "Luchtverfrissers",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-tabak-en-rookwaren-9539",
            "naam": "Tabak en rookwaren",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-vapevloeistof-en-e-sigaret-3671",
            "naam": "Vapevloeistof en e-sigaret",
            "synoniemen": [],
            "eenheid": "stuks"
          }
        ]
      },
      {
        "id": "cat-persoonlijke-verzorging",
        "naam": "Persoonlijke verzorging",
        "items": [
          {
            "id": "i-haarverzorging-3500",
            "naam": "Haarverzorging",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-haarstyling-9573",
            "naam": "Haarstyling",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-kapper-8096",
            "naam": "Kapper",
            "synoniemen": [
              "haarsnit",
              "kapsalon"
            ],
            "eenheid": "stuks"
          },
          {
            "id": "i-mondverzorging-4071",
            "naam": "Mondverzorging",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-lichaamsverzorging--douche-zee-8778",
            "naam": "Lichaamsverzorging (Douche/zeep)",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-huidverzorging--gezicht-bodylo-8947",
            "naam": "Huidverzorging (gezicht/bodylotion)",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-deodorant-en-parfum-2057",
            "naam": "Deodorant en parfum",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-zonnebescherming-3479",
            "naam": "Zonnebescherming",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-scheren-en-ontharen-7673",
            "naam": "Scheren en ontharen",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-dameshygi-ne-8789",
            "naam": "Dameshygiëne",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-nagelverzorging-3686",
            "naam": "Nagelverzorging",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-toiletpapier-6360",
            "naam": "Toiletpapier",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-vochtige-doekjes-3135",
            "naam": "Vochtige doekjes",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-tandenborstel-677",
            "naam": "Tandenborstel",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-tandpasta-5571",
            "naam": "Tandpasta",
            "synoniemen": [],
            "eenheid": "stuks"
          }
        ]
      },
      {
        "id": "cat-x-kapper-en-schoonheid",
        "naam": "Kapper en schoonheid",
        "items": [
          {
            "id": "i-x-barbier",
            "naam": "Barbier",
            "synoniemen": [
              "barber"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-schoonheidsspecialiste",
            "naam": "Schoonheidsspecialiste",
            "synoniemen": [
              "gelaatsverzorging"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-manicure",
            "naam": "Manicure",
            "synoniemen": [
              "nagels",
              "gelnagels"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-pedicure",
            "naam": "Pedicure",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-make-up",
            "naam": "Make-up",
            "synoniemen": [
              "cosmetica"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-parfum",
            "naam": "Parfum",
            "synoniemen": [
              "eau de toilette"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zonnebank",
            "naam": "Zonnebank",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-wellness-en-ontspanning",
        "naam": "Wellness en ontspanning",
        "items": [
          {
            "id": "i-x-massage",
            "naam": "Massage",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-sauna",
            "naam": "Sauna",
            "synoniemen": [
              "wellnesscentrum"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-spa-bezoek",
            "naam": "Spa-bezoek",
            "synoniemen": [
              "spa"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-floatsessie",
            "naam": "Floatsessie",
            "synoniemen": [
              "floating"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-wasserij-en-herstel",
        "naam": "Wasserij en herstel",
        "items": [
          {
            "id": "i-x-droogkuis",
            "naam": "Droogkuis",
            "synoniemen": [
              "stomerij"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-wassalon",
            "naam": "Wassalon",
            "synoniemen": [
              "wasserette"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-strijkdienst",
            "naam": "Strijkdienst",
            "synoniemen": [
              "strijkatelier"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-schoenmaker",
            "naam": "Schoenmaker",
            "synoniemen": [
              "schoenherstel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-kledijherstelling",
            "naam": "Kledijherstelling",
            "synoniemen": [
              "retouches",
              "naaiatelier"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-apotheek-en-gezondheid",
    "naam": "Apotheek en gezondheid",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#D64545",
    "icoon": "❤️",
    "categorieen": [
      {
        "id": "cat-medicatie",
        "naam": "Medicatie",
        "items": [
          {
            "id": "i-pijn-en-koorts-7283",
            "naam": "Pijn en koorts",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-pleisters-4459",
            "naam": "Pleisters",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-verband-9951",
            "naam": "Verband",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-ontsmettingsmiddel-5013",
            "naam": "Ontsmettingsmiddel",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-wondverzorging-6732",
            "naam": "Wondverzorging",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-hoestsiroop-257",
            "naam": "Hoestsiroop",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-keelpastilles-8537",
            "naam": "Keelpastilles",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-neusspray-459",
            "naam": "Neusspray",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-maagmedicatie-6493",
            "naam": "Maagmedicatie",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-darmmedicatie-6742",
            "naam": "Darmmedicatie",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-muggenspray-895",
            "naam": "Muggenspray",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-allergie-medicatie-8488",
            "naam": "Allergie medicatie",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-vitaminen-en-supplementen-9328",
            "naam": "Vitaminen en supplementen",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-rilatine-jasper-5184",
            "naam": "Rilatine Kind 1",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-rilatine-milo-6025",
            "naam": "Rilatine Kind 3",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-cold-hot-packs-5920",
            "naam": "Cold/hot packs",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-bloeddrukmeter-7046",
            "naam": "Bloeddrukmeter",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-thermometer-7519",
            "naam": "Thermometer",
            "synoniemen": [],
            "eenheid": "stuks"
          }
        ]
      },
      {
        "id": "cat-medische-zorg-en-facturen",
        "naam": "Medische zorg en facturen",
        "items": [
          {
            "id": "i-huisarts-8922",
            "naam": "Huisarts",
            "synoniemen": [
              "dokter",
              "geneesheer"
            ],
            "eenheid": null
          },
          {
            "id": "i-specialisten-3458",
            "naam": "Specialisten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tandarts-en-orthodontie-6414",
            "naam": "Tandarts en orthodontie",
            "synoniemen": [
              "tandarts",
              "orthodontist",
              "beugel"
            ],
            "eenheid": null
          },
          {
            "id": "i-ziekenhuisfacturen-6531",
            "naam": "Ziekenhuisfacturen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kinesist-5419",
            "naam": "Kinesist",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-psycholoog-1237",
            "naam": "Psycholoog",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-brillen-en-lenzen-6413",
            "naam": "Brillen en lenzen",
            "synoniemen": [
              "opticien",
              "contactlenzen",
              "oogarts bril"
            ],
            "eenheid": null
          },
          {
            "id": "i-gynaecoloog-5087",
            "naam": "Gynaecoloog",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dermatoloog-4899",
            "naam": "Dermatoloog",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-ziekenfonds-terugbetalingen-5629",
            "naam": "Ziekenfonds terugbetalingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tandverzekering-terugbetalinge-7926",
            "naam": "Tandverzekering terugbetalingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dkv-terugbetalingen-990",
            "naam": "DKV terugbetalingen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-paramedische-zorg",
        "naam": "Paramedische zorg",
        "items": [
          {
            "id": "i-x-osteopaat",
            "naam": "Osteopaat",
            "synoniemen": [
              "osteopathie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-podoloog",
            "naam": "Podoloog",
            "synoniemen": [
              "podologie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-di-tist",
            "naam": "Diëtist",
            "synoniemen": [
              "voedingsadvies"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-logopedist",
            "naam": "Logopedist",
            "synoniemen": [
              "logopedie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ergotherapeut",
            "naam": "Ergotherapeut",
            "synoniemen": [
              "ergotherapie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-chiropractor",
            "naam": "Chiropractor",
            "synoniemen": [
              "chiropraxie"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-geestelijke-gezondheid",
        "naam": "Geestelijke gezondheid",
        "items": [
          {
            "id": "i-x-psychiater",
            "naam": "Psychiater",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-therapiesessie",
            "naam": "Therapiesessie",
            "synoniemen": [
              "therapie",
              "gesprekstherapie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-relatietherapie",
            "naam": "Relatietherapie",
            "synoniemen": [
              "koppeltherapie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-mentale-coaching",
            "naam": "Mentale coaching",
            "synoniemen": [
              "life coach",
              "burn-out coach"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-optiek-en-gehoor",
        "naam": "Optiek en gehoor",
        "items": [
          {
            "id": "i-x-brilmontuur",
            "naam": "Brilmontuur",
            "synoniemen": [
              "bril",
              "montuur"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-brilglazen",
            "naam": "Brilglazen",
            "synoniemen": [
              "glazen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-contactlenzen",
            "naam": "Contactlenzen",
            "synoniemen": [
              "lenzen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-lenzenvloeistof",
            "naam": "Lenzenvloeistof",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-zonnebril-op-sterkte",
            "naam": "Zonnebril op sterkte",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-hoorapparaat",
            "naam": "Hoorapparaat",
            "synoniemen": [
              "hoortoestel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-oogmeting",
            "naam": "Oogmeting",
            "synoniemen": [
              "oogonderzoek",
              "opticien"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-tandzorg",
        "naam": "Tandzorg",
        "items": [
          {
            "id": "i-x-orthodontie",
            "naam": "Orthodontie",
            "synoniemen": [
              "beugel",
              "orthodontist"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tandprothese",
            "naam": "Tandprothese",
            "synoniemen": [
              "kunstgebit"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-mondhygi-nist",
            "naam": "Mondhygiënist",
            "synoniemen": [
              "tandreiniging"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tandimplantaat",
            "naam": "Tandimplantaat",
            "synoniemen": [
              "implantaat"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-vitamines-en-supplementen",
        "naam": "Vitamines en supplementen",
        "items": [
          {
            "id": "i-x-vitamines",
            "naam": "Vitamines",
            "synoniemen": [
              "multivitamine",
              "vitamine d"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-voedingssupplementen",
            "naam": "Voedingssupplementen",
            "synoniemen": [
              "supplementen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-magnesium",
            "naam": "Magnesium",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-omega-3",
            "naam": "Omega 3",
            "synoniemen": [
              "visolie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-probiotica",
            "naam": "Probiotica",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-medische-hulpmiddelen",
        "naam": "Medische hulpmiddelen",
        "items": [
          {
            "id": "i-x-krukken",
            "naam": "Krukken",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-steunzolen",
            "naam": "Steunzolen",
            "synoniemen": [
              "zolen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-braces-en-verbanden",
            "naam": "Braces en verbanden",
            "synoniemen": [
              "polsbrace",
              "kniebrace"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gehoorbescherming",
            "naam": "Gehoorbescherming",
            "synoniemen": [
              "oordoppen"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-alternatieve-zorg",
        "naam": "Alternatieve zorg",
        "items": [
          {
            "id": "i-x-acupunctuur",
            "naam": "Acupunctuur",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-homeopathie",
            "naam": "Homeopathie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-voetreflexologie",
            "naam": "Voetreflexologie",
            "synoniemen": [
              "reflexologie"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-kinderen-en-gezin",
    "naam": "Kinderen en Gezin",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#C1502E",
    "icoon": "👨‍👩‍👧‍👦",
    "categorieen": [
      {
        "id": "cat-kinderen-school",
        "naam": "Kinderen school",
        "items": [
          {
            "id": "i-schoolfactuur-jasper-95",
            "naam": "Schoolfactuur Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoolfactuur-hanne-6123",
            "naam": "Schoolfactuur Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoolfactuur-milo-9966",
            "naam": "Schoolfactuur Kind 3",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoolboeken-jasper-46",
            "naam": "Schoolboeken Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoolboeken-hanne-3901",
            "naam": "Schoolboeken Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoolboeken-milo-8693",
            "naam": "Schoolboeken Kind 3",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-laptop-jasper-185",
            "naam": "Laptop Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-laptop-hanne-4647",
            "naam": "Laptop Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-laptop-milo-8590",
            "naam": "Laptop Kind 3",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoolmateriaal-3503",
            "naam": "Schoolmateriaal",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-boekentassen-6177",
            "naam": "Boekentassen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zakgeld-uitstappen-lunchgeld-8341",
            "naam": "Zakgeld uitstappen/lunchgeld",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schooluitstappen-jasper-6697",
            "naam": "Schooluitstappen Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schooluitstappen-hanne-9401",
            "naam": "Schooluitstappen Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schooluitstappen-milo-4464",
            "naam": "Schooluitstappen Kind 3",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-kinderen-kleding",
        "naam": "Kinderen Kleding",
        "items": [
          {
            "id": "i-kleding-jasper-9943",
            "naam": "Kleding Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kleding-hanne-1781",
            "naam": "Kleding Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kleding-milo-1004",
            "naam": "Kleding Kind 3",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoenen-jasper-3772",
            "naam": "Schoenen Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoenen-hanne-9312",
            "naam": "Schoenen Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schoenen-milo-6932",
            "naam": "Schoenen Kind 3",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-kinderen-hobby",
        "naam": "Kinderen Hobby",
        "items": [
          {
            "id": "i-hobbykosten-jasper-5011",
            "naam": "Hobbykosten Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-hobbykosten-hanne-4644",
            "naam": "Hobbykosten Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-hobbykosten-milo-2946",
            "naam": "Hobbykosten Kind 3",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-kinderen-varia",
        "naam": "Kinderen Varia",
        "items": [
          {
            "id": "i-zakgeld-jasper-9805",
            "naam": "Zakgeld Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zakgeld-hanne-6347",
            "naam": "Zakgeld Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zakgeld-milo-4328",
            "naam": "Zakgeld Kind 3",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-verjaardagscadeaus-vrienden-2118",
            "naam": "Verjaardagscadeaus vrienden",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-verjaardag-jasper-4240",
            "naam": "Verjaardag Kind 1",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-verjaardag-hanne-9130",
            "naam": "Verjaardag Kind 2",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-verjaardag-milo-7195",
            "naam": "Verjaardag Kind 3",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-baby-en-peuter",
        "naam": "Baby en peuter",
        "items": [
          {
            "id": "i-x-luiers",
            "naam": "Luiers",
            "synoniemen": [
              "pampers"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-billendoekjes",
            "naam": "Billendoekjes",
            "synoniemen": [
              "vochtige doekjes"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-flesvoeding",
            "naam": "Flesvoeding",
            "synoniemen": [
              "melkpoeder"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-babyvoeding-potjes",
            "naam": "Babyvoeding potjes",
            "synoniemen": [
              "fruitpap",
              "groentepap"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-fopspenen",
            "naam": "Fopspenen",
            "synoniemen": [
              "tut",
              "tutje"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zuigflessen",
            "naam": "Zuigflessen",
            "synoniemen": [
              "papfles"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-kinderwagen",
            "naam": "Kinderwagen",
            "synoniemen": [
              "buggy"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-babyfoon",
            "naam": "Babyfoon",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-autostoel-kind",
            "naam": "Autostoel kind",
            "synoniemen": [
              "maxi-cosi"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-babykleding",
            "naam": "Babykleding",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-verzorging-baby",
            "naam": "Verzorging baby",
            "synoniemen": [
              "babyolie",
              "zinkzalf"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-kampen-en-uitstappen",
        "naam": "Kampen en uitstappen",
        "items": [
          {
            "id": "i-x-jeugdkamp",
            "naam": "Jeugdkamp",
            "synoniemen": [
              "chirokamp",
              "scoutskamp"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-speelpleinwerking",
            "naam": "Speelpleinwerking",
            "synoniemen": [
              "speelplein"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sportkamp",
            "naam": "Sportkamp",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-schooluitstap",
            "naam": "Schooluitstap",
            "synoniemen": [
              "schoolreis"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-pretpark-gezin",
            "naam": "Pretpark gezin",
            "synoniemen": [
              "plopsaland",
              "bellewaerde",
              "efteling"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-dierentuin",
            "naam": "Dierentuin",
            "synoniemen": [
              "zoo",
              "pairi daiza"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-zakgeld-en-sparen-kind",
        "naam": "Zakgeld en sparen kind",
        "items": [
          {
            "id": "i-x-zakgeld",
            "naam": "Zakgeld",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-spaargeld-kind",
            "naam": "Spaargeld kind",
            "synoniemen": [
              "spaarrekening kind"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-hoger-onderwijs",
        "naam": "Hoger onderwijs",
        "items": [
          {
            "id": "i-x-kothuur",
            "naam": "Kothuur",
            "synoniemen": [
              "kot",
              "studentenkamer"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-inschrijvingsgeld-hogeschool-of-unief",
            "naam": "Inschrijvingsgeld hogeschool of unief",
            "synoniemen": [
              "studiegeld"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-cursusmateriaal",
            "naam": "Cursusmateriaal",
            "synoniemen": [
              "cursussen",
              "handboeken"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-studentenrestaurant",
            "naam": "Studentenrestaurant",
            "synoniemen": [
              "resto"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-studentenvereniging",
            "naam": "Studentenvereniging",
            "synoniemen": [
              "lidgeld club"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-woning-en-vaste-lasten",
    "naam": "Woning en vaste lasten",
    "hoofdtype": "Vaste Uitgaven",
    "kleur": "#96588A",
    "icoon": "🏠",
    "categorieen": [
      {
        "id": "cat-abonnementen-en-multimedia",
        "naam": "Abonnementen en multimedia",
        "items": [
          {
            "id": "i-leasingkosten-gsm--cafetariapl-9339",
            "naam": "Leasingkosten GSM (cafetariaplan)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-leasingkosten-ipad--cafetariap-2206",
            "naam": "Leasingkosten Ipad (cafetariaplan)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-leasingkosten-laptop--cafetari-1683",
            "naam": "Leasingkosten laptop (cafetariaplan)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-internet--tv---gsm-4253",
            "naam": "Internet, TV & GSM",
            "synoniemen": [
              "telecom",
              "telenet",
              "proximus",
              "orange",
              "wifi"
            ],
            "eenheid": null
          },
          {
            "id": "i-streaming-video-5157",
            "naam": "Streaming Video",
            "synoniemen": [
              "netflix",
              "disney plus",
              "videoland"
            ],
            "eenheid": null
          },
          {
            "id": "i-streaming-video-aankopen-5539",
            "naam": "Streaming Video aankopen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-gaming-aankopen-7263",
            "naam": "Gaming aankopen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-gaming-abonnementen-126",
            "naam": "Gaming abonnementen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-software-en-licenties-1950",
            "naam": "Software en licenties",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-krant-en-nieuws-abonnement-1659",
            "naam": "Krant en nieuws abonnement",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-cloudopslag--icloud-google-dri-9335",
            "naam": "Cloudopslag (iCloud/Google Drive)",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-huisvesting",
        "naam": "Huisvesting",
        "items": [
          {
            "id": "i-huur-4062",
            "naam": "Huur",
            "synoniemen": [
              "huurgeld",
              "rent",
              "huurgeld",
              "rent",
              "huishuur"
            ],
            "eenheid": null
          },
          {
            "id": "i-hypotheek-8607",
            "naam": "Hypotheek",
            "synoniemen": [
              "lening woning",
              "krediet woning",
              "lening woning",
              "krediet woning",
              "woonkrediet"
            ],
            "eenheid": null
          },
          {
            "id": "i-onroerende-voorheffing-1420",
            "naam": "Onroerende voorheffing",
            "synoniemen": [
              "kadastraal inkomen",
              "KI"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-energie-en-nutsvoorzieningen",
        "naam": "Energie en nutsvoorzieningen",
        "items": [
          {
            "id": "i-elektriciteit-gas-voorschotten-7574",
            "naam": "Elektriciteit/Gas voorschotten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-elektriciteit-gas-jaarafrekeni-14",
            "naam": "Elektriciteit/Gas jaarafrekening",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-water-voorschotten-8977",
            "naam": "Water voorschotten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-water-jaarafrekening-9197",
            "naam": "Water jaarafrekening",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-stookolie---pellets---hout-3303",
            "naam": "Stookolie / Pellets / Hout",
            "synoniemen": [],
            "eenheid": "L"
          }
        ]
      },
      {
        "id": "cat-verzekeringen",
        "naam": "Verzekeringen",
        "items": [
          {
            "id": "i-brand-en-familiale-verzekering-2328",
            "naam": "Brand en Familiale verzekering",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-schuldsaldoverzekering-6890",
            "naam": "Schuldsaldoverzekering",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-rechtsbijstand-8519",
            "naam": "Rechtsbijstand",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-hospitalisatieverzekering-prem-4163",
            "naam": "Hospitalisatieverzekering premie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-levensverzekering-5771",
            "naam": "Levensverzekering",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-reisverzekering-1791",
            "naam": "Reisverzekering",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-onderhoud-en-inrichting",
        "naam": "Onderhoud en inrichting",
        "items": [
          {
            "id": "i-klusmateriaal-7597",
            "naam": "Klusmateriaal",
            "synoniemen": [
              "gereedschap",
              "doe-het-zelf",
              "bouwmarkt",
              "hubo",
              "gamma",
              "brico"
            ],
            "eenheid": null
          },
          {
            "id": "i-meubels-8685",
            "naam": "Meubels",
            "synoniemen": [
              "meubilair",
              "ikea",
              "interieur"
            ],
            "eenheid": null
          },
          {
            "id": "i-decoratie-360",
            "naam": "Decoratie",
            "synoniemen": [
              "deco",
              "interieurdecoratie"
            ],
            "eenheid": null
          },
          {
            "id": "i-verplichte-keuringen-2406",
            "naam": "Verplichte keuringen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-huishoudelijke-apparaten-4304",
            "naam": "Huishoudelijke apparaten",
            "synoniemen": [
              "wasmachine",
              "droogkast",
              "koelkast",
              "frigo",
              "gsm-toestel nee",
              "toestellen"
            ],
            "eenheid": null
          },
          {
            "id": "i-tuinmateriaal-en-planten-7296",
            "naam": "Tuinmateriaal en planten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tuinmeubelen-6621",
            "naam": "Tuinmeubelen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-bankkosten",
        "naam": "Bankkosten",
        "items": [
          {
            "id": "i-bijdrage-zichtrekening-9225",
            "naam": "Bijdrage Zichtrekening",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-interesten-zichtrekening-712",
            "naam": "Interesten Zichtrekening",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-roerende-voorheffing-4087",
            "naam": "Roerende voorheffing",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-meerwaardebelasting-9532",
            "naam": "Meerwaardebelasting",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-taks-op-beursverrichtingen-2249",
            "naam": "Taks op Beursverrichtingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-bewaarloon-en-beheerskosten-4572",
            "naam": "Bewaarloon en beheerskosten",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-kredieten",
        "naam": "Kredieten",
        "items": [
          {
            "id": "i-budgetline-455",
            "naam": "Budgetline",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-budgetkrediet-hoofdrekening-7947",
            "naam": "Budgetkrediet Hoofdrekening",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-budgetkrediet-kindrekening-8933",
            "naam": "Budgetkrediet Kindrekening",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aflossingsplan-belastingen-1034",
            "naam": "Aflossingsplan Belastingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aflossingsplan-elektriciteit-g-7906",
            "naam": "Aflossingsplan Elektriciteit/Gas",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aflossingsplan-water-3159",
            "naam": "Aflossingsplan Water",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-tuin-en-terras",
        "naam": "Tuin en terras",
        "items": [
          {
            "id": "i-x-planten-en-bloemen",
            "naam": "Planten en bloemen",
            "synoniemen": [
              "tuinplanten",
              "bloemen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zaden-en-bollen",
            "naam": "Zaden en bollen",
            "synoniemen": [
              "bloembollen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-potgrond",
            "naam": "Potgrond",
            "synoniemen": [
              "compost",
              "aarde"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tuingereedschap",
            "naam": "Tuingereedschap",
            "synoniemen": [
              "snoeischaar",
              "hark"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-grasmaaier",
            "naam": "Grasmaaier",
            "synoniemen": [
              "robotmaaier"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tuinaannemer",
            "naam": "Tuinaannemer",
            "synoniemen": [
              "tuinman",
              "tuinonderhoud"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-barbecue",
            "naam": "Barbecue",
            "synoniemen": [
              "bbq"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-parasol",
            "naam": "Parasol",
            "synoniemen": [
              "zonnescherm"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-snoeiwerk",
            "naam": "Snoeiwerk",
            "synoniemen": [
              "boomverzorging"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-klussen-en-materiaal",
        "naam": "Klussen en materiaal",
        "items": [
          {
            "id": "i-x-verf-en-lak",
            "naam": "Verf en lak",
            "synoniemen": [
              "verf",
              "muurverf"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-behang",
            "naam": "Behang",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-gereedschap",
            "naam": "Gereedschap",
            "synoniemen": [
              "boormachine",
              "schroevendraaier"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-bouwmaterialen",
            "naam": "Bouwmaterialen",
            "synoniemen": [
              "cement",
              "gyproc"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-schroeven-en-bevestiging",
            "naam": "Schroeven en bevestiging",
            "synoniemen": [
              "pluggen",
              "nagels"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-elektriciteitsmateriaal",
            "naam": "Elektriciteitsmateriaal",
            "synoniemen": [
              "stopcontact",
              "kabels"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sanitair-materiaal",
            "naam": "Sanitair materiaal",
            "synoniemen": [
              "kraan",
              "leidingen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-hout",
            "naam": "Hout",
            "synoniemen": [
              "planken",
              "multiplex"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-huur-machines",
            "naam": "Huur machines",
            "synoniemen": [
              "machineverhuur"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-duurzaam-wonen",
        "naam": "Duurzaam wonen",
        "items": [
          {
            "id": "i-x-zonnepanelen",
            "naam": "Zonnepanelen",
            "synoniemen": [
              "pv-installatie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-thuisbatterij",
            "naam": "Thuisbatterij",
            "synoniemen": [
              "batterij"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-warmtepomp",
            "naam": "Warmtepomp",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-isolatiewerken",
            "naam": "Isolatiewerken",
            "synoniemen": [
              "isolatie",
              "dakisolatie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-laadpaal-installatie",
            "naam": "Laadpaal installatie",
            "synoniemen": [
              "laadpaal"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-energieaudit",
            "naam": "Energieaudit",
            "synoniemen": [
              "epc",
              "energiescan"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-regenwaterput",
            "naam": "Regenwaterput",
            "synoniemen": [
              "regenwater"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zonwering",
            "naam": "Zonwering",
            "synoniemen": [
              "screens",
              "rolluiken"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-beveiliging",
        "naam": "Beveiliging",
        "items": [
          {
            "id": "i-x-alarmsysteem",
            "naam": "Alarmsysteem",
            "synoniemen": [
              "alarm"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-camerabewaking",
            "naam": "Camerabewaking",
            "synoniemen": [
              "bewakingscamera"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-slotenmaker",
            "naam": "Slotenmaker",
            "synoniemen": [
              "slotenmakerij"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-rookmelders",
            "naam": "Rookmelders",
            "synoniemen": [
              "rookdetector"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-brandblusser",
            "naam": "Brandblusser",
            "synoniemen": [
              "branddeken"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-afval-en-milieu",
        "naam": "Afval en milieu",
        "items": [
          {
            "id": "i-x-vuilniszakken-gemeente",
            "naam": "Vuilniszakken gemeente",
            "synoniemen": [
              "restafvalzakken",
              "pmd-zakken"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-containerpark",
            "naam": "Containerpark",
            "synoniemen": [
              "recyclagepark"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ophaling-grofvuil",
            "naam": "Ophaling grofvuil",
            "synoniemen": [
              "grofvuil"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gft-container",
            "naam": "GFT-container",
            "synoniemen": [
              "gft"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-verhuis-en-opslag",
        "naam": "Verhuis en opslag",
        "items": [
          {
            "id": "i-x-verhuisfirma",
            "naam": "Verhuisfirma",
            "synoniemen": [
              "verhuizers"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-opslagruimte",
            "naam": "Opslagruimte",
            "synoniemen": [
              "self storage",
              "box"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-verhuisdozen",
            "naam": "Verhuisdozen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-vervoer-en-mobiliteit",
    "naam": "Vervoer en Mobiliteit",
    "hoofdtype": "Vaste Uitgaven",
    "kleur": "#3E7C7B",
    "icoon": "🚗",
    "categorieen": [
      {
        "id": "cat-auto",
        "naam": "Auto",
        "items": [
          {
            "id": "i-leasingkosten-wagen--cafetaria-697",
            "naam": "Leasingkosten wagen (cafetariaplan)",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-brandstof-2808",
            "naam": "Brandstof",
            "synoniemen": [
              "benzine",
              "diesel",
              "tanken",
              "fuel",
              "benzine",
              "diesel",
              "tanken",
              "fuel",
              "lpg"
            ],
            "eenheid": "L"
          },
          {
            "id": "i-elektriciteit-5578",
            "naam": "Elektriciteit",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-autoverzekering-8001",
            "naam": "Autoverzekering",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-verkeersbelasting-2649",
            "naam": "Verkeersbelasting",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-biv-8646",
            "naam": "BIV",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-groot-onderhoud-4205",
            "naam": "Groot onderhoud",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-klein-onderhoud-4917",
            "naam": "Klein onderhoud",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-banden-en-bandenwissel-7465",
            "naam": "Banden en bandenwissel",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-autokeuring-2314",
            "naam": "Autokeuring",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-carwash-456",
            "naam": "Carwash",
            "synoniemen": [
              "autowas",
              "wasstraat"
            ],
            "eenheid": "L"
          },
          {
            "id": "i-parkeerkosten-8857",
            "naam": "Parkeerkosten",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-tol-7737",
            "naam": "Tol",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-pechverhelping-3394",
            "naam": "Pechverhelping",
            "synoniemen": [],
            "eenheid": "L"
          },
          {
            "id": "i-aankoop---afbetaling-wagen-8108",
            "naam": "Aankoop / afbetaling wagen",
            "synoniemen": [
              "autolening",
              "nieuwe wagen",
              "tweedehands auto"
            ],
            "eenheid": "L"
          }
        ]
      },
      {
        "id": "cat-openbaar-vervoer",
        "naam": "Openbaar Vervoer",
        "items": [
          {
            "id": "i-treintickets-en-abonnementen-6220",
            "naam": "Treintickets en abonnementen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-de-lijn-6666",
            "naam": "De Lijn",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-deelfietsen---e-steps-7237",
            "naam": "Deelfietsen & e-steps",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-fietsen-en-andere-vervoermidde",
        "naam": "Fietsen en andere vervoermiddelen",
        "items": [
          {
            "id": "i-leasingkosten-fiets--cafetaria-5911",
            "naam": "Leasingkosten fiets (cafetariaplan)",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-aankoop-fietsen-en-steps-2035",
            "naam": "Aankoop Fietsen en steps",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-onderhouden-en-herstellingen-9154",
            "naam": "Onderhouden en herstellingen",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-accessoires-en-kleding-5256",
            "naam": "Accessoires en kleding",
            "synoniemen": [],
            "eenheid": "stuks"
          },
          {
            "id": "i-fietsverzekering-3864",
            "naam": "Fietsverzekering",
            "synoniemen": [],
            "eenheid": "stuks"
          }
        ]
      },
      {
        "id": "cat-x-elektrisch-laden",
        "naam": "Elektrisch laden",
        "items": [
          {
            "id": "i-x-laadpas",
            "naam": "Laadpas",
            "synoniemen": [
              "laadkaart"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-publiek-laden",
            "naam": "Publiek laden",
            "synoniemen": [
              "laadstation"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-snelladen",
            "naam": "Snelladen",
            "synoniemen": [
              "fastned",
              "ionity"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-thuis-laden",
            "naam": "Thuis laden",
            "synoniemen": [
              "laadpaal verbruik"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-deelmobiliteit-en-taxi",
        "naam": "Deelmobiliteit en taxi",
        "items": [
          {
            "id": "i-x-taxi",
            "naam": "Taxi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-uber",
            "naam": "Uber",
            "synoniemen": [
              "bolt"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-deelauto",
            "naam": "Deelauto",
            "synoniemen": [
              "cambio",
              "poppy"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-deelfiets",
            "naam": "Deelfiets",
            "synoniemen": [
              "blue-bike",
              "velo"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-deelstep",
            "naam": "Deelstep",
            "synoniemen": [
              "lime",
              "dott"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-autoverhuur",
            "naam": "Autoverhuur",
            "synoniemen": [
              "huurauto"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-moto-en-brommer",
        "naam": "Moto en brommer",
        "items": [
          {
            "id": "i-x-moto-onderhoud",
            "naam": "Moto onderhoud",
            "synoniemen": [
              "motorfiets"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-motokledij",
            "naam": "Motokledij",
            "synoniemen": [
              "motorpak"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-motorhelm",
            "naam": "Motorhelm",
            "synoniemen": [
              "helm"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-brommer-onderhoud",
            "naam": "Brommer onderhoud",
            "synoniemen": [
              "scooter"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-parkeren-en-heffingen",
        "naam": "Parkeren en heffingen",
        "items": [
          {
            "id": "i-x-parkeergarage",
            "naam": "Parkeergarage",
            "synoniemen": [
              "parking"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-parkeermeter",
            "naam": "Parkeermeter",
            "synoniemen": [
              "parkeerapp",
              "4411"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tolwegen",
            "naam": "Tolwegen",
            "synoniemen": [
              "tol",
              "péage"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-vignetten",
            "naam": "Vignetten",
            "synoniemen": [
              "vignet"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-lez-heffing",
            "naam": "LEZ-heffing",
            "synoniemen": [
              "lage-emissiezone"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-vrije-tijd-en-lifestyle",
    "naam": "Vrije Tijd en Lifestyle",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#3F8A58",
    "icoon": "🎭",
    "categorieen": [
      {
        "id": "cat-ontspanning",
        "naam": "Ontspanning",
        "items": [
          {
            "id": "i-horeca-9295",
            "naam": "Horeca",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-cultuur--cinema--theater-772",
            "naam": "Cultuur, Cinema, Theater",
            "synoniemen": [
              "bioscoop",
              "film",
              "concert",
              "museum"
            ],
            "eenheid": null
          },
          {
            "id": "i-hobby-6407",
            "naam": "Hobby",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sport-2474",
            "naam": "Sport",
            "synoniemen": [
              "sportclub",
              "lidgeld sport",
              "voetbal",
              "tennis"
            ],
            "eenheid": null
          },
          {
            "id": "i-wellness-1508",
            "naam": "Wellness",
            "synoniemen": [
              "spa",
              "massage"
            ],
            "eenheid": null
          },
          {
            "id": "i-boeken-474",
            "naam": "Boeken",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-strips-5896",
            "naam": "Strips",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dvd-s-en-blu-ray-s-2860",
            "naam": "DVD's en Blu Ray's",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tijdschriften-8700",
            "naam": "Tijdschriften",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-events-1651",
            "naam": "Events",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-loterij-en-kansspelen-1291",
            "naam": "Loterij en kansspelen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-fitnessabonnement-3929",
            "naam": "Fitnessabonnement",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-cadeaus-en-feest",
        "naam": "Cadeaus en feest",
        "items": [
          {
            "id": "i-verjaardagen--gezin-en-familie-1426",
            "naam": "Verjaardagen (Gezin en familie)",
            "synoniemen": [
              "verjaardag",
              "jarig"
            ],
            "eenheid": null
          },
          {
            "id": "i-cadeaus-vrienden-en-gelegenhed-9970",
            "naam": "Cadeaus vrienden en gelegenheden",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kerst-en-nieuwjaar-8781",
            "naam": "Kerst en nieuwjaar",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-feestinrichting-7310",
            "naam": "Feestinrichting",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tractaties-6514",
            "naam": "Tractaties",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-giften-aan-goede-doelen-3720",
            "naam": "Giften aan goede doelen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-vakantie-en-reizen",
        "naam": "Vakantie en reizen",
        "items": [
          {
            "id": "i-boeking-vliegtuig-1519",
            "naam": "Boeking Vliegtuig",
            "synoniemen": [
              "vliegtickets",
              "vliegtuigticket",
              "ryanair",
              "brussels airlines"
            ],
            "eenheid": null
          },
          {
            "id": "i-boeking-trein-1150",
            "naam": "Boeking Trein",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-boeking-bus-274",
            "naam": "Boeking Bus",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-boeking-taxi-8777",
            "naam": "Boeking Taxi",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-boeking-hotel-5322",
            "naam": "Boeking Hotel",
            "synoniemen": [
              "overnachting",
              "booking.com",
              "airbnb"
            ],
            "eenheid": null
          },
          {
            "id": "i-uitgaven-op-reis-varia-9082",
            "naam": "Uitgaven op Reis varia",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pretparken-29",
            "naam": "Pretparken",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-daguitstappen-8327",
            "naam": "Daguitstappen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-reisverzekering",
            "naam": "Reisverzekering",
            "synoniemen": [
              "annulatieverzekering"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-visum-en-reisdocumenten",
            "naam": "Visum en reisdocumenten",
            "synoniemen": [
              "visum",
              "esta"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-huurauto-vakantie",
            "naam": "Huurauto vakantie",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-camping",
            "naam": "Camping",
            "synoniemen": [
              "campingplaats"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-skipas",
            "naam": "Skipas",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-excursies",
            "naam": "Excursies",
            "synoniemen": [
              "uitstap ter plaatse",
              "tour"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-reisgids",
            "naam": "Reisgids",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-bagage",
            "naam": "Bagage",
            "synoniemen": [
              "koffer",
              "reistas"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-sport-en-fitness",
        "naam": "Sport en fitness",
        "items": [
          {
            "id": "i-x-sportclub-lidgeld",
            "naam": "Sportclub lidgeld",
            "synoniemen": [
              "voetbalclub",
              "volleybalclub"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-padel",
            "naam": "Padel",
            "synoniemen": [
              "padelterrein"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tennis",
            "naam": "Tennis",
            "synoniemen": [
              "tennisles"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-zwembad",
            "naam": "Zwembad",
            "synoniemen": [
              "zwemles",
              "zwembeurt"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-yogales",
            "naam": "Yogales",
            "synoniemen": [
              "yoga",
              "pilates"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-personal-trainer",
            "naam": "Personal trainer",
            "synoniemen": [
              "pt-sessie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-wedstrijdinschrijving",
            "naam": "Wedstrijdinschrijving",
            "synoniemen": [
              "loopwedstrijd",
              "10 miles"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sportmateriaal",
            "naam": "Sportmateriaal",
            "synoniemen": [
              "fitnessmateriaal",
              "halters"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-skiles",
            "naam": "Skiles",
            "synoniemen": [
              "skipas les"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-klimzaal",
            "naam": "Klimzaal",
            "synoniemen": [
              "boulderen"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-cultuur-en-uitgaan",
        "naam": "Cultuur en uitgaan",
        "items": [
          {
            "id": "i-x-bioscoop",
            "naam": "Bioscoop",
            "synoniemen": [
              "cinema",
              "kinepolis"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-theater",
            "naam": "Theater",
            "synoniemen": [
              "toneel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-concert",
            "naam": "Concert",
            "synoniemen": [
              "optreden"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-festival",
            "naam": "Festival",
            "synoniemen": [
              "festivalticket"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-museum",
            "naam": "Museum",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-tentoonstelling",
            "naam": "Tentoonstelling",
            "synoniemen": [
              "expo"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-stand-upcomedy",
            "naam": "Stand-upcomedy",
            "synoniemen": [
              "comedy"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-bowling",
            "naam": "Bowling",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-escape-room",
            "naam": "Escape room",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-nachtleven",
            "naam": "Nachtleven",
            "synoniemen": [
              "club",
              "discotheek"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-hobby-en-creatief",
        "naam": "Hobby en creatief",
        "items": [
          {
            "id": "i-x-muziekinstrument",
            "naam": "Muziekinstrument",
            "synoniemen": [
              "gitaar",
              "piano"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-muzieklessen",
            "naam": "Muzieklessen",
            "synoniemen": [
              "muziekschool"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-fotografie",
            "naam": "Fotografie",
            "synoniemen": [
              "camera",
              "lens"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-knutselmateriaal",
            "naam": "Knutselmateriaal",
            "synoniemen": [
              "knutselen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-naaimachine-en-stof",
            "naam": "Naaimachine en stof",
            "synoniemen": [
              "naaien",
              "stoffen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-tekenmateriaal",
            "naam": "Tekenmateriaal",
            "synoniemen": [
              "schildermateriaal",
              "verf hobby"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-modelbouw",
            "naam": "Modelbouw",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-lego",
            "naam": "LEGO",
            "synoniemen": [
              "duplo"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-puzzels",
            "naam": "Puzzels",
            "synoniemen": [
              "puzzel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-bordspellen",
            "naam": "Bordspellen",
            "synoniemen": [
              "gezelschapsspel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-handwerk-en-breien",
            "naam": "Handwerk en breien",
            "synoniemen": [
              "breigaren",
              "haken"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-gamen",
        "naam": "Gamen",
        "items": [
          {
            "id": "i-x-videogames",
            "naam": "Videogames",
            "synoniemen": [
              "playstation game",
              "nintendo game"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gameconsole",
            "naam": "Gameconsole",
            "synoniemen": [
              "playstation",
              "xbox",
              "switch"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-game-abonnement",
            "naam": "Game-abonnement",
            "synoniemen": [
              "game pass",
              "ps plus"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-in-game-aankopen",
            "naam": "In-game aankopen",
            "synoniemen": [
              "v-bucks",
              "skins"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-gaming-accessoires",
            "naam": "Gaming accessoires",
            "synoniemen": [
              "controller",
              "headset"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-boeken-en-media",
        "naam": "Boeken en media",
        "items": [
          {
            "id": "i-x-e-books",
            "naam": "E-books",
            "synoniemen": [
              "kobo",
              "kindle"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-luisterboeken",
            "naam": "Luisterboeken",
            "synoniemen": [
              "audiobook",
              "storytel"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-krantenabonnement",
            "naam": "Krantenabonnement",
            "synoniemen": [
              "krant"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-loterij-en-kansspelen",
        "naam": "Loterij en kansspelen",
        "items": [
          {
            "id": "i-x-lotto",
            "naam": "Lotto",
            "synoniemen": [
              "euromillions"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-krasbiljetten",
            "naam": "Krasbiljetten",
            "synoniemen": [
              "krasloten",
              "win for life"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sportweddenschappen",
            "naam": "Sportweddenschappen",
            "synoniemen": [
              "betting"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-inkomsten",
    "naam": "Inkomsten",
    "hoofdtype": "Inkomsten",
    "kleur": "#3F8A58",
    "icoon": "💵",
    "categorieen": [
      {
        "id": "cat-beroepsinkomen",
        "naam": "Beroepsinkomen",
        "items": [
          {
            "id": "i-vast-loon--netto-4025",
            "naam": "Vast Loon (netto)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-variabele-verloning-3012",
            "naam": "Variabele verloning",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-cafetariaplan-en-voordelen",
        "naam": "Cafetariaplan en Voordelen",
        "items": [
          {
            "id": "i-cafetariaplan-budget-1351",
            "naam": "Cafetariaplan budget",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tank-laadkaart-5112",
            "naam": "Tank/Laadkaart",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-schenkingen-en-extra-s",
        "naam": "Schenkingen en Extra's",
        "items": [
          {
            "id": "i-familiale-steun-mama-en-papa-1282",
            "naam": "Familiale steun mama en papa",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-onvoorziene-meevallers-931",
            "naam": "Onvoorziene meevallers",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-rendement-en-vermogen",
        "naam": "Rendement en Vermogen",
        "items": [
          {
            "id": "i-spaarrekening-interesten-308",
            "naam": "Spaarrekening interesten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dividenden-1629",
            "naam": "Dividenden",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-gerealiseerde-meerwaarden-6260",
            "naam": "Gerealiseerde Meerwaarden",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-aankoop-beleggingen-5427",
            "naam": "Aankoop Beleggingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-verkoop-beleggingen-9831",
            "naam": "Verkoop Beleggingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-kapitaalverhogingen-2634",
            "naam": "Kapitaalverhogingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-pensioensparen-6807",
            "naam": "Pensioensparen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-langetermijnsparen-3706",
            "naam": "Langetermijnsparen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-buffer-persoonlijk-7888",
            "naam": "Buffer persoonlijk",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-buffer-kinderen-9338",
            "naam": "Buffer kinderen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-invest-persoonlijk-3628",
            "naam": "Invest persoonlijk",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-terugbetalingen",
        "naam": "Terugbetalingen",
        "items": [
          {
            "id": "i-x-terugbetaling-mutualiteit",
            "naam": "Terugbetaling mutualiteit",
            "synoniemen": [
              "terugbetaling ziekenfonds"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-belastingteruggave",
            "naam": "Belastingteruggave",
            "synoniemen": [
              "teruggave belastingen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-cashback",
            "naam": "Cashback",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-terugbetaling-onkosten",
            "naam": "Terugbetaling onkosten",
            "synoniemen": [
              "onkostenvergoeding terug"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-waarborg-terug",
            "naam": "Waarborg terug",
            "synoniemen": [
              "huurwaarborg terug"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-statiegeld-terug",
            "naam": "Statiegeld terug",
            "synoniemen": [
              "statiegeld",
              "lege flessen"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-verkoop-en-verhuur",
        "naam": "Verkoop en verhuur",
        "items": [
          {
            "id": "i-x-tweedehands-verkoop",
            "naam": "Tweedehands verkoop",
            "synoniemen": [
              "2dehands",
              "marktplaats"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-vinted-verkoop",
            "naam": "Vinted verkoop",
            "synoniemen": [
              "vinted"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-garageverkoop",
            "naam": "Garageverkoop",
            "synoniemen": [
              "rommelmarkt"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-huurinkomsten",
            "naam": "Huurinkomsten",
            "synoniemen": [
              "huur ontvangen"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-sociale-toelagen",
        "naam": "Sociale toelagen",
        "items": [
          {
            "id": "i-x-groeipakket",
            "naam": "Groeipakket",
            "synoniemen": [
              "kinderbijslag"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-studietoelage",
            "naam": "Studietoelage",
            "synoniemen": [
              "studiebeurs"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-sparen---investeren",
    "naam": "Sparen & Investeren",
    "hoofdtype": "Sparen",
    "kleur": "#3E7C7B",
    "icoon": "💰",
    "categorieen": [
      {
        "id": "cat-schuldaflossing-extra",
        "naam": "Schuldaflossing extra",
        "items": [
          {
            "id": "i-extra-aflossing-lening-2126",
            "naam": "Extra aflossing lening",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-buffer-persoonlijk",
        "naam": "Buffer persoonlijk",
        "items": [
          {
            "id": "i-storting-buffer-persoonlijk-5899",
            "naam": "Storting buffer persoonlijk",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-buffer-kinderen",
        "naam": "Buffer kinderen",
        "items": [
          {
            "id": "i-storting-buffer-kinderen-9841",
            "naam": "Storting buffer kinderen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-invest-persoonlijk",
        "naam": "Invest persoonlijk",
        "items": [
          {
            "id": "i-storting-beleggingsrekening-2890",
            "naam": "Storting beleggingsrekening",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-beleggen",
        "naam": "Beleggen",
        "items": [
          {
            "id": "i-x-aandelen",
            "naam": "Aandelen",
            "synoniemen": [
              "aandeel kopen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-etf-s",
            "naam": "ETF's",
            "synoniemen": [
              "tracker",
              "etf"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-obligaties",
            "naam": "Obligaties",
            "synoniemen": [
              "staatsbon"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-crypto",
            "naam": "Crypto",
            "synoniemen": [
              "bitcoin",
              "ethereum"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-goud-en-edelmetalen",
            "naam": "Goud en edelmetalen",
            "synoniemen": [
              "goud"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-beleggingsfonds",
            "naam": "Beleggingsfonds",
            "synoniemen": [
              "fonds"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-kledij-en-schoenen",
    "naam": "Kledij en Schoenen",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#C97B8B",
    "icoon": "👗",
    "categorieen": [
      {
        "id": "cat-kledij-volwassenen",
        "naam": "Kledij volwassenen",
        "items": [
          {
            "id": "i-bovenkleding-8990",
            "naam": "Bovenkleding",
            "synoniemen": [
              "kleren",
              "kledij",
              "t-shirt",
              "trui",
              "hemd"
            ],
            "eenheid": null
          },
          {
            "id": "i-onderkleding---ondergoed-1325",
            "naam": "Onderkleding / ondergoed",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-nachtkledij-9923",
            "naam": "Nachtkledij",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sportkledij-564",
            "naam": "Sportkledij",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-werkkledij-5966",
            "naam": "Werkkledij",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-winterjas-en-regenkledij-2390",
            "naam": "Winterjas en regenkledij",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-schoenen-volwassenen",
        "naam": "Schoenen volwassenen",
        "items": [
          {
            "id": "i-dagelijkse-schoenen-9466",
            "naam": "Dagelijkse schoenen",
            "synoniemen": [
              "sneakers",
              "casual schoenen"
            ],
            "eenheid": null
          },
          {
            "id": "i-sportschoenen-2486",
            "naam": "Sportschoenen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-feestschoenen-1539",
            "naam": "Feestschoenen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-laarzen-en-winterschoenen-2454",
            "naam": "Laarzen en winterschoenen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-accessoires",
        "naam": "Accessoires",
        "items": [
          {
            "id": "i-tassen-en-rugzakken-6286",
            "naam": "Tassen en rugzakken",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-riemen-en-sjaals-9989",
            "naam": "Riemen en sjaals",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-sieraden-en-horloges-9182",
            "naam": "Sieraden en horloges",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-zonnebrillen-2652",
            "naam": "Zonnebrillen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-sport-en-zwemkledij",
        "naam": "Sport- en zwemkledij",
        "items": [
          {
            "id": "i-x-zwemkledij",
            "naam": "Zwemkledij",
            "synoniemen": [
              "badpak",
              "zwembroek"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-wandelschoenen",
            "naam": "Wandelschoenen",
            "synoniemen": [
              "bergschoenen"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-speciale-gelegenheden",
        "naam": "Speciale gelegenheden",
        "items": [
          {
            "id": "i-x-kostuum",
            "naam": "Kostuum",
            "synoniemen": [
              "maatpak"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-feestkledij",
            "naam": "Feestkledij",
            "synoniemen": [
              "galajurk",
              "avondkledij"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-trouwkledij",
            "naam": "Trouwkledij",
            "synoniemen": [
              "trouwjurk",
              "trouwpak"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-verkleedkledij",
            "naam": "Verkleedkledij",
            "synoniemen": [
              "carnaval",
              "halloween"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-belastingen-en-offici-le-koste",
    "naam": "Belastingen en Officiële Kosten",
    "hoofdtype": "Vaste Uitgaven",
    "kleur": "#83705C",
    "icoon": "📋",
    "categorieen": [
      {
        "id": "cat-personenbelasting",
        "naam": "Personenbelasting",
        "items": [
          {
            "id": "i-aanslagbiljet-personenbelastin-454",
            "naam": "Aanslagbiljet personenbelasting",
            "synoniemen": [
              "belastingbrief",
              "belastingen betalen",
              "fiscus"
            ],
            "eenheid": null
          },
          {
            "id": "i-voorafbetalingen-belastingen-2138",
            "naam": "Voorafbetalingen belastingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-successierechten-2395",
            "naam": "Successierechten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-registratierechten-4289",
            "naam": "Registratierechten",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-andere-taksen-en-boetes",
        "naam": "Andere taksen en boetes",
        "items": [
          {
            "id": "i-gemeentebelasting-4332",
            "naam": "Gemeentebelasting",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-milieutaks-1557",
            "naam": "Milieutaks",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-verkeersboetes-en-gas-boetes-6632",
            "naam": "Verkeersboetes en GAS-boetes",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-leges-en-attesten-7685",
            "naam": "Leges en attesten",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-notaris-en-juridisch-advies",
        "naam": "Notaris en juridisch advies",
        "items": [
          {
            "id": "i-notariskosten-2235",
            "naam": "Notariskosten",
            "synoniemen": [
              "notaris"
            ],
            "eenheid": null
          },
          {
            "id": "i-advocaatkosten-2700",
            "naam": "Advocaatkosten",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-gerechtskosten-6178",
            "naam": "Gerechtskosten",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-documenten-en-retributies",
        "naam": "Documenten en retributies",
        "items": [
          {
            "id": "i-x-identiteitskaart",
            "naam": "Identiteitskaart",
            "synoniemen": [
              "eid"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-reispas",
            "naam": "Reispas",
            "synoniemen": [
              "paspoort"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-rijbewijs",
            "naam": "Rijbewijs",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-attesten-en-uittreksels",
            "naam": "Attesten en uittreksels",
            "synoniemen": [
              "uittreksel",
              "attest gemeente"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-milieuheffing",
            "naam": "Milieuheffing",
            "synoniemen": [
              "milieubelasting"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-huisdieren",
    "naam": "Huisdieren",
    "hoofdtype": "Variabele Uitgaven",
    "kleur": "#92400E",
    "icoon": "🐾",
    "categorieen": [
      {
        "id": "cat-huisdier-verzorging",
        "naam": "Huisdier verzorging",
        "items": [
          {
            "id": "i-hondenvoeding-5777",
            "naam": "Hondenvoeding",
            "synoniemen": [
              "hondenbrokken",
              "hondeneten"
            ],
            "eenheid": null
          },
          {
            "id": "i-kattenvoeding-8979",
            "naam": "Kattenvoeding",
            "synoniemen": [
              "kattenbrokken",
              "kattenkorrels"
            ],
            "eenheid": null
          },
          {
            "id": "i-ander-dierenvoeding-6879",
            "naam": "Ander dierenvoeding",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dierenarts-1590",
            "naam": "Dierenarts",
            "synoniemen": [
              "veearts",
              "dierenkliniek"
            ],
            "eenheid": null
          },
          {
            "id": "i-verzekering-huisdier-5443",
            "naam": "Verzekering huisdier",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-accessoires-en-speelgoed-huisd-7357",
            "naam": "Accessoires en speelgoed huisdier",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-trimsalon-7196",
            "naam": "Trimsalon",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-hondenschool-4649",
            "naam": "Hondenschool",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-dierenoppas---pension-4240",
            "naam": "Dierenoppas / pension",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-diergeneeskunde",
        "naam": "Diergeneeskunde",
        "items": [
          {
            "id": "i-x-vaccinatie-huisdier",
            "naam": "Vaccinatie huisdier",
            "synoniemen": [
              "inenting"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ontworming-en-vlooien",
            "naam": "Ontworming en vlooien",
            "synoniemen": [
              "vlooienband",
              "ontwormingskuur"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sterilisatie-of-castratie",
            "naam": "Sterilisatie of castratie",
            "synoniemen": [
              "sterilisatie",
              "castratie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-dierenverzekering",
            "naam": "Dierenverzekering",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-x-medicatie-huisdier",
            "naam": "Medicatie huisdier",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-opvang-en-training",
        "naam": "Opvang en training",
        "items": [
          {
            "id": "i-x-dierenpension",
            "naam": "Dierenpension",
            "synoniemen": [
              "kattenpension",
              "hondenpension"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-hondenuitlaatdienst",
            "naam": "Hondenuitlaatdienst",
            "synoniemen": [
              "dogwalker"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-hondenbelasting",
            "naam": "Hondenbelasting",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      }
    ]
  },
  {
    "id": "ov-diensten-en-ontwikkeling",
    "naam": "Diensten en Ontwikkeling",
    "hoofdtype": "Vaste Uitgaven",
    "kleur": "#0891B2",
    "icoon": "🛠️",
    "categorieen": [
      {
        "id": "cat-huishoudhulp",
        "naam": "Huishoudhulp",
        "items": [
          {
            "id": "i-dienstencheques-9094",
            "naam": "Dienstencheques",
            "synoniemen": [
              "dienstencheque",
              "poetsvrouw",
              "huishoudhulp cheques"
            ],
            "eenheid": null
          },
          {
            "id": "i-poetshulp-4801",
            "naam": "Poetshulp",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-strijkdienst-9614",
            "naam": "Strijkdienst",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-tuinonderhoud--extern-405",
            "naam": "Tuinonderhoud (extern)",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-kinderopvang",
        "naam": "Kinderopvang",
        "items": [
          {
            "id": "i-cr-che-9817",
            "naam": "Crèche",
            "synoniemen": [
              "kinderdagverblijf",
              "kribbe"
            ],
            "eenheid": null
          },
          {
            "id": "i-onthaalouder-1836",
            "naam": "Onthaalouder",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-babysit-6707",
            "naam": "Babysit",
            "synoniemen": [
              "oppas",
              "kinderoppas"
            ],
            "eenheid": null
          },
          {
            "id": "i-buitenschoolse-opvang-3170",
            "naam": "Buitenschoolse opvang",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-vakantiekampen-1693",
            "naam": "Vakantiekampen",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-vorming-en-opleiding",
        "naam": "Vorming en opleiding",
        "items": [
          {
            "id": "i-cursussen-en-opleidingen-8133",
            "naam": "Cursussen en opleidingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-taalcursussen-1201",
            "naam": "Taalcursussen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-coaching-en-therapie--niet-med-4506",
            "naam": "Coaching en therapie (niet-medisch)",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-boeken-voor-opleiding-3422",
            "naam": "Boeken voor opleiding",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-lidgelden-en-vakliteratuur",
        "naam": "Lidgelden en vakliteratuur",
        "items": [
          {
            "id": "i-vakbond-lidgeld-7932",
            "naam": "Vakbond lidgeld",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-beroepsverenigingen-5215",
            "naam": "Beroepsverenigingen",
            "synoniemen": [],
            "eenheid": null
          },
          {
            "id": "i-abonnementen-vakliteratuur-9762",
            "naam": "Abonnementen vakliteratuur",
            "synoniemen": [],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-digitale-abonnementen",
        "naam": "Digitale abonnementen",
        "items": [
          {
            "id": "i-x-cloudopslag",
            "naam": "Cloudopslag",
            "synoniemen": [
              "icloud",
              "google one",
              "dropbox"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-software-abonnement",
            "naam": "Software-abonnement",
            "synoniemen": [
              "office 365",
              "adobe"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-vpn",
            "naam": "VPN",
            "synoniemen": [
              "nordvpn"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-domeinnaam-en-hosting",
            "naam": "Domeinnaam en hosting",
            "synoniemen": [
              "website hosting"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-ai-assistent-abonnement",
            "naam": "AI-assistent abonnement",
            "synoniemen": [
              "claude",
              "chatgpt",
              "copilot"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-wachtwoordmanager",
            "naam": "Wachtwoordmanager",
            "synoniemen": [
              "1password",
              "bitwarden"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-antivirus",
            "naam": "Antivirus",
            "synoniemen": [
              "norton",
              "mcafee"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-administratie-en-advies",
        "naam": "Administratie en advies",
        "items": [
          {
            "id": "i-x-boekhouder",
            "naam": "Boekhouder",
            "synoniemen": [
              "accountant"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-vakbondsbijdrage",
            "naam": "Vakbondsbijdrage",
            "synoniemen": [
              "vakbond",
              "acv",
              "abvv"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-mutualiteitsbijdrage",
            "naam": "Mutualiteitsbijdrage",
            "synoniemen": [
              "ziekenfonds",
              "cm",
              "bond moyson"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-postzegels-en-verzending",
            "naam": "Postzegels en verzending",
            "synoniemen": [
              "postzegel",
              "bpost",
              "pakje versturen"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-print-en-kopiekosten",
            "naam": "Print- en kopiekosten",
            "synoniemen": [
              "printen",
              "kopie"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-vertaaldienst",
            "naam": "Vertaaldienst",
            "synoniemen": [
              "beëdigde vertaling"
            ],
            "eenheid": null
          }
        ]
      },
      {
        "id": "cat-x-goede-doelen",
        "naam": "Goede doelen",
        "items": [
          {
            "id": "i-x-gift-goed-doel",
            "naam": "Gift goed doel",
            "synoniemen": [
              "donatie",
              "gift"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-sponsoring",
            "naam": "Sponsoring",
            "synoniemen": [
              "sponsortocht"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-collecte",
            "naam": "Collecte",
            "synoniemen": [
              "omhaling"
            ],
            "eenheid": null
          },
          {
            "id": "i-x-peterschap",
            "naam": "Peterschap",
            "synoniemen": [
              "plan international",
              "unicef"
            ],
            "eenheid": null
          }
        ]
      }
    ]
  }
]
