import type { CareActionType, Mood } from '../../../lib/companionEngine/types';
import type { DialogueResponse } from './types';

type FallbackTable = Record<Mood, Partial<Record<CareActionType, readonly string[]>>>;

const FALLBACKS: FallbackTable = {
  Thriving: {
    feed: ['That was amazing!', 'Best meal ever!'],
    play: ['Again! Again!', 'You throw, I zoom!'],
    groom: ['So fresh and fluffy!', 'Looking good!'],
    rest: ['Perfect nap spot.', 'Dreaming of treats!'],
  },
  Happy: {
    feed: ['Yum! That hit the spot!', 'More please! Just kidding... maybe.'],
    play: ['Best game ever!', 'Tag, you are it!'],
    groom: ['Sparkling clean!', 'Brush time is the best.'],
    rest: ['Cozy and happy.', 'Soft pillow, happy heart.'],
  },
  Calm: {
    feed: ['Thank you for the snack.', 'Nice and steady now.'],
    play: ['A gentle game sounds nice.', 'Happy to play at my pace.'],
    groom: ['That feels soothing.', 'All tidy and calm.'],
    rest: ['Peaceful rest time.', 'Quiet moments are nice.'],
  },
  Sleepy: {
    feed: ['Mmm... sleepy snack.', 'Yawn... thank you.'],
    play: ['Maybe just one toss?', 'A little play, then nap.'],
    groom: ['Soft brushes... zzz.', 'Almost asleep already.'],
    rest: ['Nap time is the best time.', 'Shhh... resting now.'],
  },
  'Needs Attention': {
    feed: ['I was hungry — thank you!', 'That helps a lot.'],
    play: ['I missed playing with you!', 'Let us have some fun.'],
    groom: ['A little TLC goes far.', 'Much better now.'],
    rest: ['Rest helps me feel better.', 'Thanks for looking after me.'],
  },
  Cozy: {
    feed: ['Warm snack, warm heart.', 'Cozy bites are the best.'],
    play: ['Snuggly playtime!', 'Fun from right here.'],
    groom: ['Soft and cozy now.', 'Comfy and clean.'],
    rest: ['Blanket burrito mode.', 'So cozy I could melt.'],
  },
  Playful: {
    feed: ['Fuel for more fun!', 'Snack break — back to play!'],
    play: ['Woohoo! Let us go!', 'This is my favorite!'],
    groom: ['Quick brush, back to play!', 'Fluffed and ready!'],
    rest: ['Power nap, then zoomies!', 'Resting... but thinking of toys.'],
  },
};

const DEFAULT_MESSAGES: Record<CareActionType, string> = {
  feed: 'Thanks for taking care of me!',
  play: 'That was fun!',
  groom: 'All clean and happy!',
  rest: 'Feeling refreshed!',
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getFallbackDialogue(
  companionId: string,
  mood: Mood,
  action: CareActionType,
): DialogueResponse {
  const templates =
    FALLBACKS[mood]?.[action] ??
    FALLBACKS.Happy[action] ??
    [DEFAULT_MESSAGES[action]];

  const index = hashString(`${companionId}:${todayKey()}:${action}`) % templates.length;
  const message = templates[index] ?? DEFAULT_MESSAGES[action];

  return {
    mood,
    message,
    memory_reference_id: null,
    suggested_action: null,
  };
}
