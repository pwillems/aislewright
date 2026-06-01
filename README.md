# Aislewright

Aislewright is an open-source, self-hostable wedding website and RSVP platform. One install is
one wedding: content, guests, household magic links, RSVP, menu collection,
Friday activity intent, carpooling, admin reporting, and exports.

This repository is intentionally a clean build. It does not reuse code,
database migrations, components, or authentication logic from the original Pim
and Kelly wedding site. That site is only a product reference.

## What Works In This First Version

- React/Vite wedding site with guest and admin areas.
- Fastify API with Postgres persistence.
- Household magic links with hashed invite tokens.
- First-run owner setup.
- RSVP, dietary confirmation, menu choices, Friday activity intent, and
  carpooling.
- Admin content editor, household/guest manager, reports, and CSV exports.
- Docker Compose packaging for web, API, and Postgres.
- MIT-licensed public core.

Deferred on purpose: hosted SaaS, payments, custom-domain automation, managed
email, tenant routing, premium themes, and billing.

## Local Development

Requirements:

- Node.js 22 or newer.
- pnpm via Corepack.
- Postgres 16, or Docker if you want the Compose setup.

~~~bash
corepack pnpm install
copy .env.example .env
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
~~~

Web runs at http://localhost:5173. The API runs at http://localhost:4000.

## Docker

~~~bash
cp .env.example .env
docker compose -f deploy/docker-compose.yml up --build
~~~

After the app starts, open /admin and complete first-run owner setup.

## Invite Links

Guest access is household-scoped. Admins generate fresh invitation links from
the admin reports screen. The app stores only token hashes, so exported links
should be saved or printed when generated.

## Repository Layout

~~~text
apps/web          React wedding site and admin UI
apps/api          Fastify API
packages/shared   Zod schemas and shared types
packages/db       SQL migrations and seed data
deploy            Docker packaging
~~~

## Release Criteria For v0.1.0

- A fresh install can run with Docker Compose.
- An owner can complete first-run setup.
- A guest can open a household invite link and complete RSVP/menu/activity
  details.
- A couple can manage households, review reports, export planning data, and
  moderate carpooling.
- Private Pim and Kelly data is removed from public demo seeds before release.
