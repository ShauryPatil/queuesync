# QueueSync

QueueSync is a multi-tenant resource booking and real-time queue management platform with customer web experiences, merchant operational controls, evidence-based analytics, and a Windows Electron merchant desktop shell.

The product records booking, queue, resource, and service events in the database. Wait estimates and analytics are derived from these persisted records, so newly created businesses display truthful empty states until real activity occurs.

## Local development

Run `pnpm dev` to start the full-stack web application. Run `pnpm check` for static type validation and `pnpm test` for the core test suite. Use `pnpm desktop:dev` to open the Electron merchant shell against the local application.

## Documentation

The implementation boundaries and live-operation model are documented in [`docs/architecture.md`](docs/architecture.md). The UI principles are documented in [`docs/ui-direction.md`](docs/ui-direction.md). Supabase migration, production real-time choices, and desktop packaging requirements are documented in [`docs/setup-checklist.md`](docs/setup-checklist.md).
