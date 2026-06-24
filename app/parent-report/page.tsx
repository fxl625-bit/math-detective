'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Target, TrendingUp, Lightbulb, Settings, Check, Brain, GraduationCap, Bug, Download, Copy, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import type { GradeBand, CognitiveSkill, TodayLesson } from '@/lib/types';
import StarDisplay from '@/components/StarDisplay';
import StreakDisplay from '@/components/StreakDisplay';
import LevelBadge from '@/components/LevelBadge';
import ProgressBar from '@/components/ProgressBar';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import PageContainer from '@/components/layout/PageContainer';
import { getLevelInfo, getAccuracyStats } from '@/lib/storage';
import { getTodayLesson } from '@/lib/lessonPlanner';
import { getQuestionById } from '@/data/questions';
import { validateStepQuestionMatch } from '@/lib/questionValidation';
import { getRepairAttemptsSnapshot, getRepairRecordsSnapshot } from '@/lib/lessonTransaction';
import { classifyKeyword } from '@/data/keywordRules';
import { createDataSnapshot, downloadExportFile, copyExportToClipboard, estimateLocalStorageSize, formatBytes, type ExportPayload } from '@/lib/dataExport';

const GRADE_OPTIONS: { value: GradeBand; label: string }[] = [
  { value: 'G1', label: '一年级' },
  { value: 'G2', label: '二年级' },
  { value: 'G3', label: '三年级' },
  { value: 'G4', label: '四年级' },
  { value: 'G5', label: '五年级' },
  { value: 'G6', label: '六年级' },
];

const SKILL_LABELS: Record<CognitiveSkill, string> = {
  find_numbers: '找数字',
  find_keywords: '找关键词',
  remove_noise: '排除干扰',
  understand_question: '理解题意',
  choose_operation: '选择运算',
  find_compare_numbers: '比较关系',
  spot_extra_info: '识别多余信息',
  spot_missing_info: '判断信息缺失',
  build_model: '建立模型',
  multi_step_reasoning: '多步推理',
  estimate: '估算',
  explain_reasoning: '解释推理',
};

export default function ParentReportPage() {
  const { state, setParentSettings } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showScoreDiag, setShowScoreDiag] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [debugLesson, setDebugLesson] = useState<TodayLesson | null>(null);
  const [exportPayload, setExportPayload] = useState<ExportPayload | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  // Settings form state
  const [formDailyGoal, setFormDailyGoal] = useState(state.parentSettings.dailyGoal);
  const [formGrade, setFormGrade] = useState<GradeBand>(state.parentSettings.gradeBand);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-4 animate-bounce-gentle">📊</div><p className="text-green-600 font-bold">正在加载报告...</p></div></div>;

  const levelInfo = getLevelInfo(state.level);

  // v2.6.8: 使用统一统计函数 getAccuracyStats()
  // 统计口径：
  //   - 总体正确率 = 每道题最新提交的正确数 / 总提交题数（未作答不计入分母）
  //   - 7日正确率 = 最近7天内的正确数 / 7天内提交题数
  //   - 今日完成 = 今日首次答对的题目数
  const accuracyStats = getAccuracyStats(state);
  const { todayCompleted, overallAccuracy, last7DaysAccuracy, totalAttempts } = accuracyStats;
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
      suggestions.push(`弱项技能"${SKILL_LABELS[topWeak[0] as CognitiveSkill] || topWeak[0]}"需重点练习，已累计${topWeak[1]}次错误。`);
    }
  }
  if (suggestions.length === 0 && state.totalCompleted >= 5) suggestions.push('孩子表现不错！继续保持每天练习的习惯。');
  if (state.totalCompleted < 5) suggestions.push('刚开始使用，数据积累中。坚持一周后查看详细分析。');

  function handleSaveSettings() {
    setParentSettings({
      dailyGoal: formDailyGoal,
      gradeBand: formGrade,
    });
    setShowSettings(false);
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-green-800">📊 家长报告</h1>
        <button className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          onClick={() => setShowSettings(!showSettings)}>
          <Settings size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div className="card-detective p-4 space-y-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Settings size={18} /> 学习设置
          </h3>

          {/* Grade selection */}
          <div>
            <label className="text-sm font-bold text-gray-600 mb-2 block">📚 年级选择</label>
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map((g) => (
                <button key={g.value}
                  className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${
                    formGrade === g.value ? 'bg-green-400 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setFormGrade(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Daily goal */}
          <div>
            <label className="text-sm font-bold text-gray-600 mb-2 block">🎯 每日目标关数</label>
            <div className="flex gap-2">
              {[3, 5, 8, 10].map((n) => (
                <button key={n}
                  className={`px-4 py-2 rounded-xl font-bold text-sm ${
                    formDailyGoal === n ? 'bg-green-400 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setFormDailyGoal(n)}
                >{n}关/天</button>
              ))}
            </div>
          </div>


          <AppButton variant="success" size="sm" onClick={handleSaveSettings}>
            <Check size={16} /> 保存设置
          </AppButton>
        </motion.div>
      )}

      {/* Current grade info */}
      <AppCard variant="purple">
        <div className="flex items-center gap-2">
          <GraduationCap size={20} className="text-purple-600" />
          <span className="text-sm font-bold text-purple-800">
            当前年级：{GRADE_OPTIONS.find(g => g.value === state.parentSettings.gradeBand)?.label || '未设置'}
          </span>
        </div>
      </AppCard>

      {/* Today */}
      <AppCard variant="green">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <Target size={20} className="text-green-600" />今日学习情况
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <div className="text-3xl font-extrabold text-amber-600">{todayCompleted}</div>
            <div className="text-xs text-gray-500">今日完成</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <div className="text-3xl font-extrabold text-green-600">{overallAccuracy}%</div>
            <div className="text-xs text-gray-500">总体正确率</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <div className="text-3xl font-extrabold text-blue-600">{last7DaysAccuracy}%</div>
            <div className="text-xs text-gray-500">7日正确率</div>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar label="今日目标进度" value={state.completedToday} max={state.parentSettings.dailyGoal}
            color="bg-gradient-to-r from-green-400 to-emerald-400" showPulse={state.completedToday >= state.parentSettings.dailyGoal} />
        </div>
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
          <Row label="提交次数" value={`${totalAttempts} 题`} />
          <Row label="侦探等级" value={<LevelBadge level={state.level} name={levelInfo.name} icon={levelInfo.icon} size="sm" />} />
          <Row label="拥有星星" value={<StarDisplay count={state.stars} size="sm" />} />
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

      {/* Skill Radar Chart */}
      <AppCard variant="purple">
        <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <Brain size={20} className="text-purple-500" />技能分布图
        </h2>
        <SkillRadarChart skillMistakes={skillMistakes} totalCompleted={state.totalCompleted} />
        <p className="text-xs text-gray-400 text-center mt-2">越靠近中心表示该技能越弱（错误次数越多）</p>
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
                <span className="text-sm text-gray-700 flex-1">{SKILL_LABELS[skill as CognitiveSkill] || skill}</span>
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
                const lesson = (() => { try { return getTodayLesson(); } catch { return null; } })();
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
                <div className="text-xs text-gray-500">stars（主积分）</div>
                <div className="text-xl font-extrabold text-amber-600">{state.stars}</div>
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
                  const lesson = getTodayLesson();
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

      {/* v2.8.4: 数据备份与导出 */}
      <AppCard variant="blue">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
            <Download size={20} className="text-blue-600" />数据备份与导出
          </h2>
          <button
            className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 hover:bg-blue-200 transition-colors"
            onClick={() => setShowDataExport(!showDataExport)}
          >
            {showDataExport ? '收起' : '展开'}
          </button>
        </div>

        {showDataExport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              导出只会<strong>复制</strong>当前本地学习数据，不会修改或清空任何记录。
              积分、错题、奖励、打卡记录在导出前后完全一致。
            </p>

            {/* 当前数据摘要 */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-white rounded-lg text-center">
                <div className="text-amber-600 font-extrabold text-lg">{state.stars}</div>
                <div className="text-gray-500">当前星星</div>
              </div>
              <div className="p-2 bg-white rounded-lg text-center">
                <div className="text-red-500 font-extrabold text-lg">{state.mistakes.length}</div>
                <div className="text-gray-500">错题数量</div>
              </div>
              <div className="p-2 bg-white rounded-lg text-center">
                <div className="text-green-600 font-extrabold text-lg">{state.streak}</div>
                <div className="text-gray-500">连续打卡</div>
              </div>
            </div>

            <div className="text-xs text-gray-400">
              本地数据大小：{formatBytes(estimateLocalStorageSize())}
            </div>

            {/* 导出状态提示 */}
            {exportStatus !== 'idle' && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                exportStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {exportStatus === 'success'
                  ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                }
                <span>{exportMessage}</span>
              </div>
            )}

            {/* 按钮组 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all"
                onClick={() => {
                  try {
                    const payload = createDataSnapshot();
                    setExportPayload(payload);
                    const { filename, sizeBytes } = downloadExportFile(payload);
                    setExportStatus('success');
                    setExportMessage(
                      `已导出 ${filename}（${formatBytes(sizeBytes)}）。包含：星星 ${payload.summary.stars}颗、错题 ${payload.summary.mistakesCount}道、打卡 ${payload.summary.streak}天。当前学习数据没有被修改。`
                    );
                    setTimeout(() => setExportStatus('idle'), 8000);
                  } catch (e) {
                    setExportStatus('error');
                    setExportMessage('导出失败：' + (e instanceof Error ? e.message : '未知错误'));
                  }
                }}
              >
                <Download size={14} />导出全部数据 JSON
              </button>

              <button
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all"
                onClick={async () => {
                  try {
                    const payload = exportPayload ?? createDataSnapshot();
                    setExportPayload(payload);
                    const ok = await copyExportToClipboard(payload);
                    setExportStatus(ok ? 'success' : 'error');
                    setExportMessage(ok
                      ? '已复制备份 JSON 到剪贴板。当前学习数据没有被修改。'
                      : '复制失败，请尝试"导出全部数据"下载文件。'
                    );
                    setTimeout(() => setExportStatus('idle'), 5000);
                  } catch {
                    setExportStatus('error');
                    setExportMessage('复制失败，请尝试"导出全部数据"。');
                  }
                }}
              >
                <Copy size={14} />复制备份 JSON
              </button>

              <button
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all"
                onClick={() => {
                  try {
                    const fullPayload = createDataSnapshot();
                    // 只保留错题数据
                    const mistakesOnly = {
                      ...fullPayload,
                      data: {
                        ...fullPayload.data,
                        learningState: null,
                        todayLesson: null,
                        rewards: null,
                        avatar: null,
                        settings: null,
                        // mistakes 保留
                      },
                    };
                    const json = JSON.stringify(mistakesOnly, null, 2);
                    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const now = new Date();
                    a.download = `math-detective-mistakes-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.json`;
                    a.href = url;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setExportStatus('success');
                    setExportMessage(`已导出错题本（共 ${fullPayload.summary.mistakesCount} 道）。数据未被修改。`);
                    setTimeout(() => setExportStatus('idle'), 5000);
                  } catch (e) {
                    setExportStatus('error');
                    setExportMessage('导出失败：' + (e instanceof Error ? e.message : '未知错误'));
                  }
                }}
              >
                <FileText size={14} />导出错题本
              </button>

              <button
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all"
                onClick={() => {
                  try {
                    const payload = createDataSnapshot();
                    // 学习报告：摘要 + 统计字段
                    const report = {
                      exportedAt: payload.exportedAt,
                      appVersion: payload.appVersion,
                      summary: payload.summary,
                      weeklySnapshots: payload.data.learningState?.weeklySnapshots || [],
                      attemptRecords: payload.data.learningState?.attemptRecords || [],
                      badges: payload.data.learningState?.badges || [],
                    };
                    const json = JSON.stringify(report, null, 2);
                    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const now = new Date();
                    a.download = `math-detective-report-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.json`;
                    a.href = url;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setExportStatus('success');
                    setExportMessage('已导出学习报告。数据未被修改。');
                    setTimeout(() => setExportStatus('idle'), 5000);
                  } catch (e) {
                    setExportStatus('error');
                    setExportMessage('导出失败：' + (e instanceof Error ? e.message : '未知错误'));
                  }
                }}
              >
                <BarChart3 size={14} />导出学习报告
              </button>
            </div>

            {/* 导入预留按钮 */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gray-50 text-gray-400 text-xs font-bold cursor-not-allowed border border-dashed border-gray-300"
            >
              导入备份（后续开放）
            </button>

            {/* 导出时间 */}
            {exportPayload && (
              <div className="text-xs text-gray-400 text-center">
                最近导出：{new Date(exportPayload.exportedAt).toLocaleString('zh-CN')}
                &nbsp;·&nbsp;checksum: {exportPayload.checksum}
              </div>
            )}
          </motion.div>
        )}
      </AppCard>

      <div className="text-center text-xs text-gray-400 py-2">
        数据保存在本地浏览器中，不会上传到服务器
      </div>
    </PageContainer>
  );
}

// ========== Skill Radar Chart (SVG) ==========

function SkillRadarChart({ skillMistakes, totalCompleted: _totalCompleted }: { skillMistakes: Record<string, number>; totalCompleted: number }) {
  const skills: { key: string; label: string; mistakes: number }[] = [
    { key: 'find_numbers', label: '找数字', mistakes: skillMistakes.find_numbers || 0 },
    { key: 'find_keywords', label: '找关键词', mistakes: skillMistakes.find_keywords || 0 },
    { key: 'remove_noise', label: '排除干扰', mistakes: skillMistakes.remove_noise || 0 },
    { key: 'understand_question', label: '理解题意', mistakes: skillMistakes.understand_question || 0 },
    { key: 'choose_operation', label: '选择运算', mistakes: skillMistakes.choose_operation || 0 },
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
