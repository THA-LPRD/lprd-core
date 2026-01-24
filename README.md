# LPRD Core

Next.js 16 application with Convex backend and WorkOS authentication.

## Prerequisites

- Node.js 20+
- pnpm
- A [Convex](https://convex.dev) account
- A [WorkOS](https://workos.com) account with AuthKit enabled

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOYMENT` | Your Convex deployment name |
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL |
| `WORKOS_CLIENT_ID` | WorkOS client ID |
| `WORKOS_API_KEY` | WorkOS API key |
| `WORKOS_COOKIE_PASSWORD` | Secure string, min 32 characters |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | OAuth callback URL (e.g., `http://localhost:3000/callback`) |

3. Start the Convex development server (in a separate terminal):

```bash
npx convex dev
```

4. Start the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Notes

- Make sure to add `/callback` to your allowed redirect URIs in WorkOS dashboard.
