import { z } from "zod";
const text = (max = 120) => z.string().trim().min(1).max(max);
const number = (min, max) => z.number().finite().min(min).max(max);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Enter a valid date",
  );
export const schemas = {
  register: z.object({
    name: text(80),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(8).max(72),
  }),
  login: z.object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(72),
  }),
  farms: z.object({
    name: text(),
    location: text(),
    area: number(0.01, 1000000),
    latitude: number(-90, 90),
    longitude: number(-180, 180),
    soilType: z.enum(["Loamy", "Clay", "Sandy", "Silty", "Other"]),
  }),
  crops: z
    .object({
      farmId: text(),
      name: text(),
      variety: z.string().trim().max(120).default(""),
      plantedAt: date,
      harvestAt: date,
      stage: z.enum([
        "Planned",
        "Sowing",
        "Growing",
        "Flowering",
        "Harvest ready",
        "Harvested",
      ]),
      area: number(0.01, 1000000),
      notes: z.string().max(2000).default(""),
    })
    .refine((v) => v.harvestAt >= v.plantedAt, {
      message: "Harvest date must follow planting date",
      path: ["harvestAt"],
    }),
  soil: z.object({
    farmId: text(),
    testedAt: date,
    ph: number(0, 14),
    nitrogen: number(0, 10000),
    phosphorus: number(0, 10000),
    potassium: number(0, 10000),
    moisture: number(0, 100),
    notes: z.string().max(2000).default(""),
  }),
  activities: z.object({
    farmId: text(),
    title: text(160),
    date,
    type: z.enum([
      "Irrigation",
      "Fertilization",
      "Sowing",
      "Harvest",
      "Inspection",
      "Other",
    ]),
    notes: z.string().max(2000).default(""),
  }),
  products: z.object({
    name: text(),
    category: z.enum(["Seeds", "Nutrition", "Tools", "Irrigation"]),
    description: text(2000),
    price: number(1, 1000000).refine(
      (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
      "Use at most 2 decimal places",
    ),
    stock: z.number().int().min(0).max(1000000),
    unit: text(40),
  }),
  consultations: z.object({
    subject: text(160),
    category: z.enum(["Crop health", "Soil", "Irrigation", "General"]),
    message: text(4000),
  }),
  posts: z.object({
    title: text(160),
    category: z.enum(["General", "Crop tips", "Questions", "Success stories"]),
    body: text(4000),
  }),
  advisories: z.object({
    title: text(160),
    body: text(4000),
    severity: z.enum(["Info", "Watch", "Urgent"]),
    region: text(160),
    crop: text(80),
  }),
  order: z.object({
    items: z
      .array(
        z.object({
          productId: text(),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(30),
    address: text(1000),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d ()-]{8,20}$/, "Enter a valid phone number"),
    idempotencyKey: z.string().uuid(),
  }),
  reply: z.object({ body: text(4000) }),
  status: z.object({
    status: z.enum(["Confirmed", "Shipped", "Delivered", "Cancelled"]),
  }),
};
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw Object.assign(
      new Error(
        result.error.issues
          .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
          .join("; "),
      ),
      { status: 400 },
    );
  return result.data;
}
