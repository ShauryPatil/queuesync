# QueueSync Architecture

QueueSync uses one multi-tenant domain model for every supported service category. A business owns resources, defines availability, accepts advance bookings, and manages one live operational queue. Every operational record is scoped by a `businessId`, and every merchant mutation is authorized against an explicit business membership.

| Layer | Responsibility | Isolation boundary |
|---|---|---|
| Customer web experience | Discovery, booking, live queue visibility, notifications | Customers can access only their own bookings, queue entries, and notifications. |
| Merchant web and desktop experiences | Business configuration, queue control, resources, booking operations, analytics | Business membership is verified for every mutation and query. |
| Application backend | Validation, state transitions, wait estimates, event generation, real-time publication | The backend derives tenant scope from the requested business and authenticated membership. |
| Relational database | Persisted operational data, timestamps, audit records, and analytics source data | Every tenant-owned table includes `businessId`; user-owned data is constrained by `customerId` or `userId`. |

The application records lifecycle timestamps only when real actions occur. Dashboard values are calculated from those persisted records and report an empty state where a calculation cannot be supported by actual history.

The queue state machine permits `waiting → called → in_service → completed`, with controlled `no_show` and `cancelled` terminal states. The server validates each transition, writes the event log, updates resources and affected queue estimates, emits tenant-scoped events, and creates appropriate notifications in one logical operation.

For deployments requiring continuously connected Socket.IO clients, QueueSync should run on a persistent single-process service. The same codebase remains compatible with a managed project database during development and includes a Supabase migration path for the required PostgreSQL deployment.

