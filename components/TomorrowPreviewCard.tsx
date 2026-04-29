'use client';

import { TomorrowLessonPreview } from '@/lib/types';
import AppCard from './ui/AppCard';

interface TomorrowPreviewCardProps {
  preview: TomorrowLessonPreview | null;
  variant?: 'full' | 'compact';
}

const STEP_TYPE_LABELS: Record<string, string> = {
  find_numbers: '找数字线索',
  find_action_words: '找动作线索',
  simulation: '观察变化',
  remove_noise: '擦掉废话',
  full_solve: '完整破案',
};

export default function TomorrowPreviewCard({ preview, variant = 'full' }: TomorrowPreviewCardProps) {
  if (!preview) {
    return (
      <AppCard variant="purple">
        <div className="text-center py-4">
          <div className="text-3xl mb-2">🔮</div>
          <h3 className="font-extrabold text-purple-800">明天预告</h3>
          <p className="text-sm text-purple-600 mt-1">
            明天会有新的侦探任务等着你！
          </p>
        </div>
      </AppCard>
    );
  }

  if (variant === 'compact') {
    return (
      <AppCard variant="purple">
        <div className="text-center">
          <div className="text-2xl mb-1">🔮</div>
          <h3 className="font-extrabold text-purple-700 text-sm">明天预告</h3>
          <p className="text-xs text-purple-600 mt-1">
            明天共 {preview.stepCount} 关，难度 {preview.difficultyRange.min}~{preview.difficultyRange.max} ⭐
          </p>
          <p className="text-xs text-purple-500 mt-1 italic">
            &ldquo;{preview.sampleQuestionPreview.slice(0, 30)}...&rdquo;
          </p>
          <p className="text-xs text-purple-400 mt-1">
            预估 {preview.estimatedStars} ⭐ 奖励
          </p>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard variant="purple">
      <div className="flex items-start gap-3">
        <div className="text-3xl">🔮</div>
        <div className="flex-1">
          <h3 className="font-extrabold text-purple-800 mb-2">明天预告</h3>
          <p className="text-sm text-purple-600">
            明天又是 {preview.stepCount} 个关卡的挑战！难度范围：{preview.difficultyRange.min}~{preview.difficultyRange.max} ⭐
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {preview.stepTypes.map((st) => (
              <span key={st} className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-bold">
                {STEP_TYPE_LABELS[st] || st}
              </span>
            ))}
          </div>
          <div className="mt-3 p-3 bg-purple-50 rounded-xl text-sm text-purple-700 italic">
            &ldquo;{preview.sampleQuestionPreview.slice(0, 60)}{preview.sampleQuestionPreview.length > 60 ? '...' : ''}&rdquo;
          </div>
          <p className="text-xs text-purple-500 mt-2">
            完成后预估可获得 {preview.estimatedStars} ⭐
          </p>
        </div>
      </div>
    </AppCard>
  );
}
