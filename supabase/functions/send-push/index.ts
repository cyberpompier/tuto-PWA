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

  try {
    const { message } = await req.json();
    if (!message) throw new Error('Message manquant');

    // On récupère la clé de service pour contourner RLS et voir tous les abonnés
    // @ts-ignore
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // @ts-ignore
    const projectUrl = Deno.env.get('SUPABASE_URL') || 'https://quvdxjxszquqqcvesntn.supabase.co';
    
    if (!serviceKey) throw new Error("Clé SERVICE_ROLE_KEY introuvable sur le serveur.");

    const supabase = createClient(projectUrl, serviceKey);

    // 1. Récupérer TOUS les abonnements
    const { data: subs, error: dbError } = await supabase.from('push_subscriptions').select('*');
    
    if (dbError) throw dbError;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sentTo: 0, message: "Aucun abonné." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.stringify({
      title: 'Zen PWA Broadcast',
      body: message,
      url: '/'
    });

    // 2. Envoyer à tout le monde
    const results = await Promise.all(subs.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload);
        return { success: true };
      } catch (err) {
        // Supprimer l'abonnement s'il n'est plus valide (410 Gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('user_id', item.user_id);
        }
        return { success: false, error: err.message };
      }
    }));

    const successful = results.filter(r => r.success).length;

    return new Response(JSON.stringify({ success: true, sentTo: successful }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})