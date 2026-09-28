# WhenNotToMeet

A TypeScript React app built with [TanStack Start](https://tanstack.com/start) (SSR), Drizzle ORM
on Postgres, Better Auth, Tailwind CSS, React Email, and Motion.

## Stack

- **Framework:** TanStack Start (React 19, Vite, SSR)
- **Data:** Drizzle ORM + PostgreSQL (`pg`)
- **Auth:** Better Auth (email/password + GitHub OAuth)
- **Validation:** Zod (including a typed, camelCased `.env`)
- **UI:** [Intent UI](https://intentui.com) (React Aria Components) on Tailwind CSS v4 (CSS-first)
- **Styling:** Tailwind CSS v4 with light/dark theming (driven by `data-theme`)
- **Email:** React Email + Nodemailer
- **Animation:** Motion
- **Tooling:** Biome, TypeScript, pnpm

## UI components

Intent UI components live in `src/components/ui` (with shared primitives in `src/lib/primitive.ts`).
The theme is defined CSS-first in `src/app/globals.css` — there is no `tailwind.config.ts`. Add more
components with the shadcn CLI, e.g.:

```bash
pnpm dlx shadcn@latest add @intentui/select @intentui/checkbox
```

React Aria links/buttons navigate through TanStack Router via the `RouterProvider` wired up in
`src/app/routes/__root.tsx`.

## Getting started

```bash
pnpm install
cp .env.example .env          # then fill in secrets

docker compose up -d          # Postgres on :5432, Mailpit UI on :8025
pnpm run db:generate          # generate the SQL migration from the schema
pnpm run db:migrate           # apply it

pnpm run dev                  # http://localhost:3000
```

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Start the dev server                     |
| `pnpm build`        | Build for production                     |
| `pnpm start`        | Run the built app (Node)                 |
| `pnpm typecheck`    | Type-check with `tsc`                    |
| `pnpm lint`         | Lint/format check with Biome             |
| `pnpm format`       | Format with Biome                        |
| `pnpm db:generate`  | Generate Drizzle migrations              |
| `pnpm db:migrate`   | Apply Drizzle migrations                 |
| `pnpm db:studio`    | Open Drizzle Studio                      |
| `pnpm email:dev`    | Preview emails at http://localhost:3000  |

## Environment

Environment variables are validated and camelCased via `src/env.ts`. Use `publicEnv()` for
client-safe values and `privateEnv()` for server-only values. See `.env.example` for the full list.
