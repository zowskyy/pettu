# Build Pet Echo for Android (installable APK)

Pet Echo compiles to a **real Android app** via EAS Build — not Expo Go.

**Project ID:** set via `EAS_PROJECT_ID` in `.env.development` → `app.config.ts` `extra.eas.projectId`.  
`eas.json` does **not** store the project ID (only build profiles).

---

## Post-migration checklist (migrations done)

Supabase migrations **00001–00010** are applied. Remaining steps to get a dev APK:

### 1. Install dependencies

```bash
cd /path/to/pet-echo
npm install
```

### 2. Confirm Supabase env (already configured)

```bash
npm run check-supabase-env
```

If this fails, copy the template and add your keys:

```bash
cp .env.example .env.development
# Edit EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### 3. One-time EAS setup (login + project link)

```bash
npm run eas:setup
```

This runs `eas login`, `eas init`, and writes `EAS_PROJECT_ID` to `.env.development`.

### 4. Build development APK

```bash
npm run build:android:dev
```

When the build finishes, EAS prints a download URL. Open it on your Android phone → install APK.

**First install:** Enable "Install unknown apps" for your browser if prompted.

### 5. Run Metro against the dev build

After installing the dev APK once:

```bash
npm run start:dev-client
```

Open the **Pet Echo** app (not Expo Go) on your phone — it connects to Metro.

---

## Copy-paste quick path

```bash
npm install
npm run check-supabase-env
npm run eas:setup
npm run build:android:dev
```

---

## Build for Google Play (later)

```bash
npm run build:android:prod   # produces .aab
npx eas submit --platform android --profile production
```

---

## Verify native project locally (optional)

Generates `android/` folder (gitignored):

```bash
npm run prebuild:android
```

Confirmed permissions in manifest:
- `CAMERA`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS`, `INTERNET`, `VIBRATE`
- Package: `com.petecho.app`

Clean regenerate:

```bash
npm run prebuild:android:clean
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `An Expo user account is required` | `npm run eas:setup` or `npx eas login` |
| `EAS_PROJECT_ID` empty | `npm run eas:setup` |
| Build fails before upload | `npm run check-supabase-env` |
| Google Sign-In fails | See `docs/ANDROID_AUTH_SETUP.md` |
| Build fails on SDK | Ensure `eas.json` profiles match `app.config.ts` |

---

## What the cloud agent verified

- [x] `app.config.ts` — `com.petecho.app`, permissions, deep link `petecho://`
- [x] `eas.json` — development / preview / production profiles
- [x] `expo prebuild --platform android --no-install` — native project generates cleanly
- [x] AndroidManifest permissions present
- [ ] EAS cloud build — **requires your `npm run eas:setup`** (cannot run without Expo account token)
