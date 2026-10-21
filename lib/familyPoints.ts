import type { GameState, PointCategory, PointEntry, PointsWallet, TodayLesson } from './types';

export interface PointsResult {
  state: GameState;
  ok: boolean;
  message: string;
  pointsDelta: number;
}

export interface ParentPointsInput {
  actionId: string;
  amount: number;
  category: PointCategory;
  note: string;
}

export interface RewardRequestInput {
  actionId: string;
  rewardName: string;
}

export interface RedemptionResolutionInput {
  id: string;
  status: 'confirmed' | 'cancelled';
}

const UNITS_PER_POINT = 2;
const REWARD_COST_UNITS = 30;
const MAX_GRANT_UNITS = 2000;
const CORE_ROLES = ['due_review', 'current_concept', 'same_skill_variant', 'application', 'stretch', 'olympiad'] as const;

export function isValidPointsWallet(value: unknown): value is PointsWallet {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Number.isFinite(Date.parse(String(value.initializedAt)))
    || Object.keys(value).some(key => !['schemaVersion', 'initializedAt', 'ledger', 'redemptions'].includes(key))
    || !Array.isArray(value.ledger) || !Array.isArray(value.redemptions)) return false;
  const actionIds = new Set<string>();
  const entryIds = new Set<string>();
  const redemptionEntries = new Map<string, number>();
  const redemptionActionById = new Map<string, string>();
  const refunds = new Map<string, number>();
  for (const raw of value.ledger) {
    if (!isRecord(raw)
      || Object.keys(raw).some(key => !['id', 'actionId', 'type', 'unitsDelta', 'createdAt', 'category', 'note', 'referenceId', 'rewardName'].includes(key))
      || typeof raw.id !== 'string' || !raw.id
      || typeof raw.actionId !== 'string' || !raw.actionId
      || !['checkin', 'perfect_lesson', 'parent_grant', 'mistake_review', 'redemption', 'redemption_refund'].includes(String(raw.type))
      || !Number.isSafeInteger(raw.unitsDelta)
      || !Number.isFinite(Date.parse(String(raw.createdAt)))) return false;
    if (raw.category !== undefined && !['chores', 'school', 'homework', 'other'].includes(String(raw.category))) return false;
    if (raw.note !== undefined && typeof raw.note !== 'string') return false;
    if (raw.referenceId !== undefined && typeof raw.referenceId !== 'string') return false;
    if (raw.rewardName !== undefined && typeof raw.rewardName !== 'string') return false;
    if (actionIds.has(raw.actionId) || entryIds.has(raw.id)) return false;
    actionIds.add(raw.actionId);
    entryIds.add(raw.id);
    if (typeof raw.unitsDelta !== 'number' || !Number.isSafeInteger(raw.unitsDelta)) return false;
    const unitsDelta = raw.unitsDelta;
    if (raw.type === 'checkin' && unitsDelta !== 1) return false;
    if (raw.type === 'perfect_lesson' && unitsDelta !== 2) return false;
    if (raw.type === 'parent_grant' && (unitsDelta <= 0 || unitsDelta > MAX_GRANT_UNITS
      || !['chores', 'school', 'homework', 'other'].includes(String(raw.category)))) return false;
    if (raw.type === 'mistake_review' && unitsDelta !== 1) return false;
    if (raw.type === 'redemption') {
      if (unitsDelta !== -REWARD_COST_UNITS || typeof raw.referenceId !== 'string' || !raw.rewardName) return false;
      redemptionEntries.set(raw.referenceId, (redemptionEntries.get(raw.referenceId) || 0) + 1);
      redemptionActionById.set(raw.referenceId, String(raw.actionId));
    }
    if (raw.type === 'redemption_refund') {
      if (unitsDelta !== REWARD_COST_UNITS || typeof raw.referenceId !== 'string' || !raw.rewardName
        || raw.actionId !== `redemption-refund:${raw.referenceId}`) return false;
      refunds.set(raw.referenceId, (refunds.get(raw.referenceId) || 0) + 1);
    }
  }
  const redemptionIds = new Set<string>();
  const redemptionActions = new Set<string>();
  const matchedRedemptions = new Set<string>();
  for (const raw of value.redemptions) {
    if (!isRecord(raw)
      || Object.keys(raw).some(key => !['id', 'actionId', 'rewardName', 'unitsCost', 'requestedAt', 'status', 'resolvedAt'].includes(key))
      || typeof raw.id !== 'string' || !raw.id
      || typeof raw.actionId !== 'string' || !raw.actionId
      || typeof raw.rewardName !== 'string' || !raw.rewardName.trim()
      || raw.unitsCost !== REWARD_COST_UNITS
      || !Number.isFinite(Date.parse(String(raw.requestedAt)))
      || !['pending', 'confirmed', 'cancelled'].includes(String(raw.status))
      || (raw.resolvedAt !== undefined && !Number.isFinite(Date.parse(String(raw.resolvedAt))))) return false;
    if (redemptionIds.has(raw.id) || redemptionActions.has(raw.actionId)) return false;
    if (matchedRedemptions.has(raw.id) || redemptionEntries.get(raw.id) !== 1
      || redemptionActionById.get(raw.id) !== raw.actionId) return false;
    if ((raw.status === 'cancelled' && refunds.get(raw.id) !== 1)
      || (raw.status !== 'cancelled' && refunds.has(raw.id))) return false;
    redemptionIds.add(raw.id);
    redemptionActions.add(raw.actionId);
    matchedRedemptions.add(raw.id);
  }
  if ([...redemptionEntries.keys()].some(id => !matchedRedemptions.has(id))
    || [...refunds.keys()].some(id => !matchedRedemptions.has(id))) return false;
  const units = value.ledger.reduce((sum, entry) => sum + (entry.unitsDelta as number), 0);
  return Number.isSafeInteger(units) && units >= 0;
}

export function ensurePointsState(state: GameState): GameState {
  const wallet = state.pointsWallet;
  // A missing wallet marks a first migration. Never infer income from legacy stars.
  return {
    ...state,
    stars: 0,
    pointsWallet: wallet === undefined
      ? { schemaVersion: 1, initializedAt: new Date().toISOString(), ledger: [], redemptions: [] }
      : wallet,
    mistakeReviewAttempts: Array.isArray(state.mistakeReviewAttempts) ? state.mistakeReviewAttempts : [],
  };
}

export function getPointsBalance(state: GameState): number {
  const wallet = state.pointsWallet;
  if (!isValidPointsWallet(wallet)) return 0;
  const units = wallet.ledger.reduce((total, entry) => total + entry.unitsDelta, 0);
  return Number.isSafeInteger(units) ? units / UNITS_PER_POINT : 0;
}

export function getPointsLedger(state: GameState): PointEntry[] {
  return isValidPointsWallet(state.pointsWallet) ? [...state.pointsWallet.ledger] : [];
}

export function claimCheckin(state: GameState, now: Date = new Date()): PointsResult {
  if (state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet)) return result(state, false, '积分账本损坏，已停止写入。', 0);
  const base = ensurePointsState(state);
  const date = localDate(now);
  const actionId = `checkin:${date}`;
  if (base.lastCheckinDate === date) return result(base, false, '今天已经签到过了。', 0);
  if (hasAction(base, actionId)) return result(base, true, '今天已经领取签到积分。', 0);
  const entry = makeEntry(actionId, 'checkin', 1, now);
  return result(withEntry({ ...base, lastCheckinDate: date }, entry), true, '签到成功，获得 0.5 积分。', 0.5);
}

export function grantPerfectLessonPoints(state: GameState, lesson: TodayLesson, now: Date = new Date()): PointsResult {
  if (state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet)) return result(state, false, '积分账本损坏，已停止写入。', 0);
  const base = ensurePointsState(state);
  if (!isPerfectFirstAnswerLesson(base, lesson)) return result(base, false, '本课没有满足首答全对条件。', 0);
  const date = localDate(now);
  const priorLessonReward = base.pointsWallet!.ledger.some(entry => entry.type === 'perfect_lesson' && entry.referenceId === lesson.lessonId);
  if (priorLessonReward) return result(base, true, '这节课的积分已经领取。', 0);
  const completionToday = (base.learningEvents || []).some(event => event.eventType === 'lesson_completed'
    && event.lessonId === lesson.lessonId && Number.isFinite(Date.parse(event.timestamp))
    && localDate(new Date(event.timestamp)) === date);
  if (!completionToday) return result(base, false, '这节课不是今天刚完成的课程。', 0);
  const actionId = `perfect-lesson:${date}`;
  if (hasAction(base, actionId)) return result(base, true, '今天的核心日课积分已领取。', 0);
  const entry = makeEntry(actionId, 'perfect_lesson', 2, now, { referenceId: lesson.lessonId || lesson.date });
  return result(withEntry(base, entry), true, '核心日课全对，获得 1 积分。', 1);
}

export function addParentPoints(state: GameState, input: ParentPointsInput, now: Date = new Date()): PointsResult {
  if (state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet)) return result(state, false, '积分账本损坏，已停止写入。', 0);
  const base = ensurePointsState(state);
  const amountUnits = input.amount * UNITS_PER_POINT;
  if (!input.actionId?.trim() || !['chores', 'school', 'homework', 'other'].includes(input.category)
    || !Number.isFinite(input.amount) || !Number.isSafeInteger(amountUnits) || amountUnits <= 0 || amountUnits > MAX_GRANT_UNITS
    || typeof input.note !== 'string') return result(base, false, '积分记录内容无效。', 0);
  const payload = JSON.stringify({ type: 'parent_grant', amountUnits, category: input.category, note: input.note });
  const prior = base.pointsWallet!.ledger.find((entry) => entry.actionId === input.actionId);
  if (prior) return prior.type === 'parent_grant'
    && JSON.stringify({ type: prior.type, amountUnits: Math.abs(prior.unitsDelta), category: prior.category, note: prior.note }) === payload
    ? result(base, true, '这条积分记录已保存。', 0)
    : result(base, false, '操作编号已用于不同内容，未重复记分。', 0);
  const entry = makeEntry(input.actionId, 'parent_grant', amountUnits, now, { category: input.category, note: input.note });
  return result(withEntry(base, entry), true, `已记入 ${input.amount} 积分。`, input.amount);
}

export function requestReward(state: GameState, input: RewardRequestInput, now: Date = new Date()): PointsResult {
  if (state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet)) return result(state, false, '积分账本损坏，已停止写入。', 0);
  const base = ensurePointsState(state);
  const rewardName = input.rewardName?.trim();
  if (!input.actionId?.trim() || !rewardName) return result(base, false, '请填写奖励名称。', 0);
  const payload = JSON.stringify({ type: 'redemption', rewardName });
  const prior = base.pointsWallet!.ledger.find((entry) => entry.actionId === input.actionId);
  if (prior) return prior.type === 'redemption' && prior.rewardName === rewardName
    ? result(base, true, '兑换申请已经提交。', 0)
    : result(base, false, '操作编号已用于不同内容，未重复申请。', 0);
  if (getPointsBalance(base) < REWARD_COST_UNITS / UNITS_PER_POINT) return result(base, false, '需要 15 积分才能申请兑换。', 0);
  const redemptionId = input.actionId;
  const entry = makeEntry(input.actionId, 'redemption', -REWARD_COST_UNITS, now, { referenceId: redemptionId, rewardName });
  const wallet = base.pointsWallet!;
  const next: GameState = {
    ...base,
    pointsWallet: {
      ...wallet,
      ledger: [...wallet.ledger, entry],
      redemptions: [...wallet.redemptions, {
        id: redemptionId,
        actionId: input.actionId,
        rewardName,
        unitsCost: REWARD_COST_UNITS,
        requestedAt: now.toISOString(),
        status: 'pending',
      }],
    },
  };
  return result(next, true, '已提交 15 积分兑换申请，等待家长确认。', -15);
}

export function resolveRedemption(state: GameState, input: RedemptionResolutionInput, now: Date = new Date()): PointsResult {
  if (state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet)) return result(state, false, '积分账本损坏，已停止写入。', 0);
  const base = ensurePointsState(state);
  if (!input || typeof input.id !== 'string' || !['confirmed', 'cancelled'].includes(input.status)) {
    return result(base, false, '申请处理状态无效。', 0);
  }
  const wallet = base.pointsWallet!;
  const redemption = wallet.redemptions.find((item) => item.id === input.id);
  if (!redemption) return result(base, false, '没有找到这条兑换申请。', 0);
  if (redemption.status === input.status) return result(base, true, '申请状态已经更新。', 0);
  if (redemption.status !== 'pending') return result(base, false, '已处理的申请不能再次更改。', 0);
  if (input.status === 'confirmed') {
    const redemptions = wallet.redemptions.map((item) => item.id === input.id
      ? { ...item, status: 'confirmed' as const, resolvedAt: now.toISOString() }
      : item);
    return result({ ...base, pointsWallet: { ...wallet, redemptions } }, true, '已确认兑换。', 0);
  }
  const refundActionId = `redemption-refund:${redemption.id}`;
  if (hasAction(base, refundActionId)) return result(base, true, '这笔申请已经退款。', 0);
  const redemptions = wallet.redemptions.map((item) => item.id === input.id
    ? { ...item, status: 'cancelled' as const, resolvedAt: now.toISOString() }
    : item);
  const entry = makeEntry(refundActionId, 'redemption_refund', REWARD_COST_UNITS, now, {
    referenceId: redemption.id,
    rewardName: redemption.rewardName,
  });
  return result(withEntry({ ...base, pointsWallet: { ...wallet, redemptions } }, entry), true, '申请已取消，退回 15 积分。', 15);
}

export function isPerfectFirstAnswerLesson(state: GameState, lesson: TodayLesson): boolean {
  const base = ensurePointsState(state);
  if (!lesson || lesson.completed !== true || !lesson.lessonId) return false;
  const coreSteps = lesson.steps.filter((step) => (CORE_ROLES as readonly string[]).includes(step.role || ''));
  if (coreSteps.length !== CORE_ROLES.length || new Set(coreSteps.map((step) => step.role)).size !== CORE_ROLES.length) return false;
  if (coreSteps.some((step) => step.status !== 'completed' || !step.questionInstanceId)) return false;
  const firstAttempts = new Map<string, boolean>();
  const answerEvents = (base.learningEvents || []).map((event, index) => ({ event, index }))
    .filter(({ event }) => event.eventType === 'attempt_submitted' && event.source !== 'transfer' && Boolean(event.questionInstanceId))
    .sort((left, right) => left.event.timestamp.localeCompare(right.event.timestamp) || left.index - right.index)
    .map(({ event }) => event);
  for (const event of answerEvents) {
    if (event.firstAttemptKnown !== true) {
      if (!firstAttempts.has(event.questionInstanceId)) firstAttempts.set(event.questionInstanceId, false);
      continue;
    }
    if (!firstAttempts.has(event.questionInstanceId)) firstAttempts.set(event.questionInstanceId, event.result === 'correct');
  }
  const walletInitializedAt = base.pointsWallet!.initializedAt;
  const lessonCompletionEvidence = (base.learningEvents || []).some((event) => event.eventType === 'lesson_completed'
    && event.lessonId === lesson.lessonId && Number.isFinite(Date.parse(event.timestamp))
    && Date.parse(event.timestamp) >= Date.parse(walletInitializedAt));
  return lessonCompletionEvidence && coreSteps.every((step) => firstAttempts.get(step.questionInstanceId!) === true);
}

function withEntry(state: GameState, entry: PointEntry): GameState {
  const wallet = ensurePointsState(state).pointsWallet!;
  return { ...state, stars: 0, pointsWallet: { ...wallet, ledger: [...wallet.ledger, entry] } };
}

function makeEntry(actionId: string, type: PointEntry['type'], unitsDelta: number, now: Date, extra: Partial<PointEntry> = {}): PointEntry {
  return { id: actionId, actionId, type, unitsDelta, createdAt: now.toISOString(), ...extra };
}

function result(state: GameState, ok: boolean, message: string, pointsDelta: number): PointsResult {
  return { state: { ...state, stars: 0 }, ok, message, pointsDelta };
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hasAction(state: GameState, actionId: string): boolean {
  return Boolean(state.pointsWallet?.ledger.some((item) => item.actionId === actionId));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
