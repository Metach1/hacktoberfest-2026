import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outputPath = join(dirname(fileURLToPath(import.meta.url)), "athletes.json");

const regions = {
  NCR: { name: "National Capital Region", locality: "Quezon City" },
  CAR: { name: "Cordillera Administrative Region", locality: "Baguio City" },
  "Region I": { name: "Ilocos Region", locality: "Vigan City, Ilocos Sur" },
  "Region II": { name: "Cagayan Valley", locality: "Tuguegarao City, Cagayan" },
  "Region III": { name: "Central Luzon", locality: "San Fernando, Pampanga" },
  "Region IV-A": { name: "CALABARZON", locality: "Lipa City, Batangas" },
  "Region IV-B": { name: "MIMAROPA", locality: "Calapan City, Oriental Mindoro" },
  "Region V": { name: "Bicol Region", locality: "Naga City, Camarines Sur" },
  "Region VI": { name: "Western Visayas", locality: "Iloilo City, Iloilo" },
  "Region VII": { name: "Central Visayas", locality: "Tagbilaran City, Bohol" },
  "Region VIII": { name: "Eastern Visayas", locality: "Tacloban City, Leyte" },
  "Region IX": { name: "Zamboanga Peninsula", locality: "Zamboanga City" },
  "Region X": { name: "Northern Mindanao", locality: "Cagayan de Oro City" },
  "Region XI": { name: "Davao Region", locality: "Davao City" },
  "Region XII": { name: "SOCCSKSARGEN", locality: "Koronadal City, South Cotabato" },
  "Region XIII": { name: "Caraga", locality: "Butuan City, Agusan del Norte" },
  BARMM: { name: "Bangsamoro Autonomous Region in Muslim Mindanao", locality: "Cotabato City" },
};

const seedProfiles = [
  ["ath-001", "Mikaela Solis", "Track and Field", 23, 164, "NCR", "Quezon City", "A fictional middle-distance runner focused on consistent community training.", ["Fictional Metro Manila open meet finisher"], 80000, 28000, 124],
  ["ath-002", "Tomas Alvar", "Basketball", 21, 178, "CAR", "Baguio City", "A fictional guard who helps organize youth-free adult recreational leagues.", ["Fictional Cordillera invitational participant"], 65000, 22000, 97],
  ["ath-003", "Neri Villanueva", "Volleyball", 24, 169, "Region I", "Vigan City, Ilocos Sur", "A fictional volleyball setter supporting a local adult club.", ["Fictional Ilocos club tournament finalist"], 72000, 31000, 88],
  ["ath-004", "Ivo Santiago", "Cycling", 26, 172, "Region II", "Tuguegarao City, Cagayan", "A fictional endurance cyclist preparing for a regional road event.", ["Fictional Cagayan Valley road event finisher"], 90000, 40000, 112],
  ["ath-005", "Amara de Vera", "Arnis", 22, 160, "Region III", "San Fernando, Pampanga", "A fictional arnis practitioner training for a regional demonstration.", ["Fictional Central Luzon arnis medalist"], 60000, 18000, 76],
  ["ath-006", "Paolo Dizon", "Weightlifting", 25, 170, "Region IV-A", "Lipa City, Batangas", "A fictional weightlifter seeking support for equipment and travel.", ["Fictional Batangas strength meet participant"], 85000, 51000, 146],
  ["ath-007", "Lian Mercado", "Swimming", 20, 166, "Region IV-B", "Calapan City, Oriental Mindoro", "A fictional swimmer balancing training with community coaching.", ["Fictional MIMAROPA swim meet finalist"], 70000, 24000, 91],
  ["ath-008", "Sela Magsino", "Boxing", 27, 163, "Region V", "Naga City, Camarines Sur", "A fictional amateur boxer working toward a regional tournament.", ["Fictional Bicol boxing invitational finalist"], 95000, 33000, 139],
  ["ath-009", "Renzo Ledesma", "Football", 23, 175, "Region VI", "Iloilo City, Iloilo", "A fictional midfielder representing a community adult football club.", ["Fictional Western Visayas league participant"], 76000, 29000, 105],
  ["ath-010", "Tala Cordero", "Volleyball", 22, 168, "Region VII", "Tagbilaran City, Bohol", "A fictional volleyball outside hitter from an adult community team.", ["Fictional Central Visayas cup finalist"], 68000, 37000, 154],
  ["ath-011", "Nico Abellanosa", "Dragon Boat", 28, 180, "Region VIII", "Tacloban City, Leyte", "A fictional paddler training with a regional adult crew.", ["Fictional Eastern Visayas regatta finisher"], 88000, 30000, 83],
  ["ath-012", "Rhea Cabato", "Taekwondo", 24, 162, "Region IX", "Zamboanga City", "A fictional taekwondo athlete preparing for a regional open.", ["Fictional Zamboanga open podium finisher"], 64000, 26000, 119],
  ["ath-013", "Elian Roque", "Basketball", 20, 181, "Region X", "Cagayan de Oro City", "A fictional forward training in an adult city basketball program.", ["Fictional Northern Mindanao league finalist"], 73000, 42000, 171],
  ["ath-014", "Mara Quinto", "Sepak Takraw", 26, 158, "Region XI", "Davao City", "A fictional sepak takraw player committed to regional competition.", ["Fictional Davao regional games participant"], 69000, 19000, 73],
  ["ath-015", "Juno Sarmiento", "Wrestling", 25, 174, "Region XII", "Koronadal City, South Cotabato", "A fictional wrestler training for an adult open tournament.", ["Fictional SOCCSKSARGEN grappling finalist"], 81000, 27000, 99],
  ["ath-016", "Arielle Pangan", "Badminton", 21, 165, "Region XIII", "Butuan City, Agusan del Norte", "A fictional badminton player building experience on the regional circuit.", ["Fictional Caraga doubles finalist"], 57000, 23000, 108],
  ["ath-017", "Samira Hadji", "Track and Field", 24, 167, "BARMM", "Cotabato City", "A fictional sprinter representing a community athletics club.", ["Fictional Bangsamoro athletics meet finisher"], 78000, 35000, 132],
  ["ath-018", "Luca Manalo", "Basketball", 22, 176, "NCR", "Pasig City", "A fictional point guard who volunteers at an adult neighborhood sports club.", ["Fictional Pasig invitational finalist"], 71000, 36000, 181],
  ["ath-019", "Dara Fuentebella", "Trail Running", 29, 159, "CAR", "La Trinidad, Benguet", "A fictional trail runner training on community routes in Benguet.", ["Fictional Cordillera trail challenge finisher"], 92000, 47000, 143],
  ["ath-020", "Noel Esguerra", "Cycling", 23, 173, "Region I", "Laoag City, Ilocos Norte", "A fictional cyclist preparing for a long-distance regional ride.", ["Fictional Ilocos road challenge finisher"], 63000, 21000, 80],
  ["ath-021", "Celine Manabat", "Weightlifting", 26, 161, "Region III", "Cabanatuan City, Nueva Ecija", "A fictional lifter looking for support for competition equipment.", ["Fictional Nueva Ecija strength event finalist"], 84000, 45000, 167],
  ["ath-022", "Basti Lontoc", "Swimming", 22, 177, "Region IV-A", "Santa Rosa City, Laguna", "A fictional distance swimmer training with a local adult club.", ["Fictional CALABARZON open-water finisher"], 76000, 39000, 127],
  ["ath-023", "Yana Gatchalian", "Boxing", 23, 165, "Region V", "Legazpi City, Albay", "A fictional boxer preparing for a regional amateur event.", ["Fictional Albay boxing open finalist"], 88000, 32000, 94],
  ["ath-024", "Kean Jover", "Football", 25, 179, "Region VI", "Roxas City, Capiz", "A fictional defender training with a community adult football team.", ["Fictional Western Visayas cup semifinalist"], 67000, 25000, 115],
  ["ath-025", "Mavi Llorente", "Basketball", 27, 183, "Region VII", "Cebu City, Cebu", "A fictional center who competes in local adult leagues.", ["Fictional Cebu city league finalist"], 97000, 58000, 202],
  ["ath-026", "Inez Ocampo", "Arnis", 21, 157, "Region X", "Iligan City, Lanao del Norte", "A fictional arnis practitioner training for a friendly regional meet.", ["Fictional Northern Mindanao arnis finalist"], 59000, 16000, 69],
  ["ath-027", "Rafi Natividad", "Dragon Boat", 30, 182, "Region XI", "Tagum City, Davao del Norte", "A fictional paddler supporting an adult community crew.", ["Fictional Davao paddling regatta finisher"], 86000, 41000, 156],
  ["ath-028", "Asha Macapaar", "Sepak Takraw", 23, 160, "Region XII", "General Santos City", "A fictional sepak takraw player preparing for a regional tournament.", ["Fictional SOCCSKSARGEN takraw finalist"], 74000, 34000, 121],
  ["ath-029", "Dino Balane", "Badminton", 24, 171, "Region XIII", "Surigao City, Surigao del Norte", "A fictional singles player building experience at local events.", ["Fictional Caraga badminton open finalist"], 62000, 20000, 87],
  ["ath-030", "Nawal Karim", "Taekwondo", 28, 168, "BARMM", "Marawi City, Lanao del Sur", "A fictional taekwondo athlete training with a community sports group.", ["Fictional BARMM martial arts open finalist"], 80000, 43000, 148],
];

function createProfiles() {
  if (seedProfiles.length !== 30) {
    throw new Error(`Expected exactly 30 seed profiles; found ${seedProfiles.length}.`);
  }

  const ids = new Set();
  const names = new Set();
  const presentRegions = new Set();

  const athletes = seedProfiles.map(
    ([id, name, sport, age, heightCm, regionCode, provinceOrLocality, bio, achievements, fundingGoal, fundingRaised, votes]) => {
      if (ids.has(id) || names.has(name)) {
        throw new Error(`Duplicate seed athlete identity: ${id} / ${name}.`);
      }
      if (age < 18 || !regions[regionCode] || !provinceOrLocality || !bio || !sport) {
        throw new Error(`Invalid seed athlete profile: ${id}.`);
      }
      if (!Number.isInteger(votes) || fundingGoal <= 0 || fundingRaised < 0 || fundingRaised > fundingGoal) {
        throw new Error(`Invalid sample funding or vote values: ${id}.`);
      }

      ids.add(id);
      names.add(name);
      presentRegions.add(regionCode);

      return {
        id,
        name,
        sport,
        age,
        heightCm,
        regionCode,
        region: regions[regionCode].name,
        provinceOrLocality,
        bio,
        achievements,
        verified: true,
        fundingGoal,
        fundingRaised,
        fundingProgress: Math.round((fundingRaised / fundingGoal) * 100),
        votes,
        ranking: 0,
      };
    },
  );

  const missingRegions = Object.keys(regions).filter((code) => !presentRegions.has(code));
  if (missingRegions.length > 0) {
    throw new Error(`Missing region coverage: ${missingRegions.join(", ")}.`);
  }

  athletes
    .toSorted((left, right) => right.votes - left.votes)
    .forEach((athlete, index) => {
      athlete.ranking = index + 1;
    });

  return athletes;
}

const dataset = {
  description: "Entirely fictional adult profiles and mock metrics for local development and demos. No real athlete data.",
  athletes: createProfiles(),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(`Wrote ${dataset.athletes.length} fictional athlete profiles to ${outputPath}`);
