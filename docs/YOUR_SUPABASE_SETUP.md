# Your Supabase project is connected!

**Project:** `qtpsjrqvjfhplhcvphev`  
**URL:** https://qtpsjrqvjfhplhcvphev.supabase.co

Your URL and anon key are saved in `.env.development` (not committed to git).

---

## One thing left: apply pending database migrations

Migrations **00001–00006** are already applied. You still need **00007–00010** (idempotency, paw points, deletion, generation job policies).

The cloud agent **cannot connect directly** to your database from this environment (network restriction).  
You have two options:

### Option A — SQL Editor (easiest, ~2 minutes)

1. Open: [SQL Editor → New query](https://supabase.com/dashboard/project/qtpsjrqvjfhplhcvphev/sql/new)
2. Open **`supabase/APPLY_00007_00010.sql`** in this repo (pending migrations only)
3. **Select all → Copy → Paste → Run**

> Do **not** re-run the full `APPLY_ALL.sql` — that will error on objects that already exist.

### Option B — From your computer (CLI)

```bash
SUPABASE_DB_PASSWORD='your-password' npm run db:push
```

This pushes any migration in `supabase/migrations/` not yet recorded in Supabase's migration history.

> **Security:** Reset your database password in [Database Settings](https://supabase.com/dashboard/project/qtpsjrqvjfhplhcvphev/settings/database) if you shared it in chat.

---

## What I already did for you

- Configured `.env.development` with your URL + anon key
- Switched login to **6-digit email code** (no redirect URL setup needed)
- Fixed migrations and RLS policies
- Prepared `npm run db:push` script

---

## After migrations (or if you prefer DIY)

Run in terminal yourself:
```bash
SUPABASE_DB_PASSWORD='your-password' npm run db:push
```

Or in Supabase **SQL Editor**, run each file in `supabase/migrations/` in order (00001 → 00005).

---

## Enable email login in Supabase (30 seconds)

1. [Authentication → Providers → Email](https://supabase.com/dashboard/project/qtpsjrqvjfhplhcvphev/auth/providers)
2. Ensure **Email** is enabled
3. Under **Email OTP**, confirm it's on (sends 6-digit codes)

---

## Test the app

```bash
npm start
```

1. Enter your email → receive 6-digit code
2. Enter code → signed in
3. Kill app → reopen → session should restore
