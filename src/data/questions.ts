import chaptersData from './chapters.json';
import questionsData from './questions.json';

export type AppLanguage = 'ko' | 'es';
export type QuestionDirection = 'FORWARD' | 'REVERSE';
export type QuestionOrigin = 'NEW' | 'REVIEW';

export interface ParableQuestion {
  id: number;
  code: string;
  chapterId: number;
  chapterTitleEs: string;
  chapterTitleKo: string;
  termEs: string;
  termKo: string;
  questionEs: string;
  questionKo: string;
  answerEs: string;
  answerKo: string;
  verseEs: string;
  verseKo: string;
}

export interface ChapterInfo {
  id: number;
  titleEs: string;
  titleKo: string;
}

export interface StudyCardItem {
  uid: string; // e.g. "1-FORWARD-NEW"
  question: ParableQuestion;
  direction: QuestionDirection;
  origin: QuestionOrigin;
  /** All questions that share the exact same answer (used when direction === 'REVERSE' without verse hints) */
  equivalentQuestions: ParableQuestion[];
}

export const CHAPTERS: ChapterInfo[] = chaptersData as ChapterInfo[];

export const QUESTIONS: ParableQuestion[] = questionsData as ParableQuestion[];

function normalizeAnswerKey(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Returns all questions that share the same answer (in either Spanish or Korean),
 * so that when a Reverse question (Answer -> Question) is presented without verse hints,
 * all matching parable concepts are accepted and shown together.
 */
export function getEquivalentQuestions(question: ParableQuestion): ParableQuestion[] {
  const keyEs = normalizeAnswerKey(question.answerEs);
  const keyKo = normalizeAnswerKey(question.answerKo);
  return QUESTIONS.filter(
    (q) =>
      normalizeAnswerKey(q.answerEs) === keyEs ||
      normalizeAnswerKey(q.answerKo) === keyKo
  );
}

export interface DaySchedule {
  day: number;
  titleKo: string;
  titleEs: string;
  newConceptIds: number[];
  learnedPoolIds: number[];
  reviewConceptCount: number;
}

export const DAY_SCHEDULES: DaySchedule[] = Array.from({ length: 20 }, (_, idx) => {
  const day = idx + 1;
  if (day === 1) {
    return {
      day: 1,
      titleKo: "1일차 · 신규 10문항 (Q1~Q10)",
      titleEs: "Día 1 · 10 nuevas (Q1~Q10)",
      newConceptIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      learnedPoolIds: [],
      reviewConceptCount: 0
    };
  }
  if (day <= 18) {
    const startId = 10 + (day - 2) * 5 + 1;
    const endId = startId + 4;
    const newIds: number[] = [];
    for (let i = startId; i <= endId; i++) {
      newIds.push(i);
    }
    const poolIds: number[] = [];
    for (let i = 1; i < startId; i++) {
      poolIds.push(i);
    }
    return {
      day,
      titleKo: `${day}일차 · 신규 5 (Q${startId}~Q${endId}) + 복습 5`,
      titleEs: `Día ${day} · 5 nuevas (Q${startId}~Q${endId}) + 5 repaso`,
      newConceptIds: newIds,
      learnedPoolIds: poolIds,
      reviewConceptCount: 5
    };
  }
  if (day === 19) {
    const newIds = [96, 97, 98, 99];
    const poolIds = Array.from({ length: 95 }, (_, i) => i + 1);
    return {
      day: 19,
      titleKo: "19일차 · 신규 4 (Q96~Q99) + 복습 6",
      titleEs: "Día 19 · 4 nuevas (Q96~Q99) + 6 repaso",
      newConceptIds: newIds,
      learnedPoolIds: poolIds,
      reviewConceptCount: 6
    };
  }
  return {
    day: 20,
    titleKo: "20일차 · 전 범위 랜덤 10문항",
    titleEs: "Día 20 · 10 aleatorias finales",
    newConceptIds: [],
    learnedPoolIds: Array.from({ length: 99 }, (_, i) => i + 1),
    reviewConceptCount: 10
  };
});

export function sampleRandomIds(
  poolIds: number[],
  count: number,
  prioritizeIds: number[] = []
): number[] {
  if (count <= 0) return [];
  if (poolIds.length <= count) {
    return [...poolIds];
  }
  const copy = [...poolIds];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (prioritizeIds.length === 0) {
    return copy.slice(0, count).sort((a, b) => a - b);
  }
  const priorityMatches = copy.filter((id) => prioritizeIds.includes(id));
  const others = copy.filter((id) => !prioritizeIds.includes(id));
  return [...priorityMatches, ...others].slice(0, count).sort((a, b) => a - b);
}

/**
 * Generates ONLY Question -> Answer (FORWARD) study/exam cards for each day's
 * new questions and cumulative random review questions.
 */
export function buildBidirectionalSessionCards(
  newConceptIds: number[],
  reviewConceptIds: number[]
): StudyCardItem[] {
  const cards: StudyCardItem[] = [];

  const appendForwardOnly = (id: number, origin: QuestionOrigin) => {
    const q = QUESTIONS.find((item) => item.id === id);
    if (!q) return;
    cards.push({
      uid: `${q.id}-FORWARD-${origin}`,
      question: q,
      direction: 'FORWARD',
      origin,
      equivalentQuestions: [q]
    });
  };

  newConceptIds.forEach((id) => appendForwardOnly(id, 'NEW'));
  reviewConceptIds.forEach((id) => appendForwardOnly(id, 'REVIEW'));

  return cards;
}
