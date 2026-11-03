import versesData from './verses.json';
import { AppLanguage, ParableQuestion } from './questions';

export interface BibleVerseEntry {
  key: string;
  refKo: string;
  refEs: string;
  textKo: string;
  textEs: string;
}

const VERSES_MAP = versesData as Record<
  string,
  {
    refKo: string;
    refEs: string;
    textKo: string;
    textEs: string;
  }
>;

const ES_BOOK_TO_KO_KEY: Record<string, string> = {
  Sal: '시',
  Lc: '눅',
  '1P': '벧전',
  Jn: '요',
  Mt: '마',
  '1Co': '고전',
  Ez: '겔',
  Ap: '계',
  Stg: '약',
  Dn: '단',
  Is: '사',
  Am: '암',
  Pr: '잠',
  Mal: '말',
  Hch: '행',
  Jer: '렘',
  Zac: '슥',
  '1Ts': '살전',
  Dt: '신',
  Ef: '엡',
  Hab: '합',
  Heb: '히',
  Gn: '창',
  Os: '호',
  Lm: '애',
  '1Ti': '딤전'
};

function normalizeKoVerseToken(token: string): string {
  return token
    .trim()
    .replace(/~/g, '-')
    .replace(/장$/g, '')
    .trim();
}

function convertEsTokenToKoKey(token: string): string {
  const trimmed = token.trim().replace(/~/g, '-');
  const match = trimmed.match(/^([1-3]?[A-Za-z]+)\s+(.+)$/);
  if (!match) return trimmed;
  const [, esBook, rest] = match;
  const koBook = ES_BOOK_TO_KO_KEY[esBook] || esBook;
  return `${koBook} ${rest.trim()}`;
}

/**
 * Checks whether a question has at least one Bible verse reference in the active language.
 */
export function questionHasVerse(
  question: ParableQuestion,
  language: AppLanguage = 'ko'
): boolean {
  const v = (language === 'ko' ? question.verseKo : question.verseEs).trim();
  return v !== '-' && v.length > 0;
}

/**
 * Returns the list of full Bible verse entries (개역한글판 & Reina-Valera 1960)
 * for a given question in the active language.
 */
export function getVerseTextsForQuestion(
  question: ParableQuestion,
  language: AppLanguage = 'ko'
): BibleVerseEntry[] {
  if (language === 'es') {
    const rawEs = question.verseEs.trim();
    if (!rawEs || rawEs === '-') {
      return [];
    }
    const esTokens = rawEs
      .split(/,\s*(?=[1-3]?[A-Za-z])/)
      .map((t) => t.trim())
      .filter(Boolean);

    const results: BibleVerseEntry[] = [];
    for (const esToken of esTokens) {
      const lookupKey = convertEsTokenToKoKey(esToken);
      const found = VERSES_MAP[lookupKey];
      if (found) {
        results.push({
          key: lookupKey,
          ...found
        });
      }
    }
    return results;
  }

  const rawKo = question.verseKo.trim();
  if (!rawKo || rawKo === '-') {
    return [];
  }

  // Split on commas that precede a Korean book name so "단 7:3, 17" and "계 21:2, 10" stay intact
  const tokens = rawKo
    .split(/,\s*(?=[가-힣])/)
    .map((t) => normalizeKoVerseToken(t))
    .filter(Boolean);

  const results: BibleVerseEntry[] = [];
  for (const token of tokens) {
    const found = VERSES_MAP[token];
    if (found) {
      results.push({
        key: token,
        ...found
      });
    }
  }

  return results;
}
