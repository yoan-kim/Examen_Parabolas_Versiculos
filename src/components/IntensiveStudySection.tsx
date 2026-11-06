import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bookmark,
  Check,
  CreditCard,
  Keyboard,
  ClipboardCheck,
  Eye,
  EyeOff,
  Volume2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Shuffle
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

interface MiniExamDraftEntry {
  answer: string;
  verse: string;
}

function shuffleQuestionsRandomly<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
  const [typingResetBannerVisible, setTypingResetBannerVisible] = useState<boolean>(false);
  const typingInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const lastSubmitTimeRef = useRef<number>(0);

  // Mini Exam state (per-question immediate grading on Enter, locked inputs once graded, randomized every time)
  const [examIndex, setExamIndex] = useState<number>(0);
  const [examSessionSeed, setExamSessionSeed] = useState<number>(0);
  const [examDrafts, setExamDrafts] = useState<Record<number, MiniExamDraftEntry>>({});
  const [examValidations, setExamValidations] = useState<Record<number, TypingValidationResult>>({});
  const [examResults, setExamResults] = useState<Record<number, 'correct' | 'review_again'>>({});
  const [examShowResults, setExamShowResults] = useState<boolean>(false);
  const [examMistakeIds, setExamMistakeIds] = useState<number[] | null>(null);
  const examInputRef = useRef<HTMLInputElement | null>(null);
  const examNextBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastExamGradeTimeRef = useRef<number>(0);

  const bookmarkedQuestions: ParableQuestion[] = useMemo(
    () => QUESTIONS.filter((q) => bookmarkedIds.includes(q.id)),
    [bookmarkedIds]
  );

  const activeExamQuestions: ParableQuestion[] = useMemo(() => {
    void examSessionSeed;
    const base =
      examMistakeIds && examMistakeIds.length > 0
        ? bookmarkedQuestions.filter((q) => examMistakeIds.includes(q.id))
        : bookmarkedQuestions;
    return shuffleQuestionsRandomly(base);
  }, [bookmarkedQuestions, examMistakeIds, examSessionSeed]);

  const currentExamQuestion =
    activeExamQuestions[Math.min(examIndex, Math.max(0, activeExamQuestions.length - 1))];

  useEffect(() => {
    if (
      subMode === 'exam' &&
      !examShowResults &&
      currentExamQuestion &&
      !examValidations[currentExamQuestion.id]
    ) {
      const timer = setTimeout(() => {
        examInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [subMode, examIndex, examShowResults, currentExamQuestion, examValidations]);

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

  const handleResetIntensiveTyping = () => {
    setTypingEntries({});
    setTypingResetBannerVisible(true);
    setTimeout(() => {
      setTypingResetBannerVisible(false);
    }, 3200);
    setTimeout(() => {
      const firstQ = bookmarkedQuestions[0];
      if (firstQ) {
        const el = typingInputRefs.current[firstQ.id];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
    }, 30);
  };

  // Mini Exam helpers (per-question immediate grading on Enter, locked inputs once graded)
  const startNewRandomMiniExam = (mistakeIds: number[] | null = null) => {
    setExamSessionSeed((s) => s + 1);
    setExamIndex(0);
    setExamDrafts({});
    setExamValidations({});
    setExamResults({});
    setExamMistakeIds(mistakeIds);
    setExamShowResults(false);
  };

  const getExamDraft = (id: number): MiniExamDraftEntry => {
    return examDrafts[id] || { answer: '', verse: '' };
  };

  const updateExamDraftAnswer = (id: number, answer: string) => {
    if (examValidations[id]) return; // Locked once graded
    setExamDrafts((prev) => {
      const existing = prev[id] || { answer: '', verse: '' };
      return { ...prev, [id]: { ...existing, answer } };
    });
  };

  const updateExamDraftVerse = (id: number, verse: string) => {
    if (examValidations[id]) return; // Locked once graded
    setExamDrafts((prev) => {
      const existing = prev[id] || { answer: '', verse: '' };
      return { ...prev, [id]: { ...existing, verse } };
    });
  };

  const gradeCurrentMiniExamQuestion = () => {
    if (!currentExamQuestion) return;
    if (examValidations[currentExamQuestion.id]) return;

    lastExamGradeTimeRef.current = Date.now();
    const draft = examDrafts[currentExamQuestion.id] || { answer: '', verse: '' };
    const res = evaluateTypingSubmission(
      currentExamQuestion,
      draft.answer,
      draft.verse,
      language
    );

    setExamValidations((prev) => ({ ...prev, [currentExamQuestion.id]: res }));
    setExamResults((prev) => ({
      ...prev,
      [currentExamQuestion.id]: res.isCorrect ? 'correct' : 'review_again'
    }));
    onRecordAttempt(currentExamQuestion.id, res.isCorrect);

    setTimeout(() => {
      examNextBtnRef.current?.focus();
    }, 30);
  };

  const advanceMiniExamAfterGrading = () => {
    if (!currentExamQuestion || !examValidations[currentExamQuestion.id]) return;
    if (examIndex < activeExamQuestions.length - 1) {
      setExamIndex((i) => Math.min(activeExamQuestions.length - 1, i + 1));
      setTimeout(() => {
        examInputRef.current?.focus();
      }, 30);
    } else {
      setExamShowResults(true);
    }
  };

  const handleMiniExamKeyAction = () => {
    if (!currentExamQuestion) return;
    const isGraded = Boolean(examValidations[currentExamQuestion.id]);
    if (!isGraded) {
      gradeCurrentMiniExamQuestion();
    } else if (Date.now() - lastExamGradeTimeRef.current >= 150) {
      advanceMiniExamAfterGrading();
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
                startNewRandomMiniExam(null);
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

          {subMode === 'typing' && (
            <button
              type="button"
              onClick={handleResetIntensiveTyping}
              title={t.btnResetTypingModeTooltip}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>{t.btnResetTypingMode}</span>
            </button>
          )}
        </div>
      </div>

      {/* Intensive Typing Reset Confirmation Banner */}
      {subMode === 'typing' && typingResetBannerVisible && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span>{t.typingResetDoneBanner}</span>
          </div>
        </div>
      )}

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
                    onRecordAttempt={onRecordAttempt}
                    onMarkMastered={(id) => {
                      if (!masteredIds.includes(id)) {
                        onToggleMastered(id);
                      }
                    }}
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

      {/* SUB-MODE 3: INTENSIVE MINI EXAM (IMMEDIATE GRADING ON ENTER, LOCKED INPUTS) */}
      {subMode === 'exam' && currentExamQuestion && (
        <>
          {!examShowResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              {/* Top 80-Point Pass Criteria Notice Banner */}
              <div className="rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0369A1]">
                  <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <span>{t.examTopPassNotice}</span>
                </div>
                <span className="text-[11px] font-medium text-slate-600">
                  {t.examOneWayNotice}
                </span>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono-tabular text-slate-400">
                    {examIndex + 1} / {activeExamQuestions.length} · {currentExamQuestion.code}
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {t.intensiveMethodExam}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t.examOnePassGuide}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {renderStatBadge(currentExamQuestion.id)}
                  <button
                    type="button"
                    onClick={() => startNewRandomMiniExam(null)}
                    title={t.examResetBtnTooltip}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>{t.examResetBtn}</span>
                  </button>
                </div>
              </div>

              {/* Non-clickable progress badges (shows ✓ / ✕ as each question is graded) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {activeExamQuestions.map((q, idx) => {
                  const isCurrent = idx === examIndex;
                  const gradedStatus = examResults[q.id];
                  return (
                    <span
                      key={q.id}
                      className={`w-8 h-8 rounded-lg text-xs font-mono-tabular font-bold inline-flex items-center justify-center select-none ${
                        isCurrent
                          ? 'bg-[#0284C7] text-white ring-2 ring-[#0284C7]/30'
                          : gradedStatus === 'correct'
                            ? 'bg-emerald-100 text-[#059669] border border-emerald-300'
                            : gradedStatus === 'review_again'
                              ? 'bg-red-100 text-red-600 border border-red-300'
                              : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {gradedStatus === 'correct'
                        ? '✓'
                        : gradedStatus === 'review_again'
                          ? '✕'
                          : idx + 1}
                    </span>
                  );
                })}
              </div>

              <p className="text-xl font-bold text-slate-900 leading-snug">
                {isKo ? currentExamQuestion.questionKo : currentExamQuestion.questionEs}
              </p>

              {(() => {
                const currentDraft = getExamDraft(currentExamQuestion.id);
                const currentValidation = examValidations[currentExamQuestion.id] || null;
                const isCurrentGraded = Boolean(currentValidation);
                const hasVerse = questionHasVerse(currentExamQuestion, language);
                const isLastQuestion = examIndex >= activeExamQuestions.length - 1;

                return (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[#0284C7]">
                      {isSingleShortQuestion(currentExamQuestion.id)
                        ? t.typingBadgeShort
                        : t.typingBadgeKeywords}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className={hasVerse ? 'sm:col-span-7' : 'sm:col-span-12'}>
                        <input
                          ref={examInputRef}
                          type="text"
                          value={currentDraft.answer}
                          disabled={isCurrentGraded}
                          readOnly={isCurrentGraded}
                          onChange={(e) =>
                            updateExamDraftAnswer(currentExamQuestion.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMiniExamKeyAction();
                            }
                          }}
                          placeholder={
                            isSingleShortQuestion(currentExamQuestion.id)
                              ? t.typingAnswerPlaceholderShort
                              : t.typingAnswerPlaceholderKeywords
                          }
                          className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none ${
                            isCurrentGraded
                              ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                              : 'bg-white border-slate-300 focus:border-[#0284C7]'
                          }`}
                        />
                      </div>

                      {hasVerse && (
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={currentDraft.verse}
                            disabled={isCurrentGraded}
                            readOnly={isCurrentGraded}
                            onChange={(e) =>
                              updateExamDraftVerse(currentExamQuestion.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleMiniExamKeyAction();
                              }
                            }}
                            placeholder={t.typingVersePlaceholder}
                            className={`w-full px-3.5 py-2.5 text-sm font-mono-tabular border rounded-lg focus:outline-none ${
                              isCurrentGraded
                                ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                                : 'bg-white border-slate-300 focus:border-[#0284C7]'
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Forward-only navigation footer (grade on Enter, then advance on Enter) */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div className="text-xs font-mono-tabular text-slate-500">
                        {examIndex + 1} / {activeExamQuestions.length}
                      </div>

                      {!isCurrentGraded ? (
                        <button
                          type="button"
                          onClick={gradeCurrentMiniExamQuestion}
                          className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {isKo
                              ? `${t.examSubmitAndCheck} (엔터 ↵)`
                              : `${t.examSubmitAndCheck} (Intro ↵)`}
                          </span>
                        </button>
                      ) : !isLastQuestion ? (
                        <button
                          ref={examNextBtnRef}
                          type="button"
                          onClick={advanceMiniExamAfterGrading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (Date.now() - lastExamGradeTimeRef.current >= 150) {
                                advanceMiniExamAfterGrading();
                              }
                            }
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] ring-2 ring-[#059669]/30 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>
                            {isKo
                              ? `${t.examNextQuestion} (엔터 ↵)`
                              : `${t.examNextQuestion} (Intro ↵)`}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          ref={examNextBtnRef}
                          type="button"
                          onClick={advanceMiniExamAfterGrading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (Date.now() - lastExamGradeTimeRef.current >= 150) {
                                advanceMiniExamAfterGrading();
                              }
                            }
                          }}
                          className="px-5 py-2.5 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] ring-2 ring-[#059669]/30 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {isKo
                              ? `${t.examCheckAllBtn} (엔터 ↵)`
                              : `${t.examCheckAllBtn} (Intro ↵)`}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Immediate Per-Question Grading Feedback Box */}
                    {isCurrentGraded && currentValidation && (
                      <div className="space-y-2.5 pt-2">
                        <div
                          className={`rounded-xl border p-4 space-y-3 ${
                            currentValidation.isCorrect
                              ? 'bg-[#059669]/[0.06] border-[#059669]/40'
                              : 'bg-red-50/70 border-red-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-xs sm:text-sm font-bold ${
                                currentValidation.isCorrect
                                  ? 'text-[#059669]'
                                  : 'text-red-600'
                              }`}
                            >
                              {currentValidation.isCorrect
                                ? t.typingResultCorrect
                                : t.typingResultWrong}
                            </span>

                            <button
                              type="button"
                              onClick={advanceMiniExamAfterGrading}
                              className="px-3 py-1 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-md flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <span>
                                {!isLastQuestion
                                  ? isKo
                                    ? `${t.examNextQuestion} (엔터 ↵)`
                                    : `${t.examNextQuestion} (Intro ↵)`
                                  : isKo
                                    ? `${t.examCheckAllBtn} (엔터 ↵)`
                                    : `${t.examCheckAllBtn} (Intro ↵)`}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {!currentValidation.isCorrect && (
                            <div className="bg-white/90 border border-red-200/80 rounded-lg p-3 text-xs space-y-2 text-slate-700">
                              <div>
                                <span className="font-semibold text-slate-500 mr-1.5">
                                  {t.examYourAnswerLabel}
                                </span>
                                <span className="font-mono-tabular text-slate-900 font-medium">
                                  {currentDraft.answer.trim() || currentDraft.verse.trim()
                                    ? `${currentDraft.answer || '-'} / ${
                                        currentDraft.verse || '-'
                                      }`
                                    : t.examNoAnswerEntered}
                                </span>
                              </div>

                              {currentValidation.missingKeywords.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-red-600">
                                    {t.typingMissingKeywords}
                                  </span>
                                  {currentValidation.missingKeywords.map((kw, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-mono-tabular font-bold"
                                    >
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {currentValidation.missingVerses.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-red-600">
                                    {t.typingMissingVerses}
                                  </span>
                                  {currentValidation.missingVerses.map((v, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-mono-tabular font-bold"
                                    >
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="pt-1.5 border-t border-red-100 text-[11px] font-semibold text-red-700">
                                {t.examLockedInputNotice}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-200/80 space-y-1">
                            <div className="text-xl font-bold text-[#0284C7]">
                              {isKo ? currentExamQuestion.answerKo : currentExamQuestion.answerEs}
                            </div>
                            <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                              {t.labelKeyVerse}:{' '}
                              {isKo ? currentExamQuestion.verseKo : currentExamQuestion.verseEs}
                            </div>
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
                );
              })()}
            </div>
          ) : (
            (() => {
              const totalCount = activeExamQuestions.length;
              const correctQuestions = activeExamQuestions.filter(
                (q) => examResults[q.id] === 'correct'
              );
              const wrongQuestions = activeExamQuestions.filter(
                (q) => examResults[q.id] !== 'correct'
              );
              const correctCount = correctQuestions.length;
              const wrongCount = wrongQuestions.length;
              const finalPercent =
                totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
              const isPassed = finalPercent >= 80;

              return (
                <div className="space-y-5">
                  {isPassed ? (
                    <div className="rounded-2xl border-2 border-[#059669] bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 sm:p-8 shadow-sm text-center space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#059669] text-white">
                        <span>{t.examPassBadge}</span>
                      </div>
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
                        {t.examPassHeadline}
                      </h2>
                      <p className="text-sm font-medium text-emerald-800">
                        {t.examPassSubtext}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-red-600 bg-gradient-to-br from-red-950 via-red-900 to-slate-900 text-white p-6 sm:p-8 shadow-lg space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{t.examFailBadge}</span>
                        </span>
                        <span className="text-xs font-mono-tabular text-red-200 font-semibold">
                          {t.examFailWarningLabel}
                        </span>
                      </div>

                      <blockquote className="p-4 sm:p-5 rounded-xl bg-black/35 border-l-4 border-amber-400 space-y-2">
                        <p className="text-base sm:text-lg font-bold text-amber-100 leading-relaxed">
                          {t.examFailVerseText}
                        </p>
                        <footer className="text-xs sm:text-sm font-mono-tabular font-bold text-amber-300 text-right">
                          {t.examFailVerseRef}
                        </footer>
                      </blockquote>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="text-xs font-mono-tabular text-slate-400">
                          {t.examTopPassNotice}
                        </div>
                        <h4 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                          {t.intensiveExamResultsTitle}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">{t.examFinalScoreLabel}</div>
                        <div
                          className={`font-mono-tabular text-2xl font-bold ${
                            isPassed ? 'text-[#059669]' : 'text-red-600'
                          }`}
                        >
                          {finalPercent}%{' '}
                          <span className="text-sm text-slate-500 font-normal">
                            ({correctCount}/{totalCount})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startNewRandomMiniExam(null)}
                          className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] rounded-lg hover:bg-[#0369A1] flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.examRetryAllBtn}</span>
                        </button>

                        {wrongCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              startNewRandomMiniExam(wrongQuestions.map((q) => q.id))
                            }
                            className="px-4 py-2 text-xs font-bold text-[#D97706] bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            <span>{t.examReviewMistakesBtn(wrongCount)}</span>
                          </button>
                        )}
                      </div>

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
                    </div>
                  </div>

                  {/* Detailed per-question review */}
                  <div className="space-y-3">
                    <h4 className="font-display text-sm font-bold text-slate-700 px-1">
                      {t.examAllQuestionsReviewTitle}
                    </h4>

                    {activeExamQuestions.map((q, idx) => {
                      const draft = getExamDraft(q.id);
                      const validation = examValidations[q.id];
                      const isCorrect = examResults[q.id] === 'correct';

                      return (
                        <div
                          key={q.id}
                          className={`bg-white border rounded-xl p-5 space-y-3 ${
                            isCorrect ? 'border-emerald-200' : 'border-red-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-mono-tabular font-bold text-slate-900">
                              {String(idx + 1).padStart(2, '0')}. {q.code}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                                isCorrect
                                  ? 'bg-[#059669] text-white'
                                  : 'bg-red-600 text-white'
                              }`}
                            >
                              {isCorrect ? t.examCorrectBadge : t.examWrongBadge}
                            </span>
                          </div>

                          <div className="text-base font-bold text-slate-900">
                            {isKo ? q.questionKo : q.questionEs}
                          </div>

                          <div
                            className={`rounded-lg border p-3 text-xs space-y-1 ${
                              isCorrect
                                ? 'bg-[#059669]/[0.05] border-[#059669]/30 text-slate-800'
                                : 'bg-red-50/60 border-red-200 text-slate-800'
                            }`}
                          >
                            <div className="font-semibold text-slate-500">
                              {t.examYourAnswerLabel}{' '}
                              <span className="text-slate-900 font-bold">
                                {draft.answer.trim() || t.examNoAnswerEntered}
                              </span>
                              {draft.verse.trim() ? ` (${draft.verse.trim()})` : ''}
                            </div>
                            {!isCorrect && validation && (
                              <div className="space-y-0.5 pt-1 text-red-700">
                                {validation.missingKeywords.length > 0 && (
                                  <div>
                                    <span className="font-semibold">
                                      {t.typingMissingKeywords}{' '}
                                    </span>
                                    <span className="font-bold">
                                      {validation.missingKeywords.join(' · ')}
                                    </span>
                                  </div>
                                )}
                                {validation.missingVerses.length > 0 && (
                                  <div>
                                    <span className="font-semibold">
                                      {t.typingMissingVerses}{' '}
                                    </span>
                                    <span className="font-mono-tabular font-bold">
                                      {validation.missingVerses.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                            <div className="text-base font-bold text-[#0284C7]">
                              {isKo ? q.answerKo : q.answerEs}
                            </div>
                            <div className="text-sm font-bold text-[#0284C7] font-mono-tabular">
                              {t.labelKeyVerse}: {isKo ? q.verseKo : q.verseEs}
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
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </>
      )}
    </div>
  );
};
