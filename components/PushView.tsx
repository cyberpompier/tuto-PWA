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
    const { data: userData, error } = await supabase
      .from('appepi_users')
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
        // On récupère l'ID utilisateur actuel ou on en crée un
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

  const sendBroadcast = async () => {
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
          : `🚀 Envoyé à l'utilisateur ciblé.`, 
        type: 'success' 
      });
    } catch (err: any) {
      setStatus({ msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center pb-32 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-8 aspect-[16/9] relative">
         <img src={data.imageUrl} className="w-full h-full object-cover" alt="Focus" />
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
            <h2 className="text-white text-2xl font-bold">Ciblage & Diffusion</h2>
            <p className="text-white/70 text-sm">Envoyez des messages personnalisés</p>
         </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status && (
          <div className={`p-4 rounded-2xl text-sm font-semibold border ${
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
              <h3 className="font-bold text-slate-800">Paramètres d'envoi</h3>
              
              <div className="space-y-3">
                {/* Sélecteur de destinataire */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Destinataire</label>
                  <select 
                    value={pushContent.targetUserId}
                    onChange={(e) => setPushContent({...pushContent, targetUserId: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Titre</label>
                  <input 
                    type="text"
                    value={pushContent.title}
                    onChange={(e) => setPushContent({...pushContent, title: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Message</label>
                  <textarea 
                    value={pushContent.body}
                    onChange={(e) => setPushContent({...pushContent, body: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm h-24 resize-none"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={sendBroadcast}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Envoi..." : pushContent.targetUserId === 'all' ? "Envoyer à tous" : "Envoyer à l'utilisateur"}
            </button>
          </div>
        )}

        {!isSubscribed && (
          <button 
            onClick={handleSubscribeClick}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold"
          >
            S'abonner pour tester
          </button>
        )}
      </div>
    </div>
  );
};