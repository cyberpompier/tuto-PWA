import React, { useState, useEffect } from 'react';
import { PageData } from '../types';

interface PushViewProps {
  data: PageData;
}

export const PushView: React.FC<PushViewProps> = ({ data }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert("Ce navigateur ne supporte pas les notifications.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const sendNotification = () => {
    if (permission === 'granted') {
      new Notification("Coucou de Zen PWA ! 👋", {
        body: "Ceci est une notification de test envoyée depuis votre application.",
        icon: "/icon-192.png",
        vibrate: [200, 100, 200]
      } as any);
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
          {data.description}
        </p>

        {permission === 'default' && (
             <button 
                onClick={handleRequestPermission}
                className="w-full px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow-lg shadow-indigo-200 active:bg-indigo-700 transition-all"
             >
                Autoriser les notifications
             </button>
        )}

        {permission === 'granted' && (
            <div className="space-y-4">
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Notifications actives
                </div>
                <button 
                    onClick={sendNotification}
                    className="w-full px-8 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-full font-semibold active:bg-indigo-50 transition-all"
                >
                    Envoyer un test
                </button>
            </div>
        )}

        {permission === 'denied' && (
            <div className="p-4 bg-orange-50 text-orange-700 rounded-lg text-sm border border-orange-200">
                Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
            </div>
        )}
      </div>
    </div>
  );
};