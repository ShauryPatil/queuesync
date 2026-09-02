# QueueSync real-data demonstration workflow

QueueSync is designed to demonstrate a complete, database-backed customer and merchant workflow. The application does not create sample businesses, artificial queue positions, generated customers, or fabricated analytics. When a business has not configured a service, schedule, or slot, the interface deliberately presents a truthful empty state.

## What is persisted

| Area | Persisted records | How the application uses them |
|---|---|---|
| Identity and tenancy | Users, profiles, business members | Protected procedures scope merchant operations to authorized business membership. |
| Configuration | Businesses, services, resources, service-resource assignments, schedules, slots | Merchants create their own operating setup; services are assignable only to resources belonging to the same business. |
| Customer operations | Bookings and queue entries | A booking must reference a published slot. Queue entries derive their place from ordered, active database records. |
| Service delivery | Queue timestamps and service sessions | Merchant call, start, complete, no-show, and cancellation actions persist status transitions and timestamps. |
| Evidence | Event logs and notifications | Important actions record an actor, timestamp, related business, resource, booking, or queue entry as applicable. |
| Analytics | Bookings, queue records, and completed service sessions | Metrics and charts query persisted records only; sparse periods show no-data states rather than invented values. |

## Merchant setup

The merchant signs in at `/merchant`, creates a business if necessary, and configures real resources and operating hours. The **Manage services** action in **Resources & slots** opens `/merchant/services`. There, the merchant creates an active service with a duration, capacity, optional price, and description, then assigns that service to an owned resource. A merchant can publish service-specific booking slots only after the associated resource supports that service.

## Customer booking and queue workflow

Customers discover businesses through database queries. On a business page, configured services appear only when active service records exist. Selecting a service filters customer-visible slots to that persisted service. Booking confirmation validates the exact slot, business, resource, time window, resource condition, optional service assignment, and conflicting booking records on the server before creating a booking.

For a queue join, QueueSync verifies that the business is open according to its saved schedule, that a selected resource is currently available, that the optional service is assigned to that resource, and that the customer has no active entry at that business. A unique active-key constraint at the database layer prevents two near-simultaneous joins from creating duplicate active entries for the same customer and business.

## Live multi-device demonstration

Use two authenticated browser sessions or the Electron merchant shell and a customer browser. The sequence below creates only real records through the product UI.

1. The merchant configures a business, resource, operating hours, service, service-resource assignment, and service-specific slot.
2. The customer discovers that business, selects the service, and either books the published slot or joins the currently open live queue.
3. The merchant workspace receives the server-emitted queue update through Socket.IO without polling.
4. The merchant calls the entry, starts service using an atomically reserved available resource, then completes it.
5. The customer live queue page receives the same user-targeted events, displays the current status, position, service context, join time, and final outcome without a manual refresh.
6. Queue events, notifications, resource state, service session timestamps, and analytics all update from those stored records.

## Safeguards to explain during viva

| Concern | QueueSync safeguard |
|---|---|
| Tenant isolation | Merchant procedures check business membership; customer bookings, queue entries, and notifications are scoped to the authenticated user. |
| Invalid bookings | Every booking references a published slot and is checked for matching business/resource/time plus existing resource conflicts. |
| Duplicate queue joins | Active queue lookup provides a friendly conflict response, while the `activeKey` unique constraint resolves concurrent insertion races. |
| Concurrent service starts | The selected resource is conditionally changed from `available` to `busy`; competing starts cannot reserve the same resource. |
| Queue order | Position is derived from active entries ordered by join timestamp and stable queue-entry identifier, not saved as a frontend counter. |
| Real-time updates | Database-backed transitions emit Socket.IO events to merchant, business, and authenticated customer rooms. |
| Auditability | Event logs persist the action type, actor, relevant entity references, and occurrence time. |
| Honest analytics | Charts aggregate stored bookings, queue entries, and completed sessions; no records produce explicit empty states. |

## Desktop relationship

The Electron merchant shell loads the same `/merchant` application and uses the same authenticated API and real-time transport as the browser. It therefore observes the same business configuration, queue transitions, bookings, notifications, and analytics records. Its initial window background also matches QueueSync’s dark-only operational interface.

## Deferred genuine-data demonstration

The installed workflow is ready for the final live demonstration, but the current business has no saved service record. QueueSync intentionally leaves its catalog and customer booking slots empty rather than inserting a sample offering, appointment, queue entry, notification, or analytics event. The automated regression suite now proves service creation, service-resource assignment, service-specific slot persistence, service-filtered customer booking inputs, service-aware queue snapshots, and service completion side effects including resource release, audit event, and customer notification. When the merchant can provide genuine service details, the remaining walkthrough is: create the service, assign it to an owned resource, publish a future service slot, book it from a customer session or join the live queue, and transition it in the merchant workspace. The resulting stored records will then be visible in customer history, notifications, operational history, and analytics without any change to the application code.

## Authenticated live-demo result — 2 September 2026

Using the authenticated Shap merchant session, the provided real configuration was confirmed in the product: active service **Spa / Hair dry**, **30 minutes**, **capacity 1**, **₹2.99**, assigned to **Testres**. A future service-specific slot was published for **3 September 2026 at 09:00–09:30**. The customer flow displayed the service, assigned resource, price, and slot; the booking was confirmed and persisted. The merchant Bookings view displayed the confirmed appointment, the Notifications view displayed the booking confirmation, and Analytics displayed **Confirmed bookings: 1** with a persisted booking-activity point.

The live queue join was intentionally not forced because Shap has no operating schedule saved and the application correctly reported that the business is closed to new queue entries. No schedule or queue record was invented. To complete the queue-specific call → start → complete demonstration later, the merchant must first provide genuine operating hours through **Business settings** or **Resources & slots**. The advance-booking path is fully demonstrated from authentic configuration through customer confirmation, merchant visibility, notification, audit evidence, and analytics.
