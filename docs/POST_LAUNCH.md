# Post-Launch Loop — Pet Echo

**Slice 45** — Operate after Google Play production release.

---

## Core loop

```
Monitor → measure → identify bottleneck → make one change → measure again
```

Apply **one** change per cycle. Avoid reactive feature sprawl.

---

## Monitor (daily / weekly)

| Signal | Source | Action threshold |
|--------|--------|------------------|
| Crash-free rate | Sentry | < 99% → hotfix triage |
| ANR rate | Play Console vitals | Above peer baseline → profile |
| D1 / D7 retention | PostHog | Drop > 10% WoW → funnel review |
| Generation failure rate | PostHog + job logs | > 5% → AI provider / queue |
| Care action failures | PostHog | > 2% → RPC / RLS audit |
| Payment webhook lag | Server logs | > 5 min → billing on-call |

---

## Measure

Use beta metrics from `docs/BETA_PLAN.md` as ongoing dashboards:

- Onboarding completion
- Companion creation success
- Daily care completion
- Memory creation rate
- Subscription conversion (when enabled)

---

## Identify bottleneck

Prioritize in order:

1. Crashes and data loss (persistence, deletion)
2. Onboarding / generation drop-off
3. Daily care engagement
4. Monetization (only after retention stable)

---

## Explicitly out of scope — do not build reactively

- Voice chat
- AR features
- Social feed
- PvP
- Breeding mechanics
- NFTs
- Web client
- Desktop app
- Open-ended AI chat (stay constrained dialogue per Slice 22)

---

## Release discipline

- Hotfix: crash or security only → patch version
- Minor: one measured improvement → minor version
- Rollback plan: keep previous AAB in Play Console; halt staged rollout if vitals degrade

---

## References

- `docs/PRODUCTION_READINESS.md` — pre-ship gate
- `docs/BETA_PLAN.md` — metrics definitions
- `PROJECT_STATE.md` — slice status and build IDs
- `PETTU_BUILD_SPEC.md` — feature scope authority
