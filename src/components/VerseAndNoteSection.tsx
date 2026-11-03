import React, { useState, useEffect } from 'react';
import { BookOpen, StickyNote, Check, Trash2, Volume2 } from 'lucide-react';
import { AppLanguage, ParableQuestion } from '../data/questions';
import { getVerseTextsForQuestion } from '../data/bibleVerses';
import { UI_STRINGS } from '../data/i18n';
import { speakEcuadorSpanish } from '../utils/ecuadorTts';

interface VerseAndNoteSectionProps {
  question: ParableQuestion;
  language: AppLanguage;
  isAdvancedMode: boolean;
  savedNote: string;
  onSaveNote: (questionId: number, noteText: string) => void;
}

export const VerseAndNoteSection: React.FC<VerseAndNoteSectionProps> = ({
  question,
  language,
  isAdvancedMode,
  savedNote,
  onSaveNote
}) => {
  const isKo = language === 'ko';
  const t = UI_STRINGS[language];
  const verseEntries = getVerseTextsForQuestion(question, language);

  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(false);
  const [draftNote, setDraftNote] = useState<string>(savedNote || '');
  const [justSaved, setJustSaved] = useState<boolean>(false);

  useEffect(() => {
    setDraftNote(savedNote || '');
  }, [savedNote, question.id]);

  const handleSave = () => {
    onSaveNote(question.id, draftNote.trim());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const handleDelete = () => {
    setDraftNote('');
    onSaveNote(question.id, '');
  };

  const hasSavedNote = Boolean(savedNote && savedNote.trim().length > 0);

  return (
    <div className="mt-3 space-y-2.5">
      {/* 1. Original Bible Verse Text (개역한글판 / Reina-Valera 1960) */}
      {verseEntries.length > 0 && (
        <div className="scripture-box p-3.5 border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7]">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{t.bibleVersionBadge}</span>
            </div>
          </div>

          <div className="space-y-2">
            {verseEntries.map((v) => (
              <div
                key={v.key}
                className="text-xs sm:text-sm leading-relaxed text-slate-700 bg-white/90 rounded-lg p-2.5 border border-slate-100"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono-tabular font-bold text-slate-900">
                    {isKo ? v.refKo : v.refEs}
                  </span>
                  {!isKo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEcuadorSpanish(`${v.refEs}. ${v.textEs}`);
                      }}
                      className="px-2 py-0.5 text-[11px] font-medium text-[#0284C7] hover:bg-[#0284C7]/10 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>EC</span>
                    </button>
                  )}
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {isKo ? v.textKo : v.textEs}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Advanced Study Mode: Per-Question "학습팁 노트" Button & Expandable Note Editor */}
      {isAdvancedMode && (
        <div className="pt-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNoteOpen((prev) => !prev);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                hasSavedNote
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-2xs'
                  : isNoteOpen
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50/70'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>{hasSavedNote ? t.btnStudyTipNoteSaved : t.btnStudyTipNote}</span>
            </button>

            {hasSavedNote && !isNoteOpen && (
              <div
                onClick={() => setIsNoteOpen(true)}
                className="flex-1 truncate text-xs text-indigo-700 bg-indigo-50/80 border border-indigo-200/80 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-indigo-100/70 transition-colors"
              >
                {savedNote}
              </div>
            )}
          </div>

          {isNoteOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 advanced-note-panel p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {question.code} · {t.studyTipNoteTitle}
                  </span>
                </span>
                {justSaved && (
                  <span className="text-xs font-semibold text-[#059669] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.noteSavedFeedback}</span>
                  </span>
                )}
              </div>

              <textarea
                rows={3}
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder={t.studyTipNotePlaceholder}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 resize-y"
              />

              <div className="flex items-center justify-between gap-2">
                {hasSavedNote ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.btnDeleteNote}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNoteOpen(false)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                  >
                    {t.btnCloseModal}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer"
                  >
                    {t.btnSaveNote}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
