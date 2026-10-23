/**
 * Canonical (pragmatic) PH region → province → city taxonomy for the athlete
 * registration cascade and Discover search.
 *
 * Single source of truth shared by the Next.js/TypeScript app (via the typed
 * re-export in `src/app/lib/locations.ts`) and the dependency-free Node test
 * suite. It is a plain ES module with no React/DOM imports, mirroring
 * `data/regions.mjs`.
 *
 * KEYS: the top-level keys are the canonical `regionCode` values from
 * `data/regions.mjs` (NCR, CAR, Region I–XIII, BARMM, NIR). Each region maps to
 * provinces, and each province maps to a list of cities/municipalities.
 *
 * COVERAGE: this dataset aims to be COMPLETE per province — it lists every
 * city and municipality (LGU) of each province, using the commonly-used LGU
 * name (a "City" suffix is kept only where it disambiguates, e.g. "Cebu City",
 * "Tarlac City"). NCR has no provinces, so it is modeled as a single
 * pseudo-province "Metro Manila" holding its cities. The helpers below sort at
 * read time and do not assume completeness, so adding/removing an LGU here is
 * safe. If a new LGU is created or renamed, update the relevant province list.
 */

/**
 * @typedef {Object.<string, Object.<string, string[]>>} LocationTree
 * regionCode -> { provinceName -> cityName[] }
 */

/** @type {LocationTree} */
export const LOCATIONS = {
  NCR: {
    "Metro Manila": [
      "Manila", "Quezon City", "Caloocan", "Las Piñas", "Makati", "Malabon",
      "Mandaluyong", "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay",
      "Pasig", "San Juan", "Taguig", "Valenzuela", "Pateros",
    ],
  },
  CAR: {
    Abra: [
      "Bangued", "Boliney", "Bucay", "Bucloc", "Daguioman", "Danglas", "Dolores",
      "La Paz", "Lacub", "Lagangilang", "Lagayan", "Langiden", "Licuan-Baay",
      "Luba", "Malibcong", "Manabo", "Peñarrubia", "Pidigan", "Pilar", "Sallapadan",
      "San Isidro", "San Juan", "San Quintin", "Tayum", "Tineg", "Tubo", "Villaviciosa",
    ],
    Apayao: ["Calanasan", "Conner", "Flora", "Kabugao", "Luna", "Pudtol", "Santa Marcela"],
    Benguet: [
      "Baguio", "Atok", "Bakun", "Bokod", "Buguias", "Itogon", "Kabayan",
      "Kapangan", "Kibungan", "La Trinidad", "Mankayan", "Sablan", "Tuba", "Tublay",
    ],
    Ifugao: [
      "Aguinaldo", "Alfonso Lista", "Asipulo", "Banaue", "Hingyon", "Hungduan",
      "Kiangan", "Lagawe", "Lamut", "Mayoyao", "Tinoc",
    ],
    Kalinga: [
      "Tabuk", "Balbalan", "Lubuagan", "Pasil", "Pinukpuk", "Rizal", "Tanudan", "Tinglayan",
    ],
    "Mountain Province": [
      "Barlig", "Bauko", "Besao", "Bontoc", "Natonin", "Paracelis", "Sabangan",
      "Sadanga", "Sagada", "Tadian",
    ],
  },
  "Region I": {
    "Ilocos Norte": [
      "Laoag", "Batac", "Adams", "Bacarra", "Badoc", "Bangui", "Banna", "Burgos",
      "Carasi", "Currimao", "Dingras", "Dumalneg", "Marcos", "Nueva Era", "Pagudpud",
      "Paoay", "Pasuquin", "Piddig", "Pinili", "San Nicolas", "Sarrat", "Solsona", "Vintar",
    ],
    "Ilocos Sur": [
      "Vigan", "Candon", "Alilem", "Banayoyo", "Bantay", "Burgos", "Cabugao",
      "Caoayan", "Cervantes", "Galimuyod", "Gregorio del Pilar", "Lidlidda", "Magsingal",
      "Nagbukel", "Narvacan", "Quirino", "Salcedo", "San Emilio", "San Esteban",
      "San Ildefonso", "San Juan", "San Vicente", "Santa", "Santa Catalina",
      "Santa Cruz", "Santa Lucia", "Santa Maria", "Santiago", "Santo Domingo",
      "Sigay", "Sinait", "Sugpon", "Suyo", "Tagudin",
    ],
    "La Union": [
      "San Fernando", "Agoo", "Aringay", "Bacnotan", "Bagulin", "Balaoan", "Bangar",
      "Bauang", "Burgos", "Caba", "Luna", "Naguilian", "Pugo", "Rosario", "San Gabriel",
      "San Juan", "Santo Tomas", "Santol", "Sudipen", "Tubao",
    ],
    Pangasinan: [
      "Dagupan", "San Carlos", "Urdaneta", "Alaminos", "Agno", "Aguilar", "Alcala",
      "Anda", "Asingan", "Balungao", "Bani", "Basista", "Bautista", "Bayambang",
      "Binalonan", "Binmaley", "Bolinao", "Bugallon", "Burgos", "Calasiao",
      "Dasol", "Infanta", "Labrador", "Laoac", "Lingayen", "Mabini", "Malasiqui",
      "Manaoag", "Mangaldan", "Mangatarem", "Mapandan", "Natividad", "Pozorrubio",
      "Rosales", "San Fabian", "San Jacinto", "San Manuel", "San Nicolas",
      "San Quintin", "Santa Barbara", "Santa Maria", "Santo Tomas", "Sison",
      "Sual", "Tayug", "Umingan", "Urbiztondo", "Villasis",
    ],
  },
  "Region II": {
    Batanes: ["Basco", "Itbayat", "Ivana", "Mahatao", "Sabtang", "Uyugan"],
    Cagayan: [
      "Tuguegarao", "Abulug", "Alcala", "Allacapan", "Amulung", "Aparri", "Baggao",
      "Ballesteros", "Buguey", "Calayan", "Camalaniugan", "Claveria", "Enrile",
      "Gattaran", "Gonzaga", "Iguig", "Lal-lo", "Lasam", "Pamplona", "Peñablanca",
      "Piat", "Rizal", "Sanchez-Mira", "Santa Ana", "Santa Praxedes", "Santa Teresita",
      "Santo Niño", "Solana", "Tuao",
    ],
    Isabela: [
      "Ilagan", "Cauayan", "Santiago", "Alicia", "Angadanan", "Aurora", "Benito Soliven",
      "Burgos", "Cabagan", "Cabatuan", "Cordon", "Delfin Albano", "Dinapigue",
      "Divilacan", "Echague", "Gamu", "Jones", "Luna", "Maconacon", "Mallig",
      "Naguilian", "Palanan", "Quezon", "Quirino", "Ramon", "Reina Mercedes",
      "Roxas", "San Agustin", "San Guillermo", "San Isidro", "San Manuel",
      "San Mariano", "San Mateo", "San Pablo", "Santa Maria", "Santo Tomas", "Tumauini",
    ],
    "Nueva Vizcaya": [
      "Bayombong", "Alfonso Castañeda", "Ambaguio", "Aritao", "Bagabag", "Bambang",
      "Diadi", "Dupax del Norte", "Dupax del Sur", "Kasibu", "Kayapa", "Quezon",
      "Santa Fe", "Solano", "Villaverde",
    ],
    Quirino: ["Cabarroguis", "Aglipay", "Diffun", "Maddela", "Nagtipunan", "Saguday"],
  },
  "Region III": {
    Aurora: [
      "Baler", "Casiguran", "Dilasag", "Dinalungan", "Dingalan", "Dipaculao",
      "Maria Aurora", "San Luis",
    ],
    Bataan: [
      "Balanga", "Abucay", "Bagac", "Dinalupihan", "Hermosa", "Limay", "Mariveles",
      "Morong", "Orani", "Orion", "Pilar", "Samal",
    ],
    Bulacan: [
      "Malolos", "Meycauayan", "San Jose del Monte", "Angat", "Balagtas", "Baliuag",
      "Bocaue", "Bulakan", "Bustos", "Calumpit", "Doña Remedios Trinidad", "Guiguinto",
      "Hagonoy", "Marilao", "Norzagaray", "Obando", "Pandi", "Paombong", "Plaridel",
      "Pulilan", "San Ildefonso", "San Miguel", "San Rafael", "Santa Maria",
    ],
    "Nueva Ecija": [
      "Cabanatuan", "Gapan", "Muñoz", "Palayan", "San Jose", "Aliaga", "Bongabon",
      "Cabiao", "Carranglan", "Cuyapo", "Gabaldon", "General Mamerto Natividad",
      "General Tinio", "Guimba", "Jaen", "Laur", "Licab", "Llanera", "Lupao",
      "Nampicuan", "Pantabangan", "Peñaranda", "Quezon", "Rizal", "San Antonio",
      "San Isidro", "San Leonardo", "Santa Rosa", "Santo Domingo", "Talavera",
      "Talugtug", "Zaragoza",
    ],
    Pampanga: [
      "San Fernando", "Angeles", "Mabalacat", "Apalit", "Arayat", "Bacolor",
      "Candaba", "Floridablanca", "Guagua", "Lubao", "Macabebe", "Magalang",
      "Masantol", "Mexico", "Minalin", "Porac", "San Luis", "San Simon", "Santa Ana",
      "Santa Rita", "Santo Tomas", "Sasmuan",
    ],
    Tarlac: [
      "Tarlac City", "Anao", "Bamban", "Camiling", "Capas", "Concepción", "Gerona",
      "La Paz", "Mayantoc", "Moncada", "Paniqui", "Pura", "Ramos", "San Clemente",
      "San Jose", "San Manuel", "Santa Ignacia", "Victoria",
    ],
    Zambales: [
      "Olongapo", "Iba", "Botolan", "Cabangan", "Candelaria", "Castillejos",
      "Masinloc", "Palauig", "San Antonio", "San Felipe", "San Marcelino",
      "San Narciso", "Santa Cruz", "Subic",
    ],
  },
  "Region IV-A": {
    Batangas: [
      "Batangas City", "Lipa", "Tanauan", "Santo Tomas", "Agoncillo", "Alitagtag",
      "Balayan", "Balete", "Bauan", "Calaca", "Calatagan", "Cuenca", "Ibaan",
      "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", "Mataasnakahoy",
      "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis",
      "San Nicolas", "San Pascual", "Santa Teresita", "Taal", "Talisay", "Taysan",
      "Tingloy", "Tuy",
    ],
    Cavite: [
      "Bacoor", "Imus", "Dasmariñas", "General Trias", "Tagaytay", "Trece Martires",
      "Cavite City", "Alfonso", "Amadeo", "Carmona", "General Mariano Alvarez",
      "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta",
      "Rosario", "Silang", "Tanza", "Ternate",
    ],
    Laguna: [
      "Calamba", "Santa Rosa", "Biñan", "San Pablo", "Cabuyao", "San Pedro",
      "Alaminos", "Bay", "Cavinti", "Famy", "Kalayaan", "Liliw", "Los Baños",
      "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan",
      "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "Santa Cruz",
      "Santa Maria", "Siniloan", "Victoria",
    ],
    Quezon: [
      "Lucena", "Tayabas", "Agdangan", "Alabat", "Atimonan", "Buenavista",
      "Burdeos", "Calauag", "Candelaria", "Catanauan", "Dolores", "General Luna",
      "General Nakar", "Guinayangan", "Gumaca", "Infanta", "Jomalig", "Lopez",
      "Lucban", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao",
      "Panukulan", "Patnanungan", "Perez", "Pitogo", "Plaridel", "Polillo",
      "Quezon", "Real", "Sampaloc", "San Andres", "San Antonio", "San Francisco",
      "San Narciso", "Sariaya", "Tagkawayan", "Tiaong", "Unisan",
    ],
    Rizal: [
      "Antipolo", "Angono", "Baras", "Binangonan", "Cainta", "Cardona", "Jalajala",
      "Morong", "Pililla", "Rodriguez", "San Mateo", "Tanay", "Taytay", "Teresa",
    ],
  },
  "Region IV-B": {
    Marinduque: ["Boac", "Buenavista", "Gasan", "Mogpog", "Santa Cruz", "Torrijos"],
    "Occidental Mindoro": [
      "Mamburao", "Abra de Ilog", "Calintaan", "Looc", "Lubang", "Magsaysay",
      "Paluan", "Rizal", "Sablayan", "San Jose", "Santa Cruz",
    ],
    "Oriental Mindoro": [
      "Calapan", "Baco", "Bansud", "Bongabong", "Bulalacao", "Gloria", "Mansalay",
      "Naujan", "Pinamalayan", "Pola", "Puerto Galera", "Roxas", "San Teodoro",
      "Socorro", "Victoria",
    ],
    Palawan: [
      "Puerto Princesa", "Aborlan", "Agutaya", "Araceli", "Balabac", "Bataraza",
      "Brooke's Point", "Busuanga", "Cagayancillo", "Coron", "Culion", "Cuyo",
      "Dumaran", "El Nido", "Kalayaan", "Linapacan", "Magsaysay", "Narra", "Quezon",
      "Rizal", "Roxas", "San Vicente", "Sofronio Española", "Taytay",
    ],
    Romblon: [
      "Romblon", "Alcantara", "Banton", "Cajidiocan", "Calatrava", "Concepcion",
      "Corcuera", "Ferrol", "Looc", "Magdiwang", "Odiongan", "San Agustin",
      "San Andres", "San Fernando", "San Jose", "Santa Fe", "Santa Maria",
    ],
  },
  "Region V": {
    Albay: [
      "Legazpi", "Ligao", "Tabaco", "Bacacay", "Camalig", "Daraga", "Guinobatan",
      "Jovellar", "Libon", "Malilipot", "Malinao", "Manito", "Oas", "Pio Duran",
      "Polangui", "Rapu-Rapu", "Santo Domingo", "Tiwi",
    ],
    "Camarines Norte": [
      "Daet", "Basud", "Capalonga", "Jose Panganiban", "Labo", "Mercedes",
      "Paracale", "San Lorenzo Ruiz", "San Vicente", "Santa Elena", "Talisay", "Vinzons",
    ],
    "Camarines Sur": [
      "Naga", "Iriga", "Pili", "Baao", "Balatan", "Bato", "Bombon", "Buhi",
      "Bula", "Cabusao", "Calabanga", "Camaligan", "Canaman", "Caramoan", "Del Gallego",
      "Gainza", "Garchitorena", "Goa", "Lagonoy", "Libmanan", "Lupi", "Magarao",
      "Milaor", "Minalabac", "Nabua", "Ocampo", "Pamplona", "Pasacao", "Presentacion",
      "Ragay", "Sagñay", "San Fernando", "San Jose", "Sipocot", "Siruma", "Tigaon", "Tinambac",
    ],
    Catanduanes: [
      "Virac", "Bagamanoc", "Baras", "Bato", "Caramoran", "Gigmoto", "Pandan",
      "Panganiban", "San Andres", "San Miguel", "Viga",
    ],
    Masbate: [
      "Masbate City", "Aroroy", "Baleno", "Balud", "Batuan", "Cataingan", "Cawayan",
      "Claveria", "Dimasalang", "Esperanza", "Mandaon", "Milagros", "Mobo",
      "Monreal", "Palanas", "Pio V. Corpuz", "Placer", "San Fernando", "San Jacinto",
      "San Pascual", "Uson",
    ],
    Sorsogon: [
      "Sorsogon City", "Barcelona", "Bulan", "Bulusan", "Casiguran", "Castilla",
      "Donsol", "Gubat", "Irosin", "Juban", "Magallanes", "Matnog", "Pilar",
      "Prieto Diaz", "Santa Magdalena",
    ],
  },
  "Region VI": {
    Aklan: [
      "Kalibo", "Altavas", "Balete", "Banga", "Batan", "Buruanga", "Ibajay",
      "Lezo", "Libacao", "Madalag", "Makato", "Malay", "Malinao", "Nabas",
      "New Washington", "Numancia", "Tangalan",
    ],
    Antique: [
      "San Jose de Buenavista", "Anini-y", "Barbaza", "Belison", "Bugasong",
      "Caluya", "Culasi", "Hamtic", "Laua-an", "Libertad", "Pandan", "Patnongon",
      "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama",
    ],
    Capiz: [
      "Roxas", "Cuartero", "Dao", "Dumalag", "Dumarao", "Ivisan", "Jamindan",
      "Maayon", "Mambusao", "Panay", "Panitan", "Pilar", "Pontevedra", "President Roxas",
      "Sapian", "Sigma", "Tapaz",
    ],
    Guimaras: ["Jordan", "Buenavista", "Nueva Valencia", "San Lorenzo", "Sibunag"],
    Iloilo: [
      "Iloilo City", "Passi", "Ajuy", "Alimodian", "Anilao", "Badiangan", "Balasan",
      "Banate", "Barotac Nuevo", "Barotac Viejo", "Batad", "Bingawan", "Cabatuan",
      "Calinog", "Carles", "Concepcion", "Dingle", "Dueñas", "Dumangas", "Estancia",
      "Guimbal", "Igbaras", "Janiuay", "Lambunao", "Leganes", "Lemery", "Leon",
      "Maasin", "Miagao", "Mina", "New Lucena", "Oton", "Pavia", "Pototan",
      "San Dionisio", "San Enrique", "San Joaquin", "San Miguel", "San Rafael",
      "Santa Barbara", "Sara", "Tigbauan", "Tubungan", "Zarraga",
    ],
  },
  "Region VII": {
    Bohol: [
      "Tagbilaran", "Alburquerque", "Alicia", "Anda", "Antequera", "Baclayon",
      "Balilihan", "Batuan", "Bien Unido", "Bilar", "Buenavista", "Calape",
      "Candijay", "Carmen", "Catigbian", "Clarin", "Corella", "Cortes", "Dagohoy",
      "Danao", "Dauis", "Dimiao", "Duero", "Garcia Hernandez", "Guindulman",
      "Inabanga", "Jagna", "Jetafe", "Lila", "Loay", "Loboc", "Loon", "Mabini",
      "Maribojoc", "Panglao", "Pilar", "Pres. Carlos P. Garcia", "Sagbayan",
      "San Isidro", "San Miguel", "Sevilla", "Sierra Bullones", "Sikatuna",
      "Talibon", "Trinidad", "Tubigon", "Ubay", "Valencia",
    ],
    Cebu: [
      "Cebu City", "Carcar", "Danao", "Lapu-Lapu", "Mandaue", "Naga", "Talisay",
      "Toledo", "Bogo", "Alcantara", "Alcoy", "Alegria", "Aloguinsan", "Argao",
      "Asturias", "Badian", "Balamban", "Bantayan", "Barili", "Boljoon", "Borbon",
      "Carmen", "Catmon", "Compostela", "Consolacion", "Cordova", "Daanbantayan",
      "Dalaguete", "Dumanjug", "Ginatilan", "Liloan", "Madridejos", "Malabuyoc",
      "Medellin", "Minglanilla", "Moalboal", "Oslob", "Pilar", "Pinamungajan",
      "Poro", "Ronda", "Samboan", "San Fernando", "San Francisco", "San Remigio",
      "Santa Fe", "Santander", "Sibonga", "Sogod", "Tabogon", "Tabuelan", "Tuburan",
      "Tudela",
    ],
  },
  "Region VIII": {
    Biliran: [
      "Naval", "Almeria", "Biliran", "Cabucgayan", "Caibiran", "Culaba",
      "Kawayan", "Maripipi",
    ],
    "Eastern Samar": [
      "Borongan", "Arteche", "Balangiga", "Balangkayan", "Can-avid", "Dolores",
      "General MacArthur", "Giporlos", "Guiuan", "Hernani", "Jipapad", "Lawaan",
      "Llorente", "Maslog", "Maydolong", "Mercedes", "Oras", "Quinapondan",
      "Salcedo", "San Julian", "San Policarpo", "Sulat", "Taft",
    ],
    Leyte: [
      "Tacloban", "Baybay", "Ormoc", "Abuyog", "Alangalang", "Albuera", "Babatngon",
      "Barugo", "Bato", "Burauen", "Calubian", "Capoocan", "Carigara", "Dagami",
      "Dulag", "Hilongos", "Hindang", "Inopacan", "Isabel", "Jaro", "Javier",
      "Julita", "Kananga", "La Paz", "Leyte", "MacArthur", "Mahaplag", "Matag-ob",
      "Matalom", "Mayorga", "Merida", "Palo", "Palompon", "Pastrana", "San Isidro",
      "San Miguel", "Santa Fe", "Tabango", "Tabontabon", "Tanauan", "Tolosa",
      "Tunga", "Villaba",
    ],
    "Northern Samar": [
      "Catarman", "Allen", "Biri", "Bobon", "Capul", "Catubig", "Gamay",
      "Laoang", "Lapinig", "Las Navas", "Lavezares", "Lope de Vega", "Mapanas",
      "Mondragon", "Palapag", "Pambujan", "Rosario", "San Antonio", "San Isidro",
      "San Jose", "San Roque", "San Vicente", "Silvino Lobos", "Victoria",
    ],
    Samar: [
      "Catbalogan", "Calbayog", "Almagro", "Basey", "Calbiga", "Daram",
      "Gandara", "Hinabangan", "Jiabong", "Marabut", "Matuguinao", "Motiong",
      "Pagsanghan", "Paranas", "Pinabacdao", "San Jorge", "San Jose de Buan",
      "San Sebastian", "Santa Margarita", "Santa Rita", "Santo Niño", "Tagapul-an",
      "Talalora", "Tarangnan", "Villareal", "Zumarraga",
    ],
    "Southern Leyte": [
      "Maasin", "Anahawan", "Bontoc", "Hinunangan", "Hinundayan", "Libagon",
      "Liloan", "Limasawa", "Macrohon", "Malitbog", "Padre Burgos", "Pintuyan",
      "Saint Bernard", "San Francisco", "San Juan", "San Ricardo", "Silago",
      "Sogod", "Tomas Oppus",
    ],
  },
  "Region IX": {
    "Zamboanga del Norte": [
      "Dipolog", "Dapitan", "Bacungan", "Baliguian", "Godod", "Gutalac", "Jose Dalman",
      "Kalawit", "Katipunan", "La Libertad", "Labason", "Leon B. Postigo", "Liloy",
      "Manukan", "Mutia", "Piñan", "Polanco", "President Manuel A. Roxas",
      "Rizal", "Salug", "Sergio Osmeña Sr.", "Siayan", "Sibuco", "Sibutad",
      "Sindangan", "Siocon", "Sirawai", "Tampilisan",
    ],
    "Zamboanga del Sur": [
      "Pagadian", "Zamboanga City", "Aurora", "Bayog", "Dimataling", "Dinas",
      "Dumalinao", "Dumingag", "Guipos", "Josefina", "Kumalarang", "Labangan",
      "Lakewood", "Lapuyan", "Mahayag", "Margosatubig", "Midsalip", "Molave",
      "Pitogo", "Ramon Magsaysay", "San Miguel", "San Pablo", "Sominot", "Tabina",
      "Tambulig", "Tigbao", "Tukuran", "Vincenzo A. Sagun",
    ],
    "Zamboanga Sibugay": [
      "Ipil", "Alicia", "Buug", "Diplahan", "Imelda", "Kabasalan", "Mabuhay",
      "Malangas", "Naga", "Olutanga", "Payao", "Roseller Lim", "Siay", "Talusan",
      "Titay", "Tungawan",
    ],
  },
  "Region X": {
    Bukidnon: [
      "Malaybalay", "Valencia", "Baungon", "Cabanglasan", "Damulog", "Dangcagan",
      "Don Carlos", "Impasugong", "Kadingilan", "Kalilangan", "Kibawe", "Kitaotao",
      "Lantapan", "Libona", "Malitbog", "Manolo Fortich", "Maramag", "Pangantucan",
      "Quezon", "San Fernando", "Sumilao", "Talakag",
    ],
    Camiguin: ["Mambajao", "Catarman", "Guinsiliban", "Mahinog", "Sagay"],
    "Lanao del Norte": [
      "Iligan", "Bacolod", "Baloi", "Baroy", "Kapatagan", "Kauswagan", "Kolambugan",
      "Lala", "Linamon", "Magsaysay", "Maigo", "Matungao", "Munai", "Nunungan",
      "Pantao Ragat", "Pantar", "Poona Piagapo", "Salvador", "Sapad", "Sultan Naga Dimaporo",
      "Tagoloan", "Tangcal", "Tubod",
    ],
    "Misamis Occidental": [
      "Oroquieta", "Ozamiz", "Tangub", "Aloran", "Baliangao", "Bonifacio",
      "Calamba", "Clarin", "Concepcion", "Don Victoriano Chiongbian", "Jimenez",
      "Lopez Jaena", "Panaon", "Plaridel", "Sapang Dalaga", "Sinacaban", "Tudela",
    ],
    "Misamis Oriental": [
      "Cagayan de Oro", "El Salvador", "Gingoog", "Alubijid", "Balingasag",
      "Balingoan", "Binuangan", "Claveria", "Gitagum", "Initao", "Jasaan",
      "Kinoguitan", "Lagonglong", "Laguindingan", "Libertad", "Lugait", "Magsaysay",
      "Manticao", "Medina", "Naawan", "Opol", "Salay", "Sugbongcogon", "Tagoloan",
      "Talisayan", "Villanueva",
    ],
  },
  "Region XI": {
    "Davao de Oro": [
      "Nabunturan", "Compostela", "Laak", "Mabini", "Maco", "Maragusan",
      "Mawab", "Monkayo", "Montevista", "New Bataan", "Pantukan",
    ],
    "Davao del Norte": [
      "Tagum", "Panabo", "Island Garden City of Samal", "Asuncion", "Braulio E. Dujali",
      "Carmen", "Kapalong", "New Corella", "San Isidro", "Santo Tomas", "Talaingod",
    ],
    "Davao del Sur": [
      "Davao City", "Digos", "Bansalan", "Hagonoy", "Kiblawan", "Magsaysay",
      "Malalag", "Matanao", "Padada", "Santa Cruz", "Sulop",
    ],
    "Davao Occidental": [
      "Malita", "Don Marcelino", "Jose Abad Santos", "Santa Maria", "Sarangani",
    ],
    "Davao Oriental": [
      "Mati", "Baganga", "Banaybanay", "Boston", "Caraga", "Cateel", "Governor Generoso",
      "Lupon", "Manay", "San Isidro", "Tarragona",
    ],
  },
  "Region XII": {
    Cotabato: [
      "Kidapawan", "Alamada", "Aleosan", "Antipas", "Arakan", "Banisilan",
      "Carmen", "Kabacan", "Libungan", "Magpet", "Makilala", "Matalam", "Midsayap",
      "M'lang", "Pigcawayan", "Pikit", "President Roxas", "Tulunan",
    ],
    Sarangani: [
      "Alabel", "Glan", "Kiamba", "Maasim", "Maitum", "Malapatan", "Malungon",
    ],
    "South Cotabato": [
      "Koronadal", "General Santos", "Banga", "Lake Sebu", "Norala", "Polomolok",
      "Santo Niño", "Surallah", "Tampakan", "Tantangan", "T'boli", "Tupi",
    ],
    "Sultan Kudarat": [
      "Tacurong", "Bagumbayan", "Columbio", "Esperanza", "Isulan", "Kalamansig",
      "Lambayong", "Lebak", "Lutayan", "Palimbang", "President Quirino", "Sen. Ninoy Aquino",
    ],
  },
  "Region XIII": {
    "Agusan del Norte": [
      "Butuan", "Cabadbaran", "Buenavista", "Carmen", "Jabonga", "Kitcharao",
      "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Santiago", "Tubay",
    ],
    "Agusan del Sur": [
      "Bayugan", "Bunawan", "Esperanza", "La Paz", "Loreto", "Prosperidad",
      "Rosario", "San Francisco", "San Luis", "Santa Josefa", "Sibagat", "Talacogon",
      "Trento", "Veruela",
    ],
    "Dinagat Islands": [
      "San Jose", "Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "Tubajon",
    ],
    "Surigao del Norte": [
      "Surigao City", "Alegria", "Bacuag", "Burgos", "Claver", "Dapa", "Del Carmen",
      "General Luna", "Gigaquit", "Mainit", "Malimono", "Pilar", "Placer",
      "San Benito", "San Francisco", "San Isidro", "Santa Monica", "Sison",
      "Socorro", "Tagana-an", "Tubod",
    ],
    "Surigao del Sur": [
      "Tandag", "Bislig", "Barobo", "Bayabas", "Cagwait", "Cantilan", "Carmen",
      "Carrascal", "Cortes", "Hinatuan", "Lanuza", "Lianga", "Lingig", "Madrid",
      "Marihatag", "San Agustin", "San Miguel", "Tagbina", "Tago",
    ],
  },
  BARMM: {
    Basilan: [
      "Lamitan", "Isabela City", "Akbar", "Al-Barka", "Hadji Mohammad Ajul",
      "Hadji Muhtamad", "Lantawan", "Maluso", "Sumisip", "Tabuan-Lasa", "Tipo-Tipo",
      "Tuburan", "Ungkaya Pukan",
    ],
    "Lanao del Sur": [
      "Marawi", "Bacolod-Kalawi", "Balabagan", "Balindong", "Bayang", "Binidayan",
      "Buadiposo-Buntong", "Bubong", "Butig", "Calanogas", "Ditsaan-Ramain",
      "Ganassi", "Kapai", "Kapatagan", "Lumba-Bayabao", "Lumbaca-Unayan",
      "Lumbatan", "Lumbayanague", "Madalum", "Madamba", "Maguing", "Malabang",
      "Marantao", "Marogong", "Masiu", "Mulondo", "Pagayawan", "Piagapo",
      "Poona Bayabao", "Pualas", "Saguiaran", "Sultan Dumalondong", "Tagoloan II",
      "Tamparan", "Taraka", "Tubaran", "Tugaya", "Wao",
    ],
    Maguindanao: [
      "Cotabato City", "Ampatuan", "Barira", "Buldon", "Buluan", "Datu Abdullah Sangki",
      "Datu Anggal Midtimbang", "Datu Blah T. Sinsuat", "Datu Hoffer Ampatuan",
      "Datu Montawal", "Datu Odin Sinsuat", "Datu Paglas", "Datu Piang",
      "Datu Salibo", "Datu Saudi-Ampatuan", "Datu Unsay", "General Salipada K. Pendatun",
      "Guindulungan", "Kabuntalan", "Mamasapano", "Mangudadatu", "Matanog",
      "Northern Kabuntalan", "Pagalungan", "Paglat", "Pandag", "Parang", "Rajah Buayan",
      "Shariff Aguak", "Shariff Saydona Mustapha", "South Upi", "Sultan Kudarat",
      "Sultan Mastura", "Sultan sa Barongis", "Talayan", "Talitay", "Upi",
    ],
    Sulu: [
      "Jolo", "Banguingui", "Hadji Panglima Tahil", "Indanan", "Kalingalan Caluang",
      "Lugus", "Luuk", "Maimbung", "Old Panamao", "Omar", "Pandami", "Panglima Estino",
      "Pangutaran", "Parang", "Pata", "Patikul", "Siasi", "Talipao", "Tapul", "Tongkil",
    ],
    "Tawi-Tawi": [
      "Bongao", "Languyan", "Mapun", "Panglima Sugala", "Sapa-Sapa", "Sibutu",
      "Simunul", "Sitangkai", "South Ubian", "Tandubas", "Turtle Islands",
    ],
  },
  NIR: {
    "Negros Occidental": [
      "Bacolod", "Bago", "Cadiz", "Escalante", "Himamaylan", "Kabankalan",
      "La Carlota", "Sagay", "San Carlos", "Silay", "Sipalay", "Talisay",
      "Victorias", "Binalbagan", "Calatrava", "Candoni", "Cauayan", "Enrique B. Magalona",
      "Hinigaran", "Hinoba-an", "Ilog", "Isabela", "La Castellana", "Manapla",
      "Moises Padilla", "Murcia", "Pontevedra", "Pulupandan", "Salvador Benedicto",
      "San Enrique", "Toboso", "Valladolid",
    ],
    "Negros Oriental": [
      "Dumaguete", "Bais", "Bayawan", "Canlaon", "Guihulngan", "Tanjay",
      "Amlan", "Ayungon", "Bacong", "Basay", "Bindoy", "Dauin", "Jimalalud",
      "La Libertad", "Mabinay", "Manjuyod", "Pamplona", "San Jose", "Santa Catalina",
      "Siaton", "Sibulan", "Tayasan", "Valencia", "Vallehermoso", "Zamboanguita",
    ],
    Siquijor: ["Siquijor", "Enrique Villanueva", "Larena", "Lazi", "Maria", "San Juan"],
  },
};

/**
 * Provinces within a region, sorted alphabetically. Unknown/blank code -> [].
 *
 * @param {string} regionCode
 * @returns {string[]}
 */
export function provincesForRegion(regionCode) {
  if (!regionCode) return [];
  const provinces = LOCATIONS[regionCode];
  if (!provinces) return [];
  return Object.keys(provinces).sort((a, b) => a.localeCompare(b));
}

/**
 * Cities within a province of a region, sorted alphabetically. The province
 * must belong to the region; otherwise [].
 *
 * @param {string} regionCode
 * @param {string} province
 * @returns {string[]}
 */
export function citiesForProvince(regionCode, province) {
  if (!regionCode || !province) return [];
  const provinces = LOCATIONS[regionCode];
  const cities = provinces ? provinces[province] : undefined;
  if (!cities) return [];
  return [...cities].sort((a, b) => a.localeCompare(b));
}

/**
 * Whether a province belongs to a region (parent-consistency check).
 *
 * @param {string} regionCode
 * @param {string} province
 * @returns {boolean}
 */
export function isProvinceInRegion(regionCode, province) {
  return provincesForRegion(regionCode).includes(province);
}

/**
 * Whether a city belongs to a province within a region (parent-consistency).
 *
 * @param {string} regionCode
 * @param {string} province
 * @param {string} city
 * @returns {boolean}
 */
export function isCityInProvince(regionCode, province, city) {
  return citiesForProvince(regionCode, province).includes(city);
}
