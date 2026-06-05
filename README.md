# Bag Tag Leaderboard

Simple Next.js app for tracking bag tag event results and season leaderboard standings.

## Requirements

- Node.js 18+
- npm

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create a local env file at `.env.local`:

```bash
ADMIN_SHARED_SECRET=replace-with-a-strong-secret
# Optional for UDisc preview fetch in admin
UDISC_API_TOKEN=replace-with-your-udisc-token
```

3. Start the dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Tests

Run the test suite:

```bash
npm test
```

## Admin Login

1. Open `http://localhost:3000/admin/login`.
2. Enter the same value you set for `ADMIN_SHARED_SECRET`.
3. Submit the form to sign in.
4. On success, you will be redirected to `http://localhost:3000/admin/events/new`.

Notes:

- Admin auth is cookie-based (`admin_session`) and issued server-side.
- If `ADMIN_SHARED_SECRET` is missing, admin authentication will fail by design.
- UDisc event preview fetch in admin requires `UDISC_API_TOKEN` to be set.
