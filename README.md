# Fieldwise

Fieldwise is a single Vercel project for farm management. The React interface and Express API deploy together; MongoDB Atlas stores production data. It has its own warm field journal visual identity and product copy.

## What it includes

- Farmer registration and sign in, with secure HTTP-only session cookies
- Farm, crop, soil, and activity records
- Seven-day weather forecasts from Open-Meteo and admin advisories
- Resource catalog, stock-aware orders, and order history
- Private expert consultation requests and community discussions
- Farmer and admin roles, notifications, and English/Hindi UI

## Run locally

Requires Node.js 24 and npm.

```bash
npm ci
```

Copy `.env.example` to `.env`. Set `MONGODB_URI`, `MONGODB_DB=fieldwise`, and a random `JWT_SECRET` of at least 32 characters. For a local preview without Atlas, set `DEMO_MODE=true` and run `npm run seed` to add sample data. Demo mode is disabled automatically on Vercel and in production.

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. Run `npm test` and `npm run build` before deployment.

## Deploy as one Vercel project

Import this folder as one Vercel project. The included `vercel.json` builds the Vite app into `dist` and routes `/api/*` to the Express serverless function. There is no separate backend deployment.

Set these Vercel environment variables for Production, Preview as needed:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | `fieldwise` (use a separate database from any other app) |
| `JWT_SECRET` | Unique random secret, at least 32 characters |
| `DEMO_MODE` | `false` |

Atlas must permit the Vercel function to connect. Use an Atlas database user with access only to the Fieldwise database. Atlas and the weather provider are managed services; the app itself is a single Vercel deployment.

To create an initial admin and catalog, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` locally in `.env` and run `npm run seed` once against the Fieldwise Atlas database. Do not commit `.env` or use credentials from another project. Ordinary registration creates farmer accounts only.

Orders record requests and tracking status; there is no online payment gateway. Soil insights are based on entered readings, and weather forecasts depend on the external provider.
