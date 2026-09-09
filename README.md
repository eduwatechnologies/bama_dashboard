# Bama Dashboard

Next.js 14 (App Router) admin dashboard for the Bama language bridge.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **CSS Modules** for component-scoped styling
- **Formik + Yup** for forms and validation
- **Axios** as the HTTP client
- **@tanstack/react-query** for server state
- **zod** available for runtime schema validation

## Design system

Tokens live in `src/lib/colors.ts` and `src/app/globals.css` and mirror the
mobile app palette in `app/constants/colors.ts`. Edit those two files to
restyle the entire dashboard.

## Getting started

```bash
cd dashboard
cp .env.example .env.local
npm install
npm run dev
```

The dashboard expects the Bama API to be reachable at
`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000/api`).

## Scripts

- `npm run dev` – start the dev server on `http://localhost:3000`
- `npm run build` – production build
- `npm run start` – run the production build
- `npm run typecheck` – `tsc --noEmit`
- `npm run lint` – `next lint`
# bama_dashboard
