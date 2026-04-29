'use client';

import { useState } from 'react';
import { ParentReward } from '@/lib/types';
import AppButton from './ui/AppButton';
import { X } from 'lucide-react';

interface ParentRewardFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ParentReward, 'id' | 'createdAt'>) => void;
  initialData?: ParentReward;
}

const EMOJI_OPTIONS = ['🎮', '⭐', '🎁', '🏆', '🎨', '📚', '🍦', '🎬', '🧸', '🎪', '🌈', '💎', '🎯', '🎵', '🍕', '⚽'];

export default function ParentRewardForm({ open, onClose, onSave, initialData }: ParentRewardFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [cost, setCost] = useState(initialData?.cost || 50);
  const [icon, setIcon] = useState(initialData?.icon || '🎁');
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), cost, icon, enabled });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-gray-800">
            {initialData ? '编辑奖励' : '新增奖励'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">奖励名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-300 focus:outline-none text-base"
              placeholder="例如：让爸爸妈妈陪自己玩10分钟"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">奖励说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-300 focus:outline-none text-base resize-none"
              rows={2}
              placeholder="描述这个奖励..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">所需星星</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-300 focus:outline-none text-base"
              min={1}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">奖励图标</label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-xl border-2 transition-colors ${
                    icon === emoji ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-bold text-gray-600">启用此奖励</span>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-7 rounded-full transition-colors ${
                enabled ? 'bg-green-400' : 'bg-gray-300'
              } relative`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <AppButton variant="ghost" size="md" fullWidth onClick={onClose} type="button">
              取消
            </AppButton>
            <AppButton variant="primary" size="md" fullWidth type="submit">
              {initialData ? '保存修改' : '添加奖励'}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
