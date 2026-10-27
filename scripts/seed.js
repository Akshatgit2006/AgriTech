import { database, closeDatabase } from "../server/store.js";
import { parse, schemas } from "../server/validation.js";

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI before running the seed command.");
}

const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
  throw new Error("SEED_OWNER_EMAIL must be a valid email address.");
}

const day = (offset) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const productData = [
  { key: "wheat-seed", name: "Wheat seed pack", category: "Seeds", description: "Certified wheat seed for a small planting trial. Confirm variety suitability locally before ordering.", price: 480, stock: 40, unit: "5 kg pack" },
  { key: "tomato-seed", name: "Tomato seed pack", category: "Seeds", description: "Vegetable seed pack suitable for nursery raising and seasonal planting.", price: 220, stock: 65, unit: "100 g pack" },
  { key: "chickpea-seed", name: "Chickpea seed pack", category: "Seeds", description: "Chickpea seed for a demonstration plot. Check local sowing recommendations.", price: 360, stock: 35, unit: "5 kg pack" },
  { key: "compost", name: "Organic compost", category: "Nutrition", description: "Mature compost for improving soil structure and organic matter.", price: 390, stock: 80, unit: "25 kg bag" },
  { key: "neem-cake", name: "Neem cake", category: "Nutrition", description: "Organic soil amendment for use according to local agronomic advice.", price: 520, stock: 30, unit: "10 kg bag" },
  { key: "soil-kit", name: "Soil sample kit", category: "Tools", description: "Collection bags, labels, and a guide for sending soil samples to a laboratory.", price: 650, stock: 25, unit: "1 kit" },
  { key: "hand-sprayer", name: "Hand sprayer", category: "Tools", description: "Portable manual sprayer for small plots and equipment cleaning.", price: 890, stock: 18, unit: "5 L unit" },
  { key: "drip-kit", name: "Drip irrigation starter kit", category: "Irrigation", description: "Starter lines and fittings for a small demonstration bed.", price: 2450, stock: 12, unit: "1 kit" },
];
const advisoryData = [
  { key: "soil-sampling", title: "Sample soil before a new season", body: "Take samples from several points in each field and use an accredited laboratory. Record the result here before planning nutrient applications.", severity: "Info", region: "All regions", crop: "All crops" },
  { key: "scouting", title: "Keep a regular crop scouting routine", body: "Walk fields weekly and record changes in leaves, moisture, weeds, and insect activity. Ask a local expert to identify problems before treatment.", severity: "Info", region: "All regions", crop: "All crops" },
  { key: "rain-check", title: "Check the forecast before field work", body: "Review local rainfall and wind forecasts before spraying, irrigation, or harvesting. Weather estimates can change, so confirm conditions on site.", severity: "Watch", region: "All regions", crop: "All crops" },
  { key: "water-records", title: "Track irrigation by field", body: "Log irrigation dates and inspect soil moisture to avoid watering by calendar alone. Adjust plans to the crop stage and local guidance.", severity: "Info", region: "All regions", crop: "All crops" },
];

const products = productData.map(({ key, ...data }) => ({
  _id: `seed:product:${key}`,
  ...parse(schemas.products, data),
  archived: false,
}));
const advisories = advisoryData.map(({ key, ...data }) => ({
  _id: `seed:advisory:${key}`,
  ...parse(schemas.advisories, data),
}));

const counts = { products: 0, advisories: 0, farms: 0, crops: 0, soil: 0, activities: 0 };
try {
await database(async (col) => {
  const owner = ownerEmail
    ? await col("users").one({ email: ownerEmail })
    : null;
  if (ownerEmail && (!owner || owner.role !== "farmer" || owner.disabled)) {
    throw new Error("SEED_OWNER_EMAIL must belong to an active, existing farmer account.");
  }

  async function insertOnce(collection, entry) {
    if (await col(collection).one({ _id: entry._id })) return;
    await col(collection).insert({ createdAt: new Date().toISOString(), ...entry });
    counts[collection] += 1;
  }

  for (const product of products) await insertOnce("products", product);
  for (const advisory of advisories) await insertOnce("advisories", advisory);

  if (!owner) return;

  const farmId = `seed:farm:${owner._id}`;
  await insertOnce("farms", {
    _id: farmId,
    ownerId: owner._id,
    ...parse(schemas.farms, {
      name: "Sunrise Demonstration Farm",
      location: "Pune, Maharashtra",
      area: 6.5,
      latitude: 18.5204,
      longitude: 73.8567,
      soilType: "Loamy",
    }),
  });

  for (const [key, name, variety, stage, area, planted, harvest] of [
    ["wheat", "Wheat", "Demonstration variety", "Growing", 3, -45, 75],
    ["tomato", "Tomato", "Demonstration variety", "Flowering", 1.5, -60, 30],
    ["chickpea", "Chickpea", "Demonstration variety", "Sowing", 2, -10, 100],
  ]) {
    await insertOnce("crops", {
      _id: `seed:crop:${key}:${owner._id}`,
      ownerId: owner._id,
      ...parse(schemas.crops, {
        farmId,
        name,
        variety,
        stage,
        area,
        plantedAt: day(planted),
        harvestAt: day(harvest),
        notes: "Demonstration record. Replace with observations from this field.",
      }),
    });
  }

  await insertOnce("soil", {
    _id: `seed:soil:${owner._id}`,
    ownerId: owner._id,
    ...parse(schemas.soil, {
      farmId,
      testedAt: day(-7),
      ph: 6.8,
      nitrogen: 210,
      phosphorus: 28,
      potassium: 180,
      moisture: 42,
      notes: "Illustrative values only; this is not a laboratory result.",
    }),
  });

  for (const [key, title, type, offset] of [
    ["inspection", "Inspect crop growth", "Inspection", -1],
    ["irrigation", "Check drip irrigation", "Irrigation", -3],
    ["soil", "Review soil report", "Other", -6],
  ]) {
    await insertOnce("activities", {
      _id: `seed:activity:${key}:${owner._id}`,
      ownerId: owner._id,
      ...parse(schemas.activities, {
        farmId,
        title,
        type,
        date: day(offset),
        notes: "Demonstration activity.",
      }),
    });
  }
});
} finally {
  await closeDatabase();
}

console.log(
  `Seed complete for ${process.env.MONGODB_DB || "fieldwise"}: ${Object.entries(counts)
    .map(([name, count]) => `${count} ${name}`)
    .join(", ")} added. Existing seed records were left unchanged.`,
);
