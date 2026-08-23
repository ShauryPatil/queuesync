# QueueSync Setup Checklist

QueueSync’s application repository is ready for real operational data. Do not add fabricated businesses, bookings, queues, reviews, metrics, or analytics to demonstrate the product. Create test records through the merchant onboarding, resource, slot, booking, and queue controls.

## Required configuration before the Supabase production migration

| Value | Where to obtain it | Exposure rule | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | Supabase project settings | Server and public web configuration as appropriate | Supabase project endpoint. |
| `SUPABASE_ANON_KEY` | Supabase project settings | Browser-safe only when RLS is enabled | Customer and merchant authenticated access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings | **Server only; never commit or expose in the desktop/web renderer** | Administrative migration and secure server automation. |
| `SUPABASE_DB_URL` | Supabase database settings | Server only | PostgreSQL connection for the final database adapter. |
| `QUEUESYNC_WEB_URL` | Your deployed QueueSync URL | Desktop build environment only | The URL loaded by the packaged Electron merchant app. |

## Supabase production database path

Create a Supabase project, enable email/password or the selected authentication providers, and apply [`supabase/migrations/0001_queuesync.sql`](../supabase/migrations/0001_queuesync.sql) through the Supabase SQL editor or CLI. The migration creates the multi-tenant PostgreSQL tables, indexes, and Row Level Security policies. Test each policy using one customer and two merchant accounts belonging to different businesses before importing any operational data.

The current managed development database remains usable for the product build and contains the matching relational model. When the Supabase credentials are provided, wire the PostgreSQL adapter in place of the development database connection, migrate only legitimate records, and verify tenant-isolation tests against the deployed policy layer.

## Real-time production options

| Approach | Trade-offs | Cost | Setup complexity |
|---|---|---:|---|
| Persistent managed application instance | Keeps the Socket.IO process connected continuously, preserving low-latency tenant rooms and native desktop alerts. This is the direct fit for QueueSync’s live operation model. | Usage-based: up to approximately **$37.50/month** at the full 1 vCPU/0.5 GB 24/7 ceiling, plus metered egress; the included $10 monthly usage credit is applied first. | Low after deployment; switch the app to persistent hosting. |
| Managed real-time provider with a stateless web backend | Reduces the need for a persistent app process but introduces a separate vendor, credentials, and a provider-specific event adapter. | Provider-dependent. | Moderate; replace the Socket.IO transport adapter and configure provider credentials. |

For a modest capstone demonstration, the persistent managed application instance is the most direct implementation route because QueueSync already has a tenant-scoped Socket.IO gateway. For larger multi-region demand, a managed real-time provider is the lighter operational scaling alternative.

## Windows merchant desktop package

Before packaging, set `QUEUESYNC_WEB_URL` to the deployed `/merchant` URL. Run `pnpm desktop:build`; the installer output is written to `release/`. The app loads the same merchant workspace and backend as the web application and invokes native Windows notifications for authenticated queue and booking events.

## Demonstration sequence

Create a merchant account, onboard a real business, add resources and operating hours, publish slots, and then use a separate customer account to create bookings or join the queue. Call, start, and complete services from the merchant workspace. This produces the event timestamps and analytics displayed by QueueSync without relying on seeded business activity.
