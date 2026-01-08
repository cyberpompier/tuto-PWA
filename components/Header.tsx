import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-center shadow-sm px-4">
      <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
      <div className="absolute right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Online" />
    </header>
  );
};