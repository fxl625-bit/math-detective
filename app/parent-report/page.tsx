'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Target, TrendingUp, Lightbulb, Settings, Brain, GraduationCap, Bug, Download, Copy, FileText, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import type { GradeBand, TodayLesson } from '@/lib/types';
import { getCognitiveSkillLabel } from '@/lib/learningLabels';
import { getKnowledgePointsForGrade } from '@/lib/curriculum/curriculumMap';
import StarDisplay from '@/components/StarDisplay';
import StreakDisplay from '@/components/StreakDisplay';
import LevelBadge from '@/components/LevelBadge';
import ProgressBar from '@/components/ProgressBar';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import PageContainer from '@/components/layout/PageContainer';
import { getLevelInfo } from '@/lib/storage';
import { getStoredTodayLesson } from '@/lib/lessonPlanner';
import { getQuestionById, questionsByGrade } from '@/data/questions';
import { validateStepQuestionMatch } from '@/lib/questionValidation';
import { getRepairAttemptsSnapshot, getRepairRecordsSnapshot } from '@/lib/lessonTransaction';
import { classifyKeyword } from '@/data/keywordRules';
import { createDataSnapshot, downloadExportFile, copyExportToClipboard, estimateLocalStorageSize, formatBytes, type ExportPayload } from '@/lib/dataExport';
import { detectUsageStage, buildLearnerProfile, initCurriculumProfile } from '@/lib/learnerProfile';
import type { TextbookEdition, SkillId } from '@/lib/curriculum/types';
import { buildWeeklyReport, OPERATION_LABELS } from '@/lib/mentalMath';
import DataTransferPanel from '@/components/DataTransferPanel';
import OfflineSupport from '@/components/OfflineSupport';
import LearningSettingsPanel from '@/components/LearningSettingsPanel';
import { normalizeLearningSettingsFromParent } from '@/lib/learningSettings';
import { learningUnits } from '@/lib/curriculum/learningPath';
import { reduceLearningMetrics, type SkillLearningMetric } from '@/lib/learningMetrics';
import { getPointsBalance } from '@/lib/familyPoints';

const GRADE_OPTIONS: { value: GradeBand; label: string }[] = [
  { value: 'G1', label: '一年级' },
  { value: 'G2', label: '二年级' },
  { value: 'G3', label: '三年级' },
  { value: 'G4', label: '四年级' },
  { value: 'G5', label: '五年级' },
  { value: 'G6', label: '六年级' },
];

const TEXTBOOK_OPTIONS: { value: TextbookEdition; label: string }[] = [
  { value: 'PEP', label: '人教版 (PEP)' },
  { value: 'BNUP', label: '北师大版' },
  { value: 'XISHi', label: '西师大版' },
  { value: 'generic_cn', label: '通用版' },
];

function getHistoricalSkillLabel(skillId: string): string {
  for (let grade = 1; grade <= 6; grade += 1) {
    for (const semester of ['lower', 'upper'] as const) {
      const match = getKnowledgePointsForGrade(grade, semester).find((point) => point.id === skillId);
      if (match) return match.name;
    }
  }
  return '历史知识点（名称待补全）';
}

const ROLE_LABELS: Record<string, string> = {
  foundation: '基础', application: '应用', advanced: '提高', olympiad: '奥数', unknown: '角色未知',
  due_review: '回顾', current_concept: '方法学习', same_skill_variant: '同技能变式', stretch: '提高挑战',
};

function groupLearningMetrics(metrics: SkillLearningMetric[]) {
  const groups = new Map<string, { grade: string; semester: string; unitId: string | null; metrics: SkillLearningMetric[] }>();
  for (const metric of metrics) {
    const key = `${metric.grade}:${metric.semester}:${metric.unitId ?? 'unknown'}`;
    const group = groups.get(key) ?? { grade: metric.grade, semester: metric.semester, unitId: metric.unitId, metrics: [] };
    group.metrics.push(metric);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.grade.localeCompare(b.grade) || (a.unitId ?? '').localeCompare(b.unitId ?? '') || a.semester.localeCompare(b.semester));
}

export default function ParentReportPage() {
  const { state, saveParentSettings } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showScoreDiag, setShowScoreDiag] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [debugLesson, setDebugLesson] = useState<TodayLesson | null>(null);
  const [exportPayload, setExportPayload] = useState<ExportPayload | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  const [showSkillProgress, setShowSkillProgress] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-4 animate-bounce-gentle">📊</div><p className="text-green-600 font-bold">正在加载报告...</p></div></div>;

  const levelInfo = getLevelInfo(state.level);

  // Only the first actual submission for each question instance counts. Old
  // attemptRecords may retain a retry while losing the original first answer.
  const uniqueEvents = [...new Map((state.learningEvents || []).map(event => [event.eventId, event])).values()]
    .filter(event => event.eventType === 'attempt_submitted' && event.result && event.firstAttemptKnown !== false)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const firstByInstance = new Map<string, (typeof uniqueEvents)[number]>();
  uniqueEvents.forEach(event => { if (!firstByInstance.has(event.questionInstanceId)) firstByInstance.set(event.questionInstanceId, event); });
  const firstAttempts = [...firstByInstance.values()];
  const totalAttempts = firstAttempts.length;
  const correctAttempts = firstAttempts.filter(event => event.result === 'correct').length;
  const overallAccuracy = totalAttempts ? Math.round(correctAttempts / totalAttempts * 100) : 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7Days = firstAttempts.filter(event => new Date(event.timestamp).getTime() >= sevenDaysAgo);
  const last7DaysTotalAttempts = last7Days.length;
  const last7DaysCorrectAttempts = last7Days.filter(event => event.result === 'correct').length;
  const last7DaysAccuracy = last7DaysTotalAttempts ? Math.round(last7DaysCorrectAttempts / last7DaysTotalAttempts * 100) : 0;
  const reportLesson = getStoredTodayLesson();
  const settings = normalizeLearningSettingsFromParent(state.parentSettings);
  const activeUnit = learningUnits.find(unit => unit.id === settings.unitId);
  const lessonDone = Boolean(reportLesson?.completed || (reportLesson?.steps.length && reportLesson.steps.every(step => step.status === 'completed')));
  const lessonStarted = Boolean(reportLesson && (reportLesson.currentStepIndex > 0 || reportLesson.steps.some((step, index) =>
    step.status === 'completed' || step.awardedAt != null || (index === reportLesson.currentStepIndex && step.currentPhaseIndex > 0))));
  const courseStatus = lessonDone ? 'completed' : lessonStarted ? 'in-progress' : 'not-started';
  const legacySnapshot = (reportLesson as TodayLesson & { curriculumSnapshot?: { grade?: number; semester?: string; unitId?: string } } | null)?.curriculumSnapshot;
  const lessonGrade = reportLesson?.settingSnapshot?.grade ?? (legacySnapshot?.grade ? `G${legacySnapshot.grade}` : null);
  const lessonSemester = reportLesson?.settingSnapshot?.semester ?? legacySnapshot?.semester ?? null;
  const lessonUnitId = reportLesson?.settingSnapshot?.unitId ?? legacySnapshot?.unitId ?? null;
  const lessonUnit = learningUnits.find(unit => unit.id === lessonUnitId);
  const legacyScopeUnknown = Boolean(reportLesson && !reportLesson.settingSnapshot);
  const scopeChanged = Boolean(reportLesson && (legacyScopeUnknown || lessonGrade === null || lessonGrade !== settings.grade || lessonSemester !== settings.semester
    || lessonUnitId !== settings.unitId || (reportLesson.settingSnapshot && (
      reportLesson.settingSnapshot.challengePreference !== settings.challengePreference
      || reportLesson.settingSnapshot.dailyGoal !== settings.dailyGoal
      || JSON.stringify(reportLesson.settingSnapshot.learnedTableRange) !== JSON.stringify(settings.learnedTableRange)))));
  const eventMetrics = Object.values(reduceLearningMetrics(state.learningEvents || []));
  const metricGroups = groupLearningMetrics(eventMetrics);
  const lessonEvents = (state.learningEvents || []).filter(event => event.lessonId === reportLesson?.lessonId);
  const completedInstances = new Set(lessonEvents.filter(event => event.eventType === 'question_completed').map(event => event.questionInstanceId));
  const lessonCompletedTasks = reportLesson?.steps.filter(step => step.status === 'completed' || Boolean(step.awardedAt)
    || Boolean(step.questionInstanceId && completedInstances.has(step.questionInstanceId))).length || 0;
  const firstAnswerSamples = new Set(lessonEvents.filter(event => event.eventType === 'attempt_submitted' && event.firstAttemptKnown !== false)
    .map(event => event.questionInstanceId)).size;
  const lessonTaskTarget = reportLesson ? Math.max(6, reportLesson.steps.length) : 6;
  const errorTypes = state.mistakes.reduce<Record<string, number>>((acc, m) => {
    acc[m.errorType] = (acc[m.errorType] || 0) + 1;
    return acc;
  }, {});

  // Skill-based error tracking
  const skillMistakes = state.skillMistakes || {};

  // Suggestions (v2.6.8: 使用 overallAccuracy 替代旧 correctRate)
  const suggestions: string[] = [];
  if (overallAccuracy < 60 && state.totalCompleted >= 5) suggestions.push('建议从基础关卡重新巩固，降低难度后再逐步提升。');
  if (errorTypes['动作词识别错误'] && errorTypes['动作词识别错误'] > 2) suggestions.push('孩子在"加减法关键词"识别上需要加强，可以多做"找动作词"关卡。');
  if (errorTypes['干扰信息判断错误'] && errorTypes['干扰信息判断错误'] > 1) suggestions.push('孩子容易被题目的无关信息干扰，建议多练习"擦掉废话"关卡。');
  if (state.streak < 3 && state.totalCompleted >= 5) suggestions.push('建议鼓励孩子每天坚持完成关卡任务，养成习惯比数量更重要。');
  if (Object.keys(skillMistakes).length > 0) {
    const topWeak = Object.entries(skillMistakes).sort((a, b) => b[1] - a[1])[0];
    if (topWeak && topWeak[1] >= 3) {
      suggestions.push(`弱项技能"${getCognitiveSkillLabel(topWeak[0])}"需重点练习，已累计${topWeak[1]}次错误。`);
    }
  }
  if (suggestions.length === 0 && state.totalCompleted >= 5) suggestions.push('孩子表现不错！继续保持每天练习的习惯。');
  if (state.totalCompleted < 5) suggestions.push('刚开始使用，数据积累中。坚持一周后查看详细分析。');

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-green-800">📊 家长报告</h1>
        <button type="button" aria-label="学习设置" aria-expanded={showSettings} className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          onClick={() => setShowSettings(!showSettings)}>
          <Settings size={20} className="text-gray-600" />
        </button>
      </div>

      {showSettings && <LearningSettingsPanel settings={settings} courseStatus={courseStatus} onSave={saveParentSettings} onClose={() => setShowSettings(false)} />}

      {/* Current grade info */}
      <AppCard variant="purple">
        <div className="flex items-center gap-2 flex-wrap">
          <GraduationCap size={20} className="text-purple-600" />
          <span className="text-sm font-bold text-purple-800">
            新课程设置：{GRADE_OPTIONS.find(g => g.value === settings.grade)?.label || '未设置'} · {activeUnit?.title || '单元未指定'}
          </span>
          {state.curriculumProfile && (
            <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
              {settings.semester === 'lower' ? '下学期' : '上学期'}{settings.semesterSource === 'auto' ? '（自动）' : '（手动）'}
              {' · '}
              {TEXTBOOK_OPTIONS.find(t => t.value === (state.curriculumProfile as any)?.textbookEdition)?.label || '通用版'}
            </span>
          )}
          {state.usageStage !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              state.usageStage >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              使用阶段 {state.usageStage}
            </span>
          )}
        </div>
        {reportLesson && <p className="mt-2 text-xs text-purple-700">{legacyScopeUnknown ? '旧课程的完整设置快照未知；新选择会用于新课程。' : scopeChanged ? courseStatus === 'not-started' ? '本课尚未开始，新选择可立即用于准备课程。' : '当前课仍按创建时的范围学习；新设置将在下一课生效。' : '当前课与新课程设置一致。'}</p>}
      </AppCard>

      {/* Today */}
      <AppCard variant="green">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <Target size={20} className="text-green-600" />今日学习情况
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <div className="text-3xl font-extrabold text-amber-600">{lessonCompletedTasks}/{lessonTaskTarget}</div>
            <div className="text-xs text-gray-500">本课任务完成</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <div data-testid="overall-first-answer-accuracy" className="text-3xl font-extrabold text-green-600">{totalAttempts ? `${overallAccuracy}%` : '—'}</div>
            <div className="text-xs text-gray-500">累计首答正确率（{correctAttempts}/{totalAttempts}）</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <div className="text-3xl font-extrabold text-blue-600">{last7DaysTotalAttempts ? `${last7DaysAccuracy}%` : '—'}</div>
            <div className="text-xs text-gray-500">7日首答正确率（{last7DaysCorrectAttempts}/{last7DaysTotalAttempts}）</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-gray-600">首答正确率按每道题第一次实际提交计算。旧版只保留最终答案的记录无法还原首答，已标为未知且不计入分母；完成率与首答正确率分别显示。</p>
        <div className="mt-3">
          <ProgressBar label="本课六个核心任务进度" value={lessonCompletedTasks} max={lessonTaskTarget}
            color="bg-gradient-to-r from-green-400 to-emerald-400" showPulse={lessonCompletedTasks >= 6} />
          {reportLesson && (
            <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-gray-600 space-y-1" data-testid="report-course-evidence">
              <p>本课创建时：{lessonGrade && GRADE_OPTIONS.find(g => g.value === lessonGrade)?.label || '年级未知'} · {lessonSemester === 'upper' ? '上学期' : lessonSemester === 'lower' ? '下学期' : '学期未知'} · {lessonUnit?.title || '单元未知'}</p>
              <p>下一课设置：{GRADE_OPTIONS.find(g => g.value === settings.grade)?.label || settings.grade} · {activeUnit?.title || '单元未指定'}{scopeChanged ? '（完成本课后生效）' : ''}</p>
              <p>不同题目数：{state.completedQuestions.length}　·　本课完成任务：{lessonCompletedTasks}/{lessonTaskTarget}　·　可信首答样本：{firstAnswerSamples}</p>
            </div>
          )}
        </div>
      </AppCard>

      <AppCard variant="blue">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold text-gray-800"><GraduationCap size={20} className="text-blue-600" />分年级与单元的学习证据</h2>
        <p className="mb-4 text-xs text-gray-600">首答率只使用有可信首答的题次；独立与辅助完成按完成事件统计。旧课程若没有事件，首答情况未知，不计为满分。</p>
        {metricGroups.length === 0 ? <p className="text-sm text-gray-500">尚无可核验的学习事件；旧记录的首答情况未知。</p> : (
          <div className="space-y-4" data-testid="learning-metrics-report">
            {metricGroups.map((group) => {
              const unit = learningUnits.find(item => item.id === group.unitId);
              const gradeLabel = GRADE_OPTIONS.find(item => item.value === group.grade)?.label ?? '年级未知';
              const semesterLabel = group.semester === 'upper' ? '上学期' : group.semester === 'lower' ? '下学期' : '学期未知';
              return <section key={`${group.grade}:${group.semester}:${group.unitId}`} className="rounded-xl border border-blue-100 bg-white p-3">
                <h3 className="mb-2 font-bold text-blue-900">{gradeLabel} · {unit?.title ?? '单元未知'} · {semesterLabel}</h3>
                <div className="space-y-2">
                  {group.metrics.sort((a, b) => a.role.localeCompare(b.role) || a.skillId.localeCompare(b.skillId)).map(metric => (
                    <div key={metric.metricId} className="rounded-lg bg-blue-50/60 p-2 text-sm text-gray-800">
                      <p className="font-semibold">{ROLE_LABELS[metric.role] ?? '角色未知'} · {metric.skillId.split(':').pop()?.replace(/-/g, ' ') || '技能未知'}</p>
                      <p className="text-xs text-gray-600">首答：{metric.firstAnswerCount ? `${Math.round((metric.firstTryAccuracy ?? 0) * 100)}%（${metric.firstCorrectCount}/${metric.firstAnswerCount}）` : '—（尚无可信首答）'}　独立完成：{metric.independentCompletions}　辅助完成：{metric.assistedCompletions}　完成题次：{metric.completedQuestionInstances}</p>
                    </div>
                  ))}
                </div>
              </section>;
            })}
          </div>
        )}
      </AppCard>

      {/* Overall stats */}
      <AppCard>
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-600" />整体数据
        </h2>
        <div className="space-y-3">
          <Row label="累计完成关数" value={`${state.totalCompleted} 关`} />
          <Row label="正确 / 错误" value={<span><span className="text-green-600">{state.correctCount}</span> / <span className="text-red-400">{state.wrongCount}</span></span>} />
          <Row label="连续打卡" value={<StreakDisplay streak={state.streak} size="sm" />} />
          <Row label="可信首答样本" value={`${totalAttempts} 题`} />
          <Row label="侦探等级" value={<LevelBadge level={state.level} name={levelInfo.name} icon={levelInfo.icon} size="sm" />} />
          <Row label="家庭积分" value={<StarDisplay count={getPointsBalance(state)} size="sm" />} />
          <Row label="获得徽章" value={<span className="font-extrabold text-purple-600">{state.badges.length} 枚</span>} />
        </div>
      </AppCard>

      {/* Error types */}
      <AppCard variant="gray">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-red-500" />常见错误类型
        </h2>
        {Object.keys(errorTypes).length === 0 ? (
          <p className="text-sm text-gray-500">暂无错误记录，继续保持！</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(errorTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 flex-1 truncate">{type}</span>
                <div className="flex-1"><ProgressBar value={count} max={state.wrongCount} color="bg-red-400" /></div>
                <span className="text-xs font-bold text-red-500 w-8 text-right">{count}次</span>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      {/* Historical mistake counts, separate from first-answer learning evidence. */}
      <AppCard variant="purple">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <Brain size={20} className="text-purple-500" />历史错误分布（非掌握度）
        </h2>
        <SkillRadarChart skillMistakes={skillMistakes} totalCompleted={state.totalCompleted} />
        {Object.values(skillMistakes).some(count => count > 0) && <p className="text-xs text-gray-500 text-center mt-2">图形只反映旧版已记录的错误次数，缺少每项练习总数，不能用于判断掌握程度。</p>}
      </AppCard>

      {/* v2.9.0: 学习进度面板 — 技能掌握情况 */}
      {state.learnerProfile && Object.keys(state.learnerProfile.skillMastery).length > 0 && (
        <AppCard variant="green">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
              <GraduationCap size={20} className="text-green-600" />历史能力进度（旧统计）
            </h2>
            <span className="text-xs text-gray-400">
              难度等级 {state.learnerProfile.currentDifficultyLevel}
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">此处沿用旧版累计能力口径，可能混合不同年级与单元；上方学习证据按课程事件区分范围。</p>
          <div className="space-y-2">
            {Object.entries(state.learnerProfile.skillMastery)
              .filter(([, m]: [string, any]) => m.attempts > 0)
              .sort(([, a]: [string, any], [, b]: [string, any]) => b.masteryScore - a.masteryScore)
              .slice(0, 12)
              .map(([skillId, mastery]: [string, any]) => (
                <div key={skillId} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1 truncate" title={skillId}>
                    {getHistoricalSkillLabel(skillId)}
                  </span>
                  <div className="flex-1">
                    <ProgressBar
                      value={Math.round(mastery.masteryScore * 100)}
                      max={100}
                      color={
                        mastery.status === 'mastered' ? 'bg-green-400'
                        : mastery.status === 'practicing' ? 'bg-blue-400'
                        : mastery.status === 'learning' ? 'bg-amber-400'
                        : 'bg-gray-300'
                      }
                    />
                  </div>
                  <span className={`text-[10px] font-bold w-12 text-right ${
                    mastery.status === 'mastered' ? 'text-green-600'
                    : mastery.status === 'practicing' ? 'text-blue-600'
                    : mastery.status === 'learning' ? 'text-amber-600'
                    : 'text-gray-400'
                  }`}>
                    {mastery.status === 'mastered' ? '已掌握' : mastery.status === 'practicing' ? '练习中' : mastery.status === 'learning' ? '学习中' : '未学习'}
                  </span>
                  <span className="text-[10px] text-gray-400 w-16 text-right">
                    {mastery.correct}/{mastery.attempts}
                  </span>
                </div>
              ))}
          </div>
        </AppCard>
      )}

      {/* v2.9.0: 题目分布诊断（最近30题） */}
      <AppCard variant="gray">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-gray-500" />题目分布诊断
          </h2>
          <button
            className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-200 hover:bg-gray-300 transition-colors"
            onClick={() => setShowSkillProgress(!showSkillProgress)}
          >
            {showSkillProgress ? '收起' : '展开'}
          </button>
        </div>
        {showSkillProgress && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 text-sm">
            <QuestionDistributionDiagnostic state={state} />
          </motion.div>
        )}
      </AppCard>

      {/* Weekly Trend */}
      {state.weeklySnapshots && state.weeklySnapshots.length > 0 && (
        <AppCard variant="blue">
          <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-blue-600" />每周趋势
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500">周</th>
                  <th className="text-center py-2 text-gray-500">正确</th>
                  <th className="text-center py-2 text-gray-500">错误</th>
                  <th className="text-center py-2 text-gray-500">正确率</th>
                </tr>
              </thead>
              <tbody>
                {state.weeklySnapshots.map((ws, i) => {
                  const weekTotal = ws.totalCorrect + ws.totalWrong;
                  const rate = weekTotal > 0 ? Math.round((ws.totalCorrect / weekTotal) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 text-gray-600">{ws.weekStart}</td>
                      <td className="text-center text-green-600 font-bold">{ws.totalCorrect}</td>
                      <td className="text-center text-red-400 font-bold">{ws.totalWrong}</td>
                      <td className="text-center font-bold" style={{ color: rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }}>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AppCard>
      )}

      {/* Skill tracking */}
      <AppCard variant="blue">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <Brain size={20} className="text-purple-500" />能力弱项追踪
        </h2>
        {Object.keys(skillMistakes).length === 0 ? (
          <p className="text-sm text-gray-500">暂无弱项数据。当孩子在特定能力上反复出错时，这里会显示需要加强的能力。</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(skillMistakes).sort((a, b) => b[1] - a[1]).map(([skill, count]) => (
              <div key={skill} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 flex-1">{getCognitiveSkillLabel(skill)}</span>
                <ProgressBar value={count} max={10} color={count >= 5 ? 'bg-red-400' : count >= 3 ? 'bg-amber-400' : 'bg-blue-400'} />
                <span className="text-xs font-bold text-red-500 w-8 text-right">{count}次</span>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      {/* Suggestions */}
      <AppCard variant="amber">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-3">
          <Lightbulb size={20} className="text-yellow-500" />学习建议
        </h2>
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700"><span>💡</span><span>{s}</span></li>
          ))}
        </ul>
      </AppCard>

      {/* v2.8.4: 积分诊断面板 */}
      <AppCard variant="amber">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />积分诊断
          </h2>
          <button
            className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 transition-colors"
            onClick={() => {
              if (!showScoreDiag) {
                const lesson = (() => { try { return getStoredTodayLesson(); } catch { return null; } })();
                setDebugLesson(lesson);
              }
              setShowScoreDiag(!showScoreDiag);
            }}
          >
            {showScoreDiag ? '收起' : '检查积分状态'}
          </button>
        </div>

        {showScoreDiag && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 text-sm">
            {/* 积分字段 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white rounded-lg">
                <div className="text-xs text-gray-500">家庭积分</div>
                <div className="text-xl font-extrabold text-amber-600">{getPointsBalance(state)}</div>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <div className="text-xs text-gray-500">level（等级）</div>
                <div className="text-xl font-extrabold text-purple-600">{state.level}</div>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <div className="text-xs text-gray-500">correctCount（答对总数）</div>
                <div className="text-xl font-extrabold text-green-600">{state.correctCount}</div>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <div className="text-xs text-gray-500">answerAttempts（提交总次数）</div>
                <div className="text-xl font-extrabold text-blue-600">{state.answerAttempts}</div>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <div className="text-xs text-gray-500">totalCompleted（历史完成）</div>
                <div className="text-xl font-extrabold text-gray-700">{state.totalCompleted}</div>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <div className="text-xs text-gray-500">completedToday（今日完成）</div>
                <div className="text-xl font-extrabold text-gray-700">{state.completedToday}</div>
              </div>
            </div>

            {/* 今日课程状态 */}
            {debugLesson && (
              <div className="p-3 bg-white rounded-lg space-y-1">
                <div className="text-xs font-bold text-gray-600 mb-1">今日课程状态</div>
                <ScoreDiagRow label="todayLesson.completed" value={String(debugLesson.completed)} ok={!debugLesson.completed || debugLesson.rewardClaimed === true} />
                <ScoreDiagRow label="todayLesson.rewardClaimed" value={String(debugLesson.rewardClaimed ?? 'undefined')} ok={debugLesson.rewardClaimed === true || !debugLesson.completed} />
                <ScoreDiagRow label="todayLesson.rewardShown" value={String(debugLesson.rewardShown ?? 'undefined')} ok />
                <ScoreDiagRow
                  label="rewardClaimed/rewardShown 一致性"
                  value={
                    debugLesson.rewardShown === true && debugLesson.rewardClaimed !== true
                      ? '⚠️ 异常：rewardShown=true 但 rewardClaimed=false'
                      : '✅ 正常'
                  }
                  ok={!(debugLesson.rewardShown === true && debugLesson.rewardClaimed !== true)}
                />
              </div>
            )}

            {/* 当前 step awarded 状态 */}
            {debugLesson && debugLesson.steps && (
              <div className="p-3 bg-white rounded-lg space-y-1">
                <div className="text-xs font-bold text-gray-600 mb-1">各 Step 幂等积分状态</div>
                {debugLesson.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${step.status === 'completed' ? 'bg-green-400' : step.status === 'current' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                    <span className="text-gray-600 flex-1 truncate">{step.type}</span>
                    {step.awardedAt
                      ? <span className="text-green-600 font-bold text-[10px]">已发 ✓</span>
                      : <span className="text-gray-400 text-[10px]">未发</span>
                    }
                  </div>
                ))}
              </div>
            )}

            {/* 近期答题记录 */}
            {state.attemptRecords && state.attemptRecords.length > 0 && (
              <div className="p-3 bg-white rounded-lg">
                <div className="text-xs font-bold text-gray-600 mb-1">最近 5 次答题记录</div>
                {[...state.attemptRecords].reverse().slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{r.isCorrect ? '✅' : '❌'}</span>
                    <span className="font-mono truncate">{r.questionId.slice(0, 12)}</span>
                    <span className="text-gray-400">{new Date(r.submittedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 诊断结论 */}
            <div className="p-3 bg-amber-50 rounded-lg text-xs space-y-1">
              <div className="font-bold text-amber-800">诊断结论</div>
              {state.answerAttempts === 0 && state.correctCount > 0 && (
                <div className="text-red-600">⚠️ answerAttempts=0 但 correctCount{'>'}0，统计数据可能异常</div>
              )}
              {state.correctCount > state.answerAttempts && (
                <div className="text-red-600">⚠️ correctCount {'>'} answerAttempts，数据不一致</div>
              )}
              {debugLesson?.completed && debugLesson.rewardClaimed !== true && (
                <div className="text-red-600">⚠️ 课程已完成但 rewardClaimed=false，每日奖励未发放</div>
              )}
              {debugLesson?.rewardShown === true && debugLesson.rewardClaimed !== true && (
                <div className="text-red-600">⚠️ rewardShown=true 但 rewardClaimed=false，需修复</div>
              )}
              {!(state.answerAttempts === 0 && state.correctCount > 0) &&
               !(state.correctCount > state.answerAttempts) &&
               !(debugLesson?.completed && debugLesson.rewardClaimed !== true) &&
               !(debugLesson?.rewardShown === true && debugLesson.rewardClaimed !== true) && (
                <div className="text-green-700">✅ 积分状态正常，未检测到已知异常</div>
              )}
            </div>
          </motion.div>
        )}
      </AppCard>

      {/* v2.6.9: 调试面板 — Step/Question/Theme 匹配信息 */}
      <AppCard variant="gray">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
            <Bug size={20} className="text-gray-500" />调试面板
          </h2>
          <button
            className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-200 hover:bg-gray-300 transition-colors"
            onClick={() => {
              if (!showDebug) {
                try {
                  const lesson = getStoredTodayLesson();
                  setDebugLesson(lesson);
                } catch { setDebugLesson(null); }
              }
              setShowDebug(!showDebug);
            }}
          >
            {showDebug ? '收起' : '展开'}
          </button>
        </div>

        {showDebug && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!debugLesson ? (
              <p className="text-sm text-gray-500">无今日课程数据</p>
            ) : (
              <div className="overflow-x-auto">
                <StepDebugTable
                  lesson={debugLesson}
                  repairAttempts={getRepairAttemptsSnapshot()}
                  repairRecords={getRepairRecordsSnapshot()}
                />
              </div>
            )}
          </motion.div>
        )}
      </AppCard>

      <DataTransferPanel />
      <OfflineSupport />

      {/* v2.12.0: 口算练习周报 */}
      <AppCard variant="amber">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <Calculator size={20} className="text-amber-500" />口算练习周报
        </h2>
        {(() => {
          const records = state.mentalMathRecords || [];
          if (records.length === 0) {
            return (
              <p className="text-sm text-gray-400 text-center py-4">
                还没有口算练习记录，去「口算练习器」练一练吧！
              </p>
            );
          }
          const report = buildWeeklyReport(records, new Date());
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border-2 border-amber-100 text-center">
                  <div className="text-2xl font-extrabold text-amber-600">{report.activeDays}</div>
                  <div className="text-xs text-gray-400">练习天数</div>
                </div>
                <div className="bg-white rounded-xl p-3 border-2 border-amber-100 text-center">
                  <div className="text-2xl font-extrabold text-blue-600">{report.totalQuestions}</div>
                  <div className="text-xs text-gray-400">本周题数</div>
                </div>
                <div className="bg-white rounded-xl p-3 border-2 border-amber-100 text-center">
                  <div className="text-2xl font-extrabold text-green-600">
                    {report.totalQuestions > 0 ? Math.round(report.accuracy) : 0}%
                  </div>
                  <div className="text-xs text-gray-400">正确率</div>
                </div>
              </div>

              {report.totalQuestions > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">各运算类型正确率</div>
                  <div className="space-y-2">
                    {Object.entries(report.byOperation).map(([op, stat]) => (
                      <div key={op} className="flex items-center gap-2">
                        <span className="text-xs w-10 text-gray-600">{OPERATION_LABELS[op as keyof typeof OPERATION_LABELS] || op}</span>
                        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                            style={{ width: `${stat.accuracy}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-12 text-right">
                          {stat.correct}/{stat.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400">
                本周 {report.weekStart} ~ {report.weekEnd}，共 {report.totalSessions} 次练习
              </div>
            </div>
          );
        })()}
      </AppCard>

      <div className="text-center text-xs text-gray-400 py-2">
        数据保存在本地浏览器中，不会上传到服务器
      </div>
    </PageContainer>
  );
}

// ========== Skill Radar Chart (SVG) ==========

function SkillRadarChart({ skillMistakes, totalCompleted }: { skillMistakes: Record<string, number>; totalCompleted: number }) {
  if (totalCompleted === 0 || !Object.values(skillMistakes).some(count => count > 0)) {
    return <p className="py-4 text-center text-sm text-gray-500">暂无足够的历史错误记录，暂不绘制分布图。</p>;
  }
  const skills: { key: string; label: string; mistakes: number }[] = [
    { key: 'find_numbers', label: getCognitiveSkillLabel('find_numbers'), mistakes: skillMistakes.find_numbers || 0 },
    { key: 'find_keywords', label: getCognitiveSkillLabel('find_keywords'), mistakes: skillMistakes.find_keywords || 0 },
    { key: 'remove_noise', label: getCognitiveSkillLabel('remove_noise'), mistakes: skillMistakes.remove_noise || 0 },
    { key: 'understand_question', label: getCognitiveSkillLabel('understand_question'), mistakes: skillMistakes.understand_question || 0 },
    { key: 'choose_operation', label: getCognitiveSkillLabel('choose_operation'), mistakes: skillMistakes.choose_operation || 0 },
  ];

  const cx = 140, cy = 100, maxR = 70, levels = 5;
  const angle = (2 * Math.PI) / skills.length;

  const points = skills.map((skill, i) => {
    // Higher mistakes = closer to center (more "damage")
    const ratio = Math.min(skill.mistakes / Math.max(1, 5), 1);
    const r = maxR * (1 - ratio * 0.7); // 0 mistakes = max radius, many mistakes = smaller
    return {
      label: skill.label,
      mistakes: skill.mistakes,
      x: cx + r * Math.cos(angle * i - Math.PI / 2),
      y: cy + r * Math.sin(angle * i - Math.PI / 2),
      outerX: cx + maxR * Math.cos(angle * i - Math.PI / 2),
      outerY: cy + maxR * Math.sin(angle * i - Math.PI / 2),
    };
  });

  const dataPolygon = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 280 200" className="w-full max-w-xs mx-auto">
      {/* Grid circles */}
      {Array.from({ length: levels }).map((_, lvl) => {
        const r = (maxR / levels) * (lvl + 1);
        return (
          <circle key={lvl} cx={cx} cy={cy} r={r}
            fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
        );
      })}
      {/* Axes */}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.outerX} y2={p.outerY}
          stroke="#e5e7eb" strokeWidth="0.5" />
      ))}
      {/* Data polygon */}
      <polygon points={dataPolygon} fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="2" />
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#a855f7" />
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <text key={i} x={p.outerX} y={p.outerY}
          textAnchor="middle" dominantBaseline={(p.outerY < cy ? 'hanging' : 'auto') as React.SVGAttributes<SVGTextElement>['dominantBaseline']}
          fontSize="9" fill="#6b7280">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-extrabold text-gray-800">{value}</span>
    </div>
  );
}

/** v2.8.4: 积分诊断行 */
function ScoreDiagRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="flex-shrink-0 mt-0.5">{ok ? '✅' : '⚠️'}</span>
      <span className="text-gray-500 flex-shrink-0 w-48">{label}:</span>
      <span className={`font-mono ${ok ? 'text-gray-700' : 'text-red-600 font-bold'}`}>{value}</span>
    </div>
  );
}

// ========== v2.9.0: 题目分布诊断 ==========

const SKILL_LABELS_CN: Record<string, string> = {
  'addition_subtraction:single_digit_addition': '一位数加法',
  'addition_subtraction:singledigit_subtraction': '一位数减法',
  'addition_subtraction:addition_within_10': '10以内加法',
  'addition_subtraction:subtraction_within_10': '10以内减法',
  'addition_subtraction:subtraction_within_20_borrowing': '20以内退位减法',
  'number:counting_within_100': '100以内数数',
  'number:composition_within_100': '100以内数的组成',
  'number:order_within_100': '100以内数的大小',
  'number:comparison_within_100': '100以内数的比较',
  'addition_subtraction:two_digit_plus_one_digit': '两位数加一位数',
  'addition_subtraction:two_digit_minus_one_digit': '两位数减一位数',
  'addition_subtraction:two_digit_plus_tens': '两位数加整十数',
  'addition_subtraction:two_digit_minus_tens': '两位数减整十数',
  'addition_subtraction:addition_within_100': '100以内加法',
  'addition_subtraction:subtraction_within_100': '100以内减法',
  'comparison:difference_comparison': '差比问题',
  'unknown:unknown_addend': '求未知加数',
  'unknown:unknown_subtrahend': '求未知减数',
  'money:rmb_recognition': '人民币认识',
  'money:simple_shopping': '简单购物',
  'geometry:plane_shapes': '平面图形',
  'classification:classify_objects': '分类物体',
  'pattern:simple_patterns': '简单规律',
  'word_problem:two_step_word_problem': '两步应用题',
  'information:identify_extra_information': '识别多余信息',
  'information:insufficient_information': '判断信息缺失',
  'reasoning:reverse_unknown': '逆向推理',
  'money:shopping_and_change': '购物找零',
  'multi_step:multi_condition_reading': '多条件阅读',
  'multiplication:equal_groups_intro': '乘法入门',
  'multiplication:repeated_addition': '连加变乘法',
  'comparison:multiplicative_comparison_intro': '倍数比较入门',
  'logic:simple_ordering': '简单排序',
  'pattern:advanced_patterns': '进阶规律',
  'reasoning:missing_number': '找缺失数字',
  'information:information_sufficiency': '信息充分性',
};

function QuestionDistributionDiagnostic({ state }: { state: any }) {
  const recentRecords = (state.attemptRecords || []).slice(-30);
  const completedIds = state.completedQuestions || [];

  // Build distribution from annotated questions
  const gradeQuestions = (questionsByGrade as any)[state.parentSettings.gradeBand] || [];

  const distribution = {
    byDifficulty: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
    bySemester: { lower: 0, upper: 0, both: 0, unknown: 0 } as Record<string, number>,
    byCategory: { review: 0, currentCore: 0, application: 0, stretch: 0, unknown: 0 } as Record<string, number>,
    singleDigitCount: 0,
    totalAnnotated: 0,
    totalInPool: gradeQuestions.length,
  };

  // Count annotated questions in the grade pool
  gradeQuestions.forEach((q: any) => {
    distribution.totalAnnotated++;
    const diff = (q as any).difficulty || 0;
    if (diff >= 1 && diff <= 5) distribution.byDifficulty[diff]++;

    const sem = (q as any).curriculumSemester || 'unknown';
    if (sem in distribution.bySemester) distribution.bySemester[sem]++;

    if ((q as any).isReview) distribution.byCategory.review++;
    else if ((q as any).isStretch) distribution.byCategory.stretch++;
    else distribution.byCategory.currentCore++;

    const skills = (q as any).skillIds || [];
    if (skills.some((s: string) => s.includes('single_digit'))) distribution.singleDigitCount++;
  });

  // Check recent 30 questions against ideal distribution
  const singleDigitPct = distribution.totalInPool > 0
    ? Math.round((distribution.singleDigitCount / distribution.totalInPool) * 100)
    : 0;
  const reviewPct = distribution.totalAnnotated > 0
    ? Math.round((distribution.byCategory.review / distribution.totalAnnotated) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">
        基于 {distribution.totalInPool} 道 {state.parentSettings.gradeBand} 题目池分析
      </div>

      {/* Difficulty distribution */}
      <div className="p-3 bg-white rounded-lg">
        <div className="text-xs font-bold text-gray-600 mb-2">难度分布</div>
        <div className="flex gap-1 h-6 items-end">
          {[1, 2, 3, 4, 5].map(d => {
            const count = distribution.byDifficulty[d];
            const pct = distribution.totalAnnotated > 0 ? (count / distribution.totalAnnotated) * 100 : 0;
            const height = Math.max(4, pct * 0.6);
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500">{count}</span>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${height}px`,
                    backgroundColor: d <= 2 ? '#fbbf24' : d <= 3 ? '#60a5fa' : d <= 4 ? '#a78bfa' : '#f87171',
                  }}
                />
                <span className="text-[10px] text-gray-400">D{d}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Semester distribution */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-white rounded-lg">
          <div className="text-xs font-bold text-gray-600 mb-1">学期分布</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">下学期</span><span className="font-bold text-blue-600">{distribution.bySemester.lower}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">上学期</span><span className="font-bold text-green-600">{distribution.bySemester.upper}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">通用</span><span className="font-bold text-gray-600">{distribution.bySemester.both}</span></div>
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg">
          <div className="text-xs font-bold text-gray-600 mb-1">题目类型</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">复习题</span><span className="font-bold text-amber-600">{distribution.byCategory.review}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">核心题</span><span className="font-bold text-blue-600">{distribution.byCategory.currentCore}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">拓展题</span><span className="font-bold text-purple-600">{distribution.byCategory.stretch}</span></div>
          </div>
        </div>
      </div>

      {/* Diagnostic alerts */}
      <div className="p-3 bg-amber-50 rounded-lg text-xs space-y-1">
        <div className="font-bold text-amber-800">诊断结论</div>
        {singleDigitPct > 10 && (
          <div className="text-amber-700">⚠️ 一位数题目占比 {singleDigitPct}%（建议 ≤10%），可能过于简单</div>
        )}
        {reviewPct > 15 && (
          <div className="text-amber-700">⚠️ 复习题占比 {reviewPct}%（建议 ≤5%），新题不够</div>
        )}
        {singleDigitPct <= 10 && reviewPct <= 15 && (
          <div className="text-green-700">✅ 题目分布合理，一位数题目 {singleDigitPct}%，复习题 {reviewPct}%</div>
        )}
        {state.usageStage !== undefined && state.usageStage >= 2 && singleDigitPct > 5 && (
          <div className="text-amber-700">⚠️ 用户已进入阶段 {state.usageStage}，一位数题目仍占 {singleDigitPct}%，建议自适应提升难度</div>
        )}
      </div>

      {/* Recent 30 questions with annotations */}
      {recentRecords.length > 0 && (
        <div className="p-3 bg-white rounded-lg">
          <div className="text-xs font-bold text-gray-600 mb-2">最近 30 题答案记录</div>
          <div className="space-y-1">
            {recentRecords.map((r: any, i: number) => {
              const q = gradeQuestions.find((gq: any) => gq.id === r.questionId);
              const skills = (q as any)?.skillIds || [];
              return (
                <div key={i} className="flex items-center gap-1 text-[10px]">
                  <span>{r.isCorrect ? '✅' : '❌'}</span>
                  <span className="font-mono text-gray-500">{r.questionId.slice(0, 8)}</span>
                  {q && <span className="text-purple-500">D{(q as any).difficulty || '?'}</span>}
                  {skills.length > 0 && (
                    <span className="text-gray-400 truncate max-w-[120px]">
                      {skills[0].split(':').pop()?.replace(/_/g, ' ') || ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== v2.6.9: Step 调试表格 ==========

function StepDebugTable({
  lesson,
  repairAttempts,
  repairRecords,
}: {
  lesson: TodayLesson;
  repairAttempts: Record<string, number>;
  repairRecords: Record<string, { lastRepairReason: string; replacementQuestionId: string; timestamp: number }>;
}) {
  // v2.6.9: 每个 step 显示完整匹配信息
  const rows = lesson.steps.map((step) => {
    const question = getQuestionById(step.questionId);
    const repair = repairRecords[step.id];
    const matchResult = question
      ? validateStepQuestionMatch(question, step.type, step.title, undefined)
      : null;

    // keywordCategories: 收集所有关键词的分类
    const keywordCategories = question
      ? [...new Set(question.keywords.map(k => classifyKeyword(k.word)?.category || 'unknown'))]
      : [];

    return {
      stepId: step.id,
      stepType: step.type,
      stepTitle: step.title,
      stepDescription: step.description,
      questionId: step.questionId,
      questionText: question ? (question.text.length > 30 ? question.text.slice(0, 30) + '…' : question.text) : 'N/A',
      problemType: question?.problemType || 'N/A',
      sceneType: question?.sceneType || 'N/A',
      keywordCategories: keywordCategories.join(', ') || 'N/A',
      isValidForStep: matchResult?.isValidForStep ?? false,
      matchErrors: matchResult?.errors || [],
      matchWarnings: matchResult?.warnings || [],
      repairAttempts: repairAttempts[step.id] || 0,
      lastRepairReason: repair?.lastRepairReason || '',
      replacementQuestionId: repair?.replacementQuestionId || '',
    };
  });

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">课程无步骤</p>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-gray-300 bg-gray-100">
          <th className="text-left py-2 px-1 text-gray-600">Step</th>
          <th className="text-left py-2 px-1 text-gray-600">Type</th>
          <th className="text-left py-2 px-1 text-gray-600">Title</th>
          <th className="text-left py-2 px-1 text-gray-600">Desc</th>
          <th className="text-left py-2 px-1 text-gray-600">Q.ID</th>
          <th className="text-left py-2 px-1 text-gray-600">Q.Text</th>
          <th className="text-left py-2 px-1 text-gray-600">ProbType</th>
          <th className="text-left py-2 px-1 text-gray-600">Scene</th>
          <th className="text-left py-2 px-1 text-gray-600">Keywords</th>
          <th className="text-center py-2 px-1 text-gray-600">Valid</th>
          <th className="text-left py-2 px-1 text-gray-600">Errors/Warnings</th>
          <th className="text-center py-2 px-1 text-gray-600">Repairs</th>
          <th className="text-left py-2 px-1 text-gray-600">Last Reason</th>
          <th className="text-left py-2 px-1 text-gray-600">Repl Q</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`border-b border-gray-200 ${!row.isValidForStep ? 'bg-red-50' : ''}`}>
            <td className="py-1 px-1 font-mono text-gray-500">{row.stepId.slice(0, 8)}</td>
            <td className="py-1 px-1">
              <span className={`px-1 rounded ${row.stepType === 'find_action_words' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                {row.stepType}
              </span>
            </td>
            <td className="py-1 px-1 max-w-[80px] truncate text-gray-700" title={row.stepTitle}>{row.stepTitle}</td>
            <td className="py-1 px-1 max-w-[80px] truncate text-gray-500" title={row.stepDescription}>{row.stepDescription}</td>
            <td className="py-1 px-1 font-mono text-gray-500">{row.questionId.slice(0, 8)}</td>
            <td className="py-1 px-1 max-w-[100px] truncate text-gray-700" title={row.questionText}>{row.questionText}</td>
            <td className="py-1 px-1">
              <span className={row.problemType === 'age_problem' ? 'text-red-600 font-bold' : 'text-gray-600'}>
                {row.problemType}
              </span>
            </td>
            <td className="py-1 px-1 text-gray-500">{row.sceneType}</td>
            <td className="py-1 px-1 max-w-[120px] truncate text-gray-500" title={row.keywordCategories}>{row.keywordCategories}</td>
            <td className="py-1 px-1 text-center">
              {row.isValidForStep
                ? <span className="text-green-600 font-bold">✅</span>
                : <span className="text-red-600 font-bold">❌</span>
              }
            </td>
            <td className="py-1 px-1 max-w-[150px]">
              {row.matchErrors.length > 0 && (
                <div className="text-red-600 text-[10px] leading-tight">{row.matchErrors.join('; ')}</div>
              )}
              {row.matchWarnings.length > 0 && (
                <div className="text-amber-600 text-[10px] leading-tight">{row.matchWarnings.join('; ')}</div>
              )}
            </td>
            <td className="py-1 px-1 text-center">
              {row.repairAttempts > 0
                ? <span className="text-amber-600 font-bold">{row.repairAttempts}</span>
                : <span className="text-gray-400">0</span>
              }
            </td>
            <td className="py-1 px-1 max-w-[100px] truncate text-gray-500 text-[10px]" title={row.lastRepairReason}>{row.lastRepairReason || '-'}</td>
            <td className="py-1 px-1 font-mono text-[10px] text-gray-400">{row.replacementQuestionId ? row.replacementQuestionId.slice(0, 8) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
