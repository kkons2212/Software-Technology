import React from 'react';
import { Globe2, Sparkles, Check, ChevronRight } from 'lucide-react';
import { useVisitorSession } from '../../context/VisitorSessionContext';

const LANGUAGES = [
  {
    code: 'vi',
    label: 'Tiếng Việt',
    english: 'Vietnamese',
    flag: '🇻🇳',
    desc: 'Thuyết minh tiếng Việt chuẩn',
  },
  {
    code: 'en',
    label: 'English',
    english: 'English',
    flag: '🇬🇧',
    desc: 'International audio guide',
  },
  {
    code: 'ja',
    label: '日本語',
    english: 'Japanese',
    flag: '🇯🇵',
    desc: '日本語の音声ガイド',
  },
  {
    code: 'ko',
    label: '한국어',
    english: 'Korean',
    flag: '🇰🇷',
    desc: '한국어 맞춤 오디오 가이드',
  },
  {
    code: 'zh',
    label: '中文 (简体)',
    english: 'Chinese',
    flag: '🇨🇳',
    desc: '中文语音智能导览',
  },
];

export default function LanguageSelectionModal() {
  const {
    isLanguageModalOpen,
    preferredLanguage,
    selectLanguage,
    closeLanguageModal,
    t,
  } = useVisitorSession();

  if (!isLanguageModalOpen) return null;

  const handleSelect = (langCode) => {
    selectLanguage(langCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-[#090d16] border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden space-y-6">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1 shadow-lg shadow-amber-500/10">
            <Globe2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {t('select_lang_prompt')}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {t('select_lang_sub')}
          </p>
        </div>

        {/* Language Options List */}
        <div className="space-y-2.5 relative z-10">
          {LANGUAGES.map((lang) => {
            const isSelected = preferredLanguage === lang.code;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25 scale-[1.02]'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Flag */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    isSelected
                      ? 'bg-slate-950/20'
                      : 'bg-slate-800/80 border border-slate-700/60'
                  }`}
                >
                  {lang.flag}
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      {lang.label}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected ? 'text-slate-900/70' : 'text-slate-400'
                      }`}
                    >
                      ({lang.english})
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate ${
                      isSelected ? 'text-slate-900/80' : 'text-slate-500'
                    }`}
                  >
                    {lang.desc}
                  </p>
                </div>

                {/* Check / Arrow icon */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Confirmation */}
        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={() => closeLanguageModal()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-black shadow-xl shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('continue_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
