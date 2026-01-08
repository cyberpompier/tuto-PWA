import React from 'react';
import { PageId, PageData, NavigationItem } from './types';

// Icons using SVG directly for zero-dependencies
export const ICONS = {
  Home: ({ active }: { active: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  Globe: ({ active }: { active: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  User: ({ active }: { active: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  MapPin: ({ active }: { active: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  Bell: ({ active }: { active: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
};

export const MENU_ITEMS: NavigationItem[] = [
  {
    id: PageId.HOME,
    label: "Accueil",
    icon: (active) => <ICONS.Home active={active} />
  },
  {
    id: PageId.EXPLORE,
    label: "Explore",
    icon: (active) => <ICONS.Globe active={active} />
  },
  {
    id: PageId.GEO,
    label: "Carte",
    icon: (active) => <ICONS.MapPin active={active} />
  },
  {
    id: PageId.PUSH,
    label: "Notif",
    icon: (active) => <ICONS.Bell active={active} />
  },
  {
    id: PageId.PROFILE,
    label: "Profil",
    icon: (active) => <ICONS.User active={active} />
  }
];

export const PAGES: Record<PageId, PageData> = {
  [PageId.HOME]: {
    id: PageId.HOME,
    title: "Bienvenue",
    subtitle: "Votre sanctuaire numérique",
    imageUrl: "https://picsum.photos/seed/nature1/800/1000",
    description: "Explorez une interface fluide conçue pour être installée. Cette page d'accueil démontre la structure PWA avec une navigation fixe."
  },
  [PageId.EXPLORE]: {
    id: PageId.EXPLORE,
    title: "Galerie",
    subtitle: "Découvrez le monde",
    imageUrl: "https://picsum.photos/seed/arch2/800/1000",
    description: "Parcourez des images haute définition. Le défilement est fluide et indépendant du header et du footer."
  },
  [PageId.GEO]: {
    id: PageId.GEO,
    title: "Position",
    subtitle: "Localisation GPS",
    imageUrl: "https://picsum.photos/seed/map1/800/1000",
    description: "Utilisez l'API de géolocalisation pour trouver votre position actuelle sur le globe."
  },
  [PageId.PUSH]: {
    id: PageId.PUSH,
    title: "Alertes",
    subtitle: "Restez connecté",
    imageUrl: "https://picsum.photos/seed/neon1/800/1000",
    description: "Testez les notifications natives de votre appareil. Fonctionne même lorsque l'application est en arrière-plan."
  },
  [PageId.PROFILE]: {
    id: PageId.PROFILE,
    title: "Profil",
    subtitle: "Espace personnel",
    imageUrl: "https://picsum.photos/seed/tech3/800/1000",
    description: "Gérez vos préférences ici. L'état de l'application est préservé lors de la navigation entre les onglets."
  }
};