import React from 'react';
import { PageData } from '../types';

interface ExploreViewProps {
  data: PageData;
}

const GALLERY_IMAGES = [
  "https://picsum.photos/seed/zen1/400/600",
  "https://picsum.photos/seed/zen2/400/400",
  "https://picsum.photos/seed/zen3/400/500",
  "https://picsum.photos/seed/zen4/400/300",
  "https://picsum.photos/seed/zen5/400/600",
  "https://picsum.photos/seed/zen6/400/400",
  "https://picsum.photos/seed/zen7/400/500",
  "https://picsum.photos/seed/zen8/400/300",
];

export const ExploreView: React.FC<ExploreViewProps> = ({ data }) => {
  return (
    <div className="px-4 py-6 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">{data.title}</h2>
        <p className="text-slate-500">{data.subtitle}</p>
      </div>

      <div className="columns-2 md:columns-3 gap-4 space-y-4">
        {GALLERY_IMAGES.map((src, index) => (
          <div 
            key={index} 
            className="break-inside-avoid rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 bg-white"
          >
            <img 
              src={src} 
              alt={`Gallery item ${index}`} 
              className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};