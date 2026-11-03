import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Check,
  CreditCard,
  Keyboard,
  ClipboardCheck,
  Eye,
  EyeOff,
  Volume2,
  ChevronRight
} from 'lucide-react';
import { AppLanguage, QUESTIONS, ParableQuestion } from '../data/questions';
import { UI_STRINGS } from '../data/i18n';
import { questionHasVerse } from '../data/bibleVerses';
import { speakEcuadorSpanish } from '../utils/ecuadorTts';
import {
  QUESTION_KEYWORD_SPECS,
  TypingValidationResult,
  evaluateTypingSubmission
} from '../utils/typingValidator';
import { TwoStepAnswerCard, RevealStage } from './TwoStepAnswerCard';
import { VerseAndNoteSection } from './VerseAndNoteSection';

export interface QuestionAttemptStat {
  attempts: number;
  correct: number;
  wrong: number;
}

interface IntensiveStudySectionProps {
  language: AppLanguage;
  bookmarkedIds: number[];
  masteredIds: number[];
  onToggleBookmark: (id: number) => void;
  onToggleMastered: (id: number) => void;
  onGoToStudy: () => void;
  isAdvancedMode: boolean;
  studyNotes: Record<number, string>;
  onSaveNote: (questionId: number, noteText: string) => void;
  questionStats: Record<number, QuestionAttemptStat>;
  onRecordAttempt: (questionId: number, isCorrect: boolean) => void;
}

type IntensiveSubMode = 'card' | 'typing' | 'exam';

interface IntensiveTypingEntry {
  answer: string;
  verse: string;
  submitted: boolean;
  result: TypingValidationResult | null;
}

export const IntensiveStudySection: React.FC<IntensiveStudySectionProps> = ({
  language,
  bookmarkedIds,
  masteredIds,
  onToggleBookmark,
  onToggleMastered,
  onGoToStudy,
  isAdvancedMode,
  studyNotes,
  onSaveNote,
  questionStats,
  onRecordAttempt
}) => {
  const isKo = language === 'ko';
  const t = UI_STRINGS[language];

  const [subMode, setSubMode] = useState<IntensiveSubMode>('card');
  const [stagesById, setStagesById] = useState<Record<number, RevealStage>>({});
  const [revealAll, setRevealAll] = useState<boolean>(false);

  // Typing study entries
  const [typingEntries, setTypingEntries] = useState<Record<number, IntensiveTypingEntry>>({});
  const typingInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const lastSubmitTimeRef = useRef<number>(0);

  // Mini Exam state
  const [examIndex, setExamIndex] = useState<number>(0);
  const [examInput, setExamInput] = useState<string>('');
  const [examVerseInput, setExamVerseInput] = useState<string>('');
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examValidation, setExamValidation] = useState<TypingValidationResult | null>(null);
  const [examResults, setExamResults] = useState<Record<number, 'correct' | 'review_again'>>({});
  const [examShowResults, setExamShowResults] = useState<boolean>(false);
  const [examMistakeIds, setExamMistakeIds] = useState<number[] | null>(null);
  const examInputRef = useRef<HTMLInputElement | null>(null);

  const bookmarkedQuestions: ParableQuestion[] = QUESTIONS.filter((q) =>
    bookmarkedIds.includes(q.id)
  );

  const activeExamQuestions: ParableQuestion[] =
    examMistakeIds && examMistakeIds.length > 0
      ? bookmarkedQuestions.filter((q) => examMistakeIds.includes(q.id))
      : bookmarkedQuestions;

  const currentExamQuestion =
    activeExamQuestions[Math.min(examIndex, Math.max(0, activeExamQuestions.length - 1))];

  useEffect(() => {
    if (subMode === 'exam' && !examSubmitted && !examShowResults && currentExamQuestion) {
      const timer = setTimeout(() => {
        examInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [subMode, examIndex, examSubmitted, examShowResults, currentExamQuestion]);

  const isSingleShortQuestion = (questionId: number) => {
    const spec = QUESTION_KEYWORD_SPECS[questionId];
    if (!spec) return false;
    const slots = isKo ? spec.koSlots : spec.esSlots;
    return spec.isShort && slots.length === 1;
  };

  const getStageForQuestion = (q: ParableQuestion): RevealStage => {
    if (revealAll) return 2;
    return stagesById[q.id] || 0;
  };

  const advanceStageForQuestion = (q: ParableQuestion) => {
    setStagesById((prev) => {
      const current = prev[q.id] || 0;
      const hasVerse = questionHasVerse(q, language);
      if (current === 0) {
        return { ...prev, [q.id]: hasVerse ? 1 : 2 };
      }
      if (current === 1) {
        return { ...prev, [q.id]: 2 };
      }
      return { ...prev, [q.id]: 0 };
    });
  };

  const resetStageForQuestion = (q: ParableQuestion) => {
    if (revealAll) {
      setRevealAll(false);
    }
    setStagesById((prev) => ({ ...prev, [q.id]: 0 }));
  };

  const renderStatBadge = (qId: number) => {
    if (!isAdvancedMode) return null;
    const stat = questionStats[qId];
    if (!stat || stat.attempts === 0) {
      return (
        <span className="px-2 py-0.5 text-[11px] font-mono-tabular rounded bg-slate-100 text-slate-500">
          {t.statNoAttemptsBadge}
        </span>
      );
    }
    const accuracy = Math.round((stat.correct / stat.attempts) * 100);
    return (
      <span
        className={`px-2 py-0.5 text-[11px] font-mono-tabular font-semibold rounded ${
          stat.wrong > 0
            ? 'bg-amber-50 text-[#D97706] border border-amber-200'
            : 'bg-emerald-50 text-[#059669] border border-emerald-200'
        }`}
      >
        {t.statAccuracyBadge(accuracy, stat.wrong, stat.attempts)}
      </span>
    );
  };

  // Empty state if no questions are bookmarked
  if (bookmarkedQuestions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#D97706]" />
              <span>{t.intensiveTitle}</span>
            </h2>
            <span className="text-xs font-mono-tabular font-semibold text-[#D97706] bg-[#D97706]/10 px-2.5 py-1 rounded-md">
              {t.intensiveCountBadge(0)}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.intensiveDescription}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-base font-bold text-slate-800">{t.intensiveEmptyTitle}</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {t.intensiveEmptySubtitle}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToStudy}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors cursor-pointer"
            >
              {t.intensiveGoToStudyBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Typing helpers for Intensive Study
  const getTypingEntry = (id: number): IntensiveTypingEntry => {
    return (
      typingEntries[id] || {
        answer: '',
        verse: '',
        submitted: false,
        result: null
      }
    );
  };

  const submitIntensiveTyping = (q: ParableQuestion) => {
    lastSubmitTimeRef.current = Date.now();
    const entry = getTypingEntry(q.id);
    const res = evaluateTypingSubmission(q, entry.answer, entry.verse, language);
    setTypingEntries((prev) => ({
      ...prev,
      [q.id]: { ...entry, submitted: true, result: res }
    }));
    onRecordAttempt(q.id, res.isCorrect);
  };

  const advanceIntensiveTyping = (currentId: number) => {
    const idx = bookmarkedQuestions.findIndex((q) => q.id === currentId);
    const nextQ =
      idx >= 0 && idx < bookmarkedQuestions.length - 1
        ? bookmarkedQuestions[idx + 1]
        : bookmarkedQuestions[0];
    if (nextQ) {
      const el = typingInputRefs.current[nextQ.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }
  };

  // Mini Exam helpers
  const submitCurrentExam = () => {
    if (!currentExamQuestion) return;
    lastSubmitTimeRef.current = Date.now();
    const res = evaluateTypingSubmission(
      currentExamQuestion,
      examInput,
      examVerseInput,
      language
    );
    setExamValidation(res);
    setExamSubmitted(true);
    setExamResults((prev) => ({
      ...prev,
      [currentExamQuestion.id]: res.isCorrect ? 'correct' : 'review_again'
    }));
    onRecordAttempt(currentExamQuestion.id, res.isCorrect);
  };

  const advanceExamOrFinish = () => {
    if (!currentExamQuestion) return;
    if (!examSubmitted) {
      submitCurrentExam();
    }
    if (examIndex < activeExamQuestions.length - 1) {
      setExamIndex((i) => i + 1);
      setExamSubmitted(false);
      setExamValidation(null);
      setExamInput('');
      setExamVerseInput('');
      setTimeout(() => {
        examInputRef.current?.focus();
      }, 30);
    } else {
      setExamShowResults(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Intensive Study Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#D97706]" />
            <span>{t.intensiveTitle}</span>
          </h2>
          <span className="text-xs font-mono-tabular font-bold text-[#D97706] bg-[#D97706]/10 px-2.5 py-1 rounded-md">
            {t.intensiveCountBadge(bookmarkedQuestions.length)}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {t.intensiveDescription}
        </p>

        {/* Sub-mode Switcher: 1. 카드 학습 | 2. 타이핑 학습 | 3. 미니 시험 */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900/5 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setSubMode('card')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                subMode === 'card'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t.intensiveMethodCard}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubMode('typing')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                subMode === 'typing'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{t.intensiveMethodTyping}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubMode('exam');
                setExamIndex(0);
                setExamSubmitted(false);
                setExamValidation(null);
                setExamInput('');
                setExamVerseInput('');
                setExamShowResults(false);
                setExamMistakeIds(null);
                setExamResults({});
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                subMode === 'exam'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>{t.intensiveMethodExam}</span>
            </button>
          </div>

          {subMode === 'card' && (
            <button
              type="button"
              onClick={() => {
                setRevealAll((prev) => !prev);
                setStagesById({});
              }}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              {revealAll ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{revealAll ? t.btnHideAllAnswers : t.btnShowAllAnswers}</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-MODE 1 & 2: CARD STUDY OR TYPING STUDY */}
      {(subMode === 'card' || subMode === 'typing') && (
        <div className="space-y-3">
          {bookmarkedQuestions.map((q, idx) => {
            const isMastered = masteredIds.includes(q.id);
            const stage = getStageForQuestion(q);
            const entry = getTypingEntry(q.id);
            const shortMode = isSingleShortQuestion(q.id);
            const verseStr = (isKo ? q.verseKo : q.verseEs).trim();
            const hasVerse = verseStr !== '-' && verseStr.length > 0;
            const isNextReady = Boolean(entry.submitted && entry.result?.isCorrect);

            return (
              <article
                key={q.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                    <span className="font-bold text-slate-900">
                      {String(idx + 1).padStart(2, '0')}. {q.code}
                    </span>
                    <span>·</span>
                    <span>{isKo ? q.chapterTitleKo : q.chapterTitleEs}</span>
                    {renderStatBadge(q.id)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isKo && (
                      <>
                        <button
                          type="button"
                          onClick={() => speakEcuadorSpanish(q.questionEs)}
                          className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span>{t.btnListenPromptEc}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => speakEcuadorSpanish(q.answerEs)}
                          className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#059669]" />
                          <span>{t.btnListenAnswerEc}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(q.id)}
                      className="px-2 py-1 text-xs font-medium border border-[#D97706] bg-[#D97706]/10 text-[#D97706] rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{t.btnBookmarked}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleMastered(q.id)}
                      className={`px-2 py-1 text-xs font-semibold border rounded-md flex items-center gap-1 cursor-pointer ${
                        isMastered
                          ? 'border-[#059669] bg-[#059669] text-white'
                          : 'border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isMastered ? t.btnMastered : t.btnMarkMastered}</span>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {isKo ? q.questionKo : q.questionEs}
                </h3>

                {subMode === 'card' ? (
                  <TwoStepAnswerCard
                    question={q}
                    language={language}
                    stage={stage}
                    onAdvanceStage={() => advanceStageForQuestion(q)}
                    onResetStage={() => resetStageForQuestion(q)}
                    isAdvancedMode={isAdvancedMode}
                    savedNote={studyNotes[q.id] || ''}
                    onSaveNote={onSaveNote}
                  />
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-[#0284C7]">
                      {shortMode ? t.typingBadgeShort : t.typingBadgeKeywords}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className={hasVerse ? 'sm:col-span-7' : 'sm:col-span-12'}>
                        <input
                          ref={(el) => {
                            typingInputRefs.current[q.id] = el;
                          }}
                          type="text"
                          value={entry.answer}
                          onChange={(e) =>
                            setTypingEntries((prev) => ({
                              ...prev,
                              [q.id]: {
                                ...entry,
                                answer: e.target.value,
                                submitted: false,
                                result: null
                              }
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (isNextReady) {
                                if (Date.now() - lastSubmitTimeRef.current >= 150) {
                                  advanceIntensiveTyping(q.id);
                                }
                              } else {
                                submitIntensiveTyping(q);
                              }
                            }
                          }}
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
                            value={entry.verse}
                            onChange={(e) =>
                              setTypingEntries((prev) => ({
                                ...prev,
                                [q.id]: {
                                  ...entry,
                                  verse: e.target.value,
                                  submitted: false,
                                  result: null
                                }
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (isNextReady) {
                                  if (Date.now() - lastSubmitTimeRef.current >= 150) {
                                    advanceIntensiveTyping(q.id);
                                  }
                                } else {
                                  submitIntensiveTyping(q);
                                }
                              }
                            }}
                            placeholder={t.typingVersePlaceholder}
                            className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {!entry.submitted ? (
                        <button
                          type="button"
                          onClick={() => submitIntensiveTyping(q)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] rounded-lg hover:bg-[#0369A1] cursor-pointer"
                        >
                          {t.btnCheckTyping}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setTypingEntries((prev) => ({
                              ...prev,
                              [q.id]: { answer: '', verse: '', submitted: false, result: null }
                            }))
                          }
                          className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {t.btnRetryTyping}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!isNextReady}
                        onClick={() => advanceIntensiveTyping(q.id)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1 ${
                          isNextReady
                            ? 'bg-[#059669] text-white hover:bg-[#047857] cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <span>{t.btnNextCard}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {entry.submitted && (
                      <div className="space-y-2">
                        <div
                          className={`rounded-xl border p-4 space-y-2 ${
                            entry.result?.isCorrect
                              ? 'bg-[#059669]/[0.05] border-[#059669]/40'
                              : 'bg-red-50/60 border-red-200'
                          }`}
                        >
                          <div
                            className={`text-xs font-bold ${
                              entry.result?.isCorrect ? 'text-[#059669]' : 'text-red-600'
                            }`}
                          >
                            {entry.result?.isCorrect
                              ? t.typingResultCorrect
                              : t.typingResultWrong}
                          </div>

                          <div className="pt-2 border-t border-slate-200/80 space-y-1">
                            <div className="text-xl font-bold text-[#0284C7]">
                              {isKo ? q.answerKo : q.answerEs}
                            </div>
                            <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                              {t.labelKeyVerse}: {isKo ? q.verseKo : q.verseEs}
                            </div>
                          </div>
                        </div>

                        <VerseAndNoteSection
                          question={q}
                          language={language}
                          isAdvancedMode={isAdvancedMode}
                          savedNote={studyNotes[q.id] || ''}
                          onSaveNote={onSaveNote}
                        />
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* SUB-MODE 3: INTENSIVE MINI EXAM */}
      {subMode === 'exam' && currentExamQuestion && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <div className="text-xs font-mono-tabular text-slate-400">
                {examIndex + 1} / {activeExamQuestions.length} · {currentExamQuestion.code}
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                {t.intensiveMethodExam}
              </h3>
            </div>
            {renderStatBadge(currentExamQuestion.id)}
          </div>

          <p className="text-xl font-bold text-slate-900 leading-snug">
            {isKo ? currentExamQuestion.questionKo : currentExamQuestion.questionEs}
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7">
                <input
                  ref={examInputRef}
                  type="text"
                  value={examInput}
                  onChange={(e) => setExamInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!examSubmitted) {
                        submitCurrentExam();
                      } else if (Date.now() - lastSubmitTimeRef.current >= 150) {
                        advanceExamOrFinish();
                      }
                    }
                  }}
                  placeholder={
                    isSingleShortQuestion(currentExamQuestion.id)
                      ? t.typingAnswerPlaceholderShort
                      : t.typingAnswerPlaceholderKeywords
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={examVerseInput}
                  onChange={(e) => setExamVerseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!examSubmitted) {
                        submitCurrentExam();
                      } else if (Date.now() - lastSubmitTimeRef.current >= 150) {
                        advanceExamOrFinish();
                      }
                    }
                  }}
                  placeholder={
                    !questionHasVerse(currentExamQuestion, language)
                      ? t.typingVerseNone
                      : t.typingVersePlaceholder
                  }
                  disabled={!questionHasVerse(currentExamQuestion, language)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7] disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              {!examSubmitted ? (
                <button
                  type="button"
                  onClick={submitCurrentExam}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] rounded-lg hover:bg-[#0369A1] cursor-pointer"
                >
                  {t.examSubmitAndCheck}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setExamSubmitted(false);
                    setExamValidation(null);
                    setExamInput('');
                    setExamVerseInput('');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t.btnRetryTyping}
                </button>
              )}

              <button
                type="button"
                disabled={!examSubmitted}
                onClick={advanceExamOrFinish}
                className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1 ${
                  examSubmitted
                    ? 'bg-[#059669] text-white hover:bg-[#047857] cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <span>
                  {examIndex < activeExamQuestions.length - 1
                    ? t.examNextQuestion
                    : t.examFinishBtn}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {examSubmitted && (
              <div className="space-y-2">
                <div
                  className={`rounded-xl border p-4 space-y-2 ${
                    examValidation?.isCorrect
                      ? 'bg-[#059669]/[0.05] border-[#059669]/40'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div
                    className={`text-xs font-bold ${
                      examValidation?.isCorrect ? 'text-[#059669]' : 'text-red-600'
                    }`}
                  >
                    {examValidation?.isCorrect
                      ? t.typingResultCorrect
                      : t.typingResultWrong}
                  </div>
                  <div className="text-xl font-bold text-[#0284C7]">
                    {isKo ? currentExamQuestion.answerKo : currentExamQuestion.answerEs}
                  </div>
                  <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                    {t.labelKeyVerse}:{' '}
                    {isKo ? currentExamQuestion.verseKo : currentExamQuestion.verseEs}
                  </div>
                </div>

                <VerseAndNoteSection
                  question={currentExamQuestion}
                  language={language}
                  isAdvancedMode={isAdvancedMode}
                  savedNote={studyNotes[currentExamQuestion.id] || ''}
                  onSaveNote={onSaveNote}
                />
              </div>
            )}
          </div>

          {examShowResults && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="font-display text-lg font-bold text-slate-900">
                    {t.intensiveExamResultsTitle}
                  </h4>
                  <span className="font-mono-tabular text-xl font-bold text-[#0284C7]">
                    {
                      activeExamQuestions.filter(
                        (q) => examResults[q.id] === 'correct'
                      ).length
                    }{' '}
                    / {activeExamQuestions.length}
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExamShowResults(false);
                      setSubMode('card');
                    }}
                    className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {t.btnCloseModal}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExamMistakeIds(null);
                      setExamResults({});
                      setExamIndex(0);
                      setExamSubmitted(false);
                      setExamValidation(null);
                      setExamInput('');
                      setExamVerseInput('');
                      setExamShowResults(false);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] rounded-lg hover:bg-[#0369A1] cursor-pointer"
                  >
                    {t.intensiveRetryAllBtn(bookmarkedQuestions.length)}
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
