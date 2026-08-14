# Android Auth Setup — Google Sign-In

Pet Echo uses Supabase Auth with Google OAuth on Android. The app deep-links back via the `petecho://` scheme configured in `app.config.ts`.

---

## Prerequisites

- Supabase project created ([SUPABASE_CLOUD_SETUP.md](./SUPABASE_CLOUD_SETUP.md))
- EAS CLI installed: `npm install -g eas-cli`
- EAS project linked: `eas init` (if not already done)
- Android package name: `com.petecho.app` (from `app.config.ts`)

---

## Step 1 — Google Cloud Console: OAuth Android client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project
2. Go to **APIs & Services → Credentials**
3. Click **Create Credentials → OAuth client ID**
4. If prompted, configure the **OAuth consent screen** first (External, app name, support email)
5. Choose application type **Android**
6. Fill in:
   - **Name:** `Pet Echo Android`
   - **Package name:** `com.petecho.app`
   - **SHA-1 certificate fingerprint:** (from Step 2 below)
7. Click **Create** and note the **Client ID**

Also create a **Web application** OAuth client (required by Supabase for the server-side OAuth flow):

1. **Create Credentials → OAuth client ID → Web application**
2. Name it `Pet Echo Web (Supabase)`
3. No redirect URIs needed here — Supabase handles the callback
4. Note the **Client ID** and **Client secret**

---

## Step 2 — SHA-1 from EAS credentials

Google Sign-In on Android requires the SHA-1 of the keystore used to sign your app.

### Development / preview builds

```bash
eas credentials -p android
```

Select your build profile (e.g. `preview` or `development`), then view the **Keystore** section. Copy the **SHA-1 Fingerprint**.

### Production builds

Run the same command with the `production` profile:

```bash
eas credentials -p android --profile production
```

Copy the production SHA-1 and add it as a **second** Android OAuth client (or add a second SHA-1 entry in the same client if Google Console allows).

### Local debug keystore (optional, Expo dev client only)

If testing with a local debug build:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Add this SHA-1 to Google Cloud Console as well if you sign in during local Android debugging.

---

## Step 3 — Supabase Google provider config

In Supabase: **Authentication → Providers → Google**

1. Enable **Google**
2. Paste the **Web application** Client ID and Client secret from Step 1
3. Save

Supabase uses the web client for the OAuth exchange; the Android client ID is validated by Google when the native app initiates sign-in.

---

## Step 4 — Redirect URLs

In Supabase: **Authentication → URL Configuration**

Add these **Redirect URLs**:

```
petecho://**
exp://127.0.0.1:8081/--/**
exp://localhost:8081/--/**
```

The app resolves OAuth callbacks via `getAuthRedirectUrl()` in `src/lib/supabase.ts`, which calls `Linking.createURL('/')` and produces `petecho:///` on Android release/dev-client builds (matching the `petecho` intent filter in `app.config.ts`).

For Expo Go / Metro during development, the `exp://` URLs above are also required.

---

## Step 5 — Verify on device

1. Build or run an Android dev client:

   ```bash
   npx expo run:android
   # or
   eas build --profile preview --platform android
   ```

2. Open the app → **Login**
3. Confirm **Continue with Apple** is hidden on Android
4. Tap **Continue with Google** → complete sign-in in the browser
5. App should return via `petecho://` and establish a session

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DEVELOPER_ERROR` or sign-in cancelled | SHA-1 mismatch — re-check `eas credentials` and Google Console Android client |
| Redirect loop / session not saved | Ensure `petecho://**` is in Supabase redirect URLs |
| OAuth opens but app doesn't reopen | Verify `intentFilters` with `scheme: 'petecho'` in `app.config.ts` |
| Works in dev, fails in production | Add production SHA-1 from EAS credentials to Google Console |
| "Invalid redirect URI" from Supabase | Confirm redirect URL matches `Linking.createURL('/')` output for your build type |

---

## Related docs

- [SUPABASE_CLOUD_SETUP.md](./SUPABASE_CLOUD_SETUP.md) — project keys, email OTP, general auth
- `app.config.ts` — Android package, `petecho` scheme, intent filters
- `src/lib/supabase.ts` — `getAuthRedirectUrl()`, `signInWithOAuth()`
