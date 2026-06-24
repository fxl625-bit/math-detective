/**
 * 数据导出模块 (v2.8.4 新增)
 *
 * 核心原则：
 * 1. 完全只读 — 不修改任何 localStorage 数据
 * 2. 深拷贝 — 不持有原始对象引用
 * 3. 不触发 migration — 不调用任何会修改状态的函数
 * 4. 不改变 rewardClaimed / rewardShown / streak / stars / mistakes
 */

import { APP_VERSION } from './appVersion';

// ========== 导出结构类型 ==========

export interface ExportDeviceInfo {
  userAgent: string;
  timezone: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
}

export interface ExportData {
  learningState: Record<string, unknown> | null;
  todayLesson: Record<string, unknown> | null;
  mistakes: unknown[] | null;
  rewards: Record<string, unknown> | null;
  parentRewards: unknown[] | null;
  avatar: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  reports: unknown[];
}

export interface ExportPayload {
  appName: string;
  appVersion: string;
  exportedAt: string;
  stateVersion: string;
  deviceInfo: ExportDeviceInfo;
  data: ExportData;
  checksum: string;
  /** 导出时各数据项的摘要（不含敏感字段） */
  summary: ExportSummary;
}

export interface ExportSummary {
  stars: number;
  streak: number;
  totalCompleted: number;
  correctCount: number;
  mistakesCount: number;
  completedLessons: number;
  lastPlayDate: string;
  dataKeys: string[];
  estimatedSizeBytes: number;
}

// ========== localStorage key 白名单 ==========

const LS_KEYS = {
  state: 'math-detective-state',
  todayLesson: 'math-detective-today-lesson',
  stateVersion: 'math-detective-state-version',
  appVersion: 'math-detective-app-version',
} as const;

// ========== 简单 checksum ==========

function simpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 转为无符号 16进制
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ========== 深拷贝（避免持有原始引用） ==========

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

// ========== 安全读取 localStorage（只读，不修改） ==========

function safeReadLocalStorage(key: string): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return deepClone(JSON.parse(raw));
  } catch {
    return null;
  }
}

function safeReadLocalStorageRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// ========== 获取设备信息 ==========

function getDeviceInfo(): ExportDeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      timezone: 'UTC',
      language: 'zh-CN',
      screenWidth: 0,
      screenHeight: 0,
    };
  }
  return {
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    language: navigator.language || 'zh-CN',
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
  };
}

// ========== 计算数据摘要 ==========

function computeSummary(
  learningState: Record<string, unknown> | null,
  todayLesson: Record<string, unknown> | null,
  mistakes: unknown[] | null,
  jsonSize: number
): ExportSummary {
  const stars = typeof learningState?.stars === 'number' ? learningState.stars : 0;
  const streak = typeof learningState?.streak === 'number' ? learningState.streak : 0;
  const totalCompleted = typeof learningState?.totalCompleted === 'number' ? learningState.totalCompleted : 0;
  const correctCount = typeof learningState?.correctCount === 'number' ? learningState.correctCount : 0;
  const lastPlayDate = typeof learningState?.lastPlayDate === 'string' ? learningState.lastPlayDate : '';

  const mistakesInState = Array.isArray(learningState?.mistakes) ? (learningState.mistakes as unknown[]).length : 0;
  const mistakesCount = mistakes ? mistakes.length : mistakesInState;

  const lessonSteps: unknown[] = Array.isArray(todayLesson?.steps) ? todayLesson.steps : [];
  const completedLessons = lessonSteps.filter((s) => (s as { status?: string })?.status === 'completed').length;

  const dataKeys: string[] = [];
  if (learningState) dataKeys.push('learningState');
  if (todayLesson) dataKeys.push('todayLesson');
  if (mistakesCount > 0) dataKeys.push('mistakes');

  return {
    stars,
    streak,
    totalCompleted,
    correctCount,
    mistakesCount,
    completedLessons,
    lastPlayDate,
    dataKeys,
    estimatedSizeBytes: jsonSize,
  };
}

// ========== 主函数：创建只读快照 ==========

/**
 * 创建完整数据快照。
 *
 * 此函数：
 * - 只读取 localStorage，不修改任何 key
 * - 对所有数据进行深拷贝
 * - 不触发 migration 或版本升级
 * - 不改变 rewardClaimed / rewardShown / streak / stars
 */
export function createDataSnapshot(): ExportPayload {
  const exportedAt = new Date().toISOString();

  // 读取各数据块（只读）
  const learningState = safeReadLocalStorage(LS_KEYS.state) as Record<string, unknown> | null;
  const todayLesson = safeReadLocalStorage(LS_KEYS.todayLesson) as Record<string, unknown> | null;
  const stateVersionRaw = safeReadLocalStorageRaw(LS_KEYS.stateVersion) || '';
  const appVersionInStorage = safeReadLocalStorageRaw(LS_KEYS.appVersion) || '';

  // 从 learningState 中提取子字段（继续深拷贝）
  const mistakes = Array.isArray(learningState?.mistakes)
    ? deepClone(learningState.mistakes as unknown[])
    : null;

  const parentRewards = Array.isArray(learningState?.parentRewards)
    ? deepClone(learningState.parentRewards as unknown[])
    : null;

  const rewards: Record<string, unknown> | null = learningState ? {
    rewardRedemptions: deepClone(learningState.rewardRedemptions) || [],
    stars: learningState.stars,
    level: learningState.level,
    badges: deepClone(learningState.badges) || [],
    collectibleCards: deepClone(learningState.collectibleCards) || [],
  } : null;

  const avatar: Record<string, unknown> | null = learningState ? {
    decorations: deepClone(learningState.decorations) || [],
    collectibleCards: deepClone(learningState.collectibleCards) || [],
  } : null;

  const parentSettings = learningState?.parentSettings as { gradeBand?: string; dailyGoal?: number } | undefined;
  const settings: Record<string, unknown> | null = learningState ? {
    parentSettings: deepClone(learningState.parentSettings),
    gradeBand: parentSettings?.gradeBand || 'G1',
    dailyGoal: parentSettings?.dailyGoal || 5,
  } : null;

  const data: ExportData = {
    learningState: learningState ? deepClone(learningState) : null,
    todayLesson: todayLesson ? deepClone(todayLesson) : null,
    mistakes,
    rewards,
    parentRewards,
    avatar,
    settings,
    reports: [], // 暂无服务端 reports，预留字段
  };

  // 构建核心 payload（不含 checksum，用于计算 checksum）
  const corePayload = {
    appName: 'Math Detective',
    appVersion: APP_VERSION,
    exportedAt,
    stateVersion: stateVersionRaw || appVersionInStorage || 'unknown',
    deviceInfo: getDeviceInfo(),
    data,
  };

  const coreJson = JSON.stringify(corePayload);
  const checksum = simpleChecksum(coreJson);
  const jsonSize = new Blob([coreJson]).size;

  const summary = computeSummary(learningState, todayLesson, mistakes, jsonSize);

  return {
    ...corePayload,
    checksum,
    summary,
  };
}

// ========== 文件名生成 ==========

export function generateExportFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `math-detective-backup-${yyyy}${mm}${dd}-${hh}${min}.json`;
}

// ========== 下载辅助 ==========

export function downloadExportFile(payload: ExportPayload): { filename: string; sizeBytes: number } {
  if (typeof window === 'undefined') {
    throw new Error('downloadExportFile must be called in browser');
  }

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = generateExportFilename();

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, sizeBytes: blob.size };
}

// ========== 剪贴板复制辅助 ==========

export async function copyExportToClipboard(payload: ExportPayload): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const json = JSON.stringify(payload, null, 2);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    // 降级：选中文本手动复制
    return false;
  }
}

// ========== 数据大小估算 ==========

export function estimateLocalStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  try {
    for (const key of Object.values(LS_KEYS)) {
      const val = localStorage.getItem(key);
      if (val) total += new Blob([key, val]).size;
    }
  } catch {
    // ignore
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
