import assert from 'node:assert/strict';
import { getWeekStreakStatus } from '@/lib/storage';
import { DEFAULT_GAME_STATE } from '@/lib/types';

const date = new Date();
const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const empty = structuredClone(DEFAULT_GAME_STATE);
empty.lastPlayDate = today;
assert.equal(getWeekStreakStatus(empty).at(-1), false, 'opening the app and daily reset alone is not practice');
const attempted = structuredClone(empty);
attempted.learningEvents = [{
  eventId: 'today-attempt', schemaVersion: 1, childProfileId: 'child', deviceId: 'device', sessionId: 'session',
  lessonId: 'lesson', questionInstanceId: 'instance', questionId: 'q', questionVersion: 'v1', skillIds: [],
  grade: 'G1', semester: 'upper', unitId: 'g1-u1', role: 'current_concept', settingSignature: 'sig',
  eventType: 'attempt_submitted', actionId: 'today', attemptId: 'today', timestamp: `${today}T10:00:00.000Z`,
  hintLevel: 'none', completionMode: 'independent', result: 'incorrect',
}];
assert.equal(getWeekStreakStatus(attempted).at(-1), true, 'a real submitted attempt records today');
const mentalMath = structuredClone(empty);
mentalMath.mentalMathRecords = [{ id: 'session', date: today, grade: 'G1', operation: 'addition', totalQuestions: 1, correctCount: 0, avgTimeMs: 1, answers: [], completedAt: `${today}T10:00:00.000Z` }];
assert.equal(getWeekStreakStatus(mentalMath).at(-1), true, 'a completed mental-math session records today');
console.log('learning-calendar: PASS');
