// Re-export from the grade-split question bank.
// All questions, filtering functions, and utilities are in data/questions/index.ts
export {
  allQuestions,
  allQuestions as questions,
  questionsByGrade,
  getQuestionsByFilter,
  getQuestionById,
  getDomainsForGrade,
  getQuestionStats,
  getRecommendedQuestions,
  pickDailyQuestions,
} from './questions/index';
