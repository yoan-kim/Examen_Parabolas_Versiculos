import React, { useState, useRef, useEffect } from 'react';
import { EyeOff, Keyboard, ChevronRight, X } from 'lucide-react';
import { AppLanguage, ParableQuestion } from '../data/questions';
import { questionHasVerse } from '../data/bibleVerses';
import { UI_STRINGS } from '../data/i18n';
import {
  QUESTION_KEYWORD_SPECS,
  TypingValidationResult,
  evaluateTypingSubmission
} from '../utils/typingValidator';
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
  onRecordAttempt?: (questionId: number, isCorrect: boolean) => void;
  onMarkMastered?: (questionId: number) => void;
  onAdvanceNextCard?: () => void;
}

export const TwoStepAnswerCard: React.FC<TwoStepAnswerCardProps> = ({
  question,
  language,
  stage,
  onAdvanceStage,
  onResetStage,
  isAdvancedMode,
  savedNote,
  onSaveNote,
  onRecordAttempt,
  onMarkMastered,
  onAdvanceNextCard
}) => {
  const isKo = language === 'ko';
  const t = UI_STRINGS[language];
  const hasVerse = questionHasVerse(question, language);
  const answerText = isKo ? question.answerKo : question.answerEs;
  const verseText = (isKo ? question.verseKo : question.verseEs).trim();
  const verseCount = hasVerse ? verseText.split(',').filter(Boolean).length : 0;

  const spec = QUESTION_KEYWORD_SPECS[question.id];
  const slots = spec ? (isKo ? spec.koSlots : spec.esSlots) : [];
  const shortMode = Boolean(spec && spec.isShort && slots.length === 1);

  // Inline typing state (opened by clicking the "타이핑" tab after revealing the card answer)
  const [isInlineTypingOpen, setIsInlineTypingOpen] = useState<boolean>(false);
  const [typingAnswer, setTypingAnswer] = useState<string>('');
  const [typingVerse, setTypingVerse] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [validationResult, setValidationResult] =
    useState<TypingValidationResult | null>(null);

  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);

  // Reset inline typing state when question changes (e.g., in 1-card focus view)
  useEffect(() => {
    setIsInlineTypingOpen(false);
    setTypingAnswer('');
    setTypingVerse('');
    setSubmitted(false);
    setValidationResult(null);
  }, [question.id, language]);

  // If the user reveals the card answer again (stage > 0), close the inline typing box
  useEffect(() => {
    if (stage > 0 && isInlineTypingOpen) {
      setIsInlineTypingOpen(false);
    }
  }, [stage, isInlineTypingOpen]);

  const handleOpenInlineTyping = () => {
    // Hide the revealed card answer above (stage -> 0) and open the typing box
    onResetStage();
    setIsInlineTypingOpen(true);
    setSubmitted(false);
    setValidationResult(null);
    setTimeout(() => {
      answerInputRef.current?.focus();
    }, 30);
  };

  const handleCloseInlineTyping = () => {
    setIsInlineTypingOpen(false);
  };

  const submitInlineTyping = () => {
    lastSubmitTimeRef.current = Date.now();
    const res = evaluateTypingSubmission(
      question,
      typingAnswer,
      typingVerse,
      language
    );
    setSubmitted(true);
    setValidationResult(res);
    onRecordAttempt?.(question.id, res.isCorrect);
    if (res.isCorrect) {
      onMarkMastered?.(question.id);
    }
  };

  const resetInlineTyping = () => {
    setTypingAnswer('');
    setTypingVerse('');
    setSubmitted(false);
    setValidationResult(null);
    setTimeout(() => {
      answerInputRef.current?.focus();
    }, 20);
  };

  const isNextReady = Boolean(submitted && validationResult?.isCorrect);

  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (isNextReady && onAdvanceNextCard) {
        if (Date.now() - lastSubmitTimeRef.current >= 150) {
          onAdvanceNextCard();
        }
      } else {
        submitInlineTyping();
      }
    }
  };

  // Stage 0: Card answer is covered by an opaque white card showing "(정답 확인)"
  // If isInlineTypingOpen is true, render the covered card on top (so answer is hidden) + the typing box below!
  if (stage === 0) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={onAdvanceStage}
          className="w-full py-6 px-5 answer-cover-card shadow-2xs flex items-center justify-center text-sm font-bold text-[#0284C7] cursor-pointer"
        >
          <span>{t.clickToRevealBox}</span>
        </button>

        {isInlineTypingOpen && (
          <div className="rounded-xl border-2 border-[#0284C7]/40 bg-[#0284C7]/[0.02] p-4 space-y-3">
            {/* Inline Typing Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#0284C7] text-white font-bold inline-flex items-center gap-1">
                  <Keyboard className="w-3 h-3" />
                  <span>{t.cardOpenTypingBtn}</span>
                </span>
                <span
                  className={`font-semibold ${
                    shortMode ? 'text-[#0284C7]' : 'text-slate-600'
                  }`}
                >
                  {shortMode ? t.typingBadgeShort : t.typingBadgeKeywords}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {hasVerse && (
                  <span className="font-mono-tabular text-slate-400">
                    {t.labelKeyVerse} ({verseCount})
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCloseInlineTyping}
                  className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>{t.cardCloseTypingBtn}</span>
                </button>
              </div>
            </div>

            {/* Meaning Answer Input + Evidence Verse Input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className={hasVerse ? 'sm:col-span-7' : 'sm:col-span-12'}>
                <input
                  ref={answerInputRef}
                  type="text"
                  value={typingAnswer}
                  onChange={(e) => {
                    setTypingAnswer(e.target.value);
                    setSubmitted(false);
                    setValidationResult(null);
                  }}
                  onKeyDown={handleInlineKeyDown}
                  placeholder={
                    shortMode
                      ? t.typingAnswerPlaceholderShort
                      : t.typingAnswerPlaceholderKeywords
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              {hasVerse && (
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={typingVerse}
                    onChange={(e) => {
                      setTypingVerse(e.target.value);
                      setSubmitted(false);
                      setValidationResult(null);
                    }}
                    onKeyDown={handleInlineKeyDown}
                    placeholder={t.typingVersePlaceholder}
                    className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!submitted ? (
                <button
                  type="button"
                  onClick={submitInlineTyping}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] rounded-lg hover:bg-[#0369A1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.btnCheckTyping}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetInlineTyping}
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.btnRetryTyping}
                </button>
              )}

              {onAdvanceNextCard && (
                <button
                  type="button"
                  disabled={!isNextReady}
                  onClick={onAdvanceNextCard}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    isNextReady
                      ? 'bg-[#059669] text-white hover:bg-[#047857] ring-2 ring-[#059669]/30 shadow-xs cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {isNextReady
                      ? isKo
                        ? `${t.btnNextCard} (엔터 ↵)`
                        : `${t.btnNextCard} (Intro ↵)`
                      : t.btnNextCard}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Validation Result Box + Full Original Bible Verse + Study Tip Note */}
            {submitted && (
              <div className="space-y-2">
                <div
                  className={`rounded-xl border p-4 space-y-2.5 ${
                    validationResult?.isCorrect
                      ? 'bg-[#059669]/[0.05] border-[#059669]/40'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        validationResult?.isCorrect
                          ? 'text-[#059669]'
                          : 'text-red-600'
                      }`}
                    >
                      {validationResult?.isCorrect
                        ? t.typingResultCorrect
                        : t.typingResultWrong}
                    </span>
                    {isNextReady && onAdvanceNextCard && (
                      <button
                        type="button"
                        onClick={onAdvanceNextCard}
                        className="px-3 py-1 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-md flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>
                          {isKo
                            ? `${t.btnNextCard} (엔터 ↵)`
                            : `${t.btnNextCard} (Intro ↵)`}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {validationResult && !validationResult.isCorrect && (
                    <div className="text-xs space-y-1 text-slate-700">
                      {validationResult.missingKeywords.length > 0 && (
                        <div>
                          <span className="font-semibold text-red-600 mr-1.5">
                            {t.typingMissingKeywords}
                          </span>
                          <span className="font-mono-tabular">
                            {validationResult.missingKeywords.join(', ')}
                          </span>
                        </div>
                      )}
                      {validationResult.missingVerses.length > 0 && (
                        <div>
                          <span className="font-semibold text-red-600 mr-1.5">
                            {t.typingMissingVerses}
                          </span>
                          <span className="font-mono-tabular">
                            {validationResult.missingVerses.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <div className="text-xl font-bold text-[#0284C7]">
                      {answerText}
                    </div>
                    <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                      {t.labelKeyVerse}: {verseText}
                    </div>
                  </div>
                </div>

                <VerseAndNoteSection
                  question={question}
                  language={language}
                  isAdvancedMode={isAdvancedMode}
                  savedNote={savedNote}
                  onSaveNote={onSaveNote}
                />
              </div>
            )}
          </div>
        )}
      </div>
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
  // + Automatic "타이핑" Tab Box below so user can click it to hide the card answer and type the answer directly!
  return (
    <div className="space-y-2.5">
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

      {/* Automatically Opened "타이핑" Tab Bar after Revealing Card Answer */}
      <div className="rounded-xl border border-[#0284C7]/30 bg-[#0284C7]/[0.04] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <span className="text-xs font-medium text-slate-600">
          {t.cardOpenTypingHint}
        </span>
        <button
          type="button"
          onClick={handleOpenInlineTyping}
          className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{t.cardOpenTypingBtn}</span>
        </button>
      </div>
    </div>
  );
};

