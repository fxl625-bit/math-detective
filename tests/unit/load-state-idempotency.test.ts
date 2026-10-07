import assert from 'node:assert/strict';
import { loadState, saveState } from '@/lib/storage';
import { DEFAULT_GAME_STATE, type GameState } from '@/lib/types';
import { ensurePointsState } from '@/lib/familyPoints';

const FIXED_NOW = new Date('2026-09-28T04:00:00.000Z').getTime();
const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(value?: string | number) {
    super(value === undefined ? FIXED_NOW : value);
  }
  static now() {
    return FIXED_NOW;
  }
}

const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => storage.clear(),
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
};

function setState(state: Partial<GameState>) {
  storage.set('math-detective-state', JSON.stringify({
    ...JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)),
    ...state,
  }));
}

function withBrowserStorage(fn: () => void) {
  const globals = globalThis as any;
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const priorDate = globalThis.Date;
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, configurable: true });
  globals.Date = FixedDate;
  try {
    fn();
  } finally {
    globals.Date = priorDate;
    if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow);
    else delete globals.window;
    if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage);
    else delete globals.localStorage;
    storage.clear();
  }
}

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

console.log('\n[load-state-idempotency]');

withBrowserStorage(() => {
  run('1, 4, and 20 reads preserve difficulty, start date, stars, and attempts', () => {
    const attempts = Array.from({ length: 20 }, (_, i) => ({
      questionId: `q-${i}`,
      isCorrect: true,
      submittedAt: '2026-09-27T04:00:00.000Z',
      attemptType: 'final_answer' as const,
    }));
    setState({
      stars: 123,
      level: 4,
      decorations: ['legacy-equipped-item'],
      totalCompleted: 85,
      answerAttempts: 20,
      attemptRecords: attempts,
      curriculumProfile: {
        country: 'CN', textbookEdition: 'PEP', grade: 2,
        semester: 'upper', detectedAt: '2026-09-20T00:00:00.000Z',
      },
      learnerProfile: {
        skillMastery: {},
        currentDifficultyLevel: 1,
        startedAt: '2026-09-01T00:00:00.000Z',
        totalCompleted: 85,
        recentAccuracy: 100,
        recentFirstTryAccuracy: 100,
        averageAttempts: 1,
        fullHintRate: 0,
        difficultyBias: 0,
      },
    });

    let baseline: Pick<NonNullable<GameState['learnerProfile']>, 'currentDifficultyLevel' | 'startedAt'> | undefined;
    for (let i = 1; i <= 20; i++) {
      const state = loadState();
      if ([1, 4, 20].includes(i)) {
        const summary = {
          currentDifficultyLevel: state.learnerProfile!.currentDifficultyLevel,
          startedAt: state.learnerProfile!.startedAt,
        };
        if (!baseline) baseline = summary;
        assert.deepEqual(summary, baseline);
        assert.equal(state.stars, 0);
        assert.equal(state.level, 4, 'legacy learning level is preserved');
        assert.ok(state.decorations.includes('legacy-equipped-item'), 'currently equipped cosmetics are preserved');
        assert.ok(state.unlockedAvatarItemIds?.includes('sticker_star_corner'), 'star-earned cosmetic unlock is captured before stars clear');
        assert.ok(state.unlockedAvatarItemIds?.includes('dec_cape'), 'legacy completed-question eligibility is captured before switching to distinct-question unlocks');
        assert.equal(state.answerAttempts, 20);
      }
    }
    assert.equal(baseline?.currentDifficultyLevel, 1);
    assert.equal(baseline?.startedAt, '2026-09-01T00:00:00.000Z');
  });

  run('first wallet migration snapshots all previously qualified legacy cosmetics once', () => {
    setState({ stars: 123, level: 5, totalCompleted: 100, correctCount: 30, wrongCount: 0 });
    const migrated = loadState();
    for (const id of ['sticker_star_corner', 'dec_cape', 'dec_scarf', 'dec_medal']) {
      assert.ok(migrated.unlockedAvatarItemIds?.includes(id), `${id} remains unlocked after migration`);
    }
    const reread = loadState();
    assert.deepEqual(reread.unlockedAvatarItemIds, migrated.unlockedAvatarItemIds, 'the snapshot stays stable on later reads');
  });

  run('legacy 100-star sticker migration uses its original threshold, not the new learning route', () => {
    setState({ stars: 123, totalCompleted: 0, completedQuestions: [], correctCount: 0, wrongCount: 0 });
    const legacyEarned = loadState();
    assert.ok(legacyEarned.unlockedAvatarItemIds?.includes('sticker_star_corner'));

    setState({ stars: 99, totalCompleted: 20, completedQuestions: [], correctCount: 0, wrongCount: 0 });
    const legacyNotEarned = loadState();
    assert.equal(legacyNotEarned.unlockedAvatarItemIds?.includes('sticker_star_corner'), false);
  });

  run('modern wallet saves do not turn legacy totals or cleared stars into cosmetic unlocks', () => {
    const wallet = ensurePointsState({ ...DEFAULT_GAME_STATE, totalCompleted: 100, correctCount: 30, wrongCount: 0 }).pointsWallet;
    assert.ok(wallet);
    setState({ pointsWallet: wallet, stars: 123, totalCompleted: 100, correctCount: 30, wrongCount: 0 });
    const modern = loadState();
    for (const id of ['sticker_star_corner', 'dec_cape', 'dec_scarf', 'dec_medal']) {
      assert.equal(modern.unlockedAvatarItemIds?.includes(id), false, `${id} is not granted from legacy totals in an already migrated save`);
    }
  });

  run('a missing start date is initialized once and then retained', () => {
    setState({ stars: 9, level: 2, unlockedAvatarItemIds: ['sticker_star_corner'], answerAttempts: 3, totalCompleted: 3 });
    const first = loadState();
    const initializedAt = first.learnerProfile!.startedAt;
    assert.equal(initializedAt, new NativeDate(FIXED_NOW).toISOString());
    for (let i = 0; i < 20; i++) {
      const state = loadState();
      assert.equal(state.learnerProfile!.startedAt, initializedAt);
      assert.equal(state.stars, 0);
      assert.equal(state.level, 2);
      assert.ok(state.unlockedAvatarItemIds?.includes('sticker_star_corner'));
      assert.equal(state.answerAttempts, 3);
    }
  });

  run('malformed settings/profile and invalid startedAt preserve learning totals', () => {
    setState({
      stars: 77,
      level: 3,
      answerAttempts: 9,
      totalCompleted: 5,
      attemptRecords: [{
        questionId: 'kept-attempt',
        isCorrect: true,
        submittedAt: '2026-09-27T04:00:00.000Z',
        attemptType: 'final_answer',
      }],
      parentSettings: null as any,
      curriculumProfile: 'broken' as any,
      learnerProfile: {
        currentDifficultyLevel: 2,
        startedAt: 'not-a-date',
        totalCompleted: 5,
        recentAccuracy: 100,
        recentFirstTryAccuracy: 100,
        averageAttempts: 1,
        fullHintRate: 0,
        difficultyBias: 0,
        skillMastery: {},
      } as any,
    });

    const state = loadState();
    assert.equal(state.stars, 0);
    assert.equal(state.level, 3);
    assert.equal(state.answerAttempts, 9);
    assert.equal(state.attemptRecords[0]?.questionId, 'kept-attempt');
    assert.equal(state.parentSettings.gradeBand, DEFAULT_GAME_STATE.parentSettings.gradeBand);
    assert.equal(state.curriculumProfile?.semester, 'upper');
    assert.ok(Number.isFinite(Date.parse(state.learnerProfile!.startedAt)));
  });

  run('manual semester survives repeated save/load and clearing it returns to date detection', () => {
    setState({
      parentSettings: {
        ...DEFAULT_GAME_STATE.parentSettings,
        gradeBand: 'G2',
        dailyGoal: 5,
        semesterOverride: undefined,
        learningSettings: {
          schemaVersion: 1,
          grade: 'G2',
          semester: 'lower',
          semesterSource: 'manual',
          textbookEdition: 'generic_cn',
          unitId: 'g2-u2',
          learnedTableRange: [2, 3, 5],
          dailyGoal: 5,
          challengePreference: 'balanced',
        },
      },
    });
    for (let i = 0; i < 5; i++) {
      const state = loadState();
      assert.equal(state.parentSettings.learningSettings?.semester, 'lower');
      assert.equal(state.parentSettings.learningSettings?.semesterSource, 'manual');
      assert.equal(state.parentSettings.semesterOverride, 'lower');
      saveState(state);
    }
    const stored = JSON.parse(storage.get('math-detective-state') || '{}');
    stored.parentSettings.semesterOverride = undefined;
    stored.parentSettings.learningSettings.semesterSource = 'auto';
    storage.set('math-detective-state', JSON.stringify(stored));
    const cleared = loadState();
    assert.equal(cleared.parentSettings.learningSettings?.semester, 'upper');
    assert.equal(cleared.parentSettings.learningSettings?.semesterSource, 'auto');
    assert.equal(cleared.curriculumProfile?.semester, 'upper');
  });

  run('new nested learning settings survive import without legacy mirror fields', () => {
    setState({
      parentSettings: {
        learningSettings: {
          schemaVersion: 1,
          grade: 'G6',
          semester: 'lower',
          semesterSource: 'manual',
          textbookEdition: 'BNUP',
          unitId: 'g6-u2',
          learnedTableRange: null,
          dailyGoal: 8,
          challengePreference: 'stretch',
        },
      } as any,
    });
    for (let i = 0; i < 5; i++) {
      const state = loadState();
      assert.equal(state.parentSettings.gradeBand, 'G6');
      assert.equal(state.parentSettings.learningSettings?.grade, 'G6');
      assert.equal(state.parentSettings.learningSettings?.semester, 'lower');
      assert.equal(state.curriculumProfile?.semester, 'lower');
      assert.equal(state.parentSettings.textbookEdition, 'BNUP');
      assert.equal(state.parentSettings.dailyGoal, 8);
      saveState(state);
    }
  });
});
