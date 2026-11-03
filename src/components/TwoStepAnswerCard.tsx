import React from 'react';
import { EyeOff } from 'lucide-react';
import { AppLanguage, ParableQuestion } from '../data/questions';
import { questionHasVerse } from '../data/bibleVerses';
import { UI_STRINGS } from '../data/i18n';
import { VerseAndNoteSection } from './VerseAndNoteSection';

export type RevealStage = 0 | 1 | 2;

interface TwoStepAnswerCardProps {
  question: ParableQuestion;
  language: AppLanguage;
  stage: RevealStage;
  onAdvanceStage: () => void;
  onResetStage: () => void;
  isAdvancedMode: boolean;
  savedNote: string;
  onSaveNote: (questionId: number, noteText: string) => void;
}

export const TwoStepAnswerCard: React.FC<TwoStepAnswerCardProps> = ({
  question,
  language,
  stage,
  onAdvanceStage,
  onResetStage,
  isAdvancedMode,
  savedNote,
  onSaveNote
}) => {
  const isKo = language === 'ko';
  const t = UI_STRINGS[language];
  const hasVerse = questionHasVerse(question, language);
  const answerText = isKo ? question.answerKo : question.answerEs;
  const verseText = isKo ? question.verseKo : question.verseEs;

  // Stage 0: Completely covered by an opaque white card showing "(정답 확인)"
  if (stage === 0) {
    return (
      <button
        type="button"
        onClick={onAdvanceStage}
        className="w-full py-6 px-5 answer-cover-card shadow-2xs flex items-center justify-center text-sm font-bold text-[#0284C7] cursor-pointer"
      >
        <span>{t.clickToRevealBox}</span>
      </button>
    );
  }

  // Stage 1: Meaning is revealed, but Bible verse is still covered by an opaque white "(정답 확인)" card
  if (stage === 1 && hasVerse) {
    return (
      <div className="bg-white border border-[#0284C7]/35 rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-[11px] font-semibold text-slate-400">
              {t.labelMeaningTitle}
            </div>
            <div className="text-xl font-bold text-[#0284C7] leading-snug">
              {answerText}
            </div>
          </div>

          <button
            type="button"
            onClick={onResetStage}
            className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <EyeOff className="w-3 h-3" />
            <span>{t.btnHideAnswer}</span>
          </button>
        </div>

        {/* Step 2 Cover: Bible Verse covered with "(정답 확인)" */}
        <div className="pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onAdvanceStage}
            className="w-full py-3.5 px-4 answer-cover-card flex items-center justify-center gap-2 text-sm font-bold text-[#0284C7] cursor-pointer"
          >
            <span className="text-xs font-semibold text-slate-500">
              {t.labelKeyVerse}:
            </span>
            <span>{t.clickToRevealVerseBox}</span>
          </button>
        </div>
      </div>
    );
  }

  // Stage 2 (or Stage 1 when question has no verse): Full Answer & Verse revealed + Original Scripture Text + Study Tip Note
  return (
    <div className="space-y-2">
      <div className="bg-white border border-[#0284C7]/35 rounded-xl p-4 space-y-2 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-[11px] font-semibold text-slate-400">
              {t.labelMeaningTitle}
            </div>
            <div className="text-xl font-bold text-[#0284C7] leading-snug">
              {answerText}
            </div>
          </div>

          <button
            type="button"
            onClick={onResetStage}
            className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <EyeOff className="w-3 h-3" />
            <span>{t.btnHideAnswer}</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xl font-bold text-[#0284C7] font-mono-tabular">
            {t.labelKeyVerse}: {verseText}
          </span>
        </div>
      </div>

      {/* Original Bible Verse Text (개역한글판 / Reina-Valera 1960) + Advanced Study Tip Note */}
      <VerseAndNoteSection
        question={question}
        language={language}
        isAdvancedMode={isAdvancedMode}
        savedNote={savedNote}
        onSaveNote={onSaveNote}
      />
    </div>
  );
};
