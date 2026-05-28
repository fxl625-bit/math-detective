'use client';

import { motion } from 'framer-motion';

interface NumberLineProps {
  range: [number, number];
  operation?: {
    type: 'add' | 'subtract';
    from: number;
    amount: number;
  };
  highlighted?: number[];
  compact?: boolean;
  className?: string;
}

export default function NumberLine({
  range,
  operation,
  highlighted = [],
  compact = false,
  className = '',
}: NumberLineProps) {
  const [start, end] = range;
  const tickCount = end - start + 1;
  const padding = compact ? 20 : 30;
  const svgWidth = compact ? 300 : 500;
  const svgHeight = compact ? 70 : 100;
  const lineY = compact ? 45 : 55;
  const usableWidth = svgWidth - padding * 2;
  const tickSpacing = usableWidth / (tickCount - 1 || 1);

  const x = (n: number) => padding + (n - start) * tickSpacing;

  const highlightedSet = new Set(highlighted);

  return (
    <motion.div
      className={`flex flex-col items-center ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={`w-full ${compact ? 'max-w-xs' : 'max-w-md'}`}
        role="img"
        aria-label={`数轴 ${start} 到 ${end}`}
      >
        {/* 水平线 */}
        <line
          x1={padding - 8}
          y1={lineY}
          x2={x(end) + 8}
          y2={lineY}
          stroke="#d1d5db"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* 左箭头 */}
        <polygon
          points={`${padding - 14},${lineY} ${padding - 4},${lineY - 4} ${padding - 4},${lineY + 4}`}
          fill="#9ca3af"
        />
        {/* 右箭头 */}
        <polygon
          points={`${x(end) + 14},${lineY} ${x(end) + 4},${lineY - 4} ${x(end) + 4},${lineY + 4}`}
          fill="#9ca3af"
        />

        {/* 刻度标记和数字 */}
        {Array.from({ length: tickCount }, (_, i) => start + i).map(n => {
          const isHighlighted = highlightedSet.has(n);
          const isResult = operation && n === (operation.type === 'add' ? operation.from + operation.amount : operation.from - operation.amount);
          const isStart = operation && n === operation.from;

          return (
            <g key={n}>
              {/* 刻度线 */}
              <line
                x1={x(n)}
                y1={lineY - (isHighlighted ? 12 : 8)}
                x2={x(n)}
                y2={lineY + (isHighlighted ? 12 : 8)}
                stroke={isStart ? '#3b82f6' : isResult ? '#22c55e' : isHighlighted ? '#f59e0b' : '#9ca3af'}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeLinecap="round"
              />
              {/* 刻度标签 */}
              <text
                x={x(n)}
                y={lineY + (compact ? 20 : 26)}
                textAnchor="middle"
                className={`${compact ? 'text-[10px]' : 'text-xs'}`}
                fill={isStart ? '#3b82f6' : isResult ? '#16a34a' : '#6b7280'}
                fontWeight={isHighlighted ? 700 : 400}
              >
                {n}
              </text>
              {/* 高亮圆点 */}
              {isHighlighted && (
                <circle
                  cx={x(n)}
                  cy={lineY}
                  r={compact ? 6 : 8}
                  fill={isStart ? '#3b82f6' : isResult ? '#22c55e' : '#f59e0b'}
                  opacity="0.85"
                />
              )}
            </g>
          );
        })}

        {/* 运算弧线 */}
        {operation && (() => {
          const fromX = x(operation.from);
          const toX = operation.type === 'add'
            ? x(operation.from + operation.amount)
            : x(operation.from - operation.amount);
          const arcColor = operation.type === 'add' ? '#22c55e' : '#ef4444';
          const midX = (fromX + toX) / 2;
          const arcHeight = compact ? 22 : 32;

          return (
            <g>
              {/* 弧线 */}
              <motion.path
                d={`M ${fromX} ${lineY - 12} Q ${midX} ${lineY - 12 - arcHeight} ${toX} ${lineY - 12}`}
                fill="none"
                stroke={arcColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
              {/* 弧线箭头 */}
              <motion.polygon
                points={
                  toX > fromX
                    ? `${toX},${lineY - 12} ${toX - 6},${lineY - 16} ${toX - 6},${lineY - 8}`
                    : `${toX},${lineY - 12} ${toX + 6},${lineY - 16} ${toX + 6},${lineY - 8}`
                }
                fill={arcColor}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              />
              {/* 运算量标签 */}
              <motion.text
                x={midX}
                y={lineY - 12 - arcHeight - 4}
                textAnchor="middle"
                className={compact ? 'text-[10px]' : 'text-xs'}
                fill={arcColor}
                fontWeight={700}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                {operation.type === 'add' ? `+${operation.amount}` : `-${operation.amount}`}
              </motion.text>
            </g>
          );
        })()}
      </svg>
    </motion.div>
  );
}
