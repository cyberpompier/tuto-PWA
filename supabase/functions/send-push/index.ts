// Setup: npx supabase functions deploy send-push --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.0'

const vapidKeys = {
  publicKey: 'BHDClaG8E5f1NTSupTS_xF20XkvJ9sMsjeSYrBHObaDwrXv2h9DkJ_oTdZvOdC8z2tgZtYtKRlVSdml18VCdBr4',
  privateKey: 'n5-SS8FgbucJ9BS41XwuvABUjkdvk2dN8pnzg7j2duY'
}

// URL de votre projet
const SUPABASE_URL = 'https://quvdxjxszquqqcvesntn.supabase.co';

// Configuration de Web Push
webpush.setVapidDetails(
  'mailto:admin@zenpwa.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()

    if (!message) {
      throw new Error('Le champ "message" est requis.')
    }

    // --- CORRECTION MAJEURE ICI ---
    // On utilise la SERVICE_ROLE_KEY injectée par Supabase (Deno.env.get)
    // Cela permet de contourner les règles RLS et de lire TOUS les abonnements.
    // Si on utilisait la clé ANON, on ne verrait que l'utilisateur courant.
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!serviceRoleKey) {
        console.warn("ATTENTION: SUPABASE_SERVICE_ROLE_KEY manquant. Le broadcast risque d'échouer.");
    }

    // Fallback sur la clé Anon si jamais (mais ne marchera pas pour le broadcast si RLS actif)
    const supabaseKey = serviceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dmR4anhzenF1cXFjdmVzbnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTk3MTQsImV4cCI6MjA1NTYzNTcxNH0.MB_f2XGYYNwV0CSIjz4W7_KoyNNTkeFMfJZee-N2vKw';
    
    const supabase = createClient(SUPABASE_URL, supabaseKey);

    // Récupérer tous les abonnements
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (dbError) {
      console.error("Erreur DB:", dbError);
      throw new Error(`Erreur base de données: ${dbError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Aucun abonné trouvé.', sentTo: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Tentative d'envoi à ${subscriptions.length} abonnés...`);

    const payload = JSON.stringify({
      title: 'Zen PWA 🧘',
      body: message,
      url: '/', // Ouvre l'accueil au clic
      icon: '/icon-192.png'
    });

    // Envoi parallèle avec gestion des erreurs individuelles
    const promises = subscriptions.map(async (sub) => {
      try {
        // sub.subscription doit être l'objet JSON complet stocké par le front
        await webpush.sendNotification(sub.subscription, payload);
        return { status: 'fulfilled', id: sub.user_id };
      } catch (err) {
        // Si l'abonnement est invalide (410 Gone ou 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Nettoyage: Abonnement invalide pour ${sub.user_id}`);
          await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
        }
        console.error(`Erreur envoi pour ${sub.user_id}:`, err);
        return { status: 'rejected', id: sub.user_id, error: err };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    return new Response(JSON.stringify({ 
      success: true, 
      sentTo: successCount, 
      failed: failureCount,
      total: subscriptions.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Erreur fatale:", error);
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // 500 pour signaler clairement un crash serveur
    })
  }
})