// Follow this setup guide to integrate the Deno runtime into your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.0'

// Clés VAPID (Note: En production, utilisez Deno.env.get('VAR_NAME'))
const vapidKeys = {
  publicKey: 'BHDClaG8E5f1NTSupTS_xF20XkvJ9sMsjeSYrBHObaDwrXv2h9DkJ_oTdZvOdC8z2tgZtYtKRlVSdml18VCdBr4',
  privateKey: 'n5-SS8FgbucJ9BS41XwuvABUjkdvk2dN8pnzg7j2duY'
}

const SUPABASE_URL = 'https://quvdxjxszquqqcvesntn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dmR4anhzenF1cXFjdmVzbnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTk3MTQsImV4cCI6MjA1NTYzNTcxNH0.MB_f2XGYYNwV0CSIjz4W7_KoyNNTkeFMfJZee-N2vKw';

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()

    if (!message) {
      throw new Error('message is required')
    }

    // 1. Initialiser Supabase Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 2. Récupérer TOUTES les souscriptions (Broadcast)
    // On ne filtre plus par user_id
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')

    if (dbError) {
        throw new Error(`DB Error: ${dbError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Préparer le payload de la notification
    const payload = JSON.stringify({
      title: 'Message de Zen PWA 🧘',
      body: message,
      url: '/push'
    })

    // 4. Envoyer à tout le monde
    const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(sub.subscription, payload);
                return { status: 'fulfilled', userId: sub.user_id };
            } catch (error) {
                // Gestion basique des abonnements invalides (410 Gone)
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.log(`Subscription expired for user ${sub.user_id}, deleting...`);
                    await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
                }
                console.error(`Error sending to user ${sub.user_id}:`, error);
                throw error;
            }
        })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    return new Response(JSON.stringify({ 
        success: true, 
        sentTo: successCount, 
        failed: failureCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})