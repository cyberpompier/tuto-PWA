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
    const { user_id, message } = await req.json()

    if (!user_id || !message) {
      throw new Error('user_id and message are required')
    }

    // 1. Initialiser Supabase Client
    // Note: Pour une edge function, on utilise souvent le Service Role Key pour contourner RLS si besoin, 
    // mais ici l'anon key suffit si les politiques RLS permettent la lecture.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 2. Récupérer la souscription de l'utilisateur
    const { data: subscriptionData, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single()

    if (dbError || !subscriptionData) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 3. Préparer le payload de la notification
    const payload = JSON.stringify({
      title: 'Message de Zen PWA 🧘',
      body: message,
      url: '/push'
    })

    // 4. Envoyer la notification via Web Push Protocol
    await webpush.sendNotification(
      subscriptionData.subscription,
      payload
    )

    return new Response(JSON.stringify({ success: true }), {
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