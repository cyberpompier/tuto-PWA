import React from 'react';
import { PageData } from '../types';

interface PageViewProps {
  data: PageData;
}

export const PageView: React.FC<PageViewProps> = ({ data }) => {
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

      <div className="max-w-md mx-auto">
        <p className="text-slate-600 leading-relaxed text-lg">
          {data.description}
        </p>
        <button className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow-lg shadow-indigo-200 active:bg-indigo-700 transition-all">
          En savoir plus
        </button>
      </div>
    </div>
  );
};