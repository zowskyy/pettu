# Google Play Store Submission — Pet Echo

**Slice 44** — Android-only v1 submission via EAS production build.

Package: `com.petecho.app`  
Build: `npm run build:android:prod` → AAB upload to Play Console

---

## Pre-submission checklist

### App bundle

- [ ] Production AAB from EAS `production` profile
- [ ] Version code incremented in `app.config.ts` / `android/app/build.gradle`
- [ ] Release notes drafted

### Store listing

- [ ] App icon — 512×512 PNG
- [ ] Feature graphic — 1024×500
- [ ] Phone screenshots — min 2, recommended 8 (Home, onboarding, reveal, memories, shop)
- [ ] Short description — ≤ 80 characters
- [ ] Full description — features, daily care, memories, family care (if enabled)
- [ ] Keywords / category — Lifestyle or Entertainment (confirm at submission time)

### Policy & compliance

- [ ] Privacy policy URL — data collected, Supabase, analytics, AI providers
- [ ] Terms of service URL
- [ ] Support email or URL
- [ ] Account deletion instructions — in-app path + web FAQ matching Play requirements
- [ ] Data safety form — photos, account info, app activity, diagnostics
- [ ] Age rating questionnaire completed
- [ ] Subscription disclosures — if Play Billing enabled: price, renewal, cancel path

### Android-specific

- [ ] Target API level meets Play current requirement (check at submission)
- [ ] Permissions justified — camera, photos, notifications, billing
- [ ] Google Sign-In OAuth client — SHA-1 from EAS credentials in Google Cloud Console
- [ ] Play App Signing enrolled
- [ ] Internal testing track smoke test passed

---

## EAS commands

```bash
npx eas login
npx eas init   # if not linked
npm run build:android:prod
npx eas submit --platform android --profile production
```

See also: `docs/ANDROID_BUILD.md`, `eas.json`, `DEPLOYMENT.md`.

---

## Post-submission

- Monitor Play Console vitals (ANR, crash rate)
- Staged rollout: 5% → 20% → 100% after 48h stable
- Link production Sentry release to version code

---

## Deferred

- Apple App Store config — post-Android launch
- Web PWA listing — out of scope v1
