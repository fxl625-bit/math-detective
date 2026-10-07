import { APP_VERSION } from './appVersion';
import { simpleChecksum, type ExportPayload } from './dataExport';
import { createLearningEvent, type LearningEventInput } from './learningEvents';
import { STEP_DEFAULT_PHASES, type LessonStepType } from './types';
import { isValidPointsWallet } from './familyPoints';

export const BACKUP_STORAGE_KEYS = {
  state: 'math-detective-state',
  todayLesson: 'math-detective-today-lesson',
  stateVersion: 'math-detective-state-version',
  appVersion: 'math-detective-app-version',
} as const;
export const RESTORE_SAFETY_KEY = 'math-detective-restore-safety-net-v1';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const DATA_KEYS = ['learningState', 'todayLesson', 'mistakes', 'rewards', 'parentRewards', 'avatar', 'settings', 'reports'];
const STORAGE_KEY_LIST = Object.values(BACKUP_STORAGE_KEYS);
const LEGACY_PHASES = new Set(['read', 'find_numbers', 'find_keywords', 'remove_noise', 'simulation', 'choose_operation',
  'build_equation', 'answer', 'explain', 'find_compare_numbers', 'spot_extra_info', 'spot_missing_info',
  'understand_clues', 'logic_elimination', 'ranking_answer', 'completed', 'known_facts', 'target', 'plan', 'check']);

export interface BackupPreview {
  grade: string;
  date: string;
  completed: number;
  total: number;
  stars: number;
  legacy: boolean;
  payload: ExportPayload;
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateLearningEvent(value: unknown): void {
  assert(isRecord(value), '学习事件格式无效');
  const allowed = ['eventId', 'schemaVersion', 'childProfileId', 'deviceId', 'sessionId', 'lessonId', 'questionInstanceId', 'questionId', 'questionVersion', 'skillIds', 'grade', 'semester', 'unitId', 'role', 'settingSignature', 'eventType', 'actionId', 'attemptId', 'timestamp', 'hintLevel', 'completionMode', 'result', 'durationMs', 'firstAttemptKnown'];
  assert(Object.keys(value).every((key) => allowed.includes(key)), '学习事件包含未知字段');
  assert(value.schemaVersion === 1, '学习事件版本无效');
  assert(typeof value.questionVersion === 'string', '学习事件 questionVersion 无效');
  assert(value.unitId === undefined || value.unitId === null || typeof value.unitId === 'string', '学习事件 unitId 无效');
  assert(value.role === undefined || ['due_review', 'current_concept', 'same_skill_variant', 'application', 'stretch', 'olympiad', 'unknown'].includes(String(value.role)), '学习事件 role 无效');
  assert(value.settingSignature === undefined || typeof value.settingSignature === 'string', '学习事件 settingSignature 无效');
  assert(value.result === undefined || ['correct', 'incorrect', 'completed'].includes(String(value.result)), '学习事件 result 无效');
  assert(value.firstAttemptKnown === undefined || typeof value.firstAttemptKnown === 'boolean', '学习事件 firstAttemptKnown 无效');
  const { schemaVersion: _schemaVersion, ...input } = value;
  assert(createLearningEvent(input as unknown as LearningEventInput) !== null, '学习事件缺少必需字段或包含无效值');
}

function validateGameState(value: unknown): asserts value is Record<string, unknown> {
  assert(isRecord(value), '备份缺少有效的学习状态');
  const numericFields = ['stars', 'streak', 'completedToday', 'totalCompleted', 'correctCount', 'wrongCount', 'answerAttempts', 'level', 'resumeCards', 'skillLevel'];
  const stringFields = ['lastPlayDate', 'lastCheckinDate', 'lastStreakCheckDate'];
  const requiredArrayFields = ['badges', 'completedQuestions', 'mistakes', 'parentRewards', 'rewardRedemptions'];
  const optionalArrayFields = ['parentGateAttempts', 'weeklySnapshots', 'decorations', 'unlockedAvatarItemIds', 'collectibleCards', 'attemptRecords', 'learningEvents', 'mentalMathRecords', 'mistakeReviewAttempts'];
  for (const key of numericFields) assert(Number.isFinite(value[key]) && (value[key] as number) >= 0, `学习状态字段 ${key} 无效`);
  for (const key of stringFields) assert(typeof value[key] === 'string', `学习状态字段 ${key} 无效`);
  for (const key of requiredArrayFields) assert(Array.isArray(value[key]), `学习状态字段 ${key} 无效`);
  for (const key of optionalArrayFields) assert(value[key] === undefined || Array.isArray(value[key]), `学习状态字段 ${key} 无效`);
  if (value.learningEvents !== undefined) {
    assert(Array.isArray(value.learningEvents), '学习状态字段 learningEvents 无效');
    for (const event of value.learningEvents) validateLearningEvent(event);
  }
  for (const mistake of value.mistakes as unknown[]) {
    if (isRecord(mistake) && mistake.questionSnapshot !== undefined) validateMistakeQuestionSnapshot(mistake.questionSnapshot);
  }
  if (value.pointsWallet !== undefined) assert(isValidPointsWallet(value.pointsWallet), '家庭积分账本无效');
  if (value.mistakeReviewAttempts !== undefined) validateMistakeReviewAttempts(value.mistakeReviewAttempts);
  assert(isRecord(value.parentSettings), '备份中的学习设置无效');
  assert(isRecord(value.skillMistakes), '学习状态字段 skillMistakes 无效');
  for (const key of ['questionReviewDates', 'questionReviewCounts']) assert(value[key] === undefined || isRecord(value[key]), `学习状态字段 ${key} 无效`);
}

function validateMistakeQuestionSnapshot(value: unknown): void {
  assert(isRecord(value), '错题题目快照无效');
  const allowed = ['id', 'gradeBand', 'text', 'answer', 'answerType', 'answerSchema', 'answerSentence', 'explanation'];
  assert(Object.keys(value).every(key => allowed.includes(key)), '错题题目快照包含未知字段');
  assert(typeof value.id === 'string' && value.id.length > 0
    && (value.gradeBand === undefined || /^G[1-6]$/.test(String(value.gradeBand)))
    && typeof value.text === 'string'
    && (typeof value.answer === 'string' || typeof value.answer === 'number')
    && value.answerType === 'number'
    && (value.answerSentence === undefined || typeof value.answerSentence === 'string')
    && (value.explanation === undefined || typeof value.explanation === 'string'), '错题题目快照字段无效');
  if (value.answerSchema !== undefined) {
    assert(isRecord(value.answerSchema) && ['integer', 'decimal', 'fraction', 'percent'].includes(String(value.answerSchema.kind)), '错题答案模式无效');
  }
}

function validateMistakeReviewAttempts(value: unknown): void {
  assert(Array.isArray(value), '错题订正记录无效');
  const ids = new Set<string>();
  const actions = new Set<string>();
  for (const item of value) {
    assert(isRecord(item), '错题订正记录无效');
    const allowed = ['id', 'recordId', 'questionId', 'actionId', 'answer', 'correct', 'submittedAt', 'pointsDeltaUnits'];
    assert(Object.keys(item).every(key => allowed.includes(key)), '错题订正记录包含未知字段');
    assert(typeof item.id === 'string' && item.id.length > 0
      && typeof item.recordId === 'string' && item.recordId.length > 0
      && typeof item.questionId === 'string' && item.questionId.length > 0
      && typeof item.actionId === 'string' && item.actionId.length > 0
      && (typeof item.answer === 'string' || (isRecord(item.answer) && Object.values(item.answer).every(answer => typeof answer === 'string')))
      && typeof item.correct === 'boolean'
      && Number.isFinite(Date.parse(String(item.submittedAt)))
      && Number.isSafeInteger(item.pointsDeltaUnits) && (item.pointsDeltaUnits as number) >= 0
      && (item.pointsDeltaUnits as number) <= 1, '错题订正记录字段无效');
    assert(!ids.has(item.id) && !actions.has(item.actionId), '错题订正操作重复');
    ids.add(item.id);
    actions.add(item.actionId);
  }
}

function validateLesson(value: unknown): void {
  if (value === null) return;
  assert(isRecord(value), '备份中的今日课程无效');
  assert(typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date), '备份中的课程日期无效');
  assert(Array.isArray(value.steps) && value.steps.length > 0, '备份中的课程步骤无效');
  assert(typeof value.completed === 'boolean', '备份中的课程完成状态无效');
  assert(Number.isInteger(value.currentStepIndex) && (value.currentStepIndex as number) >= 0
    && (value.currentStepIndex as number) <= (value.completed ? value.steps.length : value.steps.length - 1), '备份中的课程进度无效');
  for (const step of value.steps) {
    assert(isRecord(step) && typeof step.id === 'string' && step.id.length > 0
      && typeof step.questionId === 'string' && step.questionId.length > 0
      && typeof step.type === 'string' && Object.hasOwn(STEP_DEFAULT_PHASES, step.type)
      && typeof step.status === 'string', '备份中包含无效课程步骤');
    assert(['locked', 'current', 'completed'].includes(step.status as string), '备份中包含未知课程步骤状态');
    const phases = step.phases === undefined
      ? STEP_DEFAULT_PHASES[step.type as LessonStepType]
      : step.phases;
    assert(Array.isArray(phases) && phases.length > 0 && phases.every(phase => typeof phase === 'string'
      && LEGACY_PHASES.has(phase)), '备份中的课程阶段无效');
    assert(step.currentPhaseIndex === undefined || (Number.isInteger(step.currentPhaseIndex)
      && (step.currentPhaseIndex as number) >= 0 && (step.currentPhaseIndex as number) < phases.length), '备份中的课程阶段进度无效');
  }
}

function compareVersions(a: string, b: string): number | null {
  const parse = (value: string) => value.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)?.slice(1).map(Number);
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

/** Parse and strictly validate a current or legacy-v1 ExportPayload without touching storage. */
export function parseBackup(text: string): BackupPreview {
  assert(typeof text === 'string' && new TextEncoder().encode(text).byteLength <= MAX_BACKUP_BYTES, '备份文件超过 5 MB 限制');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('备份文件不是有效 JSON'); }
  assert(isRecord(parsed), '备份文件结构无效');
  const payload = parsed;
  assert(hasExactKeys(payload, ['appName', 'appVersion', 'exportedAt', 'stateVersion', 'deviceInfo', 'data', 'checksum', 'summary'])
    || hasExactKeys(payload, ['schemaVersion', 'appName', 'appVersion', 'exportedAt', 'stateVersion', 'deviceInfo', 'data', 'checksum', 'summary']), '备份格式包含未知或缺失字段');
  const legacy = !Object.hasOwn(payload, 'schemaVersion');
  assert(legacy || payload.schemaVersion === 1, '不支持此备份版本');
  assert(payload.appName === 'Math Detective', '这不是 Math Detective 备份');
  assert(typeof payload.appVersion === 'string' && compareVersions(payload.appVersion, APP_VERSION) !== null, '备份应用版本无效');
  assert((compareVersions(payload.appVersion as string, APP_VERSION) as number) <= 0, '备份来自更新版本，当前应用无法安全恢复');
  assert(typeof payload.exportedAt === 'string' && Number.isFinite(Date.parse(payload.exportedAt)), '备份时间无效');
  assert(typeof payload.stateVersion === 'string' && payload.stateVersion.length <= 80, '数据版本无效');
  assert(isRecord(payload.deviceInfo), '设备信息结构无效');
  assert(hasExactKeys(payload.deviceInfo, ['userAgent', 'timezone', 'language', 'screenWidth', 'screenHeight'])
    && typeof payload.deviceInfo.userAgent === 'string' && typeof payload.deviceInfo.timezone === 'string'
    && typeof payload.deviceInfo.language === 'string' && Number.isFinite(payload.deviceInfo.screenWidth)
    && Number.isFinite(payload.deviceInfo.screenHeight), '设备信息字段无效');
  assert(isRecord(payload.data) && hasExactKeys(payload.data, DATA_KEYS), '备份数据结构不完整或含未知数据块');
  assert(isRecord(payload.summary) && hasExactKeys(payload.summary, ['stars', 'streak', 'totalCompleted', 'correctCount', 'mistakesCount', 'completedLessons', 'lastPlayDate', 'dataKeys', 'estimatedSizeBytes']), '备份摘要无效');
  for (const key of ['stars', 'streak', 'totalCompleted', 'correctCount', 'mistakesCount', 'completedLessons', 'estimatedSizeBytes']) {
    assert(Number.isFinite(payload.summary[key]) && (payload.summary[key] as number) >= 0, `备份摘要字段 ${key} 无效`);
  }
  assert(typeof payload.summary.lastPlayDate === 'string' && Array.isArray(payload.summary.dataKeys) && payload.summary.dataKeys.every((key) => typeof key === 'string'), '备份摘要字段无效');
  assert(typeof payload.checksum === 'string' && /^[0-9a-f]{8}$/.test(payload.checksum), '备份校验和缺失或格式无效');
  validateGameState(payload.data.learningState);
  validateLesson(payload.data.todayLesson);
  assert(Array.isArray(payload.data.mistakes) && Array.isArray(payload.data.parentRewards) && Array.isArray(payload.data.reports), '备份列表字段无效');
  for (const key of ['rewards', 'avatar', 'settings']) assert(payload.data[key] === null || isRecord(payload.data[key]), `备份数据块 ${key} 无效`);
  const core = legacy
    ? { appName: payload.appName, appVersion: payload.appVersion, exportedAt: payload.exportedAt, stateVersion: payload.stateVersion, deviceInfo: payload.deviceInfo, data: payload.data }
    : { schemaVersion: payload.schemaVersion, appName: payload.appName, appVersion: payload.appVersion, exportedAt: payload.exportedAt, stateVersion: payload.stateVersion, deviceInfo: payload.deviceInfo, data: payload.data };
  assert(simpleChecksum(JSON.stringify(core)) === payload.checksum, '备份校验失败，文件可能已损坏');
  const state = payload.data.learningState as Record<string, unknown>;
  const lesson = payload.data.todayLesson as Record<string, unknown> | null;
  const settings = state.parentSettings as Record<string, unknown>;
  return {
    grade: typeof settings.gradeBand === 'string' ? settings.gradeBand : '未设置年级',
    date: lesson?.date as string || (typeof state.lastPlayDate === 'string' ? state.lastPlayDate : '—'),
    completed: lesson ? (lesson.steps as unknown[]).filter((step) => isRecord(step) && step.status === 'completed').length : Number(state.totalCompleted),
    total: lesson ? (lesson.steps as unknown[]).length : Number(state.totalCompleted),
    stars: Number(state.stars),
    legacy,
    payload: payload as unknown as ExportPayload,
  };
}

/** Replace only the four app-owned keys; restore their exact raw prior values on failure. */
export function restoreBackup(preview: BackupPreview, storage: StoragePort): void {
  const payload = preview.payload;
  const prior = new Map<string, string | null>();
  try {
    for (const key of STORAGE_KEY_LIST) prior.set(key, storage.getItem(key));
  } catch {
    throw new Error('无法读取原有数据，恢复已中止');
  }
  let previousSafetyNet: string | null;
  try { previousSafetyNet = storage.getItem(RESTORE_SAFETY_KEY); }
  catch { throw new Error('无法读取恢复副本位置，恢复已中止'); }
  const safetyNet = JSON.stringify({ schemaVersion: 1, createdAt: new Date().toISOString(), rawValues: Object.fromEntries(prior) });
  try {
    storage.setItem(RESTORE_SAFETY_KEY, safetyNet);
    if (storage.getItem(RESTORE_SAFETY_KEY) !== safetyNet) throw new Error('Safety copy readback mismatch');
  } catch {
    try {
      previousSafetyNet === null ? storage.removeItem(RESTORE_SAFETY_KEY) : storage.setItem(RESTORE_SAFETY_KEY, previousSafetyNet);
    } catch { /* best effort to retain any prior recovery record */ }
    throw new Error('无法保存并验证恢复前的原始数据副本，恢复已中止');
  }
  const writes: Array<[string, string | null]> = [
    [BACKUP_STORAGE_KEYS.state, JSON.stringify(payload.data.learningState)],
    [BACKUP_STORAGE_KEYS.todayLesson, payload.data.todayLesson === null ? null : JSON.stringify(payload.data.todayLesson)],
    [BACKUP_STORAGE_KEYS.stateVersion, payload.stateVersion],
    [BACKUP_STORAGE_KEYS.appVersion, payload.appVersion],
  ];
  try {
    for (const [key, value] of writes) value === null ? storage.removeItem(key) : storage.setItem(key, value);
  } catch {
    const rollback = () => {
      let failed = false;
      for (const key of STORAGE_KEY_LIST) {
        try {
          const value = prior.get(key) ?? null;
          value === null ? storage.removeItem(key) : storage.setItem(key, value);
        } catch { failed = true; }
      }
      return failed;
    };
    let rollbackFailed = rollback();
    if (rollbackFailed) {
      // A full localStorage may need the safety copy's quota to restore a larger old value.
      try { storage.removeItem(RESTORE_SAFETY_KEY); } catch { /* Retry rollback either way. */ }
      rollbackFailed = rollback();
    }
    throw new Error(rollbackFailed ? '写入失败，自动回滚也未能完整恢复；请勿关闭页面并重试' : '写入失败，原有数据已恢复，可以重试');
  }
}
