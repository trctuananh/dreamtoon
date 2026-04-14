# Project Instructions & Conventions

## API & Backend
- **Notification Endpoint:** Always use `/notify-v3` for sending emails (commissions, donations). 
  - **CRITICAL:** Do NOT use the `/api/` prefix for this specific route as it has caused 405 (Method Not Allowed) errors in the preview environment.
  - The route is defined in `server.ts` using `app.all("/notify-v3", ...)` to handle both POST (for actions) and GET (for health checks).
  - **Security Rules:** The `isValidUser` and `isValidProfile` functions in `firestore.rules` must include all optional fields like `photoURL`, `pioneerNumber`, `donateInfo`, and `commissionInfo` to prevent "Missing or insufficient permissions" errors during user login/sync.
- **Logging:** Maintain the request logging filter in `server.ts`. It is configured to only log paths starting with `/api` or `/notify-v3` to keep the console clean while allowing debugging of critical features.

## Firestore Security Rules
- **Profile Syncing:** The `isValidUser` and `isValidProfile` functions in `firestore.rules` should remain flexible to allow syncing of extended profile fields (e.g., `photoURL`, `pioneerNumber`, `donateInfo`, `commissionInfo`).
- **Commission Requests:** Ensure `isValidCommissionRequest` includes validation for `status` and `createdAt` fields.

## Frontend Development
- **API Calls:** Use relative paths (e.g., `fetch('/notify-v3', ...)`) for internal API calls to ensure they work correctly across different deployment URLs and preview environments.
- **Error Handling:** Always wrap the main application or critical sections in the `ErrorBoundary` component located at `src/components/ErrorBoundary.tsx`. This component is specifically tuned to handle and explain Firestore quota limit errors to users.

## Deployment & Environment
- **Resend Integration:** Email notifications depend on `RESEND_API_KEY` and `RESEND_FROM_EMAIL` environment variables. If missing, the server will simulate the email send for development purposes.
