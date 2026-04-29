'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Gift, BookOpen, BarChart3, ShieldCheck } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import DetectiveMascot from '@/components/DetectiveMascot';
import StarDisplay from '@/components/StarDisplay';
import StreakDisplay from '@/components/StreakDisplay';
import LevelBadge from '@/components/LevelBadge';
import ProgressBar from '@/components/ProgressBar';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import PageContainer from '@/components/layout/PageContainer';
import { getLevelInfo, getStreakMood } from '@/lib/storage';
import { getTodayLesson, getCurrentStep, getTomorrowLessonPreview, getLearningProfile } from '@/lib/lessonPlanner';
import TomorrowPreviewCard from '@/components/TomorrowPreviewCard';

export default function DashboardPage() {
  const { state } = useGameState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-screen" />;

  const levelInfo = getLevelInfo(state.level);
  const dailyGoal = state.parentSettings.dailyGoal;
  const streakMood = getStreakMood(state.streak);
  const lesson = getTodayLesson();
  const currentStep = getCurrentStep(lesson);
  const isLessonDone = lesson.completed;
  const profile = getLearningProfile();
  const tomorrowPreview = getTomorrowLessonPreview(profile, state);

  return (
    <PageContainer>
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-amber-800">
            🔍 傅星扬的数学侦探
          </h1>
          <p className="text-xs text-amber-600 mt-0.5">{streakMood}</p>
        </div>
        <LevelBadge
          level={state.level}
          name={levelInfo.name}
          icon={levelInfo.icon}
        />
      </div>

      {/* 侦探助手 */}
      <AppCard variant="amber">
        <div className="flex items-center gap-4">
          <DetectiveMascot mood={isLessonDone ? 'excited' : 'happy'} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <StarDisplay count={state.stars} />
              <StreakDisplay streak={state.streak} />
            </div>
            <ProgressBar
              label="今日进度"
              value={state.completedToday}
              max={dailyGoal}
              color="bg-gradient-to-r from-amber-400 to-orange-400"
              showPulse={state.completedToday >= dailyGoal}
            />
          </div>
        </div>
      </AppCard>

      {/* 快捷信息卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <InfoCard
          icon="⭐"
          label="星星"
          value={String(state.stars)}
          color="bg-amber-50 border-amber-200"
        />
        <InfoCard
          icon="🔥"
          label="连续打卡"
          value={`${state.streak}天`}
          color="bg-orange-50 border-orange-200"
        />
        <InfoCard
          icon="🏅"
          label="徽章"
          value={String(state.badges.length)}
          color="bg-purple-50 border-purple-200"
        />
      </div>

      {/* ========== 唯一的挑战入口 ========== */}
      <div className="space-y-3">
        <Link href="/play">
          <AppButton variant="primary" size="lg" fullWidth>
            {isLessonDone ? (
              <>
                <ShieldCheck size={24} />
                查看今日成果
              </>
            ) : currentStep ? (
              <>
                <Play size={24} fill="white" />
                开始今天的侦探任务
              </>
            ) : (
              <>
                <Play size={24} fill="white" />
                开始今天的侦探任务
              </>
            )}
          </AppButton>
        </Link>
      </div>

      {/* 今日任务进度卡（只读，不可点） */}
      {!isLessonDone && (
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-3">
            📋 今天的侦探任务
          </h3>
          <div className="space-y-2">
            {lesson.steps.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  step.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : step.status === 'current'
                      ? 'bg-blue-100 text-blue-700 font-bold'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step.status === 'completed' ? 'bg-green-400 text-white' :
                    step.status === 'current' ? 'bg-blue-400 text-white' : 'bg-gray-300 text-white'}">
                  {step.status === 'completed' ? '✓' : i + 1}
                </span>
                <span className="flex-1">
                  {step.title}
                  {step.status === 'locked' && ' 🔒'}
                </span>
                {step.status === 'current' && (
                  <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full">进行中</span>
                )}
              </div>
            ))}
          </div>
        </AppCard>
      )}

      {/* 今日完成提示 */}
      {isLessonDone && (
        <>
          <AppCard variant="green">
            <div className="text-center">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-extrabold text-green-700">今日任务已完成！</h3>
              <p className="text-sm text-green-600 mt-1">
                太棒了！你已经完成了今天的侦探训练，明天再来解锁新任务吧！
              </p>
            </div>
          </AppCard>
          <TomorrowPreviewCard preview={tomorrowPreview} variant="compact" />
        </>
      )}

      {/* 次要入口：奖励、错题、报告（二级入口，不突出） */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <Link href="/rewards">
          <motion.div
            className="card-detective p-3 text-center bg-pink-50 border-pink-200"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Gift size={22} className="mx-auto text-pink-500 mb-1" />
            <div className="text-xs font-bold text-pink-600">奖励中心</div>
          </motion.div>
        </Link>
        <Link href="/mistakes">
          <motion.div
            className="card-detective p-3 text-center bg-blue-50 border-blue-200"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <BookOpen size={22} className="mx-auto text-blue-500 mb-1" />
            <div className="text-xs font-bold text-blue-600">错题本</div>
          </motion.div>
        </Link>
        <Link href="/parent-report">
          <motion.div
            className="card-detective p-3 text-center bg-green-50 border-green-200"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <BarChart3 size={22} className="mx-auto text-green-500 mb-1" />
            <div className="text-xs font-bold text-green-600">家长报告</div>
          </motion.div>
        </Link>
      </div>

      {/* 补签卡提示 */}
      {state.resumeCards > 0 && (
        <div className="text-center text-xs text-amber-600 font-medium bg-amber-50 py-2 px-4 rounded-full border border-amber-200">
          🎫 你有 <strong>{state.resumeCards}</strong> 张补签卡，断签时自动使用
        </div>
      )}
    </PageContainer>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      className={`rounded-xl border-2 ${color} p-3 text-center`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-lg font-extrabold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </motion.div>
  );
}
