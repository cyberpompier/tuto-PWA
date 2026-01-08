import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PageView } from './components/PageView';
import { PageId } from './types';
import { PAGES } from './constants';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(PageId.HOME);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Fixed Header */}
      <Header title={PAGES[currentPage].title} />

      {/* Scrollable Main Content */}
      {/* pt-16 matches header height, pb-20 matches footer height */}
      <main className="flex-grow pt-16 pb-20 overflow-y-auto overflow-x-hidden scroll-smooth w-full">
        <PageView data={PAGES[currentPage]} />
      </main>

      {/* Fixed Footer */}
      <Footer activePage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}