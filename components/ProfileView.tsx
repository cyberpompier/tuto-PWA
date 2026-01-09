import React from 'react';
import { PageData } from '../types';

interface ProfileViewProps {
  data: PageData;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ data }) => {
  return (
    <div className="px-6 py-8 flex flex-col items-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img src="https://i.pravatar.cc/150?u=zenpwa" alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800">Utilisateur Zen</h2>
      <p className="text-slate-500 mb-8">Explorateur Digital</p>

      <div className="w-full max-w-md grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
          <span className="block text-xl font-bold text-indigo-600">12</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Favoris</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
          <span className="block text-xl font-bold text-indigo-600">42</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Vues</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
          <span className="block text-xl font-bold text-indigo-600">8</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Badges</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-slate-50 transition-colors">
          <span className="font-medium text-slate-700">Paramètres du compte</span>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-slate-50 transition-colors">
          <span className="font-medium text-slate-700">Confidentialité</span>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-bold active:bg-red-100 transition-colors mt-4">
          Déconnexion
        </button>
      </div>
    </div>
  );
};