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

export const TOTAL_SESSIONS = 32;

export function getQuestionSessionNumber(questionId: number): number {
  if (questionId <= 6) return 1;
  return Math.min(TOTAL_SESSIONS, Math.floor((questionId - 7) / 3) + 2);
}

export const DAY_SCHEDULES: DaySchedule[] = Array.from(
  { length: TOTAL_SESSIONS },
  (_, idx) => {
    const day = idx + 1;
    if (day === 1) {
      return {
        day: 1,
        titleKo: '1회차 · 신규 6문항 (Q1~Q6)',
        titleEs: 'Sesión 1 · 6 nuevas (Q1~Q6)',
        newConceptIds: [1, 2, 3, 4, 5, 6],
        learnedPoolIds: [],
        reviewConceptCount: 0
      };
    }

    const startId = 6 + (day - 2) * 3 + 1;
    const endId = startId + 2;
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
      titleKo: `${day}회차 · 신규 3 (Q${startId}~Q${endId}) + 복습 3`,
      titleEs: `Sesión ${day} · 3 nuevas (Q${startId}~Q${endId}) + 3 repaso`,
      newConceptIds: newIds,
      learnedPoolIds: poolIds,
      reviewConceptCount: 3
    };
  }
);

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
