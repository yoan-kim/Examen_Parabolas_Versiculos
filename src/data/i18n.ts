import { AppLanguage } from './questions';

export type { AppLanguage };

export interface LocalizedStrings {
  brandTitle: string;
  navStudy: string;
  navExam: string;
  navIntensive: string;
  navCatalog: string;
  navChangeLanguage: string;
  btnAdvancedMode: string;
  btnAdvancedModeActive: string;
  advancedModeTooltipTitle: string;
  advancedModeTooltipDesc: string;
  advancedActiveBannerTitle: string;
  advancedActiveBannerDesc: string;
  btnOpenNotebook: (count: number) => string;
  btnStudyTipNote: string;
  btnStudyTipNoteSaved: string;
  studyTipNoteTitle: string;
  studyTipNotePlaceholder: string;
  btnSaveNote: string;
  btnDeleteNote: string;
  noteSavedFeedback: string;
  notebookModalTitle: string;
  notebookModalSubtitle: string;
  notebookModalEmpty: string;
  btnCloseModal: string;
  statAccuracyBadge: (accuracy: number, wrong: number, total: number) => string;
  statNoAttemptsBadge: string;
  kickerSummary: string;
  statCurrentDay: string;
  statTodayComposition: string;
  statMasteredConcepts: string;
  statBookmarkedConcepts: string;
  studyMethodCard: string;
  studyMethodTyping: string;
  typingBadgeShort: string;
  typingBadgeKeywords: string;
  typingAnswerPlaceholderShort: string;
  typingAnswerPlaceholderKeywords: string;
  typingVersePlaceholder: string;
  typingVerseNone: string;
  btnCheckTyping: string;
  btnRetryTyping: string;
  typingResultCorrect: string;
  typingResultWrong: string;
  typingMissingKeywords: string;
  typingMissingVerses: string;
  filterAll10: string;
  filterNew: string;
  filterReview: string;
  layoutList: string;
  layoutFocus: string;
  btnShowAllAnswers: string;
  btnHideAllAnswers: string;
  btnRerollReview: string;
  tagNewConcept: string;
  tagReviewConcept: string;
  tagForward: string;
  labelPromptForward: string;
  labelAnswerForward: string;
  labelKeyVerse: string;
  labelMeaningTitle: string;
  labelVerseTitle: string;
  labelVerseNone: string;
  bibleVersionBadge: string;
  btnShowAnswer: string;
  btnHideAnswer: string;
  clickToRevealBox: string;
  clickToRevealVerseBox: string;
  btnPrevCard: string;
  btnNextCard: string;
  btnBookmark: string;
  btnBookmarked: string;
  btnMarkMastered: string;
  btnMastered: string;
  btnListenPromptEc: string;
  btnListenAnswerEc: string;
  sidebarDayController: (day: number) => string;
  btnCompleteDay: (day: number) => string;
  btnCompletedDay: (day: number) => string;
  labelNewRange: string;
  labelReviewPoolRange: string;
  labelSelectedReviewConcepts: string;
  labelFirstDayNoReview: string;
  labelAllRangeReview: string;
  checkboxPrioritizeWeak: string;
  curriculumTitle: string;
  curriculumSubtitle: string;
  curriculumExpandBtn: string;
  curriculumCollapseBtn: string;
  btnResetStudyTop: string;
  btnResetStudyTopTooltip: string;
  studyResetDoneBanner: string;
  dayDropdownBadge: (day: number) => string;
  dayDropdownOption: (day: number, subtitle: string) => string;
  sessionStatusTitle: string;
  sessionStatusSubtitle: string;
  sessionBestScore: (score: number) => string;
  sessionNotTaken: string;
  btnResetProgress: string;
  autoSaveNote: string;
  examTitle: (day: number) => string;
  examModeWritten: string;
  examModeMultipleChoice: string;
  examShuffleOrder: string;
  examOriginalOrder: string;
  examInputPlaceholderForward: string;
  examSubmitAndCheck: string;
  examCheckAllBtn: string;
  examTopPassNotice: string;
  examOneWayNotice: string;
  examOnePassGuide: string;
  examLockedInputNotice: string;
  examResetBtn: string;
  examResetBtnTooltip: string;
  examResetDoneBanner: string;
  examAnsweredStatus: (answered: number, total: number) => string;
  examYourAnswerLabel: string;
  examNoAnswerEntered: string;
  examPassBadge: string;
  examPassHeadline: string;
  examPassSubtext: string;
  examFailBadge: string;
  examFailWarningLabel: string;
  examFailVerseText: string;
  examFailVerseRef: string;
  examAllQuestionsReviewTitle: string;
  examModelAnswer: string;
  examAutoMatchedNotice: string;
  examSelfGradeLabel: string;
  examGradePass: string;
  examGradeReview: string;
  examCorrectBadge: string;
  examWrongBadge: string;
  examPrevQuestion: string;
  examNextQuestion: string;
  examFinishBtn: string;
  examResultsTitle: (day: number) => string;
  examReviewMistakesTitle: string;
  examFinalScoreLabel: string;
  examPassCriteriaNotice: string;
  examCorrectCountLabel: string;
  examWrongCountLabel: string;
  examReviewMistakesBtn: (count: number) => string;
  examRetryAllBtn: string;
  examPerfectScoreMsg: string;
  examMistakesListTitle: string;
  examBackToStudyBtn: string;
  examScoreSummary: (correct: number, review: number, total: number) => string;
  intensiveTitle: string;
  intensiveDescription: string;
  intensiveMethodCard: string;
  intensiveMethodTyping: string;
  intensiveMethodExam: string;
  intensiveEmptyTitle: string;
  intensiveEmptySubtitle: string;
  intensiveGoToStudyBtn: string;
  intensiveCountBadge: (count: number) => string;
  intensiveExamResultsTitle: string;
  intensiveRetryAllBtn: (count: number) => string;
  catalogSearchPlaceholder: string;
  catalogAllChapters: string;
  catalogFilterAll: string;
  catalogFilterBookmarked: string;
  catalogFilterMastered: string;
  catalogFilterUnmastered: string;
  catalogEmpty: string;
  footerText: string;
}

export const UI_STRINGS: Record<AppLanguage, LocalizedStrings> = {
  ko: {
    brandTitle: '비유와 성구 시험',
    navStudy: '학습 (10)',
    navExam: '시험 (10)',
    navIntensive: '집중공부',
    navCatalog: '전체 도감',
    navChangeLanguage: '언어 변경',
    btnAdvancedMode: '고급학습기능',
    btnAdvancedModeActive: '고급학습기능 켜짐',
    advancedModeTooltipTitle: '고급학습기능 안내',
    advancedModeTooltipDesc:
      '학습에 도움이 되는 더 많은 심화 기능(문제별 학습팁 노트 기록, 전체 노트북 모아보기, 누적 오답 횟수 및 정답률 분석)이 포함되어 있는 페이지로 전환합니다.',
    advancedActiveBannerTitle: '고급학습기능 모드가 활성화되었습니다',
    advancedActiveBannerDesc:
      '정답과 성구를 모두 확인한 문항마다 [학습팁 노트]를 작성할 수 있으며, 누적 정답률·오답 횟수와 전체 노트북 모아보기를 지원합니다.',
    btnOpenNotebook: (count: number) => `학습팁 노트북 (${count})`,
    btnStudyTipNote: '학습팁 노트',
    btnStudyTipNoteSaved: '학습팁 노트 (작성됨)',
    studyTipNoteTitle: '나만의 학습팁 노트',
    studyTipNotePlaceholder:
      '이 문제를 이해하고 기억하는 데 도움이 될 만한 암기팁이나 핵심 메모를 자유롭게 기록하세요...',
    btnSaveNote: '노트 저장',
    btnDeleteNote: '삭제',
    noteSavedFeedback: '저장 완료',
    notebookModalTitle: '나의 학습팁 노트북',
    notebookModalSubtitle:
      '문제별로 기록해 둔 암기팁과 핵심 노트를 한눈에 모아보고 편집할 수 있습니다.',
    notebookModalEmpty:
      '아직 작성된 학습팁 노트가 없습니다. 문제의 정답과 성구를 끝까지 확인한 뒤 [학습팁 노트] 버튼을 눌러 기록해 보세요.',
    btnCloseModal: '닫기',
    statAccuracyBadge: (accuracy: number, wrong: number, total: number) =>
      `정답률 ${accuracy}% · 오답 ${wrong}회 (총 ${total}회)`,
    statNoAttemptsBadge: '풀이 기록 없음',
    kickerSummary: '총 20개 장 · 일일 10문항',
    statCurrentDay: '학습 회차',
    statTodayComposition: '오늘 문항',
    statMasteredConcepts: '암기 완료',
    statBookmarkedConcepts: '집중공부',
    studyMethodCard: '1. 카드',
    studyMethodTyping: '2. 타이핑',
    typingBadgeShort: '단답형 · 정확히 입력',
    typingBadgeKeywords: '문장형 · 핵심단어 모두 기록',
    typingAnswerPlaceholderShort: '단답형 정답을 정확히 입력하세요 (예: 말씀)',
    typingAnswerPlaceholderKeywords: '문장의 핵심단어를 모두 입력하세요',
    typingVersePlaceholder: '증거성구 입력 (성경이름과 숫자 입력 / 띄어쓰기·쉼표 무관)',
    typingVerseNone: '증거성구 없음 (-)',
    btnCheckTyping: '정답 확인',
    btnRetryTyping: '다시 입력',
    typingResultCorrect: '✓ 정답 (핵심어 · 증거성구 모두 일치)',
    typingResultWrong: '✕ 오답 · 누락된 핵심어/증거성구를 확인하세요',
    typingMissingKeywords: '정답 핵심어:',
    typingMissingVerses: '누락 성구:',
    filterAll10: '전체 (10)',
    filterNew: '신규',
    filterReview: '복습',
    layoutList: '1문항 뷰',
    layoutFocus: '전체 뷰',
    btnShowAllAnswers: '정답 모두 보기',
    btnHideAllAnswers: '정답 모두 가리기',
    btnRerollReview: '복습 다시 뽑기',
    tagNewConcept: '신규',
    tagReviewConcept: '복습',
    tagForward: '문제→답',
    labelPromptForward: '질문',
    labelAnswerForward: '정답 · 성구',
    labelKeyVerse: '성구',
    labelMeaningTitle: '뜻 · 의미',
    labelVerseTitle: '증거성구',
    labelVerseNone: '증거성구 없음 (-)',
    bibleVersionBadge: '개역한글판 원문',
    btnShowAnswer: '정답 보기',
    btnHideAnswer: '다시 가리기',
    clickToRevealBox: '(정답 확인)',
    clickToRevealVerseBox: '(정답 확인)',
    btnPrevCard: '이전',
    btnNextCard: '다음',
    btnBookmark: '집중공부',
    btnBookmarked: '집중공부',
    btnMarkMastered: '암기체크',
    btnMastered: '암기완료',
    btnListenPromptEc: '',
    btnListenAnswerEc: '',
    sidebarDayController: (day: number) => `${day}일차 요약`,
    btnCompleteDay: (day: number) => `${day}일차 완료`,
    btnCompletedDay: (day: number) => `${day}일차 완료됨`,
    labelNewRange: '신규 범위',
    labelReviewPoolRange: '복습 범위',
    labelSelectedReviewConcepts: '복습 문항',
    labelFirstDayNoReview: '첫날 (신규 10)',
    labelAllRangeReview: '전 범위',
    checkboxPrioritizeWeak: '미암기·집중공부 우선 추출',
    curriculumTitle: '20일 진도표',
    curriculumSubtitle: '1일차 10 · 2일차~ 신규 5 + 복습 5',
    curriculumExpandBtn: '진도표 펼치기',
    curriculumCollapseBtn: '진도표 접기',
    btnResetStudyTop: '시험 리셋',
    btnResetStudyTopTooltip: '학습팁 노트는 그대로 보존하고 작성한 답안 칸만 모두 지워 처음부터 다시 볼 수 있습니다.',
    studyResetDoneBanner: '작성했던 모든 답안 칸이 초기화되었습니다. (학습팁 노트는 안전하게 유지됨)',
    dayDropdownBadge: (day: number) => `${day}일차`,
    dayDropdownOption: (day: number, subtitle: string) => `${day}일차 · ${subtitle}`,
    sessionStatusTitle: '회차별 학습 현황',
    sessionStatusSubtitle: '최고점수 누적',
    sessionBestScore: (score: number) => `최고 ${score}점`,
    sessionNotTaken: '미응시',
    btnResetProgress: '초기화',
    autoSaveNote: '자동 저장됨',
    examTitle: (day: number) => `${day}일차 시험`,
    examModeWritten: '타이핑',
    examModeMultipleChoice: '객관식',
    examShuffleOrder: '무작위 순서',
    examOriginalOrder: '기본 순서',
    examInputPlaceholderForward: '정답 입력...',
    examSubmitAndCheck: '채점하기',
    examCheckAllBtn: '최종 결과 보기',
    examTopPassNotice: '시험 합격 기준은 80점 입니다.',
    examOneWayNotice: '※ 엔터(↵)를 누르면 즉시 채점되며, 채점된 답안은 수정할 수 없습니다. 재응시하려면 오른쪽 상단 [시험 리셋]을 누르세요.',
    examOnePassGuide: '문항은 매번 무작위 순서로 출제됩니다. 각 문제마다 엔터(↵)를 눌러 즉시 채점하고 다음 문제로 진행하세요.',
    examLockedInputNotice: '🔒 채점이 완료된 문항은 지우거나 다시 작성할 수 없습니다. 처음부터 다시 시험을 보려면 우측 상단의 [시험 리셋] 버튼을 눌러주세요.',
    examResetBtn: '시험 리셋',
    examResetBtnTooltip: '학습팁 노트는 안전하게 보존하고, 현재 시험 답안을 모두 초기화하여 1번부터 새로운 무작위 순서로 다시 시험을 봅니다.',
    examResetDoneBanner: '시험이 초기화되었습니다. 1번부터 새로운 무작위 순서로 다시 시험을 시작합니다. (학습팁 노트는 안전하게 유지됨)',
    examAnsweredStatus: (answered: number, total: number) => `채점 완료 ${answered} / ${total}`,
    examYourAnswerLabel: '내가 작성한 답안:',
    examNoAnswerEntered: '(미입력)',
    examPassBadge: '🎉 합격 (80점 이상)',
    examPassHeadline: '식사 맛있게하세요 🍚🥢😋🎉',
    examPassSubtext: '수고하셨습니다! 오늘 시험에 당당히 합격하셨습니다 🥰🍱✨',
    examFailBadge: '⚠️ 불합격 (80점 미만 · 재시험 필요)',
    examFailWarningLabel: '경고 말씀 · 데살로니가후서 3:10 (개역한글판)',
    examFailVerseText:
      '"우리가 너희와 함께 있을 때에도 너희에게 명하기를 누구든지 일하기 싫어하거든 먹지도 말게 하라 하였더니"',
    examFailVerseRef: '— 데살로니가후서 3:10',
    examAllQuestionsReviewTitle: '전체 문항 채점 결과 및 정답 확인',
    examModelAnswer: '정답',
    examAutoMatchedNotice: '정답 · 증거성구 모두 일치',
    examSelfGradeLabel: '기록:',
    examGradePass: '● 통과',
    examGradeReview: '▲ 집중공부',
    examCorrectBadge: '✓ 정답',
    examWrongBadge: '✕ 오답',
    examPrevQuestion: '이전',
    examNextQuestion: '다음 문제',
    examFinishBtn: '결과 보기',
    examResultsTitle: (day: number) => `${day}일차 시험 결과`,
    examReviewMistakesTitle: '오답 복습 시험',
    examFinalScoreLabel: '최종 점수',
    examPassCriteriaNotice: '합격 기준: 80점 이상 (10문항 중 8문항 이상 정답)',
    examCorrectCountLabel: '정답 (통과)',
    examWrongCountLabel: '오답 (집중공부)',
    examReviewMistakesBtn: (count: number) => `오답 다시 풀기 (${count})`,
    examRetryAllBtn: '시험 다시보기',
    examPerfectScoreMsg: '모든 문항을 정확히 맞추셨습니다!',
    examMistakesListTitle: '오답 문항 확인',
    examBackToStudyBtn: '학습 화면으로',
    examScoreSummary: (correct: number, review: number, total: number) =>
      `통과 ${correct} · 집중공부 ${review} / ${total}`,
    intensiveTitle: '집중공부 전용 학습관',
    intensiveDescription:
      '학습 및 시험 중에 [집중공부]로 체크해 둔 문항들만 따로 모아 집중적으로 학습하고 점검할 수 있도록 구성된 공간입니다.',
    intensiveMethodCard: '1. 카드 학습',
    intensiveMethodTyping: '2. 타이핑 학습',
    intensiveMethodExam: '3. 미니 시험',
    intensiveEmptyTitle: '집중공부로 체크한 문항이 아직 없습니다.',
    intensiveEmptySubtitle:
      '학습이나 시험, 전체 도감에서 [집중공부] 버튼을 누르면 해당 문항들이 이곳에 자동으로 모아집니다.',
    intensiveGoToStudyBtn: '오늘의 학습으로 이동',
    intensiveCountBadge: (count: number) => `집중공부 ${count}문항`,
    intensiveExamResultsTitle: '집중공부 미니 시험 결과',
    intensiveRetryAllBtn: (count: number) => `집중공부 전체 다시 시험보기 (${count}문항)`,
    catalogSearchPlaceholder: '번호, 질문, 답, 성구 검색...',
    catalogAllChapters: '전체 장',
    catalogFilterAll: '전체',
    catalogFilterBookmarked: '집중공부',
    catalogFilterMastered: '암기완료',
    catalogFilterUnmastered: '미암기',
    catalogEmpty: '검색 결과 없음',
    footerText: '비유와 성구 시험 · 일일 학습 시스템'
  },
  es: {
    brandTitle: 'Parábolas y Versículos',
    navStudy: 'Estudio (10)',
    navExam: 'Examen (10)',
    navIntensive: 'Estudio intensivo',
    navCatalog: 'Catálogo',
    navChangeLanguage: 'Idioma',
    btnAdvancedMode: 'Funciones avanzadas',
    btnAdvancedModeActive: 'Modo avanzado activo',
    advancedModeTooltipTitle: 'Funciones avanzadas de aprendizaje',
    advancedModeTooltipDesc:
      'Una página que incluye más funciones de apoyo para el estudio: notas de memorización por pregunta, cuaderno completo de notas y estadísticas de aciertos y errores.',
    advancedActiveBannerTitle: 'Modo de funciones avanzadas activado',
    advancedActiveBannerDesc:
      'Al revelar la respuesta completa de cada pregunta aparecerá el botón [Nota de estudio] para guardar sus propios consejos, junto con estadísticas de precisión.',
    btnOpenNotebook: (count: number) => `Cuaderno de notas (${count})`,
    btnStudyTipNote: 'Nota de estudio',
    btnStudyTipNoteSaved: 'Nota de estudio (Guardada)',
    studyTipNoteTitle: 'Mi nota y consejo de memorización',
    studyTipNotePlaceholder:
      'Anote aquí sus propios consejos de memorización o apuntes clave para comprender mejor esta pregunta...',
    btnSaveNote: 'Guardar nota',
    btnDeleteNote: 'Eliminar',
    noteSavedFeedback: 'Guardado',
    notebookModalTitle: 'Mi Cuaderno de Notas de Estudio',
    notebookModalSubtitle:
      'Revise y edite en un solo lugar todos los consejos de memorización que ha registrado por pregunta.',
    notebookModalEmpty:
      'Aún no hay notas registradas. Cuando termine de ver la respuesta y el versículo de una pregunta, pulse [Nota de estudio] para escribir sus apuntes.',
    btnCloseModal: 'Cerrar',
    statAccuracyBadge: (accuracy: number, wrong: number, total: number) =>
      `Precisión ${accuracy}% · Errores: ${wrong} (${total} int.)`,
    statNoAttemptsBadge: 'Sin registros',
    kickerSummary: 'Total 20 capítulos · 10 preguntas diarias',
    statCurrentDay: 'Día actual',
    statTodayComposition: 'Hoy',
    statMasteredConcepts: 'Aprendidas',
    statBookmarkedConcepts: 'Estudio intensivo',
    studyMethodCard: '1. Tarjeta',
    studyMethodTyping: '2. Escritura',
    typingBadgeShort: 'Corta · Respuesta exacta',
    typingBadgeKeywords: 'Oración · Todas las palabras clave',
    typingAnswerPlaceholderShort: 'Escriba la respuesta exacta (ej. Palabra)',
    typingAnswerPlaceholderKeywords: 'Escriba todas las palabras clave de la respuesta',
    typingVersePlaceholder: 'Versículo (nombre y números / espacios libres)',
    typingVerseNone: 'Sin versículo (-)',
    btnCheckTyping: 'Comprobar',
    btnRetryTyping: 'Reintentar',
    typingResultCorrect: '✓ Correcto (Palabras clave y versículos)',
    typingResultWrong: '✕ Incorrecto · Verifique palabras clave y versículos',
    typingMissingKeywords: 'Palabras clave faltantes:',
    typingMissingVerses: 'Versículos faltantes:',
    filterAll10: 'Todo (10)',
    filterNew: 'Nuevas',
    filterReview: 'Repaso',
    layoutList: 'Vista 1',
    layoutFocus: 'Lista (10)',
    btnShowAllAnswers: 'Ver todo',
    btnHideAllAnswers: 'Ocultar todo',
    btnRerollReview: 'Sortear repaso',
    tagNewConcept: 'Nueva',
    tagReviewConcept: 'Repaso',
    tagForward: 'Pregunta→Respuesta',
    labelPromptForward: 'Pregunta',
    labelAnswerForward: 'Respuesta · Versículo',
    labelKeyVerse: 'Versículo',
    labelMeaningTitle: 'Significado',
    labelVerseTitle: 'Versículo clave',
    labelVerseNone: 'Sin versículo (-)',
    bibleVersionBadge: 'Texto bíblico · Reina-Valera 1960',
    btnShowAnswer: 'Ver',
    btnHideAnswer: 'Ocultar de nuevo',
    clickToRevealBox: '(Ver respuesta)',
    clickToRevealVerseBox: '(Ver respuesta)',
    btnPrevCard: 'Anterior',
    btnNextCard: 'Siguiente',
    btnBookmark: 'Estudio intensivo',
    btnBookmarked: 'Estudio intensivo',
    btnMarkMastered: 'Aprender',
    btnMastered: 'Aprendido',
    btnListenPromptEc: 'Pregunta (EC)',
    btnListenAnswerEc: 'Respuesta (EC)',
    sidebarDayController: (day: number) => `Resumen · Día ${day}`,
    btnCompleteDay: (day: number) => `Completar Día ${day}`,
    btnCompletedDay: (day: number) => `Día ${day} listo`,
    labelNewRange: 'Nuevas',
    labelReviewPoolRange: 'Rango repaso',
    labelSelectedReviewConcepts: 'Sorteadas',
    labelFirstDayNoReview: 'Día 1 (10 nuevas)',
    labelAllRangeReview: 'Rango total',
    checkboxPrioritizeWeak: 'Priorizar estudio intensivo',
    curriculumTitle: 'Plan 20 Días',
    curriculumSubtitle: 'Día 1: 10 · Día 2+: 5 nuevas + 5 repaso',
    curriculumExpandBtn: 'Ver plan de 20 días',
    curriculumCollapseBtn: 'Ocultar plan',
    btnResetStudyTop: 'Reiniciar examen',
    btnResetStudyTopTooltip: 'Borra únicamente las respuestas escritas para volver a practicar desde el inicio, conservando intactas todas sus notas de estudio.',
    studyResetDoneBanner: 'Se han borrado todas las respuestas escritas. (Sus notas de estudio se conservan intactas)',
    dayDropdownBadge: (day: number) => `Día ${day}`,
    dayDropdownOption: (day: number, subtitle: string) => `Día ${day} · ${subtitle}`,
    sessionStatusTitle: 'Estado por Día',
    sessionStatusSubtitle: 'Español (Ecuador)',
    sessionBestScore: (score: number) => `Máx. ${score} pts`,
    sessionNotTaken: 'Sin examen',
    btnResetProgress: 'Reiniciar',
    autoSaveNote: 'Guardado automático',
    examTitle: (day: number) => `Examen · Día ${day}`,
    examModeWritten: 'Escritura',
    examModeMultipleChoice: 'Opciones',
    examShuffleOrder: 'Orden aleatorio',
    examOriginalOrder: 'Ordenar',
    examInputPlaceholderForward: 'Respuesta...',
    examSubmitAndCheck: 'Calificar',
    examCheckAllBtn: 'Ver resultado final',
    examTopPassNotice: 'El criterio de aprobación del examen es de 80 puntos.',
    examOneWayNotice: '※ Al pulsar Intro(↵) se califica al instante y no se puede borrar ni modificar. Para repetir, pulse [Reiniciar examen] arriba a la derecha.',
    examOnePassGuide: 'Las preguntas aparecen en orden aleatorio cada vez. Pulse Intro(↵) en cada pregunta para calificarla y avanzar.',
    examLockedInputNotice: '🔒 Las respuestas ya calificadas no se pueden borrar ni editar. Si desea repetir el examen desde el principio, pulse el botón [Reiniciar examen] arriba a la derecha.',
    examResetBtn: 'Reiniciar examen',
    examResetBtnTooltip: 'Conserva intactas todas sus notas de estudio y reinicia el examen desde la pregunta 1 en un nuevo orden aleatorio.',
    examResetDoneBanner: 'El examen ha sido reiniciado desde el principio con un nuevo orden aleatorio. (Sus notas de estudio se conservan intactas)',
    examAnsweredStatus: (answered: number, total: number) => `Calificadas ${answered} / ${total}`,
    examYourAnswerLabel: 'Su respuesta:',
    examNoAnswerEntered: '(Sin responder)',
    examPassBadge: '🎉 APROBADO (80% o más)',
    examPassHeadline: '¡Buen provecho! · Buen probecho 🍽️😋🎉',
    examPassSubtext: '¡Felicidades! Ha aprobado el examen satisfactoriamente 🥰🍲✨',
    examFailBadge: '⚠️ NO APROBADO (Menos del 80%)',
    examFailWarningLabel: 'ADVERTENCIA BÍBLICA · 2 Tesalonicenses 3:10 (Reina-Valera 1960)',
    examFailVerseText:
      '"Porque también cuando estábamos con vosotros, os ordenábamos esto: Si alguno no quiere trabajar, tampoco coma."',
    examFailVerseRef: '— 2 Tesalonicenses 3:10 (Reina-Valera 1960)',
    examAllQuestionsReviewTitle: 'Revisión completa de respuestas y versículos',
    examModelAnswer: 'Respuesta',
    examAutoMatchedNotice: '¡Respuesta y versículos correctos!',
    examSelfGradeLabel: 'Evaluar:',
    examGradePass: '● Aprobado',
    examGradeReview: '▲ Estudio intensivo',
    examCorrectBadge: '✓ Correcto',
    examWrongBadge: '✕ Incorrecto',
    examPrevQuestion: 'Anterior',
    examNextQuestion: 'Siguiente pregunta',
    examFinishBtn: 'Ver resultados',
    examResultsTitle: (day: number) => `Resultados del Examen · Día ${day}`,
    examReviewMistakesTitle: 'Repaso de Errores',
    examFinalScoreLabel: 'Puntaje Final',
    examPassCriteriaNotice: 'Criterio de aprobación: 80% o más (mínimo 8 de 10 correctas)',
    examCorrectCountLabel: 'Correctas (Aprobadas)',
    examWrongCountLabel: 'Incorrectas (Estudio intensivo)',
    examReviewMistakesBtn: (count: number) => `Repasar errores (${count})`,
    examRetryAllBtn: 'Volver a realizar el examen',
    examPerfectScoreMsg: '¡Respondiste correctamente todas las preguntas!',
    examMistakesListTitle: 'Preguntas incorrectas',
    examBackToStudyBtn: 'Volver al estudio',
    examScoreSummary: (correct: number, review: number, total: number) =>
      `Bien: ${correct} · Intensivo: ${review} / ${total}`,
    intensiveTitle: 'Espacio de Estudio Intensivo',
    intensiveDescription:
      'Esta sección reúne exclusivamente las preguntas que usted ha marcado para estudio intensivo durante su aprendizaje, permitiéndole repasarlas a fondo.',
    intensiveMethodCard: '1. Tarjetas',
    intensiveMethodTyping: '2. Escritura',
    intensiveMethodExam: '3. Mini Examen',
    intensiveEmptyTitle: 'Aún no ha seleccionado preguntas para estudio intensivo.',
    intensiveEmptySubtitle:
      'Pulse el botón [Estudio intensivo] en cualquier pregunta durante el estudio, el examen o el catálogo para reunirla automáticamente aquí.',
    intensiveGoToStudyBtn: 'Ir al estudio del día',
    intensiveCountBadge: (count: number) => `${count} preguntas`,
    intensiveExamResultsTitle: 'Resultados del Mini Examen Intensivo',
    intensiveRetryAllBtn: (count: number) => `Repetir mini examen (${count})`,
    catalogSearchPlaceholder: 'Buscar pregunta, respuesta o versículo...',
    catalogAllChapters: 'Todos los cap.',
    catalogFilterAll: 'Todas',
    catalogFilterBookmarked: 'Estudio intensivo',
    catalogFilterMastered: 'Aprendidas',
    catalogFilterUnmastered: 'Pendientes',
    catalogEmpty: 'Sin resultados',
    footerText: 'Parábolas y Versículos · Sistema de Estudio Diario'
  }
};
