# Your Supabase project is connected!

**Project:** `qtpsjrqvjfhplhcvphev`  
**URL:** https://qtpsjrqvjfhplhcvphev.supabase.co

Your URL and anon key are saved in `.env.development` (not committed to git).

---

## One thing left: apply the database schema

The app needs tables (`profiles`, `companions`, etc.). I need your **database password** to create them automatically.

### Where to find it

1. Open [Supabase Dashboard → Database Settings](https://supabase.com/dashboard/project/qtpsjrqvjfhplhcvphev/settings/database)
2. Under **Database password**, click **Reveal** (or reset if you forgot it)
3. Paste the password here in chat — I'll run the migrations and delete it from logs

> This is the password you chose when creating the project — **not** the anon key you already shared.

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
