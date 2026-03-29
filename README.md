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

3. Start the Convex development server (in a separate terminal):

```bash
bunx convex dev
```

4. Start the Next.js development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

### Next.js (`.env.local`)

| Variable                          | Description                                                 |
| --------------------------------- | ----------------------------------------------------------- |
| `CONVEX_DEPLOYMENT`               | Your Convex deployment name                                 |
| `NEXT_PUBLIC_CONVEX_URL`          | Your Convex deployment URL                                  |
| `WORKOS_CLIENT_ID`                | WorkOS client ID                                            |
| `WORKOS_API_KEY`                  | WorkOS API key                                              |
| `WORKOS_AUTHKIT_DOMAIN`           | WorkOS AuthKit domain                                       |
| `WORKOS_COOKIE_PASSWORD`          | Secure string, min 32 characters                            |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | OAuth callback URL (e.g., `http://localhost:3000/callback`) |
| `SITE_URL`                        | Your site URL (e.g., `http://localhost:3000`)               |
| `NEXT_PUBLIC_CONVEX_SITE_URL`     | Your Convex site URL                                        |

### Convex (`bunx convex env set`)

The following must also be set in Convex:

| Variable                              | Description                               |
| ------------------------------------- | ----------------------------------------- |
| `WORKOS_CLIENT_ID`                    | WorkOS client ID                          |
| `WORKOS_API_KEY`                      | WorkOS API key                            |
| `WORKOS_AUTHKIT_DOMAIN`               | WorkOS AuthKit domain                     |
| `SITE_URL`                            | Your site URL                             |
| `WORKOS_WEBHOOK_USERS_PATH_SECRET`    | Path secret for user webhook URLs         |
| `WORKOS_WEBHOOK_USERS_CREATED_SECRET` | Signing secret for `user.created`         |
| `WORKOS_WEBHOOK_USERS_UPDATED_SECRET` | Signing secret for `user.updated`         |
| `WORKOS_WEBHOOK_USERS_DELETED_SECRET` | Signing secret for `user.deleted`         |
| `WORKOS_WEBHOOK_ORGS_PATH_SECRET`     | Path secret for org webhook URLs          |
| `WORKOS_WEBHOOK_ORGS_CREATED_SECRET`  | Signing secret for `organization.created` |
| `WORKOS_WEBHOOK_ORGS_UPDATED_SECRET`  | Signing secret for `organization.updated` |
| `WORKOS_WEBHOOK_ORGS_DELETED_SECRET`  | Signing secret for `organization.deleted` |

## WorkOS Webhooks

User and organization data is synced from WorkOS via webhooks. Create the following endpoints in the [WorkOS Dashboard](https://dashboard.workos.com):

### User Webhooks

| Event          | URL                                                                          |
| -------------- | ---------------------------------------------------------------------------- |
| `user.created` | `https://<deployment>.convex.site/api/v2/user/webhook/create-<PATH_SECRET>`  |
| `user.updated` | `https://<deployment>.convex.site/api/v2/user/webhook/update-<PATH_SECRET>`  |
| `user.deleted` | `https://<deployment>.convex.site/api/v2/user/webhook/deleted-<PATH_SECRET>` |

### Organization Webhooks

| Event                  | URL                                                                         |
| ---------------------- | --------------------------------------------------------------------------- |
| `organization.created` | `https://<deployment>.convex.site/api/v2/org/webhook/created-<PATH_SECRET>` |
| `organization.updated` | `https://<deployment>.convex.site/api/v2/org/webhook/updated-<PATH_SECRET>` |
| `organization.deleted` | `https://<deployment>.convex.site/api/v2/org/webhook/deleted-<PATH_SECRET>` |

Replace `<deployment>` with your Convex deployment name and `<PATH_SECRET>` with the respective path secret. Copy the signing secrets from WorkOS and set them as Convex env vars.

## Notes

- Add `/callback` to your allowed redirect URIs in the WorkOS dashboard.
- Webhook endpoints use signature verification for security.
