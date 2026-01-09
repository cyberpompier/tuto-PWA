import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PageData } from '../types';

interface PushViewProps {
  data: PageData;
}

// Configuration Supabase identique au backend
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

  const getUserId = () => {
    let id = localStorage.getItem('zen_pwa_user_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('zen_pwa_user_id', id);
    }
    return id;
  };

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch (e) {
        console.error("Erreur lors de la vérification de l'abonnement:", e);
      }
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setStatus({ msg: "Demande de permission...", type: 'info' });

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        throw new Error("Permission de notification refusée. Activez-la dans les réglages.");
      }

      const reg = await navigator.serviceWorker.ready;
      
      // On nettoie l'ancien abonnement pour éviter les collisions
      const oldSub = await reg.pushManager.getSubscription();
      if (oldSub) await oldSub.unsubscribe();

      setStatus({ msg: "Génération des clés Push...", type: 'info' });
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subJson = newSub.toJSON();
      const userId = getUserId();

      setStatus({ msg: "Enregistrement sur le serveur...", type: 'info' });
      
      // Tentative d'enregistrement dans Supabase
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
        console.error("Erreur Supabase RLS/Table:", error);
        throw new Error(`Impossible de sauvegarder l'abonnement: ${error.message}`);
      }

      setIsSubscribed(true);
      setStatus({ msg: "✅ Notifications activées avec succès !", type: 'success' });
    } catch (err: any) {
      console.error('Erreur inscription complète:', err);
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!customMessage.trim()) return;
    setSending(true);
    setStatus({ msg: "Diffusion mondiale en cours...", type: 'info' });

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ 
            message: customMessage 
        })
      });

      const resData = await response.json();
      
      if (!response.ok) {
        throw new Error(resData.error || "Le serveur de push a rencontré un problème.");
      }

      setStatus({ 
        msg: `🚀 Message envoyé à ${resData.sentTo} appareil(s) !`, 
        type: 'success' 
      });
      setCustomMessage("");
    } catch (err: any) {
      console.error("Erreur d'envoi broadcast:", err);
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center animate-fade-in pb-32">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 aspect-[4/5] relative group border border-slate-100">
         <img 
           src={data.imageUrl} 
           className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
           alt="Visual focus"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
            <span className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">{data.subtitle}</span>
            <h2 className="text-white text-4xl font-extrabold tracking-tight">{data.title}</h2>
         </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status && (
          <div className={`p-4 rounded-2xl text-sm font-semibold border shadow-sm animate-bounce-subtle ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
            'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
            <div className="flex items-center gap-3">
               <span className="flex-shrink-0">{status.type === 'error' ? '🚫' : status.type === 'success' ? '✨' : '📡'}</span>
               {status.msg}
            </div>
          </div>
        )}

        {!isSubscribed ? (
          <div className="space-y-4">
            <p className="text-slate-500 text-center text-sm px-4">
              Abonnez-vous pour que d'autres utilisateurs puissent vous envoyer des messages en temps réel.
            </p>
            <button 
              onClick={subscribe}
              disabled={loading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? "Configuration..." : "Activer les Notifications"}
            </button>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Appareil Connecté
              </div>
              <button onClick={subscribe} className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold uppercase tracking-wider">
                Réparer l'accès
              </button>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Global</label>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Qu'avez-vous à dire au monde ?"
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-700 text-base h-32 resize-none transition-all placeholder:text-slate-300"
                />
            </div>

            <button 
              onClick={sendBroadcast}
              disabled={sending || !customMessage.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Transmission...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                  Envoyer à tous
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};