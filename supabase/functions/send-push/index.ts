import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import webpush from "npm:web-push@3.6.6"

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

  console.log(`[send-push] Traitement d'une nouvelle requête...`);

  try {
    const requestData = await req.json().catch(() => ({}));
    
    // On extrait title, body et url envoyés par le client
    const { title, body, url } = requestData;

    // Validation : le corps du message est obligatoire
    if (!body) {
      console.error("[send-push] Erreur: Le champ 'body' est manquant dans la requête");
      return new Response(JSON.stringify({ error: "Le contenu du message (body) est requis" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const projectUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceKey || !projectUrl) {
      throw new Error("Configuration serveur (URL/Key) manquante");
    }

    const supabase = createClient(projectUrl, serviceKey);

    // Récupération des abonnements
    const { data: subs, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*');
    
    if (dbError) throw dbError;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ success: true, sentTo: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Construction du payload avec les données de l'interface
    const payload = JSON.stringify({
      title: title || 'Zen PWA Gallery',
      body: body,
      url: url || '/'
    });

    const results = await Promise.all(subs.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload);
        return { success: true };
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', item.id);
        }
        return { success: false };
      }
    }));

    const count = results.filter(r => r.success).length;
    console.log(`[send-push] Diffusion réussie vers ${count} appareils`);

    return new Response(JSON.stringify({ success: true, sentTo: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[send-push] Erreur critique:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})