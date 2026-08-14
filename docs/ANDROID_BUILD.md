# Build Pet Echo for Android (installable APK)

Pet Echo compiles to a **real Android app** via EAS Build — not Expo Go.

**Expo Go is not valid for slice verification.** Native capabilities (Google Sign-In, Play Billing, FCM, camera permissions) only work in an installed EAS dev/preview/production build. The app logs a runtime warning if opened in Expo Go.

---

## One-time setup (5 minutes)

### 1. Create Expo account
Sign up at [expo.dev](https://expo.dev) (free).

### 2. Log in on your machine
```bash
cd pettu
npm install
npx eas login
npx eas init          # links project, writes EAS_PROJECT_ID to app.config
```

### 3. Copy environment
```bash
cp .env.example .env.development
# Add your Supabase URL + anon key (already done if you set this up)
```

---

## Build development APK (install on phone)

```bash
npm run build:android:dev
```

When the build finishes, EAS prints a download URL. Open it on your Android phone → install APK.

**First install:** Enable "Install unknown apps" for your browser if prompted.

---

## Run Metro against dev build

After installing the dev APK once:

```bash
npm start
```

Open the **Pet Echo** dev APK (not Expo Go) on your phone — it connects to Metro.

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

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `An Expo user account is required` | Run `npx eas login` |
| `EAS_PROJECT_ID` empty | Run `npx eas init` |
| Google Sign-In fails | See `docs/ANDROID_AUTH_SETUP.md` |
| Build fails on SDK | Ensure `eas.json` profiles match `app.config.ts` |

---

## What the cloud agent verified

- [x] `app.config.ts` — `com.petecho.app`, permissions, deep link `petecho://`
- [x] `eas.json` — development / preview / production profiles
- [x] `expo prebuild --platform android` — native project generates cleanly
- [x] AndroidManifest permissions present
- [ ] EAS cloud build — **requires your `eas login`** (cannot run without Expo account token)
