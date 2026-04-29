'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { VisualItem } from '@/data/visualItems';

interface AnimatedItemsProps {
  visual: VisualItem;
  initialCount: number;
  changeCount: number;
  operation: 'addition' | 'subtraction';
  showResult?: boolean;
}

export default function AnimatedItems({
  visual,
  initialCount,
  changeCount,
  operation,
  showResult = true,
}: AnimatedItemsProps) {
  const resultCount =
    operation === 'addition'
      ? initialCount + changeCount
      : initialCount - changeCount;

  const actionWord =
    operation === 'addition' ? '增加了' : '减少了';

  return (
    <div className="space-y-3 text-center">
      {/* 初始物品 */}
      <div>
        <p className="text-sm text-gray-500 mb-1">
          先有 {initialCount} {visual.unit}{visual.itemName}
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: Math.min(initialCount, 20) }).map((_, i) => (
            <motion.span
              key={`initial-${i}`}
              className="text-xl inline-block"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {visual.itemEmoji}
            </motion.span>
          ))}
          {initialCount > 20 && (
            <span className="text-sm text-gray-400">
              ... 共{initialCount}{visual.unit}
            </span>
          )}
        </div>
      </div>

      {/* 动作指示 */}
      <motion.div
        className="text-2xl font-extrabold"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        <span className={operation === 'addition' ? 'text-green-500' : 'text-red-400'}>
          {operation === 'addition' ? '+' : '-'}
        </span>
      </motion.div>

      {/* 变化物品 */}
      <div>
        <p className="text-sm text-gray-500 mb-1">
          又{actionWord}了 {changeCount} {visual.unit}{visual.itemName}
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: Math.min(changeCount, 20) }).map((_, i) => (
            <motion.span
              key={`change-${i}`}
              className="text-xl inline-block"
              initial={
                operation === 'addition'
                  ? { opacity: 0, x: -30, scale: 0 }
                  : { opacity: 1, scale: 1 }
              }
              animate={
                operation === 'addition'
                  ? { opacity: 1, x: 0, scale: 1 }
                  : { opacity: 0, scale: 0, y: -20 }
              }
              transition={{
                delay: 0.5 + i * 0.05,
                duration: 0.3,
              }}
            >
              {visual.itemEmoji}
            </motion.span>
          ))}
        </div>
      </div>

      {/* 结果 */}
      {showResult && (
        <motion.div
          className="pt-2 border-t border-gray-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-sm font-bold text-gray-700">
            现在一共有 {resultCount} {visual.unit}{visual.itemName}
          </p>
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            {Array.from({ length: Math.min(resultCount, 20) }).map((_, i) => (
              <motion.span
                key={`result-${i}`}
                className="text-xl inline-block"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + i * 0.03 }}
              >
                {visual.itemEmoji}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
