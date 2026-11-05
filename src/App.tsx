/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2,
  Shuffle,
  Eye,
  EyeOff,
  Check,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Search,
  RotateCcw,
  CheckCircle2,
  Globe,
  Keyboard,
  CreditCard,
  Sparkles,
  StickyNote
} from 'lucide-react';
import {
  QUESTIONS,
  CHAPTERS,
  DAY_SCHEDULES,
  AppLanguage,
  ParableQuestion,
  StudyCardItem,
  sampleRandomIds,
  buildBidirectionalSessionCards
} from './data/questions';
import { UI_STRINGS } from './data/i18n';
import { questionHasVerse } from './data/bibleVerses';
import { speakEcuadorSpanish } from './utils/ecuadorTts';
import {
  QUESTION_KEYWORD_SPECS,
  TypingValidationResult,
  evaluateTypingSubmission
} from './utils/typingValidator';
import { TwoStepAnswerCard, RevealStage } from './components/TwoStepAnswerCard';
import { VerseAndNoteSection } from './components/VerseAndNoteSection';
import { NotebookModal } from './components/NotebookModal';
import {
  IntensiveStudySection,
  QuestionAttemptStat
} from './components/IntensiveStudySection';

type ActiveSection = 'study' | 'exam' | 'intensive' | 'catalog';
type StudyMethod = 'card' | 'typing';
type StudyLayoutMode = 'cards_list' | 'single_focus';
type OriginFilter = 'ALL' | 'NEW' | 'REVIEW';

interface DailyReviewStore {
  [day: number]: number[];
}

interface TypingCardState {
  answer: string;
  verse: string;
  submitted: boolean;
  result: TypingValidationResult | null;
}

interface ExamDraftEntry {
  answer: string;
  verse: string;
}

interface BestScoresByLanguage {
  ko: Record<number, number>;
  es: Record<number, number>;
}

function shuffleCardsRandomly<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function App() {
  // Language selection state: null = initial Language Selection Gate screen
  const [language, setLanguage] = useState<AppLanguage | null>(null);

  // Navigation section: study | exam | intensive | catalog
  const [activeSection, setActiveSection] = useState<ActiveSection>('study');

  // Study method: 1. 카드 ('card') | 2. 타이핑 ('typing')
  const [studyMethod, setStudyMethod] = useState<StudyMethod>('card');

  // Advanced Study Mode ("고급학습기능") toggle state
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('parabolas99_v2_advanced_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Notebook Modal state (in Advanced Study Mode)
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState<boolean>(false);

  // 20-Day Curriculum Schedule collapsed by default
  const [isCurriculumOpen, setIsCurriculumOpen] = useState<boolean>(false);

  // Day selector dropdown open state (top summary bar)
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState<boolean>(false);
  const dayDropdownContainerRef = useRef<HTMLDivElement | null>(null);

  // Exam Reset feedback banner state (shown inside Exam tab)
  const [examResetBannerVisible, setExamResetBannerVisible] = useState<boolean>(false);

  // Per-question Study Tip Notes ("학습팁 노트")
  const [studyNotes, setStudyNotes] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_study_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Per-question cumulative attempt/accuracy stats (for Advanced Mode)
  const [questionStats, setQuestionStats] = useState<
    Record<number, QuestionAttemptStat>
  >(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_question_stats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persisted curriculum & progress state
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const saved = localStorage.getItem('parabolas99_v2_selected_day');
    return saved ? Math.min(20, Math.max(1, Number(saved))) : 1;
  });

  const [completedDays, setCompletedDays] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_completed_days');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cumulative Best Exam Scores per Language (ko / es) and per Session/Day (1..20)
  const [bestScoresByLang, setBestScoresByLang] = useState<BestScoresByLanguage>(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_best_scores_by_lang');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ko: parsed?.ko || {},
          es: parsed?.es || {}
        };
      }
      return { ko: {}, es: {} };
    } catch {
      return { ko: {}, es: {} };
    }
  });

  const [masteredIds, setMasteredIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_mastered_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_bookmarked_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dailyReviews, setDailyReviews] = useState<DailyReviewStore>(() => {
    try {
      const saved = localStorage.getItem('parabolas99_v2_daily_reviews');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Study controls & 2-Step Reveal state (0 = hidden, 1 = meaning shown & verse covered, 2 = full shown)
  const [prioritizeWeakInRandom, setPrioritizeWeakInRandom] = useState<boolean>(false);
  const [studyLayout, setStudyLayout] = useState<StudyLayoutMode>('cards_list');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('ALL');
  const [revealStageByUid, setRevealStageByUid] = useState<Record<string, RevealStage>>({});
  const [catalogStageById, setCatalogStageById] = useState<Record<number, RevealStage>>({});
  const [revealAll, setRevealAll] = useState<boolean>(false);
  const [focusCardIndex, setFocusCardIndex] = useState<number>(0);

  // Typing study state per card uid
  const [typingEntries, setTypingEntries] = useState<Record<string, TypingCardState>>({});

  // Exam state (per-question immediate grading on Enter, locked inputs once graded, randomized every time)
  const [examIndex, setExamIndex] = useState<number>(0);
  const [examDrafts, setExamDrafts] = useState<Record<string, ExamDraftEntry>>({});
  const [examBatchValidations, setExamBatchValidations] = useState<
    Record<string, TypingValidationResult>
  >({});
  const [examResults, setExamResults] = useState<Record<string, 'correct' | 'review_again'>>({});
  const [examSessionSeed, setExamSessionSeed] = useState<number>(0);
  const [examShowResults, setExamShowResults] = useState<boolean>(false);
  const [examMistakeUids, setExamMistakeUids] = useState<string[] | null>(null);

  // Refs for seamless keyboard navigation
  const examAnswerInputRef = useRef<HTMLInputElement | null>(null);
  const examNextActionBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastExamGradeTimeRef = useRef<number>(0);
  const studyAnswerInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastSubmitTimeRef = useRef<number>(0);

  // Close day dropdown on outside click
  useEffect(() => {
    if (!isDayDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dayDropdownContainerRef.current &&
        !dayDropdownContainerRef.current.contains(e.target as Node)
      ) {
        setIsDayDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isDayDropdownOpen]);

  // Catalog filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number>(0);
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<
    'all' | 'bookmarked' | 'mastered' | 'unmastered'
  >('all');

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('parabolas99_v2_selected_day', String(selectedDay));
  }, [selectedDay]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_completed_days', JSON.stringify(completedDays));
  }, [completedDays]);

  useEffect(() => {
    localStorage.setItem(
      'parabolas99_v2_best_scores_by_lang',
      JSON.stringify(bestScoresByLang)
    );
  }, [bestScoresByLang]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_mastered_ids', JSON.stringify(masteredIds));
  }, [masteredIds]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_bookmarked_ids', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_daily_reviews', JSON.stringify(dailyReviews));
  }, [dailyReviews]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_advanced_mode', String(isAdvancedMode));
  }, [isAdvancedMode]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_study_notes', JSON.stringify(studyNotes));
  }, [studyNotes]);

  useEffect(() => {
    localStorage.setItem('parabolas99_v2_question_stats', JSON.stringify(questionStats));
  }, [questionStats]);

  const handleSaveStudyNote = (questionId: number, noteText: string) => {
    setStudyNotes((prev) => {
      const next = { ...prev };
      if (!noteText) {
        delete next[questionId];
      } else {
        next[questionId] = noteText;
      }
      return next;
    });
  };

  const handleRecordQuestionAttempt = (questionId: number, isCorrect: boolean) => {
    setQuestionStats((prev) => {
      const existing = prev[questionId] || { attempts: 0, correct: 0, wrong: 0 };
      return {
        ...prev,
        [questionId]: {
          attempts: existing.attempts + 1,
          correct: existing.correct + (isCorrect ? 1 : 0),
          wrong: existing.wrong + (isCorrect ? 0 : 1)
        }
      };
    });
  };

  const currentSchedule = useMemo(
    () => DAY_SCHEDULES.find((d) => d.day === selectedDay) || DAY_SCHEDULES[0],
    [selectedDay]
  );

  // Ensure the selected day has its random review concepts generated
  useEffect(() => {
    if (
      currentSchedule.reviewConceptCount > 0 &&
      (!dailyReviews[selectedDay] ||
        dailyReviews[selectedDay].length !== currentSchedule.reviewConceptCount)
    ) {
      const weakPool = currentSchedule.learnedPoolIds.filter(
        (id) => bookmarkedIds.includes(id) || !masteredIds.includes(id)
      );
      const picked = sampleRandomIds(
        currentSchedule.learnedPoolIds,
        currentSchedule.reviewConceptCount,
        prioritizeWeakInRandom ? weakPool : []
      );
      setDailyReviews((prev) => ({ ...prev, [selectedDay]: picked }));
    }
  }, [
    selectedDay,
    currentSchedule,
    dailyReviews,
    prioritizeWeakInRandom,
    bookmarkedIds,
    masteredIds
  ]);

  // Helper to start or restart the exam with a brand-new random order
  const startNewRandomExamSession = (mistakeUids: string[] | null = null) => {
    setExamSessionSeed((s) => s + 1);
    setExamIndex(0);
    setExamDrafts({});
    setExamBatchValidations({});
    setExamResults({});
    setExamMistakeUids(mistakeUids);
    setExamShowResults(false);
  };

  // Exam-tab-only Reset handler: clears exam drafts & results and starts over in a fresh random order while preserving studyNotes
  const handleResetExam = () => {
    startNewRandomExamSession(null);
    setExamResetBannerVisible(true);
    setTimeout(() => {
      setExamResetBannerVisible(false);
    }, 3200);
  };

  // Select day from dropdown or curriculum and load that day's study & exam questions
  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    setFocusCardIndex(0);
    setIsDayDropdownOpen(false);
    startNewRandomExamSession(null);
  };

  const handleRerollReviews = () => {
    if (currentSchedule.reviewConceptCount === 0) return;
    const weakPool = currentSchedule.learnedPoolIds.filter(
      (id) => bookmarkedIds.includes(id) || !masteredIds.includes(id)
    );
    const picked = sampleRandomIds(
      currentSchedule.learnedPoolIds,
      currentSchedule.reviewConceptCount,
      prioritizeWeakInRandom ? weakPool : []
    );
    setDailyReviews((prev) => ({ ...prev, [selectedDay]: picked }));
    setFocusCardIndex(0);
    startNewRandomExamSession(null);
  };

  // All 10 Question -> Answer cards for the current day
  const allDayCards = useMemo(() => {
    const revConceptIds =
      currentSchedule.reviewConceptCount > 0 ? dailyReviews[selectedDay] || [] : [];
    return buildBidirectionalSessionCards(currentSchedule.newConceptIds, revConceptIds);
  }, [currentSchedule, dailyReviews, selectedDay]);

  // Filtered study cards
  const filteredStudyCards = useMemo(() => {
    return allDayCards.filter((card) => {
      if (originFilter !== 'ALL' && card.origin !== originFilter) return false;
      return true;
    });
  }, [allDayCards, originFilter]);

  // Exam items: freshly randomized every time the user enters the exam tab or clicks retry
  const examCards = useMemo(() => {
    void examSessionSeed;
    return shuffleCardsRandomly(allDayCards);
  }, [allDayCards, examSessionSeed]);

  const activeExamCards = useMemo(() => {
    void examSessionSeed;
    if (examMistakeUids && examMistakeUids.length > 0) {
      return shuffleCardsRandomly(
        allDayCards.filter((c) => examMistakeUids.includes(c.uid))
      );
    }
    return examCards;
  }, [allDayCards, examCards, examMistakeUids, examSessionSeed]);

  const currentExamCard = activeExamCards[examIndex] || activeExamCards[0];

  const toggleMastered = (id: number) => {
    setMasteredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleBookmark = (id: number) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 2-Step Reveal helpers for Study Cards
  const getCardRevealStage = (card: StudyCardItem): RevealStage => {
    if (revealAll) return 2;
    return revealStageByUid[card.uid] || 0;
  };

  const advanceCardRevealStage = (card: StudyCardItem) => {
    setRevealStageByUid((prev) => {
      const current = prev[card.uid] || 0;
      const hasVerse = questionHasVerse(card.question, language || 'ko');
      if (current === 0) {
        return { ...prev, [card.uid]: hasVerse ? 1 : 2 };
      }
      if (current === 1) {
        return { ...prev, [card.uid]: 2 };
      }
      return { ...prev, [card.uid]: 0 };
    });
  };

  const resetCardRevealStage = (card: StudyCardItem) => {
    if (revealAll) {
      setRevealAll(false);
    }
    setRevealStageByUid((prev) => ({ ...prev, [card.uid]: 0 }));
  };

  // 2-Step Reveal helpers for Catalog items
  const getCatalogStage = (q: ParableQuestion): RevealStage => {
    return catalogStageById[q.id] ?? 0;
  };

  const advanceCatalogStage = (q: ParableQuestion) => {
    setCatalogStageById((prev) => {
      const current = prev[q.id] ?? 0;
      const hasVerse = questionHasVerse(q, language || 'ko');
      if (current === 0) {
        return { ...prev, [q.id]: hasVerse ? 1 : 2 };
      }
      if (current === 1) {
        return { ...prev, [q.id]: 2 };
      }
      return { ...prev, [q.id]: 0 };
    });
  };

  const resetCatalogStage = (q: ParableQuestion) => {
    setCatalogStageById((prev) => ({ ...prev, [q.id]: 0 }));
  };

  const toggleCompleteDay = (day: number) => {
    setCompletedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Typing mode helpers
  const getTypingEntry = (uid: string): TypingCardState => {
    return (
      typingEntries[uid] || {
        answer: '',
        verse: '',
        submitted: false,
        result: null
      }
    );
  };

  const updateTypingAnswer = (uid: string, answer: string) => {
    setTypingEntries((prev) => {
      const existing = prev[uid] || { answer: '', verse: '', submitted: false, result: null };
      return {
        ...prev,
        [uid]: { ...existing, answer, submitted: false, result: null }
      };
    });
  };

  const updateTypingVerse = (uid: string, verse: string) => {
    setTypingEntries((prev) => {
      const existing = prev[uid] || { answer: '', verse: '', submitted: false, result: null };
      return {
        ...prev,
        [uid]: { ...existing, verse, submitted: false, result: null }
      };
    });
  };

  const submitTypingCard = (card: StudyCardItem) => {
    if (!language) return;
    lastSubmitTimeRef.current = Date.now();
    const entry = getTypingEntry(card.uid);
    const result = evaluateTypingSubmission(
      card.question,
      entry.answer,
      entry.verse,
      language
    );
    setTypingEntries((prev) => ({
      ...prev,
      [card.uid]: {
        ...entry,
        submitted: true,
        result
      }
    }));
    handleRecordQuestionAttempt(card.question.id, result.isCorrect);
    if (result.isCorrect && !masteredIds.includes(card.question.id)) {
      setMasteredIds((prev) => [...prev, card.question.id]);
    }
  };

  const resetTypingCard = (uid: string) => {
    setTypingEntries((prev) => ({
      ...prev,
      [uid]: { answer: '', verse: '', submitted: false, result: null }
    }));
    setTimeout(() => {
      studyAnswerInputRefs.current[uid]?.focus();
    }, 20);
  };

  const advanceStudyTypingCard = (currentUid: string) => {
    if (filteredStudyCards.length === 0) return;
    const currentIdx = filteredStudyCards.findIndex((c) => c.uid === currentUid);
    if (studyLayout === 'single_focus') {
      const nextIdx =
        currentIdx >= 0 && currentIdx < filteredStudyCards.length - 1
          ? currentIdx + 1
          : 0;
      setFocusCardIndex(nextIdx);
      const nextCard = filteredStudyCards[nextIdx];
      if (nextCard) {
        setTimeout(() => {
          studyAnswerInputRefs.current[nextCard.uid]?.focus();
        }, 30);
      }
    } else {
      const nextIdx =
        currentIdx >= 0 && currentIdx < filteredStudyCards.length - 1
          ? currentIdx + 1
          : 0;
      const nextCard = filteredStudyCards[nextIdx];
      if (nextCard) {
        const el = studyAnswerInputRefs.current[nextCard.uid];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
    }
  };

  // Exam draft helpers (per-question immediate grading on Enter; once graded, locked and cannot be edited)
  const getExamDraft = (uid: string): ExamDraftEntry => {
    return examDrafts[uid] || { answer: '', verse: '' };
  };

  const updateExamDraftAnswer = (uid: string, answer: string) => {
    if (examBatchValidations[uid]) return; // Locked once graded
    setExamDrafts((prev) => {
      const existing = prev[uid] || { answer: '', verse: '' };
      return {
        ...prev,
        [uid]: { ...existing, answer }
      };
    });
  };

  const updateExamDraftVerse = (uid: string, verse: string) => {
    if (examBatchValidations[uid]) return; // Locked once graded
    setExamDrafts((prev) => {
      const existing = prev[uid] || { answer: '', verse: '' };
      return {
        ...prev,
        [uid]: { ...existing, verse }
      };
    });
  };

  // Accumulate and persist the highest exam score for a given language and day (1..20)
  const recordDayBestScore = (lang: AppLanguage, day: number, scorePercent: number) => {
    setBestScoresByLang((prev) => {
      const currentLangScores = prev[lang] || {};
      const existingBest = currentLangScores[day];
      if (existingBest !== undefined && existingBest >= scorePercent) {
        return prev;
      }
      return {
        ...prev,
        [lang]: {
          ...currentLangScores,
          [day]: scorePercent
        }
      };
    });
    if (scorePercent >= 80) {
      setCompletedDays((prev) => (prev.includes(day) ? prev : [...prev, day]));
    }
  };

  // Grade the current exam question immediately on Enter, lock inputs, and show right/wrong details
  const gradeCurrentExamQuestion = () => {
    if (!language || !currentExamCard) return;
    if (examBatchValidations[currentExamCard.uid]) return;

    lastExamGradeTimeRef.current = Date.now();
    const draft = examDrafts[currentExamCard.uid] || { answer: '', verse: '' };
    const res = evaluateTypingSubmission(
      currentExamCard.question,
      draft.answer,
      draft.verse,
      language
    );

    const nextResults: Record<string, 'correct' | 'review_again'> = {
      ...examResults,
      [currentExamCard.uid]: res.isCorrect ? 'correct' : 'review_again'
    };

    setExamBatchValidations((prev) => ({
      ...prev,
      [currentExamCard.uid]: res
    }));
    setExamResults(nextResults);
    handleRecordQuestionAttempt(currentExamCard.question.id, res.isCorrect);

    if (res.isCorrect && !masteredIds.includes(currentExamCard.question.id)) {
      setMasteredIds((prev) => [...prev, currentExamCard.question.id]);
    } else if (!res.isCorrect && !bookmarkedIds.includes(currentExamCard.question.id)) {
      setBookmarkedIds((prev) => [...prev, currentExamCard.question.id]);
    }

    // If all questions of the full day exam have now been graded, immediately update cumulative best score
    if (!examMistakeUids && activeExamCards.length > 0) {
      const gradedCount = activeExamCards.filter((c) => Boolean(nextResults[c.uid])).length;
      if (gradedCount === activeExamCards.length) {
        const correctCount = activeExamCards.filter(
          (c) => nextResults[c.uid] === 'correct'
        ).length;
        const scorePercent = Math.round((correctCount / activeExamCards.length) * 100);
        recordDayBestScore(language, selectedDay, scorePercent);
      }
    }

    setTimeout(() => {
      examNextActionBtnRef.current?.focus();
    }, 30);
  };

  // Advance to the next exam question after grading, or show final Pass/Fail results
  const advanceExamAfterGrading = () => {
    if (!currentExamCard || !examBatchValidations[currentExamCard.uid]) return;
    if (examIndex < activeExamCards.length - 1) {
      setExamIndex((i) => Math.min(activeExamCards.length - 1, i + 1));
      setTimeout(() => {
        examAnswerInputRef.current?.focus();
      }, 30);
    } else {
      if (language && !examMistakeUids && activeExamCards.length > 0) {
        const correctCount = activeExamCards.filter(
          (c) => examResults[c.uid] === 'correct'
        ).length;
        const scorePercent = Math.round((correctCount / activeExamCards.length) * 100);
        recordDayBestScore(language, selectedDay, scorePercent);
      }
      setExamShowResults(true);
    }
  };

  // Handle Enter key in Exam Mode: first Enter grades the question; second Enter advances to next question
  const handleExamKeyAction = () => {
    if (!currentExamCard) return;
    const isGraded = Boolean(examBatchValidations[currentExamCard.uid]);
    if (!isGraded) {
      gradeCurrentExamQuestion();
    } else if (Date.now() - lastExamGradeTimeRef.current >= 150) {
      advanceExamAfterGrading();
    }
  };

  // Auto-focus exam answer input when exam question index changes to an ungraded question
  useEffect(() => {
    if (
      activeSection === 'exam' &&
      !examShowResults &&
      currentExamCard &&
      !examBatchValidations[currentExamCard.uid]
    ) {
      const timer = setTimeout(() => {
        examAnswerInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [activeSection, examIndex, examShowResults, currentExamCard, examBatchValidations]);

  // Filtered catalog questions
  const filteredCatalog = useMemo(() => {
    if (!language) return [];
    const isKo = language === 'ko';
    return QUESTIONS.filter((q) => {
      if (selectedChapter !== 0 && q.chapterId !== selectedChapter) return false;
      if (catalogStatusFilter === 'bookmarked' && !bookmarkedIds.includes(q.id))
        return false;
      if (catalogStatusFilter === 'mastered' && !masteredIds.includes(q.id))
        return false;
      if (catalogStatusFilter === 'unmastered' && masteredIds.includes(q.id))
        return false;
      if (searchQuery.trim() !== '') {
        const kw = searchQuery.toLowerCase();
        if (isKo) {
          return (
            q.code.toLowerCase().includes(kw) ||
            q.termKo.toLowerCase().includes(kw) ||
            q.questionKo.toLowerCase().includes(kw) ||
            q.answerKo.toLowerCase().includes(kw) ||
            q.verseKo.toLowerCase().includes(kw)
          );
        } else {
          return (
            q.code.toLowerCase().includes(kw) ||
            q.termEs.toLowerCase().includes(kw) ||
            q.questionEs.toLowerCase().includes(kw) ||
            q.answerEs.toLowerCase().includes(kw) ||
            q.verseEs.toLowerCase().includes(kw)
          );
        }
      }
      return true;
    });
  }, [
    language,
    selectedChapter,
    catalogStatusFilter,
    bookmarkedIds,
    masteredIds,
    searchQuery
  ]);

  // ============================================================================
  // STEP 1: MINIMAL INITIAL LANGUAGE SELECTION GATE SCREEN
  // ============================================================================
  if (!language) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between p-6">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                비유와 성구 시험 · Parábolas y Versículos
              </h1>
              <p className="text-xs text-slate-500">
                언어 선택 · Seleccione idioma
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setLanguage('ko')}
                className="group p-6 rounded-xl border border-slate-200 bg-white hover:border-[#0284C7] hover:bg-[#0284C7]/[0.03] transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="font-display text-2xl font-bold text-slate-900">
                    한국어
                  </div>
                  <p className="text-xs text-slate-500">
                    비유와 성구 시험 · 개역한글판
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0284C7]">
                  <span>시작</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLanguage('es')}
                className="group p-6 rounded-xl border border-slate-200 bg-white hover:border-[#0284C7] hover:bg-[#0284C7]/[0.03] transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="font-display text-2xl font-bold text-slate-900">
                    Español
                  </div>
                  <p className="text-xs text-slate-500">
                    Parábolas y Versículos · Reina-Valera 1960
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0284C7]">
                  <span>Iniciar</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STEP 2: MINIMAL SINGLE-LANGUAGE WORKSPACE
  // ============================================================================
  const isKo = language === 'ko';
  const t = UI_STRINGS[language];
  const currentLangBestScores = bestScoresByLang[language] || {};
  const currentFocusCard =
    filteredStudyCards[
      Math.min(focusCardIndex, Math.max(0, filteredStudyCards.length - 1))
    ];

  const savedNotesCount = Object.values(studyNotes).filter(
    (n) => n && n.trim().length > 0
  ).length;

  const renderCardPrompt = (card: StudyCardItem) => {
    return isKo ? card.question.questionKo : card.question.questionEs;
  };

  const renderCardAnswerMain = (card: StudyCardItem) => {
    return isKo ? card.question.answerKo : card.question.answerEs;
  };

  const renderCardVerse = (card: StudyCardItem) => {
    return isKo ? card.question.verseKo : card.question.verseEs;
  };

  const isSingleShortQuestion = (questionId: number) => {
    const spec = QUESTION_KEYWORD_SPECS[questionId];
    if (!spec) return false;
    const slots = isKo ? spec.koSlots : spec.esSlots;
    return spec.isShort && slots.length === 1;
  };

  const renderQuestionStatBadge = (questionId: number) => {
    if (!isAdvancedMode) return null;
    const stat = questionStats[questionId];
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

  // Renders the interactive Typing Box for a given study card
  const renderTypingStudyBox = (card: StudyCardItem) => {
    const q = card.question;
    const entry = getTypingEntry(card.uid);
    const shortMode = isSingleShortQuestion(q.id);
    const verseStr = renderCardVerse(card).trim();
    const hasVerse = verseStr !== '-' && verseStr.length > 0;
    const verseCount = hasVerse ? verseStr.split(',').filter(Boolean).length : 0;
    const isNextReady = Boolean(entry.submitted && entry.result?.isCorrect);

    const handleStudyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (isNextReady) {
          if (Date.now() - lastSubmitTimeRef.current >= 150) {
            advanceStudyTypingCard(card.uid);
          }
        } else {
          submitTypingCard(card);
        }
      }
    };

    return (
      <div className="space-y-3 pt-2 border-t border-slate-100">
        {/* Rule Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span
            className={`font-semibold ${
              shortMode ? 'text-[#0284C7]' : 'text-slate-600'
            }`}
          >
            {shortMode ? t.typingBadgeShort : t.typingBadgeKeywords}
          </span>
          {hasVerse && (
            <span className="font-mono-tabular text-slate-400">
              {t.labelKeyVerse} ({verseCount})
            </span>
          )}
        </div>

        {/* Meaning Answer Input + Evidence Verse Input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className={hasVerse ? 'sm:col-span-7' : 'sm:col-span-12'}>
            <input
              ref={(el) => {
                studyAnswerInputRefs.current[card.uid] = el;
              }}
              type="text"
              value={entry.answer}
              onChange={(e) => updateTypingAnswer(card.uid, e.target.value)}
              onKeyDown={handleStudyInputKeyDown}
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
                onChange={(e) => updateTypingVerse(card.uid, e.target.value)}
                onKeyDown={handleStudyInputKeyDown}
                placeholder={t.typingVersePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
              />
            </div>
          )}
        </div>

        {/* Action & Next Question Button Bar */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!entry.submitted ? (
            <button
              type="button"
              onClick={() => submitTypingCard(card)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] rounded-lg hover:bg-[#0369A1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.btnCheckTyping}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => resetTypingCard(card.uid)}
              className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.btnRetryTyping}
            </button>
          )}

          <button
            type="button"
            disabled={!isNextReady}
            onClick={() => advanceStudyTypingCard(card.uid)}
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
        </div>

        {/* Validation Result Box + Full Original Bible Verse + Study Tip Note */}
        {entry.submitted && (
          <div className="space-y-2">
            <div
              className={`rounded-xl border p-4 space-y-2.5 ${
                entry.result?.isCorrect
                  ? 'bg-[#059669]/[0.05] border-[#059669]/40'
                  : 'bg-red-50/60 border-red-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-xs font-bold ${
                    entry.result?.isCorrect ? 'text-[#059669]' : 'text-red-600'
                  }`}
                >
                  {entry.result?.isCorrect
                    ? t.typingResultCorrect
                    : t.typingResultWrong}
                </span>
                {isNextReady && (
                  <button
                    type="button"
                    onClick={() => advanceStudyTypingCard(card.uid)}
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

              {entry.result && !entry.result.isCorrect && (
                <div className="text-xs space-y-1 text-slate-700">
                  {entry.result.missingKeywords.length > 0 && (
                    <div>
                      <span className="font-semibold text-red-600 mr-1.5">
                        {t.typingMissingKeywords}
                      </span>
                      <span className="font-mono-tabular">
                        {entry.result.missingKeywords.join(', ')}
                      </span>
                    </div>
                  )}
                  {entry.result.missingVerses.length > 0 && (
                    <div>
                      <span className="font-semibold text-red-600 mr-1.5">
                        {t.typingMissingVerses}
                      </span>
                      <span className="font-mono-tabular">
                        {entry.result.missingVerses.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                <div className="text-xl font-bold text-[#0284C7]">
                  {renderCardAnswerMain(card)}
                </div>
                <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                  {t.labelKeyVerse}: {renderCardVerse(card)}
                </div>
              </div>
            </div>

            <VerseAndNoteSection
              question={card.question}
              language={language}
              isAdvancedMode={isAdvancedMode}
              savedNote={studyNotes[card.question.id] || ''}
              onSaveNote={handleSaveStudyNote}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: Single row on PC (md+), Two rows on Mobile so all tabs are visible at once */}
      <header
        className={`sticky top-0 z-30 bg-white border-b px-4 sm:px-6 py-3 md:py-3.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2.5 gap-x-4 md:gap-6 transition-colors ${
          isAdvancedMode ? 'border-indigo-200 bg-indigo-50/15' : 'border-slate-200'
        }`}
      >
        {/* Left Zone (Row 1 on Mobile): Brand Title */}
        <a
          href="#study"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('study');
          }}
          className="order-1 font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>{t.brandTitle}</span>
          {isAdvancedMode && (
            <span className="px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider bg-indigo-600 text-white rounded-md">
              PRO
            </span>
          )}
        </a>

        {/* Right Zone (Row 1 Right on Mobile, Far Right on PC): "고급학습기능" Button */}
        <div className="order-2 md:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdvancedMode && (
            <button
              type="button"
              onClick={() => setIsNotebookModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{t.btnOpenNotebook(savedNotesCount)}</span>
            </button>
          )}

          <div className="relative advanced-tooltip-trigger">
            <button
              type="button"
              onClick={() => setIsAdvancedMode((prev) => !prev)}
              className={`px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isAdvancedMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-500/25 shadow-xs'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isAdvancedMode ? t.btnAdvancedModeActive : t.btnAdvancedMode}
              </span>
            </button>

            {/* Hover Popup explaining Advanced Study Mode */}
            <div className="advanced-tooltip-popup absolute right-0 top-full mt-2 w-72 sm:w-80 z-50 bg-slate-900 text-white rounded-xl p-3.5 shadow-xl border border-slate-700 text-left space-y-1">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{t.advancedModeTooltipTitle}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                {t.advancedModeTooltipDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Row 2 Full-Width on Mobile so all tabs are visible at once; Center on PC) */}
        <nav className="order-3 md:order-2 w-full md:w-auto pt-2 md:pt-0 border-t border-slate-100 md:border-t-0 flex flex-wrap items-center justify-between sm:justify-start md:justify-center gap-x-2.5 gap-y-1.5 sm:gap-5 md:gap-6 text-xs sm:text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveSection('study')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 cursor-pointer ${
              activeSection === 'study'
                ? 'border-[#0284C7] text-slate-900 font-bold'
                : 'border-transparent'
            }`}
          >
            {t.navStudy}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('exam');
              startNewRandomExamSession(null);
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 cursor-pointer ${
              activeSection === 'exam'
                ? 'border-[#0284C7] text-slate-900 font-bold'
                : 'border-transparent'
            }`}
          >
            {t.navExam}
          </button>

          {/* TAB: 집중공부 (Intensive Study) */}
          <button
            type="button"
            onClick={() => setActiveSection('intensive')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 flex items-center gap-1 cursor-pointer ${
              activeSection === 'intensive'
                ? 'border-[#D97706] text-slate-900 font-bold'
                : 'border-transparent'
            }`}
          >
            <span>{t.navIntensive}</span>
            <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono-tabular font-bold rounded bg-[#D97706]/15 text-[#D97706]">
              {bookmarkedIds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('catalog')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 cursor-pointer ${
              activeSection === 'catalog'
                ? 'border-[#0284C7] text-slate-900 font-bold'
                : 'border-transparent'
            }`}
          >
            {t.navCatalog}
          </button>

          <button
            type="button"
            onClick={() => setLanguage(null)}
            className="hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 border-transparent flex items-center gap-1 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>{t.navChangeLanguage}</span>
          </button>
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 py-6">
        {/* Advanced Study Mode Active Banner */}
        {isAdvancedMode && (
          <div className="mb-5 bg-indigo-50/90 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{t.advancedActiveBannerTitle}</span>
              </div>
              <p className="text-xs text-indigo-800/90 leading-relaxed">
                {t.advancedActiveBannerDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNotebookModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>{t.btnOpenNotebook(savedNotesCount)}</span>
            </button>
          </div>
        )}

        {/* Minimal Summary Strip with Interactive Day Dropdown Selector */}
        <section className="mb-6 pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div ref={dayDropdownContainerRef} className="relative">
            <div className="text-xs text-slate-400 mb-1.5 font-mono-tabular">
              {t.kickerSummary}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Interactive "1일차" / "Día 1" Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsDayDropdownOpen((prev) => !prev)}
                aria-expanded={isDayDropdownOpen}
                className="px-3.5 py-2 rounded-xl bg-white border-2 border-[#0284C7] text-[#0284C7] hover:bg-[#0284C7]/[0.05] font-display text-lg sm:text-xl font-bold tracking-tight inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>{t.dayDropdownBadge(selectedDay)}</span>
                {typeof currentLangBestScores[selectedDay] === 'number' && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-tabular font-bold ${
                      currentLangBestScores[selectedDay] >= 80
                        ? 'bg-emerald-50 text-[#059669]'
                        : 'bg-amber-50 text-[#D97706]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.sessionBestScore(currentLangBestScores[selectedDay])}</span>
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isDayDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isKo
                  ? currentSchedule.titleKo.replace(/^\d+일차\s*·\s*/, '')
                  : currentSchedule.titleEs.replace(/^Día\s*\d+\s*·\s*/, '')}
              </h1>
            </div>

            {/* Day Dropdown Menu (1일차 ~ 20일차 / Día 1 ~ Día 20) */}
            {isDayDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-h-80 overflow-y-auto z-40 bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 py-1">
                {DAY_SCHEDULES.map((sched) => {
                  const isSelected = sched.day === selectedDay;
                  const bestScore = currentLangBestScores[sched.day];
                  const hasTaken = typeof bestScore === 'number';
                  const subtitle = isKo
                    ? sched.titleKo.replace(/^\d+일차\s*·\s*/, '')
                    : sched.titleEs.replace(/^Día\s*\d+\s*·\s*/, '');

                  return (
                    <button
                      key={sched.day}
                      type="button"
                      onClick={() => handleSelectDay(sched.day)}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0284C7]/10 text-[#0284C7] font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-mono-tabular font-bold shrink-0 ${
                            isSelected ? 'text-[#0284C7]' : 'text-slate-900'
                          }`}
                        >
                          {t.dayDropdownBadge(sched.day)}
                        </span>
                        <span className="text-slate-500 font-mono-tabular truncate">
                          {subtitle}
                        </span>
                      </div>

                      {hasTaken ? (
                        <span
                          className={`inline-flex items-center gap-1 font-mono-tabular font-bold shrink-0 ${
                            bestScore >= 80 ? 'text-[#059669]' : 'text-[#D97706]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.sessionBestScore(bestScore)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium shrink-0">
                          {t.sessionNotTaken}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Two-Zone Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / MAIN STAGE (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* ============================================================== */}
            {/* SECTION 1: DAILY 10-QUESTION STUDY (1. 카드 / 2. 타이핑)        */}
            {/* ============================================================== */}
            {activeSection === 'study' && (
              <>
                {/* Study Method Switcher + Filter Toolbar */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 2 Study Methods: 1. 카드 | 2. 타이핑 */}
                    <div className="flex items-center gap-1 p-1 bg-slate-900/5 border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setStudyMethod('card')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          studyMethod === 'card'
                            ? 'bg-[#0284C7] text-white'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{t.studyMethodCard}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudyMethod('typing')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          studyMethod === 'typing'
                            ? 'bg-[#0284C7] text-white'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>{t.studyMethodTyping}</span>
                      </button>
                    </div>

                    {/* All / New / Review filter */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setOriginFilter('ALL');
                          setFocusCardIndex(0);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          originFilter === 'ALL'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.filterAll10}
                      </button>
                      {currentSchedule.newConceptIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setOriginFilter('NEW');
                            setFocusCardIndex(0);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            originFilter === 'NEW'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t.filterNew} ({currentSchedule.newConceptIds.length})
                        </button>
                      )}
                      {currentSchedule.reviewConceptCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setOriginFilter('REVIEW');
                            setFocusCardIndex(0);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            originFilter === 'REVIEW'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t.filterReview} ({currentSchedule.reviewConceptCount})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setStudyLayout((prev) =>
                          prev === 'cards_list' ? 'single_focus' : 'cards_list'
                        )
                      }
                      className="px-3 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {studyLayout === 'cards_list' ? t.layoutList : t.layoutFocus}
                    </button>

                    {studyMethod === 'card' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevealAll((prev) => !prev);
                          setRevealStageByUid({});
                        }}
                        className="px-3 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {revealAll ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {revealAll ? t.btnHideAllAnswers : t.btnShowAllAnswers}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Single Focus Card Mode */}
                {studyLayout === 'single_focus' && currentFocusCard ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                        <span className="font-bold text-slate-900">
                          {currentFocusCard.question.code}
                        </span>
                        <span>·</span>
                        <span
                          className={
                            currentFocusCard.origin === 'NEW'
                              ? 'text-[#0284C7] font-semibold'
                              : 'text-[#D97706] font-semibold'
                          }
                        >
                          {currentFocusCard.origin === 'NEW'
                            ? t.tagNewConcept
                            : t.tagReviewConcept}
                        </span>
                        <span>·</span>
                        <span>
                          {isKo
                            ? currentFocusCard.question.chapterTitleKo
                            : currentFocusCard.question.chapterTitleEs}
                        </span>
                        {renderQuestionStatBadge(currentFocusCard.question.id)}
                      </div>
                      <div className="text-xs font-mono-tabular text-slate-400">
                        {focusCardIndex + 1} / {filteredStudyCards.length}
                      </div>
                    </div>

                    {/* Prompt Area */}
                    <div className="space-y-3 py-2">
                      <h2 className="text-xl font-bold text-slate-900 leading-snug">
                        {renderCardPrompt(currentFocusCard)}
                      </h2>

                      {!isKo && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              speakEcuadorSpanish(currentFocusCard.question.questionEs)
                            }
                            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>{t.btnListenPromptEc}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              speakEcuadorSpanish(currentFocusCard.question.answerEs)
                            }
                            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#059669]" />
                            <span>{t.btnListenAnswerEc}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Method 1: 2-Step Card Reveal OR Method 2: Typing Input */}
                    {studyMethod === 'card' ? (
                      <div className="border-t border-slate-100 pt-4">
                        <TwoStepAnswerCard
                          question={currentFocusCard.question}
                          language={language}
                          stage={getCardRevealStage(currentFocusCard)}
                          onAdvanceStage={() => advanceCardRevealStage(currentFocusCard)}
                          onResetStage={() => resetCardRevealStage(currentFocusCard)}
                          isAdvancedMode={isAdvancedMode}
                          savedNote={studyNotes[currentFocusCard.question.id] || ''}
                          onSaveNote={handleSaveStudyNote}
                        />
                      </div>
                    ) : (
                      renderTypingStudyBox(currentFocusCard)
                    )}

                    {/* Card Navigation & Self Check */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={focusCardIndex === 0}
                          onClick={() => setFocusCardIndex((i) => Math.max(0, i - 1))}
                          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>{t.btnPrevCard}</span>
                        </button>
                        <button
                          type="button"
                          disabled={focusCardIndex >= filteredStudyCards.length - 1}
                          onClick={() =>
                            setFocusCardIndex((i) =>
                              Math.min(filteredStudyCards.length - 1, i + 1)
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>{t.btnNextCard}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleBookmark(currentFocusCard.question.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                            bookmarkedIds.includes(currentFocusCard.question.id)
                              ? 'border-[#D97706] bg-[#D97706]/10 text-[#D97706]'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{t.btnBookmark}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMastered(currentFocusCard.question.id)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                            masteredIds.includes(currentFocusCard.question.id)
                              ? 'border-[#059669] bg-[#059669] text-white'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {masteredIds.includes(currentFocusCard.question.id)
                              ? t.btnMastered
                              : t.btnMarkMastered}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* All 10 Cards List Mode */
                  <div className="space-y-3">
                    {filteredStudyCards.map((card, idx) => {
                      const q = card.question;
                      const isMastered = masteredIds.includes(q.id);
                      const isBookmarked = bookmarkedIds.includes(q.id);

                      return (
                        <article
                          key={card.uid}
                          className="bg-white border border-slate-200 rounded-xl p-5 transition-colors"
                        >
                          {/* Unboxed Metadata Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                              <span className="font-bold text-slate-900">
                                {String(idx + 1).padStart(2, '0')}. {q.code}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  card.origin === 'NEW'
                                    ? 'text-[#0284C7] font-semibold'
                                    : 'text-[#D97706] font-semibold'
                                }
                              >
                                {card.origin === 'NEW'
                                  ? t.tagNewConcept
                                  : t.tagReviewConcept}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {isKo ? q.chapterTitleKo : q.chapterTitleEs}
                              </span>
                              {renderQuestionStatBadge(q.id)}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!isKo && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => speakEcuadorSpanish(q.questionEs)}
                                    className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-[#0284C7]" />
                                    <span>{t.btnListenPromptEc}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => speakEcuadorSpanish(q.answerEs)}
                                    className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-[#059669]" />
                                    <span>{t.btnListenAnswerEc}</span>
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleBookmark(q.id)}
                                className={`px-2 py-1 text-xs font-medium border rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                                  isBookmarked
                                    ? 'border-[#D97706] bg-[#D97706]/10 text-[#D97706]'
                                    : 'border-slate-200 text-slate-500 hover:text-slate-900'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                                <span>{t.btnBookmark}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleMastered(q.id)}
                                className={`px-2 py-1 text-xs font-semibold border rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                                  isMastered
                                    ? 'border-[#059669] bg-[#059669] text-white'
                                    : 'border-slate-200 text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>
                                  {isMastered ? t.btnMastered : t.btnMarkMastered}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Question Text */}
                          <h3 className="text-lg font-bold text-slate-900 leading-snug mb-3">
                            {renderCardPrompt(card)}
                          </h3>

                          {/* Study Mode 1: 2-Step Card Reveal OR Study Mode 2: Typing */}
                          {studyMethod === 'card' ? (
                            <TwoStepAnswerCard
                              question={q}
                              language={language}
                              stage={getCardRevealStage(card)}
                              onAdvanceStage={() => advanceCardRevealStage(card)}
                              onResetStage={() => resetCardRevealStage(card)}
                              isAdvancedMode={isAdvancedMode}
                              savedNote={studyNotes[q.id] || ''}
                              onSaveNote={handleSaveStudyNote}
                            />
                          ) : (
                            renderTypingStudyBox(card)
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ============================================================== */}
            {/* SECTION 2: 10-QUESTION EXAM MODE (IMMEDIATE GRADING ON ENTER)  */}
            {/* ============================================================== */}
            {activeSection === 'exam' && currentExamCard && (
              <>
                {/* Exam Reset Confirmation Banner (Shown only inside Exam Tab) */}
                {examResetBannerVisible && (
                  <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                      <span>{t.examResetDoneBanner}</span>
                    </div>
                  </div>
                )}

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

                    {/* Exam Header with Top-Right Exam Reset Button */}
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular mb-0.5">
                          <span>
                            {examIndex + 1} / {activeExamCards.length}
                          </span>
                          <span>·</span>
                          <span
                            className={
                              currentExamCard.origin === 'NEW'
                                ? 'text-[#0284C7] font-semibold'
                                : 'text-[#D97706] font-semibold'
                            }
                          >
                            {currentExamCard.origin === 'NEW'
                              ? t.tagNewConcept
                              : t.tagReviewConcept}
                          </span>
                          {renderQuestionStatBadge(currentExamCard.question.id)}
                        </div>
                        <h2 className="font-display text-lg font-bold text-slate-900">
                          {examMistakeUids
                            ? `${t.examTitle(selectedDay)} · ${t.examReviewMistakesTitle}`
                            : t.examTitle(selectedDay)}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.examOnePassGuide}
                        </p>
                      </div>

                      {/* Top-Right Exam Controls: Exam Reset Button */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleResetExam}
                          title={t.examResetBtnTooltip}
                          className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span>{t.examResetBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* 1-to-10 Non-Clickable One-Way Progress Stepper (Shows ✓ / ✕ as each question is graded) */}
                    <div className="flex flex-wrap items-center gap-1.5" aria-label="Exam Progress">
                      {activeExamCards.map((card, idx) => {
                        const isCurrent = idx === examIndex;
                        const gradedStatus = examResults[card.uid];
                        return (
                          <span
                            key={card.uid}
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

                    {/* Exam Question Prompt */}
                    <div className="py-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">
                          {currentExamCard.question.code}
                        </span>
                        {!isKo && (
                          <button
                            type="button"
                            onClick={() =>
                              speakEcuadorSpanish(currentExamCard.question.questionEs)
                            }
                            className="text-xs font-medium text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t.btnListenPromptEc}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xl font-bold text-slate-900 leading-snug">
                        {renderCardPrompt(currentExamCard)}
                      </p>
                    </div>

                    {/* Per-Question Immediate Grading Inputs (Locked once graded) */}
                    {(() => {
                      const currentDraft = getExamDraft(currentExamCard.uid);
                      const currentValidation =
                        examBatchValidations[currentExamCard.uid] || null;
                      const isCurrentGraded = Boolean(currentValidation);
                      const hasVerse =
                        renderCardVerse(currentExamCard).trim() !== '-' &&
                        renderCardVerse(currentExamCard).trim().length > 0;
                      const isLastQuestion = examIndex >= activeExamCards.length - 1;

                      return (
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-[#0284C7]">
                            {isSingleShortQuestion(currentExamCard.question.id)
                              ? t.typingBadgeShort
                              : t.typingBadgeKeywords}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className={hasVerse ? 'sm:col-span-7' : 'sm:col-span-12'}>
                              <input
                                ref={examAnswerInputRef}
                                type="text"
                                value={currentDraft.answer}
                                disabled={isCurrentGraded}
                                readOnly={isCurrentGraded}
                                onChange={(e) =>
                                  updateExamDraftAnswer(
                                    currentExamCard.uid,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleExamKeyAction();
                                  }
                                }}
                                placeholder={
                                  isSingleShortQuestion(currentExamCard.question.id)
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
                                    updateExamDraftVerse(
                                      currentExamCard.uid,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleExamKeyAction();
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

                          {/* Exam Action Footer: Grade on Enter -> Then Advance on Enter (Strictly No Retry/Erase) */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                            <div className="text-xs font-mono-tabular text-slate-500">
                              {examIndex + 1} / {activeExamCards.length}
                            </div>

                            {!isCurrentGraded ? (
                              <button
                                type="button"
                                onClick={gradeCurrentExamQuestion}
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
                                ref={examNextActionBtnRef}
                                type="button"
                                onClick={advanceExamAfterGrading}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (Date.now() - lastExamGradeTimeRef.current >= 150) {
                                      advanceExamAfterGrading();
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
                                ref={examNextActionBtnRef}
                                type="button"
                                onClick={advanceExamAfterGrading}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (Date.now() - lastExamGradeTimeRef.current >= 150) {
                                      advanceExamAfterGrading();
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
                                    onClick={advanceExamAfterGrading}
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

                                {/* Detailed Wrong-Answer Breakdown: What user typed + Missing Keywords + Missing Verses + Lock Notice */}
                                {!currentValidation.isCorrect && (
                                  <div className="bg-white/90 border border-red-200/80 rounded-lg p-3 text-xs space-y-2 text-slate-700">
                                    <div>
                                      <span className="font-semibold text-slate-500 mr-1.5">
                                        {t.examYourAnswerLabel}
                                      </span>
                                      <span className="font-mono-tabular text-slate-900 font-medium">
                                        {currentDraft.answer.trim() ||
                                        currentDraft.verse.trim()
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

                                {/* Correct Model Answer & Key Verse */}
                                <div className="pt-2 border-t border-slate-200/80 space-y-1">
                                  <div className="text-xl font-bold text-[#0284C7]">
                                    {renderCardAnswerMain(currentExamCard)}
                                  </div>
                                  <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                                    {t.labelKeyVerse}: {renderCardVerse(currentExamCard)}
                                  </div>
                                </div>
                              </div>

                              <VerseAndNoteSection
                                question={currentExamCard.question}
                                language={language}
                                isAdvancedMode={isAdvancedMode}
                                savedNote={studyNotes[currentExamCard.question.id] || ''}
                                onSaveNote={handleSaveStudyNote}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* ========================================================== */
                  /* BATCH GRADED EXAM RESULTS + PASS / FAIL BANNER             */
                  /* ========================================================== */
                  (() => {
                    const totalCount = activeExamCards.length;
                    const correctCards = activeExamCards.filter(
                      (c) => examResults[c.uid] === 'correct'
                    );
                    const wrongCards = activeExamCards.filter(
                      (c) => examResults[c.uid] !== 'correct'
                    );
                    const correctCount = correctCards.length;
                    const wrongCount = wrongCards.length;
                    const finalPercent =
                      totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                    const isPassed = finalPercent >= 80;

                    return (
                      <div className="space-y-5">
                        {/* PASS / FAIL HERO BANNER */}
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

                        {/* Score Summary Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                            <div>
                              <div className="text-xs font-mono-tabular text-slate-400">
                                {t.examPassCriteriaNotice}
                              </div>
                              <h3 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                                {t.examResultsTitle(selectedDay)}
                              </h3>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs text-slate-400">
                                  {t.examFinalScoreLabel}
                                </div>
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

                              <button
                                type="button"
                                onClick={handleResetExam}
                                title={t.examResetBtnTooltip}
                                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-[#0284C7]" />
                                <span>{t.examResetBtn}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl border border-[#059669]/30 bg-[#059669]/[0.05]">
                              <div className="text-xs font-semibold text-[#059669]">
                                {t.examCorrectCountLabel}
                              </div>
                              <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#059669]">
                                {correctCount}
                              </div>
                            </div>
                            <div className="p-4 rounded-xl border border-red-200 bg-red-50/60">
                              <div className="text-xs font-semibold text-red-600">
                                {t.examWrongCountLabel}
                              </div>
                              <div className="mt-1 font-mono-tabular text-2xl font-bold text-red-600">
                                {wrongCount}
                              </div>
                            </div>
                          </div>

                          {/* Exam Retry (Random Order) & Back to Study Actions */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startNewRandomExamSession(null)}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t.examRetryAllBtn}</span>
                              </button>

                              {wrongCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    startNewRandomExamSession(
                                      wrongCards.map((c) => c.uid)
                                    )
                                  }
                                  className="px-4 py-2 text-xs font-bold text-[#D97706] bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
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
                                setActiveSection('study');
                              }}
                              className="px-4 py-2 text-xs font-semibold border border-slate-300 bg-white rounded-lg text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {t.examBackToStudyBtn}
                            </button>
                          </div>
                        </div>

                        {/* Full Question-by-Question Review with Original Bible Verses & Study Tip Notes */}
                        <div className="space-y-3">
                          <h4 className="font-display text-sm font-bold text-slate-700 px-1">
                            {t.examAllQuestionsReviewTitle}
                          </h4>

                          {activeExamCards.map((card, idx) => {
                            const draft = getExamDraft(card.uid);
                            const validation = examBatchValidations[card.uid];
                            const isCorrect = examResults[card.uid] === 'correct';
                            const isBookmarked = bookmarkedIds.includes(card.question.id);

                            return (
                              <div
                                key={card.uid}
                                className={`bg-white border rounded-xl p-5 space-y-3 ${
                                  isCorrect ? 'border-emerald-200' : 'border-red-200'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                                    <span className="font-bold text-slate-900">
                                      {String(idx + 1).padStart(2, '0')}.{' '}
                                      {card.question.code}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold ${
                                        isCorrect
                                          ? 'bg-emerald-50 text-[#059669]'
                                          : 'bg-red-50 text-red-600'
                                      }`}
                                    >
                                      {isCorrect ? t.examCorrectBadge : t.examWrongBadge}
                                    </span>
                                    {renderQuestionStatBadge(card.question.id)}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {!isKo && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          speakEcuadorSpanish(card.question.answerEs)
                                        }
                                        className="px-2 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                                      >
                                        <Volume2 className="w-3.5 h-3.5 text-[#059669]" />
                                        <span>{t.btnListenAnswerEc}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleBookmark(card.question.id)}
                                      className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                                        isBookmarked
                                          ? 'border-[#D97706] bg-[#D97706]/10 text-[#D97706]'
                                          : 'border-slate-200 text-slate-500 hover:text-slate-900'
                                      }`}
                                    >
                                      <Bookmark className="w-3.5 h-3.5" />
                                      <span>{t.btnBookmark}</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="text-base font-bold text-slate-900">
                                  {renderCardPrompt(card)}
                                </div>

                                {/* User's Submitted Answer */}
                                <div className="text-xs bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                                  <div className="font-semibold text-slate-500">
                                    {t.examYourAnswerLabel}
                                  </div>
                                  <div className="font-mono-tabular text-slate-800">
                                    {draft.answer.trim() || draft.verse.trim()
                                      ? `${draft.answer || '-'} / ${draft.verse || '-'}`
                                      : t.examNoAnswerEntered}
                                  </div>
                                  {validation && !validation.isCorrect && (
                                    <div className="pt-1 space-y-0.5 text-slate-700">
                                      {validation.missingKeywords.length > 0 && (
                                        <div>
                                          <span className="font-semibold text-red-600 mr-1.5">
                                            {t.typingMissingKeywords}
                                          </span>
                                          <span className="font-mono-tabular">
                                            {validation.missingKeywords.join(', ')}
                                          </span>
                                        </div>
                                      )}
                                      {validation.missingVerses.length > 0 && (
                                        <div>
                                          <span className="font-semibold text-red-600 mr-1.5">
                                            {t.typingMissingVerses}
                                          </span>
                                          <span className="font-mono-tabular">
                                            {validation.missingVerses.join(', ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Correct Model Answer */}
                                <div className="pt-1 space-y-1">
                                  <div className="text-xl font-bold text-[#0284C7]">
                                    {renderCardAnswerMain(card)}
                                  </div>
                                  <div className="text-xl font-bold text-[#0284C7] font-mono-tabular">
                                    {t.labelKeyVerse}: {renderCardVerse(card)}
                                  </div>
                                </div>

                                {/* Full Bible Verse Text (개역한글판 / Reina-Valera 1960) + Advanced Study Tip Note */}
                                <VerseAndNoteSection
                                  question={card.question}
                                  language={language}
                                  isAdvancedMode={isAdvancedMode}
                                  savedNote={studyNotes[card.question.id] || ''}
                                  onSaveNote={handleSaveStudyNote}
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

            {/* ============================================================== */}
            {/* SECTION 3: DEDICATED "집중공부" (INTENSIVE STUDY) TAB          */}
            {/* ============================================================== */}
            {activeSection === 'intensive' && (
              <IntensiveStudySection
                language={language}
                bookmarkedIds={bookmarkedIds}
                masteredIds={masteredIds}
                onToggleBookmark={toggleBookmark}
                onToggleMastered={toggleMastered}
                onGoToStudy={() => setActiveSection('study')}
                isAdvancedMode={isAdvancedMode}
                studyNotes={studyNotes}
                onSaveNote={handleSaveStudyNote}
                questionStats={questionStats}
                onRecordAttempt={handleRecordQuestionAttempt}
              />
            )}

            {/* ============================================================== */}
            {/* SECTION 4: FULL 99 CATALOG                                     */}
            {/* ============================================================== */}
            {activeSection === 'catalog' && (
              <div className="space-y-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.catalogSearchPlaceholder}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#0284C7]"
                    />
                  </div>

                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                  >
                    <option value={0}>{t.catalogAllChapters}</option>
                    {CHAPTERS.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {isKo ? ch.titleKo : ch.titleEs}
                      </option>
                    ))}
                  </select>

                  <select
                    value={catalogStatusFilter}
                    onChange={(e) => setCatalogStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                  >
                    <option value="all">{t.catalogFilterAll}</option>
                    <option value="bookmarked">{t.catalogFilterBookmarked}</option>
                    <option value="mastered">{t.catalogFilterMastered}</option>
                    <option value="unmastered">{t.catalogFilterUnmastered}</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {filteredCatalog.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                      {t.catalogEmpty}
                    </div>
                  ) : (
                    filteredCatalog.map((q) => {
                      const isMastered = masteredIds.includes(q.id);
                      const isBookmarked = bookmarkedIds.includes(q.id);
                      const introDay =
                        q.id <= 10 ? 1 : Math.min(19, Math.floor((q.id - 11) / 5) + 2);

                      return (
                        <div
                          key={q.id}
                          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                              <span className="font-bold text-slate-900">{q.code}</span>
                              <span>·</span>
                              <span>
                                {isKo ? `${introDay}일차` : `Día ${introDay}`}
                              </span>
                              <span>·</span>
                              <span>
                                {isKo ? q.chapterTitleKo : q.chapterTitleEs}
                              </span>
                              {renderQuestionStatBadge(q.id)}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!isKo && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    speakEcuadorSpanish(
                                      `${q.questionEs} ... ${q.answerEs}`
                                    )
                                  }
                                  className="px-2 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-[#0284C7]" />
                                  <span>{t.btnListenPromptEc}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleBookmark(q.id)}
                                className={`px-2 py-1 text-xs font-medium border rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                                  isBookmarked
                                    ? 'border-[#D97706] text-[#D97706] bg-[#D97706]/10'
                                    : 'border-slate-200 text-slate-500'
                                }`}
                              >
                                {t.btnBookmark}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleMastered(q.id)}
                                className={`px-2 py-1 text-xs font-semibold border rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                                  isMastered
                                    ? 'border-[#059669] bg-[#059669] text-white'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                {isMastered ? t.btnMastered : t.btnMarkMastered}
                              </button>
                            </div>
                          </div>

                          <div className="text-base font-bold text-slate-900">
                            {isKo ? q.questionKo : q.questionEs}
                          </div>

                          <TwoStepAnswerCard
                            question={q}
                            language={language}
                            stage={getCatalogStage(q)}
                            onAdvanceStage={() => advanceCatalogStage(q)}
                            onResetStage={() => resetCatalogStage(q)}
                            isAdvancedMode={isAdvancedMode}
                            savedNote={studyNotes[q.id] || ''}
                            onSaveNote={handleSaveStudyNote}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT / MINIMAL CONTROL & CURRICULUM DECK (4 cols) */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Per-Language 20-Session Cumulative Best Score Grid ("회차별 학습 현황" / "Estado por Día") */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-1">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {t.sessionStatusTitle}
                </h3>
                <span className="text-xs font-semibold text-[#0284C7]">
                  {t.sessionStatusSubtitle}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DAY_SCHEDULES.map((sched) => {
                  const isSelected = sched.day === selectedDay;
                  const bestScore = currentLangBestScores[sched.day];
                  const hasTaken = typeof bestScore === 'number';
                  const isPassScore = hasTaken && bestScore >= 80;

                  return (
                    <button
                      key={sched.day}
                      type="button"
                      onClick={() => handleSelectDay(sched.day)}
                      className={`px-3 py-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#0284C7] bg-[#0284C7]/[0.04] shadow-2xs'
                          : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold font-mono-tabular whitespace-nowrap ${
                          isSelected ? 'text-[#0284C7]' : 'text-slate-800'
                        }`}
                      >
                        {t.dayDropdownBadge(sched.day)}
                      </span>

                      {hasTaken ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono-tabular font-bold whitespace-nowrap shrink-0 ${
                            isPassScore ? 'text-[#059669]' : 'text-[#D97706]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.sessionBestScore(bestScore)}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0">
                          {t.sessionNotTaken}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day Summary & Reroll Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <select
                  value={selectedDay}
                  onChange={(e) => handleSelectDay(Number(e.target.value))}
                  aria-label={t.statCurrentDay}
                  className="font-display text-sm font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0284C7] cursor-pointer"
                >
                  {DAY_SCHEDULES.map((sched) => (
                    <option key={sched.day} value={sched.day}>
                      {t.sidebarDayController(sched.day)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => toggleCompleteDay(selectedDay)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                    completedDays.includes(selectedDay)
                      ? 'border-[#059669] bg-[#059669] text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {completedDays.includes(selectedDay)
                      ? t.btnCompletedDay(selectedDay)
                      : t.btnCompleteDay(selectedDay)}
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.labelNewRange}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {currentSchedule.newConceptIds.length > 0
                      ? `Q${currentSchedule.newConceptIds[0]}~Q${
                          currentSchedule.newConceptIds[
                            currentSchedule.newConceptIds.length - 1
                          ]
                        }`
                      : t.labelAllRangeReview}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.labelReviewPoolRange}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {currentSchedule.learnedPoolIds.length > 0
                      ? `Q1~Q${
                          currentSchedule.learnedPoolIds[
                            currentSchedule.learnedPoolIds.length - 1
                          ]
                        }`
                      : t.labelFirstDayNoReview}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {t.labelSelectedReviewConcepts}
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#0284C7]">
                    {(dailyReviews[selectedDay] || []).length > 0
                      ? (dailyReviews[selectedDay] || [])
                          .map((id) => `Q${id}`)
                          .join(', ')
                      : '-'}
                  </span>
                </div>
              </div>

              {selectedDay >= 2 && (
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prioritizeWeakInRandom}
                      onChange={(e) => setPrioritizeWeakInRandom(e.target.checked)}
                      className="rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <span>{t.checkboxPrioritizeWeak}</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleRerollReviews}
                    className="w-full py-1.5 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>{t.btnRerollReview}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 20-Day Schedule Selector (Collapsed by default, expandable with down arrow) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <button
                type="button"
                onClick={() => setIsCurriculumOpen((prev) => !prev)}
                aria-expanded={isCurriculumOpen}
                title={
                  isCurriculumOpen ? t.curriculumCollapseBtn : t.curriculumExpandBtn
                }
                className="w-full flex items-center justify-between text-left group cursor-pointer"
              >
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors">
                    {t.curriculumTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t.curriculumSubtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono-tabular font-semibold text-[#059669]">
                    {completedDays.length}/20
                  </span>
                  <span className="p-1 rounded-md bg-slate-100 text-slate-600 group-hover:bg-[#0284C7]/10 group-hover:text-[#0284C7] transition-colors">
                    {isCurriculumOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </div>
              </button>

              {isCurriculumOpen && (
                <>
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {DAY_SCHEDULES.map((sched) => {
                      const isSelected = sched.day === selectedDay;
                      const bestScore = currentLangBestScores[sched.day];
                      const hasTaken = typeof bestScore === 'number';
                      const newRangeText =
                        sched.newConceptIds.length > 0
                          ? `Q${sched.newConceptIds[0]}~Q${
                              sched.newConceptIds[sched.newConceptIds.length - 1]
                            }`
                          : t.labelAllRangeReview;
                      const revRangeText =
                        sched.reviewConceptCount > 0
                          ? isKo
                            ? `+ 복습 ${sched.reviewConceptCount}`
                            : `+ Repaso ${sched.reviewConceptCount}`
                          : '';

                      return (
                        <button
                          key={sched.day}
                          type="button"
                          onClick={() => {
                            setSelectedDay(sched.day);
                            setFocusCardIndex(0);
                            startNewRandomExamSession(null);
                          }}
                          className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected ? 'bg-[#0284C7]/10' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-xs font-mono-tabular font-bold ${
                                isSelected ? 'text-[#0284C7]' : 'text-slate-900'
                              }`}
                            >
                              {isKo
                                ? `${String(sched.day).padStart(2, '0')}일차`
                                : `Día ${String(sched.day).padStart(2, '0')}`}
                            </span>
                            <span className="text-xs text-slate-600 font-mono-tabular truncate">
                              {newRangeText} {revRangeText}
                            </span>
                          </div>

                          {hasTaken ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-mono-tabular font-bold shrink-0 ${
                                bestScore >= 80 ? 'text-[#059669]' : 'text-[#D97706]'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{t.sessionBestScore(bestScore)}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium shrink-0">
                              {t.sessionNotTaken}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{t.autoSaveNote}</span>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Notebook Modal (Advanced Study Mode) */}
      <NotebookModal
        isOpen={isNotebookModalOpen}
        onClose={() => setIsNotebookModalOpen(false)}
        language={language}
        studyNotes={studyNotes}
        onSaveNote={handleSaveStudyNote}
      />

      {/* Minimal Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white py-4 px-6">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4 text-xs text-slate-400">
          <div>{t.footerText}</div>
          <button
            type="button"
            onClick={() => setIsAdvancedMode((prev) => !prev)}
            className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isAdvancedMode ? t.btnAdvancedModeActive : t.btnAdvancedMode}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
