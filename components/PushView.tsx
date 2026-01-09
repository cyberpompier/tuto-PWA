import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PageData } from '../types';

interface PushViewProps {
  data: PageData;
}

const SUPABASE_URL = 'https://quvdxjxszquqqcvesntn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dmR4anhzenF1cXFjdmVzbnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTk3MTQsImV4cCI6MjA1NTYzNTcxNH0.MB_f2XGYYNwV0CSIjz4W7_KoyNNTkeFMfJZee-N2vKw';
const VAPID_PUBLIC_KEY = 'BHDClaG8E5f1NTSupTS_xF20XkvJ9sMsjeSYrBHObaDwrXv2h9DkJ_oTdZvOdC8z2tgZtYtKRlVSdml18VCdBr4';
const EDGE_FUNCTION_URL = 'https://quvdxjxszquqqcvesntn.supabase.co/functions/v1/send-push';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

export const PushView: React.FC<PushViewProps> = ({ data }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'error' | 'success' | 'info'} | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [permissionState, setPermissionState] = useState<NotificationPermission>(typeof Notification !== 'undefined' ? Notification.permission : 'default');

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
        setPermissionState(Notification.permission);
      } catch (e) {
        console.error("Erreur checkSubscription:", e);
      }
    }
  };

  const resetAndSubscribe = async () => {
    setLoading(true);
    setStatus({ msg: "Nettoyage du service...", type: 'info' });
    
    try {
      // 1. Désinscription forcée du SW pour réinitialiser l'état
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
        // Re-enregistrement
        await navigator.serviceWorker.register('/service-worker.js');
      }

      // 2. Demande explicite de permission
      const perm = await Notification.requestPermission();
      setPermissionState(perm);
      
      if (perm === 'denied') {
        throw new Error("Vous avez bloqué les notifications. Allez dans les paramètres de votre navigateur pour les réactiver.");
      }

      if (perm === 'granted') {
        await subscribe();
      }
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setStatus({ msg: "Génération de l'abonnement push...", type: 'info' });

    try {
      const reg = await navigator.serviceWorker.ready;
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subJson = sub.toJSON();
      let userId = localStorage.getItem('zen_pwa_user_id') || crypto.randomUUID();
      localStorage.setItem('zen_pwa_user_id', userId);

      // Envoi à Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          subscription: subJson
        });

      if (error) throw new Error(`Base de données: ${error.message}`);

      setIsSubscribed(true);
      setStatus({ msg: "✅ Notifications prêtes !", type: 'success' });
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!customMessage.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ message: customMessage })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Erreur lors de la diffusion.");

      setStatus({ msg: `🚀 Diffusé à ${resData.sentTo} appareil(s).`, type: 'success' });
      setCustomMessage("");
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center pb-32">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-8 aspect-[4/5] relative">
         <img src={data.imageUrl} className="w-full h-full object-cover" alt="Focus" />
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-8 flex flex-col justify-end">
            <h2 className="text-white text-3xl font-bold">{data.title}</h2>
         </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Diagnostic de permission */}
        {permissionState === 'denied' && (
            <div className="p-4 bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200">
                ⚠️ Notifications bloquées par votre navigateur. Réinitialisez les permissions du site.
            </div>
        )}

        {status && (
          <div className={`p-4 rounded-2xl text-sm font-semibold border ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
            'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
            {status.msg}
          </div>
        )}

        {!isSubscribed ? (
          <div className="space-y-2">
            <button 
                onClick={resetAndSubscribe}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
                {loading ? "Veuillez patienter..." : "Activer les Notifications"}
            </button>
            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                Requiert HTTPS et autorisation navigateur
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600">Appareil enregistré</span>
                <button onClick={resetAndSubscribe} className="text-[10px] text-slate-400 underline uppercase">Réinitialiser</button>
            </div>
            <textarea 
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Écrivez un message ici..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-24 resize-none"
            />
            <button 
              onClick={sendBroadcast}
              disabled={loading || !customMessage.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              Envoyer à tous
            </button>
          </div>
        )}
      </div>
    </div>
  );
};