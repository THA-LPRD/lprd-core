# apps/core

Next.js 16 app workspace for LPRD Core.

## What lives here

- App Router pages/layouts/routes in `src/app/`
- UI composition and feature components in `src/components/`
- App-specific helpers in `src/lib/`
- Site context/provider in `src/providers/`

## Local development

From repo root:

```bash
bun install
cp apps/core/.env.example apps/core/.env.local
```

Then start the app:

```bash
cd apps/core
bun dev
```

## Env vars

| Key                               | Default                          | Description                                                                   |
|-----------------------------------|----------------------------------|-------------------------------------------------------------------------------|
| `NEXT_PUBLIC_CONVEX_URL`          | —                                | Convex deployment URL                                                         |
| `CONVEX_DEPLOY_KEY`               | —                                | Convex admin key, used by legacy display API routes that call Convex directly |
| `BASE_URL`                        | —                                | Public app origin used by AuthKit callback redirects                          |
| `WORKOS_CLIENT_ID`                | —                                | WorkOS AuthKit client ID                                                      |
| `WORKOS_API_KEY`                  | —                                | WorkOS AuthKit API key                                                        |
| `WORKOS_AUTHKIT_DOMAIN`           | —                                | WorkOS AuthKit domain (e.g. `https://your-org.authkit.app`)                   |
| `WORKOS_COOKIE_PASSWORD`          | —                                | Cookie encryption secret, minimum 32 characters                               |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `http://localhost:3000/callback` | OAuth callback URL                                                            |
| `REDIS_HOST`                      | `127.0.0.1`                      | Redis/Valkey host                                                             |
| `REDIS_PORT`                      | `6379`                           | Redis/Valkey port                                                             |
| `REDIS_PASSWORD`                  | *(unset)*                        | Redis/Valkey password, optional                                               |

## Related docs

- Monorepo overview: `README.md`
- App/route conventions for agents: `apps/core/AGENTS.md`
