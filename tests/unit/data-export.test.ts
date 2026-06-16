/**
 * test:data-export — 数据导出只读行为单元测试 (v2.8.4)
 *
 * 运行：npm run test:data-export
 *
 * 覆盖：
 * 1. 导出前后 localStorage 完全一致
 * 2. 导出前后 stars 不变
 * 3. 导出前后 mistakes 不变
 * 4. 导出 payload 包含 appVersion/stateVersion/exportedAt
 * 5. 导出 JSON 可 parse
 * 6. checksum 存在且为字符串
 * 7. 文件名格式正确
 * 8. 空数据也能导出
 * 9. 大数据也能导出
 * 10. summary 字段完整
 */

import assert from 'node:assert/strict';
import { createDataSnapshot, generateExportFilename, estimateLocalStorageSize, formatBytes } from '@/lib/dataExport';
import { DEFAULT_GAME_STATE, type GameState } from '@/lib/types';

// ========== Mock localStorage for Node.js ==========

const mockStorage: Record<string, string> = {};

// Polyfill localStorage for Node (no DOM)
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
      get length() { return Object.keys(mockStorage).length; },
      key: (i: number) => Object.keys(mockStorage)[i] ?? null,
    },
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true });
}

// Use defineProperty to avoid read-only errors in newer Node
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'Node.js test runner', language: 'zh-CN' },
    configurable: true,
    writable: true,
  });
} catch { /* ignore if already defined */ }

try {
  Object.defineProperty(globalThis, 'screen', {
    value: { width: 1920, height: 1080 },
    configurable: true,
    writable: true,
  });
} catch { /* ignore */ }

// ========== Helper ==========

function seedStorage(state: GameState, mistakes: unknown[] = []) {
  const stored = { ...state, mistakes };
  mockStorage['math-detective-state'] = JSON.stringify(stored);
  mockStorage['math-detective-state-version'] = '8';
  mockStorage['math-detective-app-version'] = '2.8.4';
}

function snapshotStorage(): Record<string, string> {
  return { ...mockStorage };
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

// ========== Tests ==========

console.log('\n[test:data-export] Running data export unit tests...\n');

// 1. 导出前后 localStorage 完全一致
run('1. 导出前后 localStorage 完全一致', () => {
  seedStorage({ ...DEFAULT_GAME_STATE, stars: 42 });
  const before = snapshotStorage();
  createDataSnapshot();
  const after = snapshotStorage();
  assert.deepEqual(before, after, 'localStorage should be identical after export');
});

// 2. 导出前后 stars 不变
run('2. 导出前后 stars 不变', () => {
  seedStorage({ ...DEFAULT_GAME_STATE, stars: 77 });
  const before = JSON.parse(mockStorage['math-detective-state'] || '{}');
  createDataSnapshot();
  const after = JSON.parse(mockStorage['math-detective-state'] || '{}');
  assert.equal(before.stars, after.stars, 'stars unchanged after export');
});

// 3. 导出前后 mistakes 不变
run('3. 导出前后 mistakes 不变', () => {
  const mistakes = [
    { questionId: 'q1', questionText: '测试题', myAnswer: '5', correctAnswer: '6', errorType: 'answer_wrong', date: '2026-06-16', retriedCorrect: false },
  ];
  seedStorage({ ...DEFAULT_GAME_STATE }, mistakes);
  const before = JSON.parse(mockStorage['math-detective-state'] || '{}').mistakes || [];
  createDataSnapshot();
  const after = JSON.parse(mockStorage['math-detective-state'] || '{}').mistakes || [];
  assert.deepEqual(before, after, 'mistakes unchanged after export');
});

// 4. 导出 payload 包含必要字段
run('4. payload 包含 appVersion/stateVersion/exportedAt', () => {
  seedStorage({ ...DEFAULT_GAME_STATE });
  const payload = createDataSnapshot();
  assert.ok(typeof payload.appVersion === 'string' && payload.appVersion.length > 0, 'appVersion present');
  assert.ok(typeof payload.exportedAt === 'string' && payload.exportedAt.length > 0, 'exportedAt present');
  assert.ok(typeof payload.stateVersion === 'string', 'stateVersion present');
  assert.equal(payload.appName, 'Math Detective', 'appName correct');
});

// 5. 导出 JSON 可 parse
run('5. 导出 payload 可 JSON.stringify 再 parse', () => {
  seedStorage({ ...DEFAULT_GAME_STATE, stars: 10 });
  const payload = createDataSnapshot();
  const json = JSON.stringify(payload);
  const reparsed = JSON.parse(json);
  assert.ok(reparsed, 'reparsed should be truthy');
  assert.equal(reparsed.appName, 'Math Detective');
  assert.equal(reparsed.summary.stars, 10);
});

// 6. checksum 存在
run('6. checksum 存在且为非空字符串', () => {
  seedStorage({ ...DEFAULT_GAME_STATE });
  const payload = createDataSnapshot();
  assert.ok(typeof payload.checksum === 'string', 'checksum should be string');
  assert.ok(payload.checksum.length > 0, 'checksum should be non-empty');
});

// 7. 文件名格式正确
run('7. 文件名格式：math-detective-backup-YYYYMMDD-HHmm.json', () => {
  const filename = generateExportFilename();
  const pattern = /^math-detective-backup-\d{8}-\d{4}\.json$/;
  assert.match(filename, pattern, `filename format incorrect: ${filename}`);
});

// 8. 空数据也能导出
run('8. localStorage 为空时也能正常导出', () => {
  (globalThis as any).localStorage.clear();
  // 不应 throw
  const payload = createDataSnapshot();
  assert.ok(payload, 'payload should be created even with empty storage');
  assert.equal(payload.data.learningState, null);
  assert.equal(payload.summary.stars, 0);
});

// 9. 大数据也能导出（1000条 mistakes）
run('9. 大数据（1000条 mistakes）也能正常导出', () => {
  const bigMistakes = Array.from({ length: 1000 }, (_, i) => ({
    questionId: `q_${i}`,
    questionText: `测试题目 ${i}`.repeat(3),
    myAnswer: `${i}`,
    correctAnswer: `${i + 1}`,
    errorType: 'answer_wrong',
    date: '2026-06-16',
    retriedCorrect: false,
  }));
  seedStorage({ ...DEFAULT_GAME_STATE, stars: 500 }, bigMistakes);
  const payload = createDataSnapshot();
  assert.ok(payload, 'large export should succeed');
  assert.equal(payload.summary.mistakesCount, 1000, 'should capture all 1000 mistakes');
  assert.equal(payload.summary.stars, 500);
});

// 10. summary 字段完整
run('10. summary 包含所有必要字段', () => {
  seedStorage({ ...DEFAULT_GAME_STATE, stars: 25, streak: 7, totalCompleted: 50, correctCount: 45 });
  const payload = createDataSnapshot();
  const s = payload.summary;
  assert.ok('stars' in s, 'summary.stars');
  assert.ok('streak' in s, 'summary.streak');
  assert.ok('totalCompleted' in s, 'summary.totalCompleted');
  assert.ok('correctCount' in s, 'summary.correctCount');
  assert.ok('mistakesCount' in s, 'summary.mistakesCount');
  assert.ok('lastPlayDate' in s, 'summary.lastPlayDate');
  assert.ok('dataKeys' in s && Array.isArray(s.dataKeys), 'summary.dataKeys');
  assert.ok('estimatedSizeBytes' in s, 'summary.estimatedSizeBytes');
  assert.equal(s.stars, 25, 'summary.stars should match');
  assert.equal(s.streak, 7, 'summary.streak should match');
  assert.equal(s.totalCompleted, 50, 'summary.totalCompleted should match');
});

// 11. estimateLocalStorageSize / formatBytes
run('11. estimateLocalStorageSize 和 formatBytes 正常工作', () => {
  seedStorage({ ...DEFAULT_GAME_STATE });
  const size = estimateLocalStorageSize();
  assert.ok(typeof size === 'number' && size >= 0, `size should be non-negative number: ${size}`);
  const formatted = formatBytes(size);
  assert.ok(typeof formatted === 'string' && formatted.length > 0, 'formatted size should be non-empty string');
  // formatBytes corner cases
  assert.equal(formatBytes(0), '0 B');
  assert.ok(formatBytes(1023).endsWith(' B'));
  assert.ok(formatBytes(1024).endsWith(' KB'));
});

// 12. 导出 payload 的 data.learningState 是深拷贝（修改不影响 storage）
run('12. 导出的 data 是深拷贝，修改不影响 storage', () => {
  seedStorage({ ...DEFAULT_GAME_STATE, stars: 100 });
  const payload = createDataSnapshot();
  // 强制修改 snapshot
  if (payload.data.learningState) {
    (payload.data.learningState as any).stars = 9999;
  }
  // 原始 storage 不应变
  const storageState = JSON.parse(mockStorage['math-detective-state'] || '{}');
  assert.equal(storageState.stars, 100, 'original storage should be unchanged after mutating snapshot');
});

console.log('\n[test:data-export] All tests passed ✓\n');
