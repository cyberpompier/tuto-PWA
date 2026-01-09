// Déploiement : npx supabase functions deploy send-push --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.0'

const VAPID_KEYS = {
  publicKey: 'BHDClaG8E5f1NTSupTS_xF20XkvJ9sMsjeSYrBHObaDwrXv2h9DkJ_oTdZvOdC8z2tgZtYtKRlVSdml18VCdBr4',
  privateKey: 'n5-SS8FgbucJ9BS41XwuvABUjkdvk2dN8pnzg7j2duY'
}

webpush.setVapidDetails(
  'mailto:admin@zenpwa.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log(`[Push Server] Nouvelle tentative de broadcast...`);

  try {
    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "Le champ 'message' est vide." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // @ts-ignore
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // @ts-ignore
    const projectUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceKey || !projectUrl) {
      throw new Error("Configuration serveur (env vars) manquante.");
    }

    const supabase = createClient(projectUrl, serviceKey);

    // Récupérer tous les abonnés
    const { data: subs, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*');
    
    if (dbError) throw dbError;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ success: true, sentTo: 0, message: "Aucun abonné en base." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.stringify({
      title: 'Zen PWA',
      body: message,
      url: '/'
    });

    const results = await Promise.all(subs.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload);
        return { success: true };
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('user_id', item.user_id);
        }
        return { success: false };
      }
    }));

    const count = results.filter(r => r.success).length;
    console.log(`[Push Server] Succès: ${count}/${subs.length}`);

    return new Response(JSON.stringify({ success: true, sentTo: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[Push Server] Erreur critique: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})