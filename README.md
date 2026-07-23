# Digital Team Assistant

Internal Golden Goose Digital Team pilot for consolidating commercial calendars,
brand activity, weekly plans, year-over-year comparisons, reports, and shared
documentation.

## Local development

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The Supabase publishable key is browser-safe and authorization is enforced by
Row Level Security. Never place a Supabase secret/service-role key in a `VITE_`
environment variable.

## Authentication and pilot access

Access uses a six-digit Supabase email OTP plus an explicit tester whitelist.
Roles are `user`, `editor`, and `super_admin`. See
[SECURITY_ROLLOUT.md](./SECURITY_ROLLOUT.md) before applying database migrations
or changing the Storage bucket.

## Checks

```bash
npm run build
npm run lint
```
