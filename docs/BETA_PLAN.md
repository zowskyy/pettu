# Beta Plan — Pet Echo

**Slice 42** — Small controlled release on Google Play **Internal testing** or **Closed testing**. Do not optimize for revenue during beta; optimize for retention, stability, and funnel completion.

---

## Goals

1. Validate onboarding → companion creation → daily care loop.
2. Measure crash-free sessions and generation reliability.
3. Collect qualitative feedback from ≤ 200 testers.

---

## Metrics to measure

| Metric | Definition | Target (initial) | Tool |
|--------|------------|------------------|------|
| Onboarding completion | `onboarding_completed / onboarding_started` | ≥ 70% | PostHog funnel |
| Companion creation success | Reveal viewed / generation started | ≥ 85% | PostHog |
| D1 retention | Users active day after install | ≥ 35% | PostHog |
| D7 retention | Users active 7 days after install | ≥ 15% | PostHog |
| Daily care completion | Users completing ≥1 care action per day | ≥ 40% of DAU | PostHog |
| Memory creation | Memories created / WAU | Baseline TBD | PostHog |
| Generation success rate | `generation_succeeded / generation_started` | ≥ 90% | PostHog + Sentry |
| Crash rate | Crashes / sessions | < 1% | Sentry |
| Care action failure rate | `care_action_failed / attempts` | < 2% | PostHog |
| Payment failure rate | Failed checkouts / attempts | < 5% | PostHog (beta may be low volume) |

---

## Event instrumentation (Slice 33)

Ensure these fire before beta:

- `onboarding_started`, `onboarding_completed`
- `pet_photo_uploaded`, `companion_created`, `companion_reveal_viewed`
- `care_action_completed`, `daily_care_completed`, `care_action_failed`
- `memory_created`, `generation_started`, `generation_succeeded`, `generation_failed`
- `upload_failed`, `payment_failed`

**Privacy:** Never attach pet photo URLs or memory body text to analytics payloads.

---

## Beta phases

### Phase A — Internal (team + friends, ~20 users)

- Duration: until crash rate < 1% for 7 days
- Focus: auth, onboarding, generation, Home care loop

### Phase B — Closed (~200 users)

- Duration: 2–4 weeks
- Focus: retention, memory usage, subscription funnel (optional soft launch)

---

## Exit criteria (proceed to production readiness)

- [ ] All Slice 43 production readiness items checked
- [ ] D7 retention baseline recorded (no fixed gate — document actual)
- [ ] Zero P0 security findings from Slice 34–35 live tests
- [ ] Persistence gate (Slice 38) passed on at least one physical device
- [ ] Performance baseline filled (`scripts/measure-performance.sh` output)

---

## Out of scope for beta

- Revenue optimization, pricing experiments
- Voice, AR, social feed, web client
- iOS TestFlight
