# LPRD Core

Next.js 16 application with Convex backend and WorkOS authentication.

## Prerequisites

- Node.js 20+
- [Bun](https://bun.sh)
- A [Convex](https://convex.dev) account
- A [WorkOS](https://workos.com) account with AuthKit enabled

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy the environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

| Variable                              | Description                                                    |
|---------------------------------------|----------------------------------------------------------------|
| `CONVEX_DEPLOYMENT`                   | Your Convex deployment name                                    |
| `NEXT_PUBLIC_CONVEX_URL`              | Your Convex deployment URL                                     |
| `WORKOS_CLIENT_ID`                    | WorkOS client ID                                               |
| `WORKOS_API_KEY`                      | WorkOS API key                                                 |
| `WORKOS_COOKIE_PASSWORD`              | Secure string, min 32 characters                               |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI`     | OAuth callback URL (e.g., `http://localhost:3000/callback`)    |
| `WORKOS_WEBHOOK_USERS_PATH_SECRET`    | Random 32-char string                                          |
| `WORKOS_WEBHOOK_USERS_CREATED_SECRET` | Webhook secret for user.created events (from WorkOS dashboard) |
| `WORKOS_WEBHOOK_USERS_UPDATED_SECRET` | Webhook secret for user.updated events (from WorkOS dashboard) |
| `WORKOS_WEBHOOK_USERS_DELETED_SECRET` | Webhook secret for user.deleted events (from WorkOS dashboard) |

3. Set Convex environment variables:

The following environment variables must be set in Convex using `convex env set`:

```bash
convex env set WORKOS_CLIENT_ID "your_client_id_here"
convex env set WORKOS_API_KEY "your_api_key_here"
convex env set WORKOS_WEBHOOK_USERS_PATH_SECRET "your_path_secret_here"
convex env set WORKOS_WEBHOOK_USERS_CREATED_SECRET "secret_from_workos"
convex env set WORKOS_WEBHOOK_USERS_UPDATED_SECRET "secret_from_workos"
convex env set WORKOS_WEBHOOK_USERS_DELETED_SECRET "secret_from_workos"
convex env set SITE_URL "http://localhost:3000"
```

Note: The webhook secrets will be provided by WorkOS after creating the webhook endpoints (see step 6).

4. Start the Convex development server (in a separate terminal):

```bash
npx convex dev
```

5. Start the Next.js development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

6. Configure WorkOS Webhooks:

User data is synchronized from WorkOS to Convex via webhooks. Create three webhook endpoints in the [WorkOS Dashboard](https://dashboard.workos.com):

**Webhook 1: User Created**
- URL: `https://your-deployment.convex.site/webhooks/workos/users/<YOUR_PATH_SECRET>/create`
- Event: `user.created`
- Copy the webhook secret and set it: `convex env set WORKOS_WEBHOOK_USERS_CREATED_SECRET "<secret>"`

**Webhook 2: User Updated**
- URL: `https://your-deployment.convex.site/webhooks/workos/users/<YOUR_PATH_SECRET>/update`
- Event: `user.updated`
- Copy the webhook secret and set it: `convex env set WORKOS_WEBHOOK_USERS_UPDATED_SECRET "<secret>"`

**Webhook 3: User Deleted**
- URL: `https://your-deployment.convex.site/webhooks/workos/users/<YOUR_PATH_SECRET>/delete`
- Event: `user.deleted`
- Copy the webhook secret and set it: `convex env set WORKOS_WEBHOOK_USERS_DELETED_SECRET "<secret>"`

Replace `<YOUR_PATH_SECRET>` with the value from `WORKOS_WEBHOOK_USERS_PATH_SECRET` and `<secret>` with the webhook signing secret provided by WorkOS.

## Notes

- Make sure to add `/callback` to your allowed redirect URIs in WorkOS dashboard.
- Webhook endpoints use signature verification for security.
- User deletion cascades to organization memberships automatically.
