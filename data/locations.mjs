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
 * COVERAGE LIMITATION: this is a curated, NON-EXHAUSTIVE dataset. It covers
 * every region with its real provinces, and the most prominent cities per
 * province — enough for a realistic cascading picker and search — but it does
 * NOT list every municipality in the country. NCR has no provinces, so it is
 * modeled as a single pseudo-province "Metro Manila" holding its cities. Extend
 * the lists as needed; the helpers below do not assume completeness.
 */

/**
 * @typedef {Object.<string, Object.<string, string[]>>} LocationTree
 * regionCode -> { provinceName -> cityName[] }
 */

/** @type {LocationTree} */
export const LOCATIONS = {
  NCR: {
    "Metro Manila": [
      "Manila", "Quezon City", "Makati", "Taguig", "Pasig", "Mandaluyong",
      "Parañaque", "Las Piñas", "Muntinlupa", "Caloocan", "Pasay", "Marikina",
      "Valenzuela", "Malabon", "Navotas", "San Juan", "Pateros",
    ],
  },
  CAR: {
    Benguet: ["Baguio", "La Trinidad", "Itogon"],
    Ifugao: ["Lagawe", "Kiangan"],
    "Mountain Province": ["Bontoc", "Sagada"],
    Abra: ["Bangued"],
    Apayao: ["Kabugao", "Luna"],
    Kalinga: ["Tabuk"],
  },
  "Region I": {
    "Ilocos Norte": ["Laoag", "Batac"],
    "Ilocos Sur": ["Vigan", "Candon"],
    "La Union": ["San Fernando", "Agoo"],
    Pangasinan: ["Dagupan", "San Carlos", "Urdaneta", "Alaminos"],
  },
  "Region II": {
    Cagayan: ["Tuguegarao"],
    Isabela: ["Ilagan", "Cauayan", "Santiago"],
    "Nueva Vizcaya": ["Bayombong"],
    Quirino: ["Cabarroguis"],
    Batanes: ["Basco"],
  },
  "Region III": {
    Pampanga: ["San Fernando", "Angeles", "Mabalacat"],
    Bulacan: ["Malolos", "Meycauayan", "San Jose del Monte"],
    "Nueva Ecija": ["Cabanatuan", "Palayan", "Gapan", "Muñoz"],
    Tarlac: ["Tarlac City"],
    Zambales: ["Olongapo", "Iba"],
    Bataan: ["Balanga"],
    Aurora: ["Baler"],
  },
  "Region IV-A": {
    Cavite: ["Bacoor", "Imus", "Dasmariñas", "General Trias", "Tagaytay", "Trece Martires"],
    Laguna: ["Calamba", "Santa Rosa", "Biñan", "San Pablo", "Cabuyao", "San Pedro"],
    Batangas: ["Batangas City", "Lipa", "Tanauan"],
    Rizal: ["Antipolo"],
    Quezon: ["Lucena", "Tayabas"],
  },
  "Region IV-B": {
    "Oriental Mindoro": ["Calapan"],
    "Occidental Mindoro": ["Mamburao"],
    Palawan: ["Puerto Princesa"],
    Marinduque: ["Boac"],
    Romblon: ["Romblon"],
  },
  "Region V": {
    "Camarines Sur": ["Naga", "Iriga", "Pili"],
    "Camarines Norte": ["Daet"],
    Albay: ["Legazpi", "Tabaco", "Ligao"],
    Sorsogon: ["Sorsogon City"],
    Masbate: ["Masbate City"],
    Catanduanes: ["Virac"],
  },
  "Region VI": {
    Iloilo: ["Iloilo City", "Passi"],
    Capiz: ["Roxas"],
    Aklan: ["Kalibo"],
    Antique: ["San Jose de Buenavista"],
    Guimaras: ["Jordan"],
  },
  "Region VII": {
    Cebu: ["Cebu City", "Mandaue", "Lapu-Lapu", "Talisay", "Toledo", "Danao", "Carcar"],
    Bohol: ["Tagbilaran"],
    Siquijor: ["Siquijor"],
  },
  "Region VIII": {
    Leyte: ["Tacloban", "Ormoc", "Baybay"],
    "Southern Leyte": ["Maasin"],
    Samar: ["Catbalogan", "Calbayog"],
    "Northern Samar": ["Catarman"],
    "Eastern Samar": ["Borongan"],
    Biliran: ["Naval"],
  },
  "Region IX": {
    "Zamboanga del Sur": ["Pagadian", "Zamboanga City"],
    "Zamboanga del Norte": ["Dipolog", "Dapitan"],
    "Zamboanga Sibugay": ["Ipil"],
  },
  "Region X": {
    "Misamis Oriental": ["Cagayan de Oro", "El Salvador", "Gingoog"],
    "Misamis Occidental": ["Oroquieta", "Ozamiz", "Tangub"],
    "Bukidnon": ["Malaybalay", "Valencia"],
    "Lanao del Norte": ["Iligan"],
    Camiguin: ["Mambajao"],
  },
  "Region XI": {
    "Davao del Sur": ["Davao City", "Digos"],
    "Davao del Norte": ["Tagum", "Panabo", "Island Garden City of Samal"],
    "Davao Oriental": ["Mati"],
    "Davao de Oro": ["Nabunturan"],
    "Davao Occidental": ["Malita"],
  },
  "Region XII": {
    "South Cotabato": ["Koronadal", "General Santos"],
    Cotabato: ["Kidapawan"],
    "Sultan Kudarat": ["Tacurong", "Isulan"],
    Sarangani: ["Alabel"],
  },
  "Region XIII": {
    "Agusan del Norte": ["Butuan", "Cabadbaran"],
    "Agusan del Sur": ["Bayugan"],
    "Surigao del Norte": ["Surigao City"],
    "Surigao del Sur": ["Tandag", "Bislig"],
    "Dinagat Islands": ["San Jose"],
  },
  BARMM: {
    Maguindanao: ["Cotabato City"],
    "Lanao del Sur": ["Marawi"],
    Sulu: ["Jolo"],
    "Basilan": ["Lamitan", "Isabela City"],
    "Tawi-Tawi": ["Bongao"],
  },
  NIR: {
    "Negros Occidental": ["Bacolod", "Bago", "Cadiz", "Silay", "Talisay", "Victorias"],
    "Negros Oriental": ["Dumaguete", "Bais", "Bayawan", "Canlaon", "Tanjay"],
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
