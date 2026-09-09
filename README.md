# EIS School Management

A role-based school-management application for administrators, teachers, students, parents, finance staff, and records staff. It includes student registration, class and subject management, attendance, fees and payments, results, communication, reporting, and school operations.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project configured with this repository's migrations and Edge Functions

## Local setup

1. Install dependencies with `npm ci`.
2. Create a `.env` file using the variables below.
3. Run `npm run dev`.
4. Open the local address printed by Vite.

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Never commit `.env` files, database passwords, service-role keys, or user credentials. Use the Supabase dashboard or your deployment provider's secret manager for server-only values.

## Quality checks

```bash
npm run build
npm run lint
```

## Deployment

Build artifacts are written to `dist/`. Configure the same `VITE_SUPABASE_*` environment variables in the deployment environment. Deploy Supabase migrations and Edge Functions separately through the Supabase CLI or CI.

## Security notes

- Apply and verify Row Level Security policies before granting users access to production data.
- Enforce permissions in Supabase policies and Edge Functions; client-side route guards are only a user-experience layer.
- Rotate any credential that was previously committed to the repository, then remove it from Git history if the repository has been shared.
