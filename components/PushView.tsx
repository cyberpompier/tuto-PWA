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
  const [message, setMessage] = useState<string | null>(null);
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
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // 3. Sauvegarder dans Supabase
      const subJson = subscription.toJSON();
      const userId = getUserId();

      // On utilise upsert pour mettre à jour si l'utilisateur existe déjà
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
      setMessage("Abonnement Push activé avec succès !");

      // Notification locale de confirmation
      new Notification("Notifications activées", {
        body: "Vous recevrez désormais les alertes de Zen PWA.",
        icon: "/icon-192.png"
      } as any);

    } catch (err: any) {
      console.error('Erreur inscription:', err);
      setMessage(`Erreur: ${err.message || 'Impossible de s\'abonner'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center text-center animate-fade-in">
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
        <p className="text-slate-600 leading-relaxed text-lg mb-8">
          {isSubscribed 
            ? "Votre appareil est connecté au serveur de notifications. Vous recevrez les alertes même application fermée."
            : "Activez les notifications Push pour rester informé en temps réel, même lorsque l'application est fermée."
          }
        </p>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm border ${message.includes('Erreur') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message}
          </div>
        )}

        {!isSubscribed ? (
            <button 
                onClick={subscribeToPush}
                disabled={loading}
                className="w-full px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow-lg shadow-indigo-200 active:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-2.829-2h5.658A3 3 0 0110 18z" />
                    </svg>
                )}
                Activer les notifications Push
            </button>
        ) : (
            <div className="w-full p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Notifications actives
                </div>
                <p className="text-xs text-slate-500 text-center">
                    ID Client: <br/>
                    <code className="bg-white px-1 py-0.5 rounded border border-slate-300 select-all">
                        {localStorage.getItem('zen_pwa_user_id')?.split('-')[0]}...
                    </code>
                </p>
                <button 
                  onClick={() => new Notification("Test Local", { body: "Ceci vérifie que l'autorisation est valide.", icon: "/icon-192.png"} as any)}
                  className="text-sm text-indigo-600 font-medium hover:underline mt-2"
                >
                  Envoyer un test local
                </button>
            </div>
        )}
      </div>
    </div>
  );
};