# Supabase Cloud Setup (Option C)

Pet Echo uses **Supabase Cloud** for auth, PostgreSQL, storage, and edge functions. Follow these steps once to connect your project.

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose an organization, name it `pet-echo-dev` (or similar)
4. Set a strong database password (save it in a password manager)
5. Pick a region close to you
6. Wait ~2 minutes for provisioning

---

## Step 2 — Copy API keys

In your project: **Project Settings → API**

| Value | Where it goes |
|-------|---------------|
| **Project URL** | `EXPO_PUBLIC_SUPABASE_URL` |
| **anon / publishable key** | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| **service_role key** | Server only — never in the Expo app |

---

## Step 3 — Configure local env

```bash
cp .env.example .env.development
```

Edit `.env.development` and paste your URL and anon key:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

> `.env.development` is gitignored. Never commit real keys.

---

## Step 4 — Configure Auth redirect URLs

In Supabase: **Authentication → URL Configuration**

Add these **Redirect URLs**:

```
petecho://**
exp://127.0.0.1:8081/--/**
exp://localhost:8081/--/**
```

**Site URL** (for magic links in dev):

```
exp://127.0.0.1:8081
```

For production builds, add your EAS scheme URL later.

### Enable auth providers

**Authentication → Providers**

- **Email** — enable magic link
- **Google** — add OAuth client ID/secret from Google Cloud Console
- **Apple** — add Apple Services ID (required for iOS App Store later)

---

## Step 5 — Apply database migrations

Install the Supabase CLI (one time):

```bash
npm install
npx supabase login
```

Link to your cloud project (replace `YOUR_PROJECT_REF`):

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Push migrations:

```bash
npm run db:push
```

This applies:

- `00001_initial_schema.sql` — all tables
- `00002_rls_enable.sql` — RLS policies
- `00003_storage_buckets.sql` — private buckets
- `00004_care_actions.sql` — care action RPC

Verify in Supabase **Table Editor** — you should see `profiles`, `companions`, etc.

---

## Step 6 — Run the app

```bash
npm start
```

Test auth:

1. Open app → Login screen
2. Enter email → receive magic link
3. Kill app → relaunch → session should restore (Slice 05 verify)

---

## Step 7 — Staging & production (later)

Create separate Supabase projects for staging and production. Copy `.env.example` to:

- `.env.staging`
- `.env.production`

Never share projects across environments.

---

## Security checklist

- [ ] `npm run check-secrets` passes (no service_role in client)
- [ ] RLS enabled on all tables (verify in Supabase dashboard)
- [ ] Storage buckets are **private** (not public)
- [ ] service_role key stored only in Supabase Edge Function secrets / CI

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key" | Check URL and anon key in `.env.development`; restart Expo |
| Magic link doesn't open app | Add redirect URLs in Supabase Auth settings |
| OAuth fails on device | Use Expo dev client; ensure Google/Apple credentials configured |
| Migration fails | Run `npx supabase db push --debug`; check SQL errors in dashboard |
| RLS blocks all reads | Sign in first; policies require `auth.uid()` |

---

## What the agent can do after you share keys

Paste your **Project URL** and **anon key** in chat (safe to share). Keep **service_role** private unless you want the agent to run migrations — share it only in a secure channel or run `npm run db:push` yourself.

The agent can then:

- Wire env vars
- Apply migrations
- Run Slice 06 cross-account RLS tests
- Verify auth end-to-end
