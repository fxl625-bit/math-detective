import assert from 'node:assert/strict';
import { createDataSnapshot, simpleChecksum } from '@/lib/dataExport';
import { BACKUP_STORAGE_KEYS, RESTORE_SAFETY_KEY, parseBackup, restoreBackup, type StoragePort } from '@/lib/dataTransfer';
import { DEFAULT_GAME_STATE } from '@/lib/types';

const fixtureStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => fixtureStorage[key] ?? null,
  setItem: (key: string, value: string) => { fixtureStorage[key] = value; },
  removeItem: (key: string) => { delete fixtureStorage[key]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, configurable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'synthetic test', language: 'zh-CN' }, configurable: true });
Object.defineProperty(globalThis, 'screen', { value: { width: 1, height: 1 }, configurable: true });

function makeBackup(stars = 17) {
  for (const key of Object.keys(fixtureStorage)) delete fixtureStorage[key];
  fixtureStorage[BACKUP_STORAGE_KEYS.state] = JSON.stringify({ ...DEFAULT_GAME_STATE, stars, parentSettings: { ...DEFAULT_GAME_STATE.parentSettings, gradeBand: 'G2' } });
  fixtureStorage[BACKUP_STORAGE_KEYS.todayLesson] = JSON.stringify({ date: '2026-09-28', steps: [
    { id: 'step-1', type: 'answer_only', questionId: 'g1_01', status: 'completed', currentPhaseIndex: 0 },
    { id: 'step-2', type: 'answer_only', questionId: 'g1_02', status: 'current', currentPhaseIndex: 1 },
  ], currentStepIndex: 1, completed: false });
  fixtureStorage[BACKUP_STORAGE_KEYS.stateVersion] = '9';
  fixtureStorage[BACKUP_STORAGE_KEYS.appVersion] = '2.11.3';
  return createDataSnapshot();
}

function refreshChecksum(payload: ReturnType<typeof createDataSnapshot>) {
  payload.checksum = simpleChecksum(JSON.stringify({
    schemaVersion: payload.schemaVersion,
    appName: payload.appName,
    appVersion: payload.appVersion,
    exportedAt: payload.exportedAt,
    stateVersion: payload.stateVersion,
    deviceInfo: payload.deviceInfo,
    data: payload.data,
  }));
  return payload;
}

function memoryStore(seed: Record<string, string>, failOnWrite?: string): StoragePort {
  const values = { ...seed };
  let failed = false;
  return {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      if (key === failOnWrite && !failed) { failed = true; throw new Error('synthetic quota failure'); }
      values[key] = value;
    },
    removeItem: (key) => { delete values[key]; },
    ...({ values } as object),
  } as StoragePort & { values: Record<string, string> };
}

function run(name: string, test: () => void) {
  test();
  console.log(`  PASS  ${name}`);
}

console.log('\n[test:data-transfer] Synthetic backup/restore tests\n');

run('validates a current export and previews grade, lesson progress and stars', () => {
  const payload = makeBackup();
  const preview = parseBackup(JSON.stringify(payload));
  assert.equal(preview.grade, 'G2');
  assert.equal(preview.date, '2026-09-28');
  assert.equal(preview.completed, 1);
  assert.equal(preview.total, 2);
  assert.equal(preview.stars, 17);
  assert.equal(preview.legacy, false);
});

run('accepts the validated legacy v1 envelope and rejects damaged/future/unknown formats', () => {
  const payload = makeBackup();
  const legacy = { ...payload } as Record<string, unknown>;
  delete legacy.schemaVersion;
  const legacyCore = { appName: payload.appName, appVersion: payload.appVersion, exportedAt: payload.exportedAt, stateVersion: payload.stateVersion, deviceInfo: payload.deviceInfo, data: payload.data };
  legacy.checksum = simpleChecksum(JSON.stringify(legacyCore));
  assert.equal(parseBackup(JSON.stringify(legacy)).legacy, true);
  assert.throws(() => parseBackup('{broken'), /JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ ...payload, schemaVersion: 99 })), /版本/);
  assert.throws(() => parseBackup(JSON.stringify({ ...payload, injectedKey: 'x' })), /未知/);
  assert.throws(() => parseBackup(JSON.stringify({ ...payload, checksum: '00000000' })), /校验/);
});

run('repeated restore replaces the snapshot, preserves unrelated keys and does not add stars', () => {
  const preview = parseBackup(JSON.stringify(makeBackup(17)));
  const store = memoryStore({ [BACKUP_STORAGE_KEYS.state]: 'broken prior value', stranger: 'keep me' }) as StoragePort & { values: Record<string, string> };
  restoreBackup(preview, store);
  restoreBackup(preview, store);
  assert.equal(JSON.parse(store.values[BACKUP_STORAGE_KEYS.state]).stars, 17);
  assert.equal(store.values.stranger, 'keep me');
});

run('failed write rolls app keys back and retains a verified persistent raw safety copy', () => {
  const preview = parseBackup(JSON.stringify(makeBackup()));
  const prior = { [BACKUP_STORAGE_KEYS.state]: '{corrupt-but-preserved', [BACKUP_STORAGE_KEYS.todayLesson]: 'raw lesson', stranger: 'leave untouched' };
  const store = memoryStore(prior, BACKUP_STORAGE_KEYS.stateVersion) as StoragePort & { values: Record<string, string> };
  assert.throws(() => restoreBackup(preview, store), /原有数据已恢复/);
  for (const [key, value] of Object.entries(prior)) assert.equal(store.values[key], value);
  const safety = JSON.parse(store.values[RESTORE_SAFETY_KEY]);
  assert.equal(safety.rawValues[BACKUP_STORAGE_KEYS.state], prior[BACKUP_STORAGE_KEYS.state]);
  assert.equal(safety.rawValues[BACKUP_STORAGE_KEYS.todayLesson], prior[BACKUP_STORAGE_KEYS.todayLesson]);
});

run('cannot mutate app keys when the raw safety copy cannot be persisted', () => {
  const preview = parseBackup(JSON.stringify(makeBackup()));
  const prior = { [BACKUP_STORAGE_KEYS.state]: 'keep raw', [BACKUP_STORAGE_KEYS.todayLesson]: 'lesson raw' };
  const store = memoryStore(prior, RESTORE_SAFETY_KEY) as StoragePort & { values: Record<string, string> };
  assert.throws(() => restoreBackup(preview, store), /恢复前的原始数据副本/);
  assert.deepEqual(store.values, prior);
});

run('validates optional learning-event shapes before restoring state', () => {
  const payload = makeBackup();
  const state = payload.data.learningState as Record<string, unknown>;
  const event = {
    eventId: 'synthetic-event', schemaVersion: 1, childProfileId: 'local-child-test', deviceId: 'local-device-test',
    sessionId: 'session-test', lessonId: 'lesson-test', questionInstanceId: 'instance-test', questionId: 'question-test',
    questionVersion: 'v1', skillIds: ['g1-u1:add-within-20'], grade: 'G1', semester: 'lower', unitId: 'g1-u1',
    role: 'current_concept', eventType: 'attempt_submitted', actionId: 'action-test', attemptId: 'attempt-test',
    timestamp: '2026-09-28T00:00:00.000Z', hintLevel: 'none', completionMode: 'independent', result: 'correct',
  };
  state.learningEvents = [event];
  const valid = parseBackup(JSON.stringify(refreshChecksum(payload)));
  assert.equal(valid.payload.data.learningState && (valid.payload.data.learningState as Record<string, unknown>).learningEvents instanceof Array, true);
  const supportEvent = {
    ...event, eventId: 'synthetic-support', eventType: 'support_used', actionId: 'support-action',
    attemptId: 'support:instance-test', hintLevel: 'none', completionMode: 'legacy_unknown',
    result: undefined,
  };
  state.learningEvents = [event, supportEvent];
  const withSupport = parseBackup(JSON.stringify(refreshChecksum(payload)));
  const restored = memoryStore({}) as StoragePort & { values: Record<string, string> };
  restoreBackup(withSupport, restored);
  const restoredEvents = JSON.parse(restored.values[BACKUP_STORAGE_KEYS.state]).learningEvents;
  assert.equal(restoredEvents.length, 2);
  assert.equal(restoredEvents[1].eventType, 'support_used');
  state.learningEvents = [{ ...event, hintLevel: 'invalid' }];
  assert.throws(() => parseBackup(JSON.stringify(refreshChecksum(payload))), /学习事件/);
});

run('rejects lessons that would silently lose their current step or phase', () => {
  for (const corrupt of [
    (lesson: Record<string, any>) => { lesson.currentStepIndex = 99; },
    (lesson: Record<string, any>) => { lesson.steps = []; },
    (lesson: Record<string, any>) => { delete lesson.steps[1].questionId; },
    (lesson: Record<string, any>) => { lesson.steps[1].type = 'unknown'; },
    (lesson: Record<string, any>) => { lesson.steps[1].currentPhaseIndex = 99; },
  ]) {
    const payload = makeBackup();
    corrupt(payload.data.todayLesson as Record<string, any>);
    assert.throws(() => parseBackup(JSON.stringify(refreshChecksum(payload))), /课程/);
  }
});

console.log('\n[test:data-transfer] All tests passed ✓\n');
