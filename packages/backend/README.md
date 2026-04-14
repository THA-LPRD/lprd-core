# packages/backend

Convex backend workspace for schema, data integrity, permissions, and HTTP webhooks.

## What lives here

- Convex schema: `convex/schema.ts`
- Domain functions: `convex/**/*.ts`
- HTTP router: `convex/http.ts`
- WorkOS webhook handlers: `convex/workos/*.ts`
- Generated Convex code: `convex/_generated/*` (do not edit manually)

## Local development

From repo root:

```bash
bun install
cp packages/backend/.env.example packages/backend/.env
```

Then start the convex dev server:

```bash
cd packages/backend
bunx convex dev
```

## Env vars

| Key                                   | Default | Description                                                                    |
|---------------------------------------|---------|--------------------------------------------------------------------------------|
| `CONVEX_DEPLOYMENT`                   | —       | Convex deployment ID (e.g. `dev://your-deployment-id`)                         |
| `WORKOS_CLIENT_ID`                    | —       | WorkOS AuthKit client ID                                                       |
| `WORKOS_API_KEY`                      | —       | WorkOS AuthKit API key                                                         |
| `WORKOS_AUTHKIT_DOMAIN`               | —       | WorkOS AuthKit domain                                                          |
| `WORKOS_WEBHOOK_USERS_PATH_SECRET`    | —       | URL path secret for user webhook routes (generate with `openssl rand -hex 32`) |
| `WORKOS_WEBHOOK_ORGS_PATH_SECRET`     | —       | URL path secret for org webhook routes                                         |
| `WORKOS_WEBHOOK_USERS_CREATED_SECRET` | —       | WorkOS signature secret for `user.created` events                              |
| `WORKOS_WEBHOOK_USERS_UPDATED_SECRET` | —       | WorkOS signature secret for `user.updated` events                              |
| `WORKOS_WEBHOOK_USERS_DELETED_SECRET` | —       | WorkOS signature secret for `user.deleted` events                              |
| `WORKOS_WEBHOOK_ORGS_CREATED_SECRET`  | —       | WorkOS signature secret for `organization.created` events                      |
| `WORKOS_WEBHOOK_ORGS_UPDATED_SECRET`  | —       | WorkOS signature secret for `organization.updated` events                      |
| `WORKOS_WEBHOOK_ORGS_DELETED_SECRET`  | —       | WorkOS signature secret for `organization.deleted` events                      |

## WorkOS webhook routes

Configured in `convex/http.ts`:

- User events: `/api/v2/user/webhook/{create|update|deleted}-<PATH_SECRET>`
- Org events: `/api/v2/org/webhook/{created|updated|deleted}-<PATH_SECRET>`

## Related docs

- Monorepo overview: `README.md`
- Backend coding conventions: `packages/backend/AGENTS.md`

