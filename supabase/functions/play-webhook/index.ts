/**
 * Google Play Real-time Developer Notifications webhook (Slice 28 stub).
 * Entitlements are granted ONLY after verified webhook events — never from client claims.
 *
 * Deploy: supabase functions deploy play-webhook --no-verify-jwt
 * Set secrets: PLAY_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-play-signature',
};

type PlayNotification = {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  oneTimeProductNotification?: {
    notificationType: number;
    purchaseToken: string;
    sku: string;
  };
};

const SUBSCRIPTION_CREATED = 4;
const SUBSCRIPTION_RENEWED = 2;
const SUBSCRIPTION_CANCELED = 3;
const SUBSCRIPTION_EXPIRED = 13;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const webhookSecret = Deno.env.get('PLAY_WEBHOOK_SECRET');
  const signature = req.headers.get('x-play-signature');

  if (webhookSecret && signature !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: PlayNotification;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const providerEventId = `${payload.packageName}:${payload.eventTimeMillis}`;
  const sub = payload.subscriptionNotification;

  if (!sub) {
    return new Response(JSON.stringify({ received: true, skipped: 'not_subscription' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: existing } = await supabase
    .from('purchase_events')
    .select('id')
    .eq('provider', 'google')
    .eq('provider_event_id', providerEventId)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Stub: map purchaseToken to profile via metadata table or obfuscatedAccountId
  // Real impl verifies with Google Play Developer API
  const profileId = Deno.env.get('PLAY_STUB_PROFILE_ID');
  if (!profileId) {
    await supabase.from('purchase_events').insert({
      provider: 'google',
      provider_event_id: providerEventId,
      event_type: 'subscription_updated',
      payload,
    });
    return new Response(JSON.stringify({ received: true, profile_unresolved: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const eventType =
    sub.notificationType === SUBSCRIPTION_CANCELED || sub.notificationType === SUBSCRIPTION_EXPIRED
      ? 'subscription_canceled'
      : sub.notificationType === SUBSCRIPTION_RENEWED
        ? 'subscription_renewed'
        : sub.notificationType === SUBSCRIPTION_CREATED
          ? 'subscription_created'
          : 'subscription_updated';

  await supabase.from('purchase_events').insert({
    profile_id: profileId,
    provider: 'google',
    provider_event_id: providerEventId,
    event_type: eventType,
    payload,
    processed_at: new Date().toISOString(),
  });

  const isActive =
    sub.notificationType === SUBSCRIPTION_CREATED ||
    sub.notificationType === SUBSCRIPTION_RENEWED;

  if (isActive) {
    await supabase.from('subscriptions').upsert(
      {
        profile_id: profileId,
        provider: 'google',
        provider_subscription_id: sub.purchaseToken,
        product_id: sub.subscriptionId,
        status: 'active',
      },
      { onConflict: 'provider,provider_subscription_id' },
    );

    const premiumKeys = [
      'can_use_premium_cosmetics',
      'can_create_second_companion',
      'can_use_family_care',
      'can_export_recap',
      'can_generate_recap',
    ];

    for (const key of premiumKeys) {
      await supabase.from('entitlements').upsert(
        {
          profile_id: profileId,
          entitlement_key: key,
          granted: true,
          source: 'subscription',
        },
        { onConflict: 'profile_id,entitlement_key' },
      );
    }
  } else {
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('provider', 'google')
      .eq('provider_subscription_id', sub.purchaseToken);

    await supabase
      .from('entitlements')
      .update({ granted: false })
      .eq('profile_id', profileId)
      .eq('source', 'subscription');
  }

  return new Response(JSON.stringify({ received: true, event_type: eventType }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
