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
  
  // États pour la rédaction
  const [pushContent, setPushContent] = useState({
    title: "Zen PWA Gallery",
    body: "Une nouvelle image a été ajoutée à la galerie !",
    url: "/"
  });

  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

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

  const handleSubscribeClick = async () => {
    setLoading(true);
    setStatus({ msg: "Activation en cours...", type: 'info' });
    try {
      const perm = await Notification.requestPermission();
      setPermissionState(perm);
      if (perm === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }
        const subJson = sub.toJSON();
        let userId = localStorage.getItem('zen_pwa_user_id') || crypto.randomUUID();
        localStorage.setItem('zen_pwa_user_id', userId);
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          subscription: subJson
        });
        if (error) throw error;
        setIsSubscribed(true);
        setStatus({ msg: "✅ Notifications activées !", type: 'success' });
      }
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!pushContent.body.trim()) return;
    setLoading(true);
    setStatus({ msg: "Envoi de la campagne...", type: 'info' });

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(pushContent)
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Erreur lors de l'envoi");

      setStatus({ msg: `🚀 Diffusé avec succès à ${resData.sentTo} appareils.`, type: 'success' });
    } catch (err: any) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center pb-32 animate-fade-in">
      {/* Header Visual */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-8 aspect-[16/9] relative">
         <img src={data.imageUrl} className="w-full h-full object-cover" alt="Focus" />
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
            <h2 className="text-white text-2xl font-bold">Centre de Diffusion</h2>
            <p className="text-white/70 text-sm">Gérez vos campagnes de push</p>
         </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status && (
          <div className={`p-4 rounded-2xl text-sm font-semibold border animate-bounce-in ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
            'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
            {status.msg}
          </div>
        )}

        {!isSubscribed ? (
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Prêt à diffuser ?</h3>
            <p className="text-slate-500 text-sm">Activez les notifications sur cet appareil pour pouvoir envoyer des messages de test.</p>
            <button 
                onClick={handleSubscribeClick}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
            >
                {loading ? "Chargement..." : "S'abonner maintenant"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Redaction Form */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">Rédiger le message</h3>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Connecté</span>
              </div>
              
              <div className="space-y-3">
                <input 
                  type="text"
                  placeholder="Titre de la notification"
                  value={pushContent.title}
                  onChange={(e) => setPushContent({...pushContent, title: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                />
                <textarea 
                  value={pushContent.body}
                  onChange={(e) => setPushContent({...pushContent, body: e.target.value})}
                  placeholder="Contenu du message..."
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rediriger vers :</span>
                  <select 
                    value={pushContent.url}
                    onChange={(e) => setPushContent({...pushContent, url: e.target.value})}
                    className="flex-grow bg-transparent text-xs py-2 outline-none font-medium text-slate-600"
                  >
                    <option value="/">Accueil</option>
                    <option value="/explore">Galerie</option>
                    <option value="/profile">Profil</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Preview Sim (iOS/Android look) */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4">Aperçu en direct</p>
              <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-lg mx-2 flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <span className="text-white font-black text-xs">ZEN</span>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{pushContent.title || "Titre"}</h4>
                    <span className="text-[10px] text-slate-400">Maintenant</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {pushContent.body || "Contenu du message..."}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={sendBroadcast}
              disabled={loading || !pushContent.body.trim()}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50 shadow-xl"
            >
              Envoyer à tous les utilisateurs
            </button>
            
            <button 
              onClick={() => setIsSubscribed(false)} 
              className="w-full text-[10px] text-slate-400 underline uppercase font-bold tracking-widest py-2"
            >
              Réinitialiser l'abonnement local
            </button>
          </div>
        )}
      </div>
    </div>
  );
};