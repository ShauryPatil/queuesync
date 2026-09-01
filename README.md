# QueueSync

QueueSync is a multi-tenant resource booking and real-time queue management platform with customer web experiences, merchant operational controls, evidence-based analytics, and a Windows Electron merchant desktop shell.

The product records booking, queue, resource, and service events in the database. Wait estimates and analytics are derived from these persisted records, so newly created businesses display truthful empty states until real activity occurs.

## Installation and local development

QueueSync supports **npm and pnpm**. Use Node.js 20 or newer and run the npm workflow:

```bash
npm install
npm run dev
```

The committed `package-lock.json` makes the npm install reproducible. The repository also retains its pnpm lockfile, workspace patch configuration, and package-manager metadata, so the equivalent pnpm workflow is:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Run `npm run check` or `pnpm check` for static type validation and `npm test` or `pnpm test` for the core test suite. Use `npm run desktop:dev` or `pnpm desktop:dev` to open the Electron merchant shell.

## Documentation

The implementation boundaries and live-operation model are documented in [`docs/architecture.md`](docs/architecture.md). The UI principles are documented in [`docs/ui-direction.md`](docs/ui-direction.md). Supabase migration, production real-time choices, and desktop packaging requirements are documented in [`docs/setup-checklist.md`](docs/setup-checklist.md).
