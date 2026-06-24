'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountingBlocksProps {
  itemEmoji: string;
  itemName: string;
  targetCount: number;
  maxBlocks?: number;
  mode: 'add' | 'subtract';
  className?: string;
}

export default function CountingBlocks({
  itemEmoji,
  itemName,
  targetCount,
  maxBlocks = 10,
  mode,
  className = '',
}: CountingBlocksProps) {
  const [count, setCount] = useState(0);
  const [, setDragging] = useState<string | null>(null);

  const handleAdd = () => {
    if (count < maxBlocks) {
      setCount(c => c + 1);
    }
  };

  const handleRemove = () => {
    if (count > 0) {
      setCount(c => c - 1);
    }
  };

  const handleReset = () => setCount(0);

  const isCorrect = count === targetCount;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 标题 */}
      <p className="text-sm text-gray-600 text-center font-medium">
        {mode === 'add'
          ? `拖进来或点击 + 来增加${itemName}`
          : `拖走或点击 - 来减少${itemName}`}
      </p>

      {/* 操作区域 */}
      <div className="flex items-center justify-center gap-3">
        {/* 减法按钮 */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleRemove}
          disabled={count === 0}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
            count === 0
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300'
          }`}
          aria-label="减少一个"
        >
          −
        </motion.button>

        {/* 物品展示区 */}
        <div
          className="min-w-[120px] min-h-[80px] bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 p-3 flex flex-wrap justify-center items-center gap-1 transition-all"
        >
          <AnimatePresence>
            {Array.from({ length: count }).map((_, i) => (
              <motion.span
                key={`block-${i}`}
                className="text-2xl cursor-grab active:cursor-grabbing select-none"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                whileHover={{ scale: 1.2 }}
                drag
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                dragElastic={0.3}
                onDragStart={() => setDragging(`block-${i}`)}
                onDragEnd={(_, info) => {
                  setDragging(null);
                  if (info.offset.x > 40 || info.offset.y > 40) {
                    setCount(c => c - 1);
                  }
                }}
              >
                {itemEmoji}
              </motion.span>
            ))}
          </AnimatePresence>
          {count === 0 && (
            <p className="text-xs text-amber-400">点击 + 来添加{itemName}</p>
          )}
        </div>

        {/* 加法按钮 */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleAdd}
          disabled={count >= maxBlocks}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
            count >= maxBlocks
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-green-100 text-green-600 hover:bg-green-200 active:bg-green-300'
          }`}
          aria-label="增加一个"
        >
          +
        </motion.button>
      </div>

      {/* 计数和目标对比 */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-gray-500">
          当前：<strong className="text-amber-700">{count}</strong> {itemName}
        </span>
        <span className="text-sm text-gray-400">→</span>
        <span className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-gray-500'}`}>
          目标：{targetCount} {itemName}
        </span>
      </div>

      {/* 成功反馈 */}
      <AnimatePresence>
        {isCorrect && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-green-600 font-bold">🎉 太棒了！{targetCount}个{isCorrect && '，答对了！'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 重置按钮 */}
      <div className="text-center">
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          重新来
        </button>
      </div>
    </div>
  );
}
