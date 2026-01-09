import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PageView } from './components/PageView';
import { GeoView } from './components/GeoView';
import { PushView } from './components/PushView';
import { ExploreView } from './components/ExploreView';
import { ProfileView } from './components/ProfileView';
import { PageId } from './types';
import { PAGES } from './constants';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(PageId.HOME);

  const renderPage = () => {
    const pageData = PAGES[currentPage];
    
    switch (currentPage) {
      case PageId.GEO:
        return <GeoView data={pageData} />;
      case PageId.PUSH:
        return <PushView data={pageData} />;
      case PageId.EXPLORE:
        return <ExploreView data={pageData} />;
      case PageId.PROFILE:
        return <ProfileView data={pageData} />;
      default:
        return <PageView data={pageData} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title={PAGES[currentPage].title} />

      <main className="flex-grow pt-16 pb-20 overflow-y-auto overflow-x-hidden scroll-smooth w-full">
        {renderPage()}
      </main>

      <Footer activePage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}