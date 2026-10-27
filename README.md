# Fieldwise

Fieldwise deploys as one Vercel project: a React interface and an Express API function. MongoDB Atlas is the only application database. Weather forecasts come from Open-Meteo.

## Features

- Farmer registration and sign in with HTTP-only session cookies
- Farm, crop, soil, and activity records
- Weather forecasts and administrator-managed advisories
- Resource catalog, stock-aware orders, and order history
- Private expert requests, community posts, and notifications
- Farmer and administrator roles with English and Hindi interface text

## Configure

Use Node.js 24. Copy `.env.example` to `.env`, then fill in:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | Atlas database name, default `fieldwise` |
| `JWT_SECRET` | Unique random value of at least 32 characters |

Use a dedicated Atlas database and database user for this project. The Atlas cluster must accept connections from Vercel. Never commit `.env` or put secrets in client-side `VITE_` variables.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. MongoDB Atlas must be configured for registration, sign in, and all saved records to work.

## Create the first administrator

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your local `.env` with real credentials, then run:

```bash
npm run create-admin
```

The command only creates the account if that email does not exist. Remove those two variables from `.env` afterward. Farmer accounts are created through normal registration. Add products and advisories through the administrator dashboard.

## Add demonstration content

Run `npm run seed` when you want example catalog products and general farming advisories in the configured MongoDB database. To also add a demonstration farm, crops, soil reading, and activities, first register a farmer account and set `SEED_OWNER_EMAIL` to that account's email in your local `.env`. The seed command does not create users. It skips records already added by an earlier run and leaves edited records unchanged. Review the `MONGODB_URI` and `MONGODB_DB` values in `.env` before running it because it writes to that database.

```bash
npm run seed
```

## Deploy to Vercel

Import this folder as one Vercel project. `vercel.json` builds the frontend into `dist` and routes `/api/*` to its Express function. Set `MONGODB_URI`, `MONGODB_DB`, and `JWT_SECRET` in the Vercel project environment variables. Do not add a separate backend service.

Orders track requests and status; there is no online payment gateway. Soil insights use readings entered by users. Weather forecasts depend on Open-Meteo availability.
