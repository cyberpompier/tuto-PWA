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
  const [users, setUsers] = useState<{id: string, full_name: string}[]>([]);
  
  const [pushContent, setPushContent] = useState({
    title: "Zen PWA Gallery",
    body: "Une nouvelle image a été ajoutée à la galerie !",
    url: "/",
    targetUserId: "all"
  });

  useEffect(() => {
    checkSubscription();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Utilisation de la nouvelle table push_pwa_users
    const { data: userData, error } = await supabase
      .from('push_pwa_users')
      .select('id, full_name')
      .order('full_name');
    
    if (!error && userData) {
      setUsers(userData);
    }
  };

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch (e) {
        console.error("Erreur checkSubscription:", e);
      }
    }
  };

  const handleSubscribeClick = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
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
        setStatus({ msg: "Notifications activées !", type: 'success' });
      }
    } catch (err: any) {
      setStatus({ msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sendPush = async () => {
    if (!pushContent.body.trim()) return;
    setLoading(true);
    setStatus({ msg: "Envoi en cours...", type: 'info' });

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

      setStatus({ 
        msg: pushContent.targetUserId === 'all' 
          ? `🚀 Envoyé à ${resData.sentTo} appareils.` 
          : `🚀 Envoyé avec succès.`, 
        type: 'success' 
      });
    } catch (err: any) {
      setStatus({ msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center pb-32 animate-fade-in bg-slate-50 min-h-full">
      
      {/* APERÇU DYNAMIQUE */}
      <div className="w-full max-w-md mb-8">
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block px-1 tracking-wider">Aperçu du rendu</label>
        <div className="bg-white/80 backdrop-blur-md border border-white shadow-xl rounded-2xl p-4 flex items-start space-x-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <h4 className="font-bold text-slate-800 text-sm truncate">{pushContent.title || "Titre"}</h4>
              <span className="text-[10px] text-slate-400">Maintenant</span>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2 leading-tight">
              {pushContent.body || "Le contenu de votre message apparaîtra ici..."}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status && (
          <div className={`p-4 rounded-2xl text-sm font-semibold border animate-bounce-short ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
            'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
            {status.msg}
          </div>
        )}

        {isSubscribed && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full mr-2"></span>
                Rédaction du message
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Destinataire</label>
                  <select 
                    value={pushContent.targetUserId}
                    onChange={(e) => setPushContent({...pushContent, targetUserId: e.target.value})}
                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">📢 Tous les utilisateurs</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>👤 {u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Titre de l'alerte</label>
                  <input 
                    type="text"
                    value={pushContent.title}
                    onChange={(e) => setPushContent({...pushContent, title: e.target.value})}
                    placeholder="Ex: Alerte Matériel"
                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-semibold focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Contenu du message</label>
                  <textarea 
                    value={pushContent.body}
                    onChange={(e) => setPushContent({...pushContent, body: e.target.value})}
                    placeholder="Ecrivez votre message ici..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm h-28 resize-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={sendPush}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{pushContent.targetUserId === 'all' ? "Diffuser à tous" : "Envoyer à l'utilisateur"}</span>
                </>
              )}
            </button>
          </div>
        )}

        {!isSubscribed && (
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
            </div>
            <h3 className="font-bold text-lg text-slate-800">Prêt à tester ?</h3>
            <p className="text-sm text-slate-500">Abonnez cet appareil pour pouvoir recevoir les notifications de test que vous allez rédiger.</p>
            <button 
              onClick={handleSubscribeClick}
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
            >
              {loading ? "Chargement..." : "S'abonner sur cet appareil"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};