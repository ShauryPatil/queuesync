# QueueSync

QueueSync is a multi-tenant resource booking and real-time queue management platform with customer web experiences, merchant operational controls, evidence-based analytics, and a Windows Electron merchant desktop shell.

The product records booking, queue, resource, and service events in the database. Wait estimates and analytics are derived from these persisted records, so newly created businesses display truthful empty states until real activity occurs.

## Installation and local development

QueueSync is a **pnpm-managed** repository. The committed `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `patches/wouter@3.7.1.patch` files are part of the supported installation contract; plain `npm install` does not consume pnpm’s patched-dependency and override configuration and can produce resolution or peer-dependency errors. Use Node.js 20 or newer and run:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Run `pnpm check` for static type validation and `pnpm test` for the core test suite. Use `pnpm desktop:dev` to open the Electron merchant shell against the local application. If an environment cannot use Corepack, install pnpm 10.4.1 or newer and run the same commands with `pnpm`.

## Documentation

The implementation boundaries and live-operation model are documented in [`docs/architecture.md`](docs/architecture.md). The UI principles are documented in [`docs/ui-direction.md`](docs/ui-direction.md). Supabase migration, production real-time choices, and desktop packaging requirements are documented in [`docs/setup-checklist.md`](docs/setup-checklist.md).
