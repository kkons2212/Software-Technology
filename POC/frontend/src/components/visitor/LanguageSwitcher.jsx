import React from 'react';
import { Globe2 } from 'lucide-react';
import { useVisitorSession } from '../../context/VisitorSessionContext';

const LANGUAGES = [
  { code: 'vi', label: 'Việt', full: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'EN',   full: 'English',    flag: '🇬🇧' },
  { code: 'ja', label: '日本', full: '日本語',      flag: '🇯🇵' },
  { code: 'ko', label: '한국', full: '한국어',       flag: '🇰🇷' },
  { code: 'zh', label: '中文', full: '中文',         flag: '🇨🇳' },
];

export default function LanguageSwitcher({ activeLang, onSelectLang, availableLanguages = [] }) {
  const { openLanguageModal } = useVisitorSession();

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
      {LANGUAGES.map((lang) => {
        const isActive    = activeLang === lang.code;
        const isAvailable = availableLanguages.length === 0 || availableLanguages.includes(lang.code);
        return (
          <button
            key={lang.code}
            disabled={!isAvailable}
            onClick={() => onSelectLang(lang.code)}
            title={lang.full}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 ${
              isActive
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.03]'
                : isAvailable
                  ? 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80'
                  : 'bg-slate-900/30 text-slate-600 border border-slate-800/40 cursor-not-allowed opacity-40'
            }`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}

      {/* Button to open language picker modal */}
      <button
        type="button"
        onClick={openLanguageModal}
        className="flex-shrink-0 p-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-slate-700/80 transition-all active:scale-95"
        title="Mở bảng chọn ngôn ngữ đầy đủ"
      >
        <Globe2 className="w-4 h-4" />
      </button>
    </div>
  );
}
