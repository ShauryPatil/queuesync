# QueueSync Merchant Desktop

The Electron desktop app opens the same merchant workspace and connects to the same QueueSync backend and database as the web application. It is intended for merchants to keep open during operating hours.

Run `pnpm desktop:dev` while the QueueSync development server is available. For a packaged desktop build, set `QUEUESYNC_WEB_URL` to the deployed QueueSync merchant URL and run `pnpm desktop:build`. The generated Windows installer is placed under `release/`.

Native alerts are triggered by booking and queue notifications received through the authenticated real-time connection.
