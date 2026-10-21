'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, Calculator, Check, Coins, Gift, Play, Settings2, ShieldCheck } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import DetectiveMascot from '@/components/DetectiveMascot';
import LevelBadge from '@/components/LevelBadge';
import PageContainer from '@/components/layout/PageContainer';
import LearningSettingsPanel from '@/components/LearningSettingsPanel';
import { getLevelInfo, getStorageRecoveryStatus, getWeekStreakStatus } from '@/lib/storage';
import { getTodayLesson, getCurrentStep, hasLessonStarted } from '@/lib/lessonPlanner';
import { normalizeLearningSettingsFromParent } from '@/lib/learningSettings';
import { learningUnits } from '@/lib/curriculum/learningPath';
import { getPointsBalance } from '@/lib/familyPoints';
import { getDetectiveLevel } from '@/lib/achievements';
import type { LearningSettings, TodayLesson } from '@/lib/types';

const gradeNames: Record<LearningSettings['grade'], string> = {
  G1: '一年级', G2: '二年级', G3: '三年级', G4: '四年级', G5: '五年级', G6: '六年级',
};
const roleNames: Record<string, string> = {
  due_review: '热身回顾', current_concept: '学会方法', same_skill_variant: '换个问法',
  application: '生活应用', stretch: '提高挑战', olympiad: '思维探案（奥数）',
};

function settingsFromLesson(lesson: TodayLesson, current: LearningSettings): LearningSettings {
  if (lesson.settingSnapshot) return { ...current, ...lesson.settingSnapshot };
  const legacy = (lesson as TodayLesson & { curriculumSnapshot?: { grade?: number; semester?: string; unitId?: string } }).curriculumSnapshot;
  if (legacy?.grade && legacy.grade >= 1 && legacy.grade <= 6) {
    return {
      ...current,
      grade: `G${legacy.grade}` as LearningSettings['grade'],
      semester: legacy.semester === 'lower' || legacy.semester === 'upper' ? legacy.semester : current.semester,
      unitId: legacy.unitId ?? null,
    };
  }
  return current;
}

function SettingsSummary({ current, lessonSettings, courseStatus, lessonScopeKnown }: { current: LearningSettings; lessonSettings: LearningSettings; courseStatus: 'not-started' | 'in-progress' | 'completed'; lessonScopeKnown: boolean }) {
  const activeUnit = learningUnits.find((unit) => unit.id === lessonSettings.unitId);
  const nextUnit = learningUnits.find((unit) => unit.id === current.unitId);
  const changed = !lessonScopeKnown || lessonSettings.grade !== current.grade || lessonSettings.semester !== current.semester || lessonSettings.unitId !== current.unitId
    || lessonSettings.challengePreference !== current.challengePreference || lessonSettings.dailyGoal !== current.dailyGoal
    || JSON.stringify(lessonSettings.learnedTableRange) !== JSON.stringify(current.learnedTableRange);
  if (!changed) return null;
  return (
    <div className="mt-2 grid gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs sm:grid-cols-2 sm:text-sm">
      <p className="text-stone-700"><strong>正在学习：</strong>{lessonScopeKnown ? `${gradeNames[lessonSettings.grade]} · ${activeUnit?.title ?? '学习单元未指定'}` : '旧课程范围未知'}</p>
      <p className="text-amber-900"><strong>{courseStatus === 'in-progress' ? '完成本课后使用：' : '下一课使用：'}</strong>{gradeNames[current.grade]} · {nextUnit?.title ?? '选择学习单元'}；练习设置将按新选择生效。</p>
    </div>
  );
}

export default function DashboardPage() {
  const { state, claimDailyCheckin, saveParentSettings } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  const settings = useMemo(() => normalizeLearningSettingsFromParent(state.parentSettings), [state.parentSettings]);
  const defaultUnit = learningUnits.find((unit) => unit.grade === settings.grade);
  const displaySettings = settings.unitId ? settings : { ...settings, unitId: defaultUnit?.id ?? null };
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="flex min-h-[55vh] items-center justify-center px-4"><div className="text-center"><div className="mb-3 text-4xl" aria-hidden="true">🔍</div><p className="font-bold text-amber-800">小侦探正在准备课程…</p></div></div>;
  }

  const detectiveLevel = getDetectiveLevel(state);
  const levelInfo = getLevelInfo(detectiveLevel);
  const lesson = getTodayLesson();
  const currentStep = getCurrentStep(lesson);
  const lessonSettings = settingsFromLesson(lesson, displaySettings);
  const lessonScopeKnown = Boolean(lesson.settingSnapshot || (lesson as TodayLesson & { curriculumSnapshot?: { grade?: number } }).curriculumSnapshot?.grade);
  const completedCount = lesson.steps.filter((step) => step.status === 'completed').length;
  const lessonDone = lesson.completed || (lesson.steps.length > 0 && completedCount === lesson.steps.length);
  const courseStarted = hasLessonStarted(lesson);
  const courseStatus = lessonDone ? 'completed' : courseStarted ? 'in-progress' : 'not-started';
  const weekStatus = getWeekStreakStatus(state);
  const storageRecovery = getStorageRecoveryStatus();
  const configuredUnit = learningUnits.find((unit) => unit.id === displaySettings.unitId);
  const activeUnit = learningUnits.find((unit) => unit.id === lessonSettings.unitId);

  function checkIn() {
    const result = claimDailyCheckin();
    setCheckinMessage(result.ok ? '签到完成，获得 0.5 积分。' : result.message);
  }

  return (
    <PageContainer className="max-w-6xl space-y-3 sm:space-y-6" bottomPadding>
      <header className="flex items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-white px-3 py-2 shadow-sm sm:rounded-3xl sm:px-6 sm:py-4">
        <div className="min-w-0">
          <p className="hidden text-sm font-bold text-amber-700 sm:block">数学侦探训练站</p>
          <h1 className="text-lg font-extrabold tracking-tight text-stone-900 sm:mt-1 sm:text-3xl">🔍 傅星扬的数学侦探</h1>
          <p className="mt-0.5 text-xs text-stone-600 sm:mt-1 sm:text-sm">看清线索，想出方法。</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span data-testid="points-balance" className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-sm font-bold text-amber-900 sm:px-3 sm:py-2"><Coins size={16} />{getPointsBalance(state)} 积分</span>
          <span className="hidden sm:inline-flex"><LevelBadge level={detectiveLevel} name={levelInfo.name} icon={levelInfo.icon} /></span>
        </div>
      </header>

      {storageRecovery && (
        <div role="alert" data-testid="storage-recovery-warning" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900">
          <p className="font-bold">{storageRecovery === 'corrupt' ? '本机学习数据读取损坏' : '浏览器本机存储暂不可用'}</p>
          <p className="mt-1 text-sm">{storageRecovery === 'corrupt'
            ? '原始数据已保留，恢复前不会用空白数据覆盖。请先备份或恢复可读取的数据。'
            : '当前无法读取或保存学习记录。请检查浏览器存储权限后重试；未保存的练习不会计入记录。'}</p>
        </div>
      )}

      <section className="rounded-2xl border border-amber-200 bg-white px-3 py-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 sm:text-xs">当前学习范围</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-stone-900 sm:mt-1 sm:text-lg">{gradeNames[settings.grade]}{configuredUnit ? ` · ${configuredUnit.title}` : ' · 学习单元未指定'}</p>
          </div>
          <button data-testid="learning-settings-toggle" type="button" aria-expanded={settingsOpen} aria-controls="learning-settings-panel" onClick={() => setSettingsOpen((value) => !value)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2 text-sm font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:min-h-12 sm:gap-2 sm:px-4">
            <Settings2 size={17} />设置
          </button>
        </div>
        <SettingsSummary current={displaySettings} lessonSettings={lessonSettings} courseStatus={courseStatus} lessonScopeKnown={lessonScopeKnown} />
        {settingsOpen && <div id="learning-settings-panel" className="mt-4"><LearningSettingsPanel settings={displaySettings} courseStatus={courseStatus} onSave={saveParentSettings} onClose={() => setSettingsOpen(false)} /></div>}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="today-lesson-title" className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-white to-amber-50 p-4 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-700">今日训练 · {lesson.date}</p>
              <h2 id="today-lesson-title" className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">{activeUnit?.title ?? '今日数学任务'}</h2>
              <p className="mt-1 text-sm text-stone-600">{lessonDone ? '本课任务已全部完成。' : currentStep ? `接下来：${currentStep.title}` : '准备好开始今天的练习。'}</p>
            </div>
            <div className="shrink-0"><DetectiveMascot mood={lessonDone ? 'excited' : 'happy'} showMessage={false} size="md" /></div>
          </div>

          <div data-testid="lesson-progress" className="mt-3 sm:mt-6">
            <div className="flex items-center justify-between text-sm font-bold text-stone-700"><span>本课任务进度</span><span>{completedCount} / {lesson.steps.length}</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-label="本课任务进度" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={lesson.steps.length}>
              <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${lesson.steps.length ? Math.round(completedCount / lesson.steps.length * 100) : 0}%` }} />
            </div>
          </div>

          {!lessonDone ? (
            <a data-testid="start-lesson" href="/play" className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-amber-600 px-5 py-3 text-lg font-extrabold text-white shadow-sm hover:bg-amber-700 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:mt-6">
              <Play size={23} fill="currentColor" />{completedCount > 0 ? `继续第 ${completedCount + 1} 题` : '开始今日任务'}<ArrowRight size={21} />
            </a>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="inline-flex items-center gap-2 font-bold text-green-800"><ShieldCheck size={20} />今日课程已完成</p>
              <a href={settings.dailyGoal > 6 ? `/mental-math?count=${Math.min(30, Math.max(1, settings.dailyGoal - 6))}` : '/mental-math'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-green-300 bg-white px-4 font-bold text-green-800 hover:bg-green-100">
                {settings.dailyGoal > 6 ? `自选加练 ${Math.min(30, settings.dailyGoal - 6)} 题` : '自选口算练习'}<ArrowRight size={17} />
              </a>
            </div>
          )}

          <ol className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-3">
            {lesson.steps.map((step, index) => {
              const done = step.status === 'completed';
              const active = step.status === 'current';
              const label = roleNames[step.role ?? ''] ?? step.title;
              return <li key={step.id} className={`flex min-h-12 items-center gap-2 rounded-xl border px-2 py-2 sm:min-h-14 sm:gap-3 sm:px-3 ${done ? 'border-green-200 bg-green-50 text-green-900' : active ? 'border-amber-400 bg-amber-50 font-bold text-amber-950 ring-1 ring-amber-300' : 'border-stone-200 bg-white text-stone-500'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-green-600 text-white' : active ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600'}`}>{done ? <Check size={17} /> : index + 1}</span>
                <span className="text-sm">{label}</span>
                <span className="sr-only">{done ? '已完成' : active ? '进行中' : '未开始'}</span>
              </li>;
            })}
          </ol>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm" aria-labelledby="weekly-title">
            <h2 id="weekly-title" className="font-extrabold text-stone-900">学习日历</h2>
            <p className="mt-1 text-sm text-stone-600">连续学习 {state.streak} 天</p>
            <div className="mt-3 grid grid-cols-7 gap-1" aria-label="最近一周学习记录">
              {weekStatus.map((done, index) => <span key={index} className={`grid aspect-square place-items-center rounded-lg text-xs font-bold ${done ? 'bg-orange-100 text-orange-800' : 'bg-stone-100 text-stone-400'}`} aria-label={`第${index + 1}天${done ? '已学习' : '未记录'}`}>{done ? '✓' : '·'}</span>)}
            </div>
            <button type="button" onClick={checkIn} className="mt-4 min-h-11 w-full rounded-xl border border-orange-200 bg-orange-50 px-3 font-bold text-orange-900 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">每日签到 · +0.5 积分</button>
            {checkinMessage && <p role="status" className="mt-2 text-center text-xs text-stone-600">{checkinMessage}</p>}
          </section>

          <nav aria-label="更多学习入口" className="rounded-3xl border border-stone-200 bg-white p-2 shadow-sm">
            <a href="/mental-math" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-stone-700 hover:bg-amber-50"><Calculator size={19} className="text-amber-700" />口算练习</a>
            <a href="/mistakes" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-stone-700 hover:bg-blue-50"><BookOpen size={19} className="text-blue-700" />错题本</a>
            <a href="/rewards" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-stone-700 hover:bg-pink-50"><Gift size={19} className="text-pink-700" />奖励中心</a>
            <a href="/parent-report" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-stone-700 hover:bg-green-50"><BarChart3 size={19} className="text-green-700" />家长报告</a>
          </nav>
          <p className="px-2 text-center text-xs leading-5 text-stone-500">学习记录保存在这台设备，可通过数据备份转移。</p>
        </aside>
      </div>
    </PageContainer>
  );
}
