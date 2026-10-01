import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VisitorSessionProvider } from './context/VisitorSessionContext';
import VisitorMainPage from './pages/visitor/VisitorMainPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import LanguageSelectionModal from './components/visitor/LanguageSelectionModal';

function App() {
  return (
    <VisitorSessionProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
          <Routes>
            <Route path="/" element={<VisitorMainPage />} />
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="/poi/:id" element={<VisitorMainPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <LanguageSelectionModal />
        </div>
      </BrowserRouter>
    </VisitorSessionProvider>
  );
}

export default App;
