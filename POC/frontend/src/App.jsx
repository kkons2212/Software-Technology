import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VisitorSessionProvider } from './context/VisitorSessionContext';
import VisitorWelcomePage from './pages/visitor/VisitorWelcomePage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import PoiDetailPage from './pages/visitor/PoiDetailPage';
import InteractiveMapPage from './pages/visitor/InteractiveMapPage';
import LanguageSelectionModal from './components/visitor/LanguageSelectionModal';

function App() {
  return (
    <VisitorSessionProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
          <Routes>
            <Route path="/" element={<VisitorWelcomePage />} />
            <Route path="/welcome" element={<VisitorWelcomePage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/poi/:id" element={<PoiDetailPage />} />
            <Route path="/map" element={<InteractiveMapPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <LanguageSelectionModal />
        </div>
      </BrowserRouter>
    </VisitorSessionProvider>
  );
}

export default App;
