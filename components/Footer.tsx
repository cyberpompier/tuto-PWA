import React from 'react';
import { PageId } from '../types';
import { MENU_ITEMS } from '../constants';

interface FooterProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ activePage, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-full pb-2">
        {MENU_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform duration-150"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`${isActive ? 'text-indigo-600' : 'text-slate-400'} transition-colors duration-200`}>
                {item.icon(isActive)}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};