/**
 * Google Play Billing stub (Slice 28).
 * Client-reported purchase success is never authoritative — entitlements
 * are granted only via verified play-webhook edge function events.
 */

export type PlayProductId = 'pet_echo_premium_monthly' | 'pet_echo_premium_yearly';

export type PlayPurchaseResult = {
  productId: PlayProductId;
  purchaseToken: string;
  orderId: string;
  acknowledged: boolean;
};

export type PlayBillingState = 'unavailable' | 'ready' | 'pending' | 'error';

let billingState: PlayBillingState = 'unavailable';

export function getPlayBillingState(): PlayBillingState {
  return billingState;
}

/** Initialize Play Billing connection. Stub — real impl uses react-native-iap or expo-in-app-purchases. */
export async function initPlayBilling(): Promise<PlayBillingState> {
  if (process.env.EXPO_PUBLIC_PLAY_BILLING_ENABLED !== 'true') {
    billingState = 'unavailable';
    return billingState;
  }
  billingState = 'ready';
  return billingState;
}

export async function fetchPlayProducts(): Promise<{ productId: PlayProductId; price: string }[]> {
  if (billingState !== 'ready') return [];
  return [
    { productId: 'pet_echo_premium_monthly', price: '$4.99' },
    { productId: 'pet_echo_premium_yearly', price: '$39.99' },
  ];
}

/**
 * Initiate purchase flow. Returns local receipt only — caller must NOT grant entitlements.
 * Server webhook is the source of truth.
 */
export async function purchaseSubscription(
  productId: PlayProductId,
): Promise<PlayPurchaseResult | null> {
  if (billingState !== 'ready') {
    throw new Error('Play Billing not available');
  }

  billingState = 'pending';

  // Stub: simulate Play purchase token for dev testing
  const result: PlayPurchaseResult = {
    productId,
    purchaseToken: `stub_token_${Date.now()}`,
    orderId: `GPA.stub.${Date.now()}`,
    acknowledged: false,
  };

  billingState = 'ready';
  return result;
}

/** Acknowledge purchase locally; entitlements sync via webhook only. */
export async function acknowledgePurchase(_purchase: PlayPurchaseResult): Promise<void> {
  // Real impl calls Play Billing acknowledgePurchase API
}

/** Restore prior purchases — triggers server-side validation, not local entitlement grant. */
export async function restorePlayPurchases(): Promise<{ restored: number }> {
  if (billingState !== 'ready') {
    return { restored: 0 };
  }
  // Client sends tokens to server for validation; webhook grants entitlements
  return { restored: 0 };
}
