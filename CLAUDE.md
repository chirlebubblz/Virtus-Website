# Virtus Website — CLAUDE.md

## Stack
- Next.js 15, React 19, TypeScript, Tailwind CSS 3
- Database: Neon (PostgreSQL serverless) via `@neondatabase/serverless`
- No auth library — signed session cookies (Web Crypto HMAC) in `src/lib/session.ts`; middleware gates routes and sets security headers
- No external UI library — all components hand-built

## Structure
```
src/
  app/           # Next.js App Router pages + API routes
  components/
    dashboard/   # Internal agency OS views
    public/      # Public-facing marketing components
    portal/      # Client portal modal
    client/      # Client dashboard, login forms (token-scoped)
  db/index.ts    # In-memory AgencyDatabase class (mock store, no real DB yet)
  lib/           # neon.ts, quotationEngine.ts
  data/          # Static site content (siteData.ts)
  middleware.ts  # Auth gating + security headers
```

## Key Facts
- `src/db/index.ts` is the entire data layer — in-memory mock, no real DB writes persist
- Public site: `src/app/page.tsx` + `src/components/public/`
- Admin dashboard: `src/app/admin/page.tsx` + `src/components/dashboard/`
- Portal gateway: `src/app/portal/page.tsx`
- API routes live in `src/app/api/` — all use the in-memory store

## Auth
- Client: `/track?token=clitk_<24 hex>` (welcome) -> `POST /api/client/login` -> `vl_client` cookie -> `/client`. Tokens are stored as SHA-256 hashes, expire in 30 days, and are shown once (staff "Create/New Link" in Clients view). Regenerating ends old sessions. Bad/expired links redirect to `/client/login`.
- Staff: named accounts (email + password, PBKDF2) in Neon (`staff_users`), local in-memory store in dev. Roles `team` and `admin`. Register at `/staff/register` with a Gmail address and an invitation: either the env code (`STAFF_INVITE_CODE` team, `ADMIN_INVITE_CODE` admin) via `/staff/register#code=...`, or a personal single-use invite an admin creates in Staff & access (`#invite=...`). Codes travel in the URL fragment and are stripped after reading.
- `/admin` and all non-public `/api/*` need `admin`; `/team` is for `team` only (admins are redirected to `/admin`, team members to `/team`; no switching between the two workspaces). Middleware checks the cookie signature; `getStaff()` in `src/lib/staffAuth.ts` re-checks the account (disabled, signed out) in pages and handlers.
- Admins manage people in Staff & access: invites, role, task-board profile, disable, sign out everywhere, one-time reset links.
- Env (required in production): `SESSION_SECRET` (>= 32 chars), `DATABASE_URL` (staff accounts need it), `STAFF_INVITE_CODE`, `ADMIN_INVITE_CODE`. Optional: `STAFF_EMAIL_DOMAINS`. Seeded demo clients (`cli-1`, `cli-2`) are unreachable in production unless `ALLOW_DEMO_ACCESS=true`.
- UI rules: no emoji anywhere. Use `src/components/icons/Icon.tsx` (local inline SVG). Brand palette and type per `docs/brand-guidelines-v1.1.pdf`; workspace primitives in `src/components/dashboard/ui.tsx`.
- Client APIs live in `src/app/api/client/*` and derive the client id from the cookie only, never from the request.
- Login rate limit is in-memory per instance (`src/lib/rateLimit.ts`).

## Commands
```bash
npm run dev    # Start dev server
npm run build  # Production build
npm run lint   # ESLint
```

## Do Not Touch
- `public/fonts/` — static font assets
- `.neon/` — Neon CLI state
- `tsconfig.tsbuildinfo` — TS cache
