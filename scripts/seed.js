import { randomUUID } from "node:crypto";
import { database, isDemo } from "../server/store.js";
import { hashPassword } from "../server/auth.js";
const demo = isDemo();
const email =
  process.env.SEED_ADMIN_EMAIL || (demo ? "admin@fieldwise.demo" : "");
const password =
  process.env.SEED_ADMIN_PASSWORD || (demo ? "AdminDemo123!" : "");
if (!email || password.length < 12)
  throw new Error(
    "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 12 characters).",
  );
const adminHash = await hashPassword(password);
const farmerHash = demo ? await hashPassword("FarmerDemo123!") : "";
const record = (data) => ({
  _id: randomUUID(),
  createdAt: new Date().toISOString(),
  ...data,
});
await database(async (col) => {
  if (!(await col("users").one({ email: email.toLowerCase() })))
    await col("users").insert(
      record({
        name: "Fieldwise Admin",
        email: email.toLowerCase(),
        passwordHash: adminHash,
        role: "admin",
      }),
    );
  if (!demo) return;
  let farmer = await col("users").one({ email: "farmer@fieldwise.demo" });
  if (farmer) return;
  farmer = await col("users").insert(
    record({
      name: "Aarav Sharma",
      email: "farmer@fieldwise.demo",
      passwordHash: farmerHash,
      role: "farmer",
    }),
  );
  const farm = await col("farms").insert(
    record({
      ownerId: farmer._id,
      name: "Green Valley Farm",
      location: "Pune, Maharashtra",
      area: 8.5,
      latitude: 18.52,
      longitude: 73.85,
      soilType: "Loamy",
    }),
  );
  const today = new Date();
  const day = (offset) =>
    new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
  for (const [name, variety, stage, area, planted, harvest] of [
    ["Wheat", "HD 2967", "Growing", 4, -35, 80],
    ["Tomato", "Arka Rakshak", "Flowering", 2, -60, 30],
    ["Chickpea", "JG 11", "Sowing", 2.5, -7, 100],
  ])
    await col("crops").insert(
      record({
        ownerId: farmer._id,
        farmId: farm._id,
        name,
        variety,
        stage,
        area,
        plantedAt: day(planted),
        harvestAt: day(harvest),
        notes: "Sample crop record. Replace with your actual observations.",
      }),
    );
  await col("soil").insert(
    record({
      ownerId: farmer._id,
      farmId: farm._id,
      testedAt: day(-5),
      ph: 6.8,
      nitrogen: 210,
      phosphorus: 28,
      potassium: 180,
      moisture: 42,
      notes: "Demonstration readings, not a laboratory report.",
    }),
  );
  for (const [title, type, offset] of [
    ["Inspect wheat growth", "Inspection", 0],
    ["Drip irrigation check", "Irrigation", -1],
    ["Prepare chickpea beds", "Sowing", -3],
  ])
    await col("activities").insert(
      record({
        ownerId: farmer._id,
        farmId: farm._id,
        title,
        type,
        date: day(offset),
        notes: "Sample activity",
      }),
    );
  for (const product of [
    // ── Seeds ──────────────────────────────────────────────
    {
      name: "Wheat Seeds (HD 2967)",
      category: "Seeds",
      price: 450,
      stock: 40,
      unit: "5 kg pack",
      description:
        "High-yield certified wheat seeds suited for northern and central plains. Recommended sowing: October–November.",
    },
    {
      name: "Basmati Rice Seeds (Pusa 1121)",
      category: "Seeds",
      price: 380,
      stock: 55,
      unit: "5 kg pack",
      description:
        "Premium long-grain aromatic basmati paddy seeds. Ideal for irrigated transplanted conditions.",
    },
    {
      name: "Hybrid Tomato Seeds (Arka Rakshak)",
      category: "Seeds",
      price: 299,
      stock: 50,
      unit: "100 g pack",
      description:
        "High-yielding F1 hybrid with triple disease resistance. Suitable for kharif and rabi seasons.",
    },
    {
      name: "Mustard Seeds (Pusa Bold)",
      category: "Seeds",
      price: 210,
      stock: 60,
      unit: "2 kg pack",
      description:
        "Bold-seeded variety with high oil content (40%). Best for irrigated and rainfed conditions.",
    },
    {
      name: "Chickpea Seeds (JG 11)",
      category: "Seeds",
      price: 350,
      stock: 45,
      unit: "5 kg pack",
      description:
        "Desi chickpea variety with wilt resistance. Short duration (95–100 days), suited for central India.",
    },
    {
      name: "Onion Seeds (Nasik Red)",
      category: "Seeds",
      price: 520,
      stock: 30,
      unit: "500 g pack",
      description:
        "Dark red kharif onion variety with good storage life. Bulb weight 80–100 g.",
    },
    {
      name: "Cotton Seeds (BT Hybrid)",
      category: "Seeds",
      price: 899,
      stock: 25,
      unit: "450 g packet (1 acre)",
      description:
        "Bollgard-II hybrid cotton seeds with bollworm resistance. High ginning percentage.",
    },
    {
      name: "Soybean Seeds (JS 9560)",
      category: "Seeds",
      price: 280,
      stock: 35,
      unit: "5 kg pack",
      description:
        "High-yielding soybean variety for kharif season. Maturity in 95–100 days.",
    },
    {
      name: "Maize Seeds (DHM 117)",
      category: "Seeds",
      price: 340,
      stock: 40,
      unit: "4 kg pack",
      description:
        "Hybrid maize with excellent cob fill. Suitable for kharif and spring planting.",
    },
    {
      name: "Vegetable Seed Kit (12 varieties)",
      category: "Seeds",
      price: 649,
      stock: 70,
      unit: "1 kit",
      description:
        "Assorted kitchen garden seeds: brinjal, okra, spinach, coriander, bottle gourd, bitter gourd, chilli, carrot, radish, fenugreek, pea, and capsicum.",
    },

    // ── Nutrition ──────────────────────────────────────────
    {
      name: "Organic Vermicompost",
      category: "Nutrition",
      price: 320,
      stock: 65,
      unit: "10 kg bag",
      description:
        "100% natural earthworm compost rich in humic acid and beneficial soil microorganisms.",
    },
    {
      name: "Bio-NPK Liquid Fertilizer",
      category: "Nutrition",
      price: 550,
      stock: 35,
      unit: "1 L bottle",
      description:
        "Consortium of Azotobacter, PSB, and KMB providing balanced nitrogen, phosphorus, and potassium.",
    },
    {
      name: "DAP (Di-Ammonium Phosphate)",
      category: "Nutrition",
      price: 1350,
      stock: 100,
      unit: "50 kg bag",
      description:
        "Standard phosphatic fertilizer (18% N, 46% P₂O₅). Ideal as basal dose for wheat, rice, and pulses.",
    },
    {
      name: "Urea (Neem Coated)",
      category: "Nutrition",
      price: 267,
      stock: 120,
      unit: "45 kg bag",
      description:
        "Neem-coated urea for slow nitrogen release, reducing leaching losses. Government-price regulated.",
    },
    {
      name: "Potash (MOP)",
      category: "Nutrition",
      price: 870,
      stock: 80,
      unit: "50 kg bag",
      description:
        "Muriate of Potash (60% K₂O) for improved root development, disease resistance, and grain quality.",
    },
    {
      name: "Zinc Sulphate (21%)",
      category: "Nutrition",
      price: 190,
      stock: 90,
      unit: "5 kg bag",
      description:
        "Essential micronutrient for correcting zinc deficiency in paddy and wheat soils.",
    },
    {
      name: "Neem Oil (Cold Pressed)",
      category: "Nutrition",
      price: 420,
      stock: 45,
      unit: "1 L bottle",
      description:
        "Organic pest deterrent and soil conditioner. Effective against aphids, whiteflies, and nematodes.",
    },
    {
      name: "Seaweed Extract Spray",
      category: "Nutrition",
      price: 680,
      stock: 30,
      unit: "500 mL bottle",
      description:
        "Natural plant growth stimulant derived from Ascophyllum nodosum. Boosts root growth and stress tolerance.",
    },

    // ── Tools ──────────────────────────────────────────────
    {
      name: "Garden Hand Tools Set",
      category: "Tools",
      price: 890,
      stock: 18,
      unit: "3 piece set",
      description:
        "Durable carbon-steel trowel, transplanter, and hand cultivator with ergonomic wooden grips.",
    },
    {
      name: "Agricultural Knapsack Sprayer",
      category: "Tools",
      price: 1850,
      stock: 15,
      unit: "16 L manual sprayer",
      description:
        "High-pressure brass nozzle sprayer for efficient pesticide, herbicide, and foliar spray application.",
    },
    {
      name: "Pruning Secateur (Bypass)",
      category: "Tools",
      price: 450,
      stock: 28,
      unit: "1 piece",
      description:
        "SK5 steel blade bypass secateur for clean cuts on live stems up to 20 mm. Ideal for fruit trees and roses.",
    },
    {
      name: "Soil pH Meter (3-in-1)",
      category: "Tools",
      price: 349,
      stock: 40,
      unit: "1 device",
      description:
        "Measures soil pH, moisture, and light levels. No batteries required. Instant field readings.",
    },
    {
      name: "Heavy Duty Wheelbarrow",
      category: "Tools",
      price: 3200,
      stock: 10,
      unit: "1 unit (100 L)",
      description:
        "Puncture-proof pneumatic tyre wheelbarrow with powder-coated steel tray. Load capacity 150 kg.",
    },
    {
      name: "Seed Dibbler / Planter Stick",
      category: "Tools",
      price: 180,
      stock: 55,
      unit: "1 piece",
      description:
        "Pointed stainless-steel dibbler for precise seed placement and transplanting. Length 30 cm.",
    },
    {
      name: "Weeding Hoe (Khurpi)",
      category: "Tools",
      price: 120,
      stock: 80,
      unit: "1 piece",
      description:
        "Traditional hand-forged khurpi for weeding and light soil work. Full tang with wooden handle.",
    },
    {
      name: "Shade Net (Green, 50%)",
      category: "Tools",
      price: 1100,
      stock: 20,
      unit: "3 m × 5 m roll",
      description:
        "UV-stabilised HDPE shade net providing 50% shade. Suitable for nurseries, vegetables, and floriculture.",
    },

    // ── Irrigation ────────────────────────────────────────
    {
      name: "Drip Irrigation Starter Kit",
      category: "Irrigation",
      price: 1499,
      stock: 22,
      unit: "100 sq. m kit",
      description:
        "Complete lateral drip system with 16 mm mainline, inline drippers at 30 cm spacing, connectors, and end caps.",
    },
    {
      name: "Automatic Irrigation Timer",
      category: "Irrigation",
      price: 2200,
      stock: 12,
      unit: "1 unit",
      description:
        "Programmable electronic water timer with rain delay function. Fits standard ¾-inch hose threads.",
    },
    {
      name: "Sprinkler Head Set (Pop-up)",
      category: "Irrigation",
      price: 780,
      stock: 35,
      unit: "5 piece set",
      description:
        "Adjustable 360° pop-up sprinkler heads with 3 m radius. Ideal for lawns, nurseries, and small plots.",
    },
    {
      name: "HDPE Irrigation Pipe (63 mm)",
      category: "Irrigation",
      price: 950,
      stock: 50,
      unit: "50 m coil",
      description:
        "ISI-certified black HDPE pipe rated at 4 kg/cm² pressure. UV-resistant for buried and surface laying.",
    },
    {
      name: "Rainwater Harvesting Filter",
      category: "Irrigation",
      price: 3500,
      stock: 8,
      unit: "1 unit",
      description:
        "Self-cleaning rooftop rainwater filter with first-flush diverter. Handles up to 200 sq. m roof area.",
    },
    {
      name: "Solar Water Pump (1 HP)",
      category: "Irrigation",
      price: 45000,
      stock: 5,
      unit: "1 complete set",
      description:
        "Submersible solar pump with 4 × 335 W panels, controller, and mounting structure. Lifts water up to 30 m.",
    },
  ])
    await col("products").insert(record({ ...product, archived: false }));

  for (const advisory of [
    {
      title: "Make crop inspection a weekly habit",
      severity: "Info",
      region: "All regions",
      crop: "All crops",
      body: "Record changes in leaf colour, pest presence, and soil moisture every week. Early detection saves 30–40% of potential crop losses. Share photos with your agronomist.",
    },
    {
      title: "Pre-Rabi soil testing advisory",
      severity: "Watch",
      region: "Northern & Central India",
      crop: "Wheat, Chickpea, Mustard",
      body: "Get your soil tested at the nearest KVK or soil testing lab before sowing. Apply fertilisers based on the Soil Health Card recommendation, not habit.",
    },
    {
      title: "Fall Armyworm alert",
      severity: "Urgent",
      region: "Maharashtra, Karnataka, Andhra Pradesh",
      crop: "Maize, Sorghum",
      body: "Increased Fall Armyworm (Spodoptera frugiperda) sightings reported. Scout fields early morning. Use pheromone traps and apply recommended bio-pesticides immediately on first detection.",
    },
    {
      title: "Water conservation during dry spell",
      severity: "Watch",
      region: "Rajasthan, Gujarat, Western MP",
      crop: "All standing crops",
      body: "Forecast indicates below-normal rainfall for the next 2 weeks. Prioritise mulching, reduce tillage, and schedule irrigation during early morning or late evening to minimise evaporation.",
    },
    {
      title: "Post-harvest grain storage tips",
      severity: "Info",
      region: "All regions",
      crop: "Rice, Wheat, Pulses",
      body: "Sun-dry grain to below 12% moisture before storage. Use hermetic (airtight) bags or metal bins. Treat with neem leaf powder to deter storage pests naturally.",
    },
    {
      title: "Subsidy alert: PM-KISAN instalment",
      severity: "Info",
      region: "All India",
      crop: "All crops",
      body: "PM-KISAN 18th instalment is being disbursed. Verify your Aadhaar-linked bank account on pmkisan.gov.in. Ensure land records are updated with your state revenue department.",
    },
  ])
    await col("advisories").insert(record(advisory));
  await col("posts").insert(
    record({
      ownerId: farmer._id,
      author: farmer.name,
      title: "What are you growing this season?",
      category: "General",
      body: "Welcome to the Fieldwise community! Share your crop plans, ask questions and learn from fellow growers. This is a sample discussion to get you started.",
      hidden: false,
      reports: [],
    }),
  );
});
console.log(
  demo
    ? "Local demo ready. Farmer: farmer@fieldwise.demo / FarmerDemo123! Admin: admin@fieldwise.demo / AdminDemo123!"
    : "Administrator created if absent. No sample records were inserted.",
);
