'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Target, TrendingUp, Lightbulb, Settings, Check, Brain, GraduationCap } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import type { GradeBand, CognitiveSkill } from '@/lib/types';
import StarDisplay from '@/components/StarDisplay';
import StreakDisplay from '@/components/StreakDisplay';
import LevelBadge from '@/components/LevelBadge';
import ProgressBar from '@/components/ProgressBar';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import PageContainer from '@/components/layout/PageContainer';
import { getLevelInfo, getAccuracyStats } from '@/lib/storage';

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

  // Settings form state
  const [formDailyGoal, setFormDailyGoal] = useState(state.parentSettings.dailyGoal);
  const [formGrade, setFormGrade] = useState<GradeBand>(state.parentSettings.gradeBand);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-4 animate-bounce-gentle">📊</div><p className="text-green-600 font-bold">正在加载报告...</p></div></div>;

  const levelInfo = getLevelInfo(state.level);

  // v2.6.8: 使用统一统计函数 getAccuracyStats()
  // 统计口径：
  //   - 总体正确率 = 每道题最新提交的正确数 / 总提交题数（未作答不计入分母）
  //   - 7日正确率 = 最近7天内的正确数 / 7天内提交题数
  //   - 今日完成 = 今日首次答对的题目数
  const accuracyStats = getAccuracyStats(state);
  const { todayCompleted, overallAccuracy, last7DaysAccuracy, totalAttempts, correctAttempts, last7DaysTotalAttempts, last7DaysCorrectAttempts } = accuracyStats;
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

      <div className="text-center text-xs text-gray-400 py-2">
        数据保存在本地浏览器中，不会上传到服务器
      </div>
    </PageContainer>
  );
}

// ========== Skill Radar Chart (SVG) ==========

function SkillRadarChart({ skillMistakes, totalCompleted }: { skillMistakes: Record<string, number>; totalCompleted: number }) {
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
