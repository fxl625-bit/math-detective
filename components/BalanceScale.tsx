'use client';

import { motion } from 'framer-motion';

interface BalanceScaleProps {
  leftCount: number;
  rightCount: number;
  leftEmoji?: string;
  rightEmoji?: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

export default function BalanceScale({
  leftCount,
  rightCount,
  leftEmoji = '🍎',
  rightEmoji = '🍎',
  leftLabel,
  rightLabel,
  className = '',
}: BalanceScaleProps) {
  const isBalanced = leftCount === rightCount;
  const leftHeavier = leftCount > rightCount;
  const tiltAngle = isBalanced ? 0 : leftHeavier ? -8 : 8;
  const svgWidth = 320;
  const svgHeight = 160;
  const pivotX = svgWidth / 2;
  const pivotY = 70;
  const beamHalf = 100;

  const leftX = pivotX - beamHalf * Math.cos((tiltAngle * Math.PI) / 180);
  const leftY = pivotY - beamHalf * Math.sin((tiltAngle * Math.PI) / 180);
  const rightX = pivotX + beamHalf * Math.cos((tiltAngle * Math.PI) / 180);
  const rightY = pivotY + beamHalf * Math.sin((tiltAngle * Math.PI) / 180);

  return (
    <motion.div
      className={`flex flex-col items-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-xs"
        role="img"
        aria-label={isBalanced ? '天平平衡' : `天平${leftHeavier ? '左边重' : '右边重'}`}
      >
        {/* 底座三角形 */}
        <polygon
          points={`${pivotX},${pivotY + 20} ${pivotX - 15},${pivotY + 50} ${pivotX + 15},${pivotY + 50}`}
          fill="#d1d5db"
        />
        {/* 支柱 */}
        <line
          x1={pivotX}
          y1={pivotY}
          x2={pivotX}
          y2={pivotY + 20}
          stroke="#9ca3af"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* 横梁 */}
        <motion.line
          x1={leftX}
          y1={leftY}
          x2={rightX}
          y2={rightY}
          stroke={isBalanced ? '#22c55e' : '#6b7280'}
          strokeWidth="4"
          strokeLinecap="round"
          animate={{ x1: leftX, y1: leftY, x2: rightX, y2: rightY }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* 左托盘悬挂线 */}
        <line x1={leftX} y1={leftY} x2={leftX} y2={leftY + 30} stroke="#9ca3af" strokeWidth="1.5" />
        {/* 左托盘 */}
        <motion.line
          x1={leftX - 30}
          y1={leftY + 30}
          x2={leftX + 30}
          y2={leftY + 30}
          stroke="#9ca3af"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ x1: leftX - 30, y1: leftY + 30, x2: leftX + 30, y2: leftY + 30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* 右托盘悬挂线 */}
        <line x1={rightX} y1={rightY} x2={rightX} y2={rightY + 30} stroke="#9ca3af" strokeWidth="1.5" />
        {/* 右托盘 */}
        <motion.line
          x1={rightX - 30}
          y1={rightY + 30}
          x2={rightX + 30}
          y2={rightY + 30}
          stroke="#9ca3af"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ x1: rightX - 30, y1: rightY + 30, x2: rightX + 30, y2: rightY + 30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />

        {/* 左托盘上的物品 */}
        <motion.text
          x={leftX}
          y={leftY + 22}
          textAnchor="middle"
          className="text-lg"
          animate={{ x: leftX, y: leftY + 22 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {leftEmoji}
        </motion.text>
        <motion.text
          x={leftX}
          y={leftY + 42}
          textAnchor="middle"
          className="text-[10px]"
          fill="#374151"
          fontWeight={700}
          animate={{ x: leftX, y: leftY + 42 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          ×{leftCount}
        </motion.text>

        {/* 右托盘上的物品 */}
        <motion.text
          x={rightX}
          y={rightY + 22}
          textAnchor="middle"
          className="text-lg"
          animate={{ x: rightX, y: rightY + 22 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {rightEmoji}
        </motion.text>
        <motion.text
          x={rightX}
          y={rightY + 42}
          textAnchor="middle"
          className="text-[10px]"
          fill="#374151"
          fontWeight={700}
          animate={{ x: rightX, y: rightY + 42 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          ×{rightCount}
        </motion.text>
      </svg>

      {/* 文字标签 */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600 font-medium">
          {leftLabel || `${leftCount} ${leftEmoji}`}
        </span>
        <motion.span
          className={`text-lg font-bold px-2 ${isBalanced ? 'text-green-600' : 'text-red-500'}`}
          animate={{ scale: isBalanced ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: isBalanced ? Infinity : 0, duration: 1.5 }}
        >
          {isBalanced ? '=' : leftHeavier ? '>' : '<'}
        </motion.span>
        <span className="text-gray-600 font-medium">
          {rightLabel || `${rightCount} ${rightEmoji}`}
        </span>
      </div>

      {/* 比较结论 */}
      {!isBalanced && (
        <p className="text-sm text-gray-500 mt-1">
          {leftHeavier
            ? `左边比右边多 ${leftCount - rightCount} 个`
            : `右边比左边多 ${rightCount - leftCount} 个`}
        </p>
      )}
      {isBalanced && (
        <p className="text-sm text-green-600 font-bold mt-1">两边一样多，天平平衡！</p>
      )}
    </motion.div>
  );
}
