/**
 * PII-safe analytics wrappers (Slice 33).
 * Never log private pet photos, memory text, or signed storage URLs.
 */

export type AnalyticsEvent =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'pet_photo_uploaded'
  | 'companion_created'
  | 'companion_reveal_viewed'
  | 'care_action_completed'
  | 'daily_care_completed'
  | 'memory_created'
  | 'memory_shared'
  | 'shop_viewed'
  | 'item_purchased_with_paw_points'
  | 'subscription_started'
  | 'subscription_canceled'
  | 'companion_deleted'
  | 'account_deleted'
  | 'generation_started'
  | 'generation_succeeded'
  | 'generation_failed'
  | 'upload_failed'
  | 'care_action_failed'
  | 'payment_failed'
  | 'notification_sent'
  | 'notification_failed';

const PII_KEYS = new Set([
  'photo_url',
  'photo_path',
  'storage_path',
  'signed_url',
  'memory_text',
  'memory_note',
  'caption',
  'note',
  'title',
  'email',
  'display_name',
  'pet_name',
]);

const URL_PATTERN = /https?:\/\/|storage\.|supabase\.co\/storage/i;

type SafeProperties = Record<string, string | number | boolean | null>;

function sanitizeProperties(props?: Record<string, unknown>): SafeProperties {
  if (!props) return {};

  const safe: SafeProperties = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.has(key)) continue;
    if (typeof value === 'string' && URL_PATTERN.test(value)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    } else if (value === null) {
      safe[key] = null;
    }
  }
  return safe;
}

type AnalyticsProvider = {
  capture: (event: AnalyticsEvent, properties?: SafeProperties) => void;
  identify: (userId: string, traits?: SafeProperties) => void;
  reset: () => void;
};

let posthogProvider: AnalyticsProvider | null = null;
let sentryEnabled = false;

/** Wire PostHog when EXPO_PUBLIC_POSTHOG_KEY is set. */
export function initAnalytics(): void {
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    posthogProvider = {
      capture: (event, properties) => {
        if (__DEV__) console.log('[PostHog]', event, properties);
      },
      identify: (userId, traits) => {
        if (__DEV__) console.log('[PostHog] identify', userId, traits);
      },
      reset: () => {
        if (__DEV__) console.log('[PostHog] reset');
      },
    };
  }

  sentryEnabled = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);
}

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  const safe = sanitizeProperties(properties);
  posthogProvider?.capture(event, safe);
  if (__DEV__) console.log('[Analytics]', event, safe);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  posthogProvider?.identify(userId, sanitizeProperties(traits));
}

export function resetAnalytics(): void {
  posthogProvider?.reset();
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const safe = sanitizeProperties(context);
  if (sentryEnabled) {
    if (__DEV__) console.error('[Sentry]', error, safe);
  } else if (__DEV__) {
    console.error('[Analytics] exception', error, safe);
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  trackEvent('upload_failed', { message, ...sanitizeProperties(context) });
}
