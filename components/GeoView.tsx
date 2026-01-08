import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PageData } from '../types';

interface GeoViewProps {
  data: PageData;
}

export const GeoView: React.FC<GeoViewProps> = ({ data }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Initialisation de la carte (Vue par défaut : France/Europe ou 0,0)
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // On déplace le zoom pour éviter les conflits UI
      attributionControl: false // Optionnel pour le minimalisme, ou laisser true
    }).setView([46.603354, 1.888334], 6); // Centre de la France par défaut

    // Ajout des tuiles OpenStreetMap (Service gratuit)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Contrôle de zoom en bas à droite (juste au dessus du footer)
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Tenter de localiser au démarrage
    locateUser();

    // Nettoyage lors du démontage du composant
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const locateUser = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          
          // Animation fluide vers la position
          map.flyTo([latitude, longitude], 16, {
            duration: 1.5
          });

          // Suppression de l'ancien marqueur
          if (markerRef.current) {
            map.removeLayer(markerRef.current);
          }

          // Création d'un marqueur personnalisé (point bleu style GPS)
          const dotIcon = L.divIcon({
            className: 'custom-geo-marker',
            html: '<div style="background-color: #4f46e5; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.3), 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          markerRef.current = L.marker([latitude, longitude], { icon: dotIcon })
            .addTo(map)
            .bindPopup("Vous êtes ici !")
            .openPopup();
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Impossible de vous localiser");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="w-full h-full relative">
      {/* Conteneur de la carte */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0 outline-none"
        style={{ minHeight: '100%' }}
      />
      
      {/* Bouton d'action flottant pour se relocaliser */}
      <button 
        onClick={locateUser}
        disabled={loading}
        className="absolute bottom-6 left-6 z-[400] bg-white text-indigo-600 p-3 rounded-full shadow-xl border border-slate-100 active:bg-slate-50 active:scale-95 transition-all disabled:opacity-70 disabled:grayscale"
        title="Ma position"
      >
        {loading ? (
           <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
             <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
           </svg>
        )}
      </button>

      {/* Message d'erreur discret */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-red-50/90 backdrop-blur text-red-600 px-4 py-2 rounded-full text-xs shadow-lg font-medium border border-red-100 animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
};