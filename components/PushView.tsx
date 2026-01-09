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
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'error' | 'success' | 'info'} | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setStatus({ msg: "Initialisation...", type: 'info' });

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error("Permission refusée par l'utilisateur.");

      const reg = await navigator.serviceWorker.ready;
      
      // On force un nouvel abonnement pour garantir la validité des clés
      const oldSub = await reg.pushManager.getSubscription();
      if (oldSub) await oldSub.unsubscribe();

      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subJson = newSub.toJSON();
      const userId = localStorage.getItem('zen_pwa_user_id') || crypto.randomUUID();
      localStorage.setItem('zen_pwa_user_id', userId);

      // SAUVEGARDE CRITIQUE
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          subscription: subJson
        });

      if (error) {
        console.error("Supabase Error:", error);
        throw new Error(`Erreur serveur : ${error.message}. Vérifiez les politiques RLS de votre table.`);
      }

      setIsSubscribed(true);
      setStatus({ msg: "✅ Appareil prêt à recevoir des notifications !", type: 'success' });
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!customMessage.trim()) return;
    setSending(true);
    setStatus({ msg: "Envoi en cours...", type: 'info' });

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

      setStatus({ msg: `🚀 Diffusé avec succès à ${resData.sentTo} appareil(s) !`, type: 'success' });
      setCustomMessage("");
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center animate-fade-in pb-32">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mb-8 aspect-[4/5] relative">
         <img src={data.imageUrl} className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-6 flex flex-col justify-end">
            <h2 className="text-white text-3xl font-bold">{data.title}</h2>
         </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status && (
          <div className={`p-4 rounded-xl text-sm font-medium border ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
            status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 
            'bg-blue-50 text-blue-700 border-blue-100'
          }`}>
            {status.msg}
          </div>
        )}

        {!isSubscribed ? (
          <button 
            onClick={subscribe}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Activation..." : "Activer les notifications"}
          </button>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              Service de Push Opérationnel
            </div>
            
            <textarea 
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Écrivez un message pour tout le monde..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-28 resize-none"
            />

            <button 
              onClick={sendBroadcast}
              disabled={sending || !customMessage.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md disabled:opacity-50 active:scale-95 transition-all"
            >
              {sending ? "Diffusion..." : "Envoyer à tous les appareils"}
            </button>
            
            <button onClick={subscribe} className="w-full text-xs text-slate-400 hover:text-indigo-600 transition-colors">
              Réinitialiser l'abonnement en cas de problème
            </button>
          </div>
        )}
      </div>
    </div>
  );
};