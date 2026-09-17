# Deployment — API and database

The API and its Postgres database run on Heroku, funded by the GitHub Student
Developer Pack credit of $13/month for 24 months. A Basic dyno ($7) and a
Postgres Essential-0 database ($5) total $12/month, so the credit covers the
whole bill with a dollar to spare and the dyno never sleeps.

The frontend is deployed separately — see `docs/DEPLOYMENT.md` in the frontend
repository.

## What is already in the repository

| File                       | Why it matters                                                         |
| -------------------------- | ---------------------------------------------------------------------- |
| `Procfile`                 | `release:` applies migrations before the new dyno serves traffic       |
| `app.json`                 | Declares the addon, the dyno size and every config var with its reason |
| `package.json` `engines`   | Pins Node 22; `packageManager` selects pnpm 10                         |
| `.github/workflows/ci.yml` | Type-check, lint, format, build and test against a real Postgres       |

## First deploy

```sh
heroku create keyhold-api --region eu --stack heroku-24
heroku addons:create heroku-postgresql:essential-0 --app keyhold-api
heroku ps:type web=basic --app keyhold-api
```

`--region eu` is permanent — Heroku cannot move an app between regions, only
rebuild it. It matches Resend (`eu-west-1`) and the web app's functions (`dub1`),
so no server-side request leaves Europe. The reasoning is recorded in
`docs/adr/0019-production-runs-in-europe.md` in the frontend repository.

`DATABASE_URL` is set by the addon. Everything else you set yourself:

```sh
pnpm keys:generate

heroku config:set --app keyhold-api \
  NODE_ENV=production \
  PNPM_SKIP_PRUNING=true \
  PGSSLMODE=no-verify \
  JWT_PRIVATE_KEY="$(cat jwt-private.b64)" \
  JWT_PUBLIC_KEY="$(cat jwt-public.b64)" \
  FRONTEND_URL="https://keyhol.me" \
  COOKIE_DOMAIN=keyhol.me \
  SMTP_HOST=smtp.resend.com SMTP_PORT=465 SMTP_USER=resend \
  SMTP_PASSWORD="re_..." EMAIL_FROM="noreply@keyhol.me" \
  STRIPE_API_KEY="sk_live_..." STRIPE_WEBHOOK_SECRET="whsec_..." \
  CLOUDINARY_CLOUD_NAME="..." CLOUDINARY_API_KEY="..." CLOUDINARY_API_SECRET="..." \
  SENTRY_DSN="https://...ingest.sentry.io/..."
```

TLS is handled by Heroku ACM, which issues and renews Let's Encrypt certificates
automatically and is free on paid dynos. Do not run `heroku certs:add` with the
SSL certificate bundled in the Namecheap student offer — uploading a certificate
**disables ACM for the app**, trading automatic renewal for one that expires in
twelve months and has to be re-issued and re-uploaded by hand.

`PNPM_SKIP_PRUNING=true` is not optional. Heroku prunes devDependencies at the
end of the build, `prisma` is a devDependency, and the release phase runs after
the prune — without it every deploy fails at `prisma migrate deploy`.

`PGSSLMODE=no-verify` is not optional either. Heroku Postgres rejects unencrypted
connections, and the `DATABASE_URL` it manages carries no `sslmode`, so without
this the API boots cleanly but every query fails with `no pg_hba.conf entry … no
encryption` — `/api/health` returns 503 while the dashboard shows a healthy
deploy. A green release phase is no evidence either way: Prisma's migration
engine negotiates TLS on its own, so migrations succeed while the runtime driver
cannot connect. node-postgres reads `PGSSLMODE` only when the URL has no
`sslmode`, so the setting survives Heroku rotating the credentials and leaves local
development, which has no TLS, untouched. `no-verify` encrypts without validating
the certificate chain, which Heroku's certificates cannot satisfy.

`COOKIE_DOMAIN=keyhol.me` is what makes sign-in stick. The API sets the session
cookie, but `proxy.ts` — which guards `/dashboard`, `/agent` and `/admin` — reads it
on the web app's host. A cookie with no `Domain` belongs to `api.keyhol.me` alone,
so without this a sign-in succeeds and the next page load bounces back to
`/login`. It only works because both hosts share `keyhol.me`: the `herokuapp.com`
and `vercel.app` URLs are separate sites to the browser, so authentication can
never be tested on them. Leave it unset locally.

`NODE_ENV=production` makes `env.validation.ts` reject a boot that is missing
Stripe, SMTP or Cloudinary credentials. That check is the reason a half-configured
deploy fails loudly at startup instead of silently swallowing emails.

## Backups

Essential-tier Postgres has continuous physical backups but **no rollback** —
that starts at Standard tier. Schedule logical backups instead, and pull one
down before any destructive migration:

```sh
heroku pg:backups:schedule DATABASE_URL --at "02:00 UTC" --app keyhold-api
heroku pg:backups:capture --app keyhold-api
heroku pg:backups:download --app keyhold-api
```

Heroku retains the last 7 daily backups. `pnpm db:backup` is unrelated and does
not work on this machine — it shells out to `pg_dump`, which is not installed.

## Seeding

`app.json` runs `pnpm db:seed` as a `postdeploy` script, which only fires for
review apps and Heroku Button installs, never on a normal `git push`. The seed
owns only `seed-` prefixed rows; run it by hand on the production database only
when you mean to.

```sh
heroku run pnpm db:seed --app keyhold-api
```

Never run `db:reseed` or `db:purge` against production.

## Routine deploys

```sh
git push heroku master
heroku logs --tail --app keyhold-api
```

Health lives at `/api/health` and returns 503 when the database is unreachable,
so it works as an uptime-monitor target. Swagger is at `/api/docs`.
