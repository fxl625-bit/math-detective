'use client';

import { TomorrowLessonPreview } from '@/lib/types';
import { getStepTypeLabel } from '@/lib/learningLabels';
import AppCard from './ui/AppCard';

interface TomorrowPreviewCardProps {
  preview: TomorrowLessonPreview | null;
  variant?: 'full' | 'compact';
}

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
            明天共 {preview.stepCount} 关，难度等级 {preview.difficultyRange.min}~{preview.difficultyRange.max}
          </p>
          <div className="mt-2 text-left">
            <p className="text-xs font-bold text-purple-800">明日练习内容</p>
            <ul aria-label="明日练习内容" className="mt-1 flex flex-wrap justify-center gap-2">
              {preview.stepTypes.map((stepType, index) => (
                <li key={`${stepType}-${index}`} className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
                  {getStepTypeLabel(stepType)}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-purple-500 mt-1 italic">
            &ldquo;{preview.sampleQuestionPreview.slice(0, 30)}...&rdquo;
          </p>
          <p className="mt-2 text-xs text-purple-600">核心六题首答全对可得1积分，每日最多一次。</p>
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
            明天又是 {preview.stepCount} 个关卡的挑战！难度等级：{preview.difficultyRange.min}~{preview.difficultyRange.max}
          </p>
          <div className="mt-3">
            <p className="text-sm font-bold text-purple-900">明日练习内容</p>
            <ul aria-label="明日练习内容" className="mt-2 flex flex-wrap gap-2">
              {preview.stepTypes.map((stepType, index) => (
                <li key={`${stepType}-${index}`} className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-800">
                  {getStepTypeLabel(stepType)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 rounded-xl bg-purple-50 p-3 text-sm text-purple-700 italic">
            &ldquo;{preview.sampleQuestionPreview.slice(0, 60)}{preview.sampleQuestionPreview.length > 60 ? '...' : ''}&rdquo;
          </div>
          <p className="mt-2 text-xs text-purple-600">
            核心六题首答全对可得1积分，每日最多一次。
          </p>
        </div>
      </div>
    </AppCard>
  );
}
