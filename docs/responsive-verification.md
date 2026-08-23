# Responsive UI Verification

The revised QueueSync interface was visually checked in the managed preview at 320px, 360px, 375px, 390px, 412px, 430px, 768px, 1024px, 1280px, 1440px, and 1920px viewport widths.

The customer navigation uses the desktop action bar at the large breakpoint and an accessible, Radix-based right-side sheet below that breakpoint. The sheet includes a backdrop, built-in close control, Escape handling, focus management, and menu actions that close the sheet on navigation.

The responsive checks covered the redesigned home page, customer live-queue empty state, merchant onboarding, and desktop customer views. No horizontal clipping or header overlap was observed in the captured views. The customer and merchant experiences use real backend queries and intentionally state when no business, booking, queue, or analytics record is available.

The customer bookings, notifications, profile/settings, and unavailable-business states were also captured at 320px and 1440px. The mobile drawer uses the prebuilt accessible dialog primitive with an overlay, focus management, close control, Escape handling, and controlled open state. The static responsive regression test verifies these implementation contracts in addition to the screenshot review.

The landing preview now pairs a public business record with a tenant-safe merchant operations panel when the signed-in user owns a business. The booking flow has a dedicated post-mutation confirmation card, and the merchant overview exposes the real Socket.IO lifecycle as a `Live connected`, `Connecting`, or reconnecting state rather than a simulated status.

The current database intentionally contains no public business record for the unavailable-business route used during empty-state verification. The production business-detail, booking-confirmation, merchant history, and administration layouts rely on the same responsive shell and real authenticated records; they become available after the merchant creates legitimate operational data through the product itself.

The browser-like drawer test exercises the actual header component, confirms that the right-side drawer opens with the Radix overlay, then verifies both its explicit close control and Escape-key dismissal. The final automated suite contains 17 passing tests.

The drawer open state was also captured at 320px and 375px. The panel is opaque, elevated above the overlay, constrained to an appropriate right-side width, and leaves the page behind it non-interactive beneath the dark backdrop. The test suite additionally covers backdrop-click dismissal.
