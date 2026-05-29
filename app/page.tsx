'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Gift, BookOpen, BarChart3, ShieldCheck, Star, X } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import DetectiveMascot from '@/components/DetectiveMascot';
import StarDisplay from '@/components/StarDisplay';
import StreakDisplay from '@/components/StreakDisplay';
import LevelBadge from '@/components/LevelBadge';
import ProgressBar from '@/components/ProgressBar';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import PageContainer from '@/components/layout/PageContainer';
import { getLevelInfo, getStreakMood, getWeekStreakStatus } from '@/lib/storage';
import { getTodayLesson, getCurrentStep, getTomorrowLessonPreview, getLearningProfile, getCaseStoryForLesson } from '@/lib/lessonPlanner';
import TomorrowPreviewCard from '@/components/TomorrowPreviewCard';

function getFoxStatus(state: { lastPlayDate: string; streak: number }, isLessonDone: boolean) {
  const now = new Date();
  const hour = now.getHours();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const playedToday = state.lastPlayDate === today;

  if (isLessonDone) {
    if (state.streak >= 7) {
      return { mood: 'excited' as const, message: '连续7天破案！传奇侦探！' };
    }
    return { mood: 'excited' as const, message: '今天的案子全部告破！' };
  }

  if (!playedToday) {
    if (state.lastPlayDate === yesterdayStr) {
      // 昨天玩了今天还没
      if (hour >= 17) {
        return { mood: 'thinking' as const, message: '天快黑了...今天的案件还没看呢！' };
      }
      return { mood: 'happy' as const, message: '今天的新案件在等着你！' };
    }
    // 昨天也没玩
    return { mood: 'encourage' as const, message: '好久不见！快来破今天的案子吧～' };
  }

  // 今天玩过了但没做完
  if (hour >= 17) {
    return { mood: 'thinking' as const, message: '还有案件没破完，抓紧时间！' };
  }
  return { mood: 'happy' as const, message: '继续破案吧，小侦探！' };
}

export default function DashboardPage() {
  const { state, doCheckin } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [storyIntroShown, setStoryIntroShown] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinBonus, setCheckinBonus] = useState<number | null>(null);
  const [checkinDone, setCheckinDone] = useState(false);
  const [cardFlipped, setCardFlipped] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  // 检查签到
  useEffect(() => {
    if (!mounted) return;
    const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date()).padStart(2, '0')}`;
    if (state.lastCheckinDate !== today) {
      const timer = setTimeout(() => setShowCheckin(true), 600);
      return () => clearTimeout(timer);
    }
  }, [mounted, state.lastCheckinDate]);

  const handleFlip = (cardIndex: number) => {
    if (cardFlipped !== null) return;
    setCardFlipped(cardIndex);
    const bonus = doCheckin();
    setTimeout(() => {
      setCheckinBonus(bonus);
      setCheckinDone(true);
    }, 400);
  };

  const handleCloseCheckin = () => setShowCheckin(false);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce-gentle">🔍</div>
          <p className="text-amber-600 font-bold text-lg">小侦探正在准备...</p>
          <div className="mt-4 flex gap-1 justify-center">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    );
  }

  const levelInfo = getLevelInfo(state.level);
  const dailyGoal = state.parentSettings.dailyGoal;
  const streakMood = getStreakMood(state.streak);
  const lesson = getTodayLesson();
  const currentStep = getCurrentStep(lesson);
  const isLessonDone = lesson.completed;
  const profile = getLearningProfile();
  const tomorrowPreview = getTomorrowLessonPreview(profile, state);
  const caseStory = !isLessonDone ? getCaseStoryForLesson(lesson) : undefined;
  const hasStory = !!caseStory && !storyIntroShown;
  const foxStatus = getFoxStatus(state, isLessonDone);
  const weekStatus = getWeekStreakStatus(state);

  return (
    <PageContainer>
      {/* ===== 每日签到弹窗 ===== */}
      <AnimatePresence>
        {showCheckin && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={checkinDone ? handleCloseCheckin : undefined}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">🎁</div>
                <h2 className="text-xl font-extrabold text-amber-800 mb-1">每日签到</h2>
                <p className="text-sm text-gray-500 mb-5">翻一张牌，领取今日侦探奖励！</p>

                {!checkinDone ? (
                  <div className="flex justify-center gap-3 mb-4">
                    {[0, 1, 2].map((i) => (
                      <motion.button
                        key={i}
                        className={`w-20 h-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold transition-all ${
                          cardFlipped === i
                            ? 'bg-amber-100 border-2 border-amber-400 text-amber-600'
                            : cardFlipped === null
                              ? 'bg-amber-50 border-2 border-amber-300 text-amber-400 hover:bg-amber-100 cursor-pointer'
                              : 'bg-amber-50 border-2 border-amber-200 text-amber-300'
                        }`}
                        whileHover={cardFlipped === null ? { scale: 1.08, y: -4 } : {}}
                        whileTap={cardFlipped === null ? { scale: 0.95 } : {}}
                        onClick={() => handleFlip(i)}
                        disabled={cardFlipped !== null}
                      >
                        {cardFlipped === i ? (
                          <motion.span
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={{ scale: 1, rotateY: 0 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            ⭐
                          </motion.span>
                        ) : (
                          '?'
                        )}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="text-5xl mb-3">🌟</div>
                    <p className="text-2xl font-extrabold text-amber-600">
                      +{checkinBonus} 颗星星！
                    </p>
                    <p className="text-sm text-gray-500 mt-1">已存入你的侦探账户</p>
                  </motion.div>
                )}

                {checkinDone && (
                  <AppButton variant="primary" size="md" onClick={handleCloseCheckin}>
                    开始今天的冒险！
                  </AppButton>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 顶部信息栏 ===== */}
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

      {/* ===== 侦探助手 & 统计 ===== */}
      <AppCard variant="amber">
        <div className="flex items-center gap-4">
          <DetectiveMascot mood={foxStatus.mood} message={foxStatus.message} size="sm" />
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

      {/* ===== 7天连续打卡 ===== */}
      <AppCard variant="blue">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {weekStatus.map((done, i) => (
              <motion.div
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  done
                    ? 'bg-orange-100 border-2 border-orange-400'
                    : 'bg-gray-100 border-2 border-gray-200'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08 }}
              >
                {done ? '🔥' : '⚫'}
              </motion.div>
            ))}
          </div>
          <p className="text-sm font-bold text-blue-700">
            {state.streak >= 7
              ? '🎉 一周全勤！太厉害了！'
              : state.streak > 0
                ? `已连续 ${state.streak} 天！再坚持 ${7 - state.streak} 天解锁全勤奖励`
                : '今天开始破案，点亮小火苗！'}
          </p>
        </div>
      </AppCard>

      {/* ===== 案件故事开场白 ===== */}
      {hasStory && (
        <AppCard variant="blue">
          <div className="flex flex-col items-center gap-3">
            <DetectiveMascot
              mood="thinking"
              message={caseStory.introText}
            />
            <h3 className="font-extrabold text-blue-800 text-lg text-center">
              📋 {caseStory.title}
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-600 border border-blue-200">
                {caseStory.theme}
              </span>
            </div>
          </div>
        </AppCard>
      )}

      {/* ===== 快捷信息卡片 ===== */}
      <div className="grid grid-cols-3 gap-3">
        <InfoCard icon="⭐" label="星星" value={String(state.stars)} color="bg-amber-50 border-amber-200" />
        <InfoCard icon="🔥" label="连续打卡" value={`${state.streak}天`} color="bg-orange-50 border-orange-200" />
        <InfoCard icon="🏅" label="徽章" value={String(state.badges.length)} color="bg-purple-50 border-purple-200" />
      </div>

      {/* ===== 主要入口 ===== */}
      <div className="space-y-3">
        <Link href="/play">
          <AppButton variant="primary" size="lg" fullWidth>
            {isLessonDone ? (
              <>
                <ShieldCheck size={24} />
                查看今日成果
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

      {/* ===== 案件档案（未完成时展示） ===== */}
      {!isLessonDone && (
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-3 flex items-center gap-2">
            🔍 今日案件档案
          </h3>
          <div className="space-y-2">
            {lesson.steps.map((step, i) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              const isLocked = step.status === 'locked';
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                    isCompleted
                      ? 'bg-green-100 text-green-700'
                      : isCurrent
                        ? 'bg-blue-100 text-blue-700 font-bold ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted ? 'bg-green-400 text-white' :
                    isCurrent ? 'bg-blue-400 text-white' :
                    'bg-gray-300 text-white'
                  }`}>
                    {isCompleted ? '✓' : isLocked ? '🔒' : i + 1}
                  </span>
                  <span className="flex-1 font-medium">
                    {isLocked ? '???' : step.title}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                      进行中
                    </span>
                  )}
                  {isLocked && (
                    <span className="text-xs text-gray-400">
                      完成前置解锁
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {!currentStep && (
            <p className="text-xs text-blue-600 text-center mt-3 font-medium">
              完成第一关揭晓案件细节！
            </p>
          )}
        </AppCard>
      )}

      {/* ===== 今日完成提示 ===== */}
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

      {/* ===== 次要入口 ===== */}
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

      {/* ===== 补签卡提示 ===== */}
      {state.resumeCards > 0 && (
        <div className="text-center text-xs text-amber-600 font-medium bg-amber-50 py-2 px-4 rounded-full border border-amber-200">
          🎫 你有 <strong>{state.resumeCards}</strong> 张补签卡，断签时自动使用
        </div>
      )}
    </PageContainer>
  );
}

function InfoCard({
  icon, label, value, color,
}: {
  icon: string; label: string; value: string; color: string;
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
