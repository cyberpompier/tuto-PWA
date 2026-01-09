import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PageData } from '../types';

interface PushViewProps {
  data: PageData;
}

// Configuration Supabase
const SUPABASE_URL = 'https://quvdxjxszquqqcvesntn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dmR4anhzenF1cXFjdmVzbnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTk3MTQsImV4cCI6MjA1NTYzNTcxNH0.MB_f2XGYYNwV0CSIjz4W7_KoyNNTkeFMfJZee-N2vKw';
const VAPID_PUBLIC_KEY = 'BHDClaG8E5f1NTSupTS_xF20XkvJ9sMsjeSYrBHObaDwrXv2h9DkJ_oTdZvOdC8z2tgZtYtKRlVSdml18VCdBr4';
const EDGE_FUNCTION_URL = 'https://quvdxjxszquqqcvesntn.supabase.co/functions/v1/send-push';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilitaire pour convertir la clé VAPID
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const PushView: React.FC<PushViewProps> = ({ data }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
      }
    }
  };

  const subscribeToPush = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // 1. Demander la permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        throw new Error('Permission de notification refusée');
      }

      // 2. S'inscrire au Push Manager
      const registration = await navigator.serviceWorker.ready;
      
      // On se désabonne d'abord pour être sûr d'avoir des clés fraîches si besoin
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // 3. Sauvegarder dans Supabase
      const subJson = subscription.toJSON();
      const userId = getUserId();

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          subscription: subJson
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setIsSubscribed(true);
      setMessage("✅ Abonnement activé !");
    } catch (err: any) {
      console.error('Erreur inscription:', err);
      setMessage(`❌ Erreur: ${err.message || 'Impossible de s\'abonner'}`);
    } finally {
      setLoading(false);
    }
  };

  const sendRealPush = async () => {
    if (!customMessage.trim()) return;
    setSending(true);
    setMessage(null);

    try {
      // Utilisation directe de fetch vers l'URL fournie
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          // On envoie toujours l'ID au cas où, mais le backend va maintenant broadcaster
          user_id: getUserId(),
          message: customMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Si l'abonnement n'est pas trouvé dans la DB mais que le navigateur dit qu'on est inscrit
        if (response.status === 404 || (errorData.error && errorData.error.includes('Subscription not found'))) {
             setIsSubscribed(false); // Force l'interface à redemander l'inscription
             throw new Error("Abonnement introuvable. Veuillez vous réabonner.");
        }
        
        throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
      }
      
      const result = await response.json();
      setMessage(`🚀 Notification envoyée à ${result.sentTo} appareil(s) !`);
      setCustomMessage("");
    } catch (err: any) {
      console.error("Erreur d'envoi:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const testLocalNotification = () => {
    if (Notification.permission === 'granted') {
        new Notification("Test Local", {
            body: "Si vous voyez ceci, votre appareil peut afficher les notifications.",
            icon: "/icon-192.png"
        });
        setMessage("✅ Notification locale envoyée");
    } else {
        setMessage("⚠️ Permission non accordée pour le test local");
        Notification.requestPermission();
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center text-center animate-fade-in pb-32">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mb-8 aspect-[4/5] relative group">
         <img 
           src={data.imageUrl} 
           alt={data.title}
           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
           loading="lazy"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
            <span className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">{data.subtitle}</span>
            <h2 className="text-white text-3xl font-bold">{data.title}</h2>
         </div>
      </div>

      <div className="max-w-md mx-auto w-full">
        <p className="text-slate-600 leading-relaxed text-lg mb-6">
          {isSubscribed 
            ? "Appareil connecté. Envoyez une notification à TOUS les utilisateurs."
            : "Activez les notifications pour recevoir les alertes de tout le monde."
          }
        </p>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm font-medium border ${message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message}
          </div>
        )}

        {!isSubscribed ? (
            <button 
                onClick={subscribeToPush}
                disabled={loading}
                className="w-full px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow-lg shadow-indigo-200 active:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
                {loading ? <span className="animate-spin text-xl">◌</span> : null}
                Activer les notifications
            </button>
        ) : (
            <div className="w-full p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Service Actif
                    </div>
                    <button onClick={testLocalNotification} className="text-xs text-indigo-600 hover:underline">
                        Test Local
                    </button>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Message Broadcast (Tout le monde)</label>
                    <textarea 
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Ex: Alerte générale..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none h-24"
                    />
                </div>

                <div className="flex gap-2">
                    <button 
                      onClick={sendRealPush}
                      disabled={sending || !customMessage.trim()}
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium shadow-md shadow-indigo-100 active:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Diffusion...
                        </>
                      ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                            </svg>
                            Envoyer à tous
                        </>
                      )}
                    </button>
                    
                    <button
                        onClick={subscribeToPush} 
                        className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50"
                        title="Forcer la resynchronisation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};