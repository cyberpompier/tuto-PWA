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
  // Gestion CORS pour les requêtes preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`[Push] Requête reçue: ${req.method}`);

  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      console.error("[Push] Erreur: Message vide dans le corps de la requête");
      throw new Error('Le message est requis pour la notification.');
    }

    // Récupération des secrets d'environnement Supabase
    // @ts-ignore
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // @ts-ignore
    const projectUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceKey || !projectUrl) {
      console.error("[Push] Erreur: Variables d'environnement manquantes (SERVICE_ROLE_KEY ou URL)");
      throw new Error("Configuration serveur incomplète.");
    }

    const supabase = createClient(projectUrl, serviceKey);

    // 1. Récupérer TOUS les abonnements de la base de données
    console.log("[Push] Récupération des abonnements depuis la table push_subscriptions...");
    const { data: subs, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*');
    
    if (dbError) {
      console.error("[Push] Erreur DB lors de la lecture:", dbError.message);
      throw dbError;
    }

    if (!subs || subs.length === 0) {
      console.log("[Push] Aucun abonné trouvé en base de données.");
      return new Response(JSON.stringify({ 
        success: true, 
        sentTo: 0, 
        message: "Aucun appareil n'est actuellement abonné." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`[Push] Envoi en cours à ${subs.length} abonnés...`);

    const notificationPayload = JSON.stringify({
      title: 'Zen PWA Broadcast 🧘',
      body: message,
      url: '/',
      icon: '/icon-192.png'
    });

    // 2. Envoi parallèle des notifications
    const results = await Promise.all(subs.map(async (item) => {
      try {
        // item.subscription est l'objet JSON généré par le navigateur
        await webpush.sendNotification(item.subscription, notificationPayload);
        return { success: true, userId: item.user_id };
      } catch (err) {
        console.error(`[Push] Échec pour l'utilisateur ${item.user_id}:`, err.message);
        
        // Nettoyage automatique des abonnements obsolètes (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Push] Nettoyage: Suppression de l'abonnement expiré pour ${item.user_id}`);
          await supabase.from('push_subscriptions').delete().eq('user_id', item.user_id);
        }
        return { success: false, userId: item.user_id, error: err.message };
      }
    }));

    const successfulCount = results.filter(r => r.success).length;
    console.log(`[Push] Diffusion terminée. Succès: ${successfulCount}/${subs.length}`);

    return new Response(JSON.stringify({ 
      success: true, 
      sentTo: successfulCount, 
      total: subs.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Push] Erreur fatale dans la fonction:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne du serveur lors de l\'envoi' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})