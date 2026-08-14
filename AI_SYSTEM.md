# Pet Echo — AI System

**Last updated:** Slice 01  
**Principle:** AI is a presentation and content layer. It never mutates game state. All AI calls go through a provider-agnostic abstraction; screens never import provider SDKs.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Features / Screens                                         │
│  (Home, Reveal, Memories, Recap)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ generateCompanion()
                          │ generateDialogue()
                          │ generateCaption()
                          │ generateRecap()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  services/ai/                                               │
│  ├── AIProvider.ts          (interface)                     │
│  ├── ImageGenerationService.ts                            │
│  ├── DialogueService.ts                                     │
│  ├── CaptionService.ts                                      │
│  └── RecapService.ts                                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   providers/        Edge Functions    Fallback
   (swappable)       (server-side        Engine
                     generation jobs)
```

### Client vs server split

| Capability | Where it runs | Why |
|------------|---------------|-----|
| Companion image generation | Edge function (async job) | API key security, long latency |
| Caption generation | Edge function (async job) | Same |
| Monthly recap | Edge function (async job) | Same |
| Dialogue | Edge function (sync, short timeout) | API key security; fast enough for care loop |
| Validation & fallbacks | Edge function + shared validators | Consistent safety |

Client `services/ai/` modules are thin facades that call edge functions or poll job status — they do not embed provider SDKs.

---

## 2. Provider Abstraction

### 2.1 `AIProvider` interface

```typescript
interface AIProvider {
  readonly name: string;

  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
  generateText(input: TextGenerationInput): Promise<TextGenerationOutput>;
}

interface ImageGenerationInput {
  prompt: string;
  referenceImageUrls: string[];  // signed URLs, server-side only
  style: ArtStyle;
  width: number;
  height: number;
}

interface TextGenerationInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  responseFormat: 'json' | 'text';
}
```

### 2.2 Provider directory

```
services/ai/providers/
  ├── index.ts           # Active provider selection via env
  ├── openai.ts          # Example implementation
  ├── replicate.ts       # Example implementation
  └── mock.ts            # Tests only
```

**Swap rule (Slice 16 verification):** Change `providers/index.ts` export — zero screen changes.

### 2.3 Configuration

```
AI_PROVIDER=openai          # server env only
AI_PROVIDER_KEY=sk-...      # server env only
AI_IMAGE_MODEL=...            # per capability
AI_TEXT_MODEL=...
```

---

## 3. Generation Types

### 3.1 Companion image (`companion_image`)

**Trigger:** Onboarding complete, after 5+ photos uploaded.

**Input assembly (edge function):**
- Species, name, nickname, personality traits, favorite things, quirk
- Art style: `cozy_storybook` | `playful_3d` | `pixel_adventure`
- Up to 10 reference photos (signed URLs to provider)

**Prompt template (conceptual):**
```
Create a {art_style} illustration of a {species} named {name}.
Personality: {traits}. Loves: {favorites}. Quirk: {quirk}.
Match the likeness from reference photos. Warm, family-friendly, no text in image.
```

**Output:** PNG stored at `generated-companions/{companion_id}/main.png`

**Job record:** `generation_jobs` + `ai_generations`

### 3.2 Dialogue (`dialogue`)

**Trigger:** After care action on Home screen (non-blocking to care success).

**Context sent to model (bounded):**
```json
{
  "companion_name": "Buddy",
  "species": "dog",
  "personality_traits": ["playful", "loyal"],
  "mood": "happy",
  "recent_action": "feed",
  "optional_memory": {
    "id": "uuid",
    "title": "Park day",
    "note": "Loved the frisbee"
  }
}
```

**Required response (strict JSON):**
```json
{
  "mood": "happy",
  "message": "That was delicious!",
  "memory_reference_id": null,
  "suggested_action": "play"
}
```

**Constraints:**
- `message`: ≤160 characters, ≤2 sentences
- `mood`: must match allowed mood enum
- `suggested_action`: `feed` | `play` | `groom` | `rest` | null
- No medical advice
- No claims of consciousness or biological suffering
- No references to being a real animal in distress

### 3.3 Caption (`caption`)

**Trigger:** Optional after memory creation.

**Context:**
- Memory photo (signed URL)
- User note only (title + note text)

**Output:** ≤180 characters. Must not invent events, locations, or people not present in note/photo context.

**Example safe caption:** "A sunny afternoon with Buddy and his favorite frisbee."

**Example rejected:** "Buddy met three new dog friends at the park" (if note doesn't mention other dogs).

### 3.4 Recap (`recap`)

**Trigger:** End of month when companion has ≥3 memories in that month.

**Input:** 3–5 memory records (titles, notes, dates — not full images in prompt if avoidable; use summaries).

**Output:**
- `recap_text`: Short paragraph (3–5 sentences)
- `share_image_path`: Generated share card in `generated-recaps/`

**Gated by:** `can_generate_recap` / `can_export_recap` entitlements.

---

## 4. Generation Job Pipeline

### 4.1 States

```
queued → processing → succeeded
                   → failed
                   → cancelled
                   → expired
```

### 4.2 Flow

```
1. Client POST create-generation-job (idempotent)
2. Insert generation_jobs (status: queued)
3. Worker picks job (status: processing, started_at set)
4. Call AIProvider
5. Validate output
6. Store artifact to Storage
7. Update job (status: succeeded, result JSON)
8. Update domain record (companions.generated_image_path, memories.caption, etc.)
```

### 4.3 Failure handling

| Failure | Behavior |
|---------|----------|
| Provider timeout | Job → `failed`; client shows retry |
| Provider 500 | Job → `failed`; retry with backoff (max 3 attempts) |
| Invalid output | Job → `failed`; no partial domain corruption |
| Network interrupt mid-job | Expiry sweep → `expired` or `failed` (Slice 17) |
| User kills app | Job continues server-side; client polls on resume |

**Companion creation:** Failed generation does not corrupt companion row — `creation_status` stays recoverable; retry uses same idempotency key or new job without duplicate companion.

### 4.4 Timeout & expiry

- Default job TTL: 10 minutes (`expires_at`)
- Cron / scheduled function sweeps stuck `processing` jobs past TTL → `expired`
- Dialogue sync timeout: 8 seconds → fallback

---

## 5. Validation Layer

### 5.1 JSON schema validation

All text AI outputs parsed with strict schema (e.g. Zod). Malformed JSON → reject → fallback.

### 5.2 Safety filters

Post-parse checks on `message` and captions:

| Rule | Action on violation |
|------|---------------------|
| Length > limit | Truncate or reject → fallback |
| Medical keywords (vet, sick, medicine, ...) | Reject → fallback |
| Consciousness claims ("I think", "I feel pain", ...) | Reject → fallback |
| Suffering language ("hurts", "dying", "scared alone", ...) | Reject → fallback |
| Sentence count > 2 | Reject → fallback |

### 5.3 Fallback dialogue engine

Deterministic templates keyed by `(mood, recent_action)`:

```typescript
const FALLBACKS: Record<Mood, Record<CareAction, string[]>> = {
  happy: {
    feed: ["Yum! That hit the spot!", "More please! Just kidding... maybe."],
    play: ["Best game ever!", "Again! Again!"],
    // ...
  },
  // ...
};
```

Selection: hash(companion_id + date + action) % templates.length for variety without randomness per request.

**Care action always succeeds** regardless of dialogue outcome.

---

## 6. What AI Must Never Do

1. Write `joy`, `energy`, `bond`, `xp`, `level`, `paw_points`, or `cooldowns`
2. Grant entitlements or inventory
3. Access database directly (no tool use)
4. Receive full user profile or other users' data
5. Receive raw storage credentials
6. Block UI on synchronous image generation

---

## 7. Cost & Rate Controls

- Entitlement check before job creation
- Max concurrent jobs per user: 2
- Max companion regenerations per day: 3 (configurable)
- Log `tokens_used` and `latency_ms` in `ai_generations` for monitoring
- Input hashing for dedup debug (no raw photo bytes in logs)

---

## 8. Testing Strategy (AI-specific)

| Test | Slice | Method |
|------|-------|--------|
| Provider swap | 16 | Change provider index; screens unchanged |
| Job lifecycle | 17 | Kill network mid-job; verify terminal state |
| Style generation | 18 | One success per art style |
| Dialogue validation | 22 | Feed malformed/unsafe output → fallback |
| Caption factuality | 24 | Ambiguous photo + minimal note → no invented facts |
| Failure matrix | 36 | Timeout, 500, empty, overlong, rate limit |

**Mock provider** (`providers/mock.ts`) used in unit tests — returns deterministic outputs without network.

---

## 9. Observability

Events (PostHog):
- `generation_started`, `generation_succeeded`, `generation_failed`

Sentry:
- Tag: `ai.provider`, `ai.generation_type`, `ai.error_code`
- Never attach: photo URLs, memory text, full prompts with PII

---

## 10. Future Considerations (out of v1 scope)

- Multi-provider failover (primary + fallback provider)
- On-device model for offline dialogue fallback
- User feedback on dialogue quality (thumbs up/down — no content stored)
