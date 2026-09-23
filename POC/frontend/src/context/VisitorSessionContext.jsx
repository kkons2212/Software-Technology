import React, { createContext, useContext, useState, useEffect } from 'react';
import { VISITOR_I18N } from '../i18n/visitorTranslations';

const VisitorSessionContext = createContext();

export function VisitorSessionProvider({ children }) {
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    return localStorage.getItem('museum_preferred_lang') || 'vi';
  });

  const [hasChosenLanguage, setHasChosenLanguage] = useState(() => {
    return localStorage.getItem('museum_has_chosen_lang') === 'true';
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(() => {
    // Nếu chưa từng chọn ngôn ngữ trước đó, tự động mở modal khi truy cập
    return !localStorage.getItem('museum_has_chosen_lang');
  });

  const [lastScannedPoiId, setLastScannedPoiId] = useState(() => {
    const saved = localStorage.getItem('museum_last_scanned_poi');
    return saved ? parseInt(saved) : null;
  });

  const selectLanguage = (lang) => {
    setPreferredLanguage(lang);
    setHasChosenLanguage(true);
    setIsLanguageModalOpen(false);
    localStorage.setItem('museum_preferred_lang', lang);
    localStorage.setItem('museum_has_chosen_lang', 'true');
  };

  const updateLanguage = (lang) => {
    setPreferredLanguage(lang);
    localStorage.setItem('museum_preferred_lang', lang);
  };

  const openLanguageModal = () => setIsLanguageModalOpen(true);
  const closeLanguageModal = () => {
    setIsLanguageModalOpen(false);
    setHasChosenLanguage(true);
    localStorage.setItem('museum_has_chosen_lang', 'true');
  };

  const updateLastScannedPoi = (poiId) => {
    setLastScannedPoiId(poiId);
    if (poiId) {
      localStorage.setItem('museum_last_scanned_poi', poiId.toString());
    }
  };

  // Helper hàm dịch giao diện theo ngôn ngữ hiện tại
  const t = (key) => {
    const dict = VISITOR_I18N[preferredLanguage] || VISITOR_I18N['vi'];
    return dict[key] || VISITOR_I18N['vi'][key] || key;
  };

  return (
    <VisitorSessionContext.Provider
      value={{
        preferredLanguage,
        setPreferredLanguage: updateLanguage,
        selectLanguage,
        hasChosenLanguage,
        isLanguageModalOpen,
        openLanguageModal,
        closeLanguageModal,
        lastScannedPoiId,
        setLastScannedPoiId: updateLastScannedPoi,
        t,
      }}
    >
      {children}
    </VisitorSessionContext.Provider>
  );
}

export function useVisitorSession() {
  const context = useContext(VisitorSessionContext);
  if (!context) {
    throw new Error('useVisitorSession must be used within a VisitorSessionProvider');
  }
  return context;
}
