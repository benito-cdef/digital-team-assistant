# OTP + tester whitelist rollout

The security change is intentionally split into two database migrations so the
pilot is not locked out before email delivery and the authenticated frontend are
ready.

## 1. Apply the non-breaking foundation

Apply `20260721132502_auth_foundation.sql`. It:

- creates `tester_allowlist` and seeds it from the existing `users` table;
- links existing Supabase Auth identities by normalized email;
- creates the server-side signup hook and profile synchronization triggers;
- adds role helpers for the future RLS policies;
- leaves all legacy anonymous policies unchanged.

After applying it, verify that every current pilot user appears in both
`public.users` and `public.tester_allowlist`.

## 2. Configure Auth email delivery

In the Supabase dashboard for project `xnekmhtmapkxzcrdzhoh`:

1. Open **Authentication > Emails > SMTP Settings** and configure a custom SMTP
   provider. The built-in mailer is not suitable for sending OTPs to colleagues.
2. Open **Authentication > Email Templates > Magic Link** and use a six-digit
   code instead of a link. Minimal body:

   ```html
   <h2>Digital Team Assistant</h2>
   <p>Il tuo codice di accesso è:</p>
   <p style="font-size: 28px; letter-spacing: 6px"><strong>{{ .Token }}</strong></p>
   <p>Il codice è monouso. Se non hai richiesto l'accesso, ignora questa email.</p>
   ```

3. Set a reasonable OTP expiry (15 minutes is appropriate for the pilot) and
   keep the resend rate limit enabled.
4. Configure the production Site URL and allowed redirect URLs, even though the
   six-digit OTP flow does not depend on email links.

## 3. Enable the server-side whitelist hook

Open **Authentication > Hooks** and set **Before User Created** to the Postgres
function:

```text
public.hook_restrict_dta_signup
```

This is mandatory. The frontend domain check is only a usability check; the
hook is the server-side access boundary for new identities.

## 4. Test before cutover

Use at least three accounts:

| Account | Expected result |
| --- | --- |
| Whitelisted `user` | OTP succeeds; content is read-only |
| Whitelisted `editor` | OTP succeeds; plan/calendar writes succeed |
| Non-whitelisted company email | Signup is rejected before an Auth user is created |

Also verify that the existing `super_admin` can add and remove testers in
Settings. Removing a tester must immediately make database and Storage queries
fail, even if that tester still has an Auth session.

## 5. Deploy the authenticated frontend

Deploy the code that uses `supabase.auth.signInWithOtp`, `verifyOtp`, and the
private Storage client. Confirm the three test cases above on the deployed URL.

The publishable key is expected to be present in the browser. Never put a
`service_role`, `sb_secret_...`, SMTP password, or provider API secret in a
`VITE_` variable.

## 6. Apply the secure cutover

Only after the deployed OTP flow works, apply
`20260721132503_secure_rls_storage_cutover.sql`. It:

- revokes all Data API privileges from `anon`;
- replaces permissive table policies with user/editor/super-admin RLS;
- makes the audit log immutable to clients;
- makes `calendar-data` private;
- allows Storage reads to active testers and writes only to editors/admins.

Immediately rerun all three role tests and the Supabase Security Advisor.

## Operational notes

- Add a tester from **Settings > Utenti** before they request their first OTP.
- New testers default to `user` unless explicitly assigned another role.
- Removing a tester disables the allowlist row before deleting the profile, so
  access fails closed if the second operation encounters an error.
- SSO can replace OTP later without redesigning the profile table or RLS model.

