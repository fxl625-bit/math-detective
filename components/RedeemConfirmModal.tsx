'use client';

import { ParentReward } from '@/lib/types';
import AppButton from './ui/AppButton';
import AppCard from './ui/AppCard';
import { Star } from 'lucide-react';

interface RedeemConfirmModalProps {
  open: boolean;
  reward: ParentReward | null;
  currentStars: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RedeemConfirmModal({
  open,
  reward,
  currentStars,
  onConfirm,
  onCancel,
}: RedeemConfirmModalProps) {
  if (!open || !reward) return null;

  const canAfford = currentStars >= reward.cost;
  const shortage = reward.cost - currentStars;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-5xl mb-3">{reward.icon}</div>
          <h2 className="text-lg font-extrabold text-gray-800">确认兑换</h2>
          <p className="text-base font-bold text-gray-600 mt-1">{reward.name}</p>
          {reward.description && (
            <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
          )}
        </div>

        <AppCard variant="amber" className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-700">需要星星</span>
            <span className="flex items-center gap-1 text-lg font-extrabold text-amber-600">
              {reward.cost} <Star size={18} fill="currentColor" />
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-amber-700">你的星星</span>
            <span className="flex items-center gap-1 text-lg font-extrabold text-amber-600">
              {currentStars} <Star size={18} fill="currentColor" />
            </span>
          </div>
        </AppCard>

        {!canAfford && (
          <p className="text-sm text-red-500 text-center mt-3 font-bold">
            还差 {shortage} 颗星星，继续努力吧！
          </p>
        )}

        {canAfford && (
          <p className="text-sm text-amber-600 text-center mt-3">
            兑换后请找爸爸妈妈确认奖励哦！
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <AppButton variant="ghost" size="md" fullWidth onClick={onCancel}>
            取消
          </AppButton>
          <AppButton
            variant="primary"
            size="md"
            fullWidth
            disabled={!canAfford}
            onClick={onConfirm}
          >
            确认兑换
          </AppButton>
        </div>
      </div>
    </div>
  );
}
