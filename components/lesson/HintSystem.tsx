'use client';

/**
 * HintSystem — 统一分层提示组件 (v2.6.7 新增)
 *
 * 设计原则：
 * - 答题前不自动展示提示；课程帮助由独立互动任务驱动
 * - medium 需要点击"再给一点提示"
 * - 完整讲解必须由终结回调处理并先持久化，不在此组件内直接展开
 * - explain 阶段可展示完整推导
 */

import React, { useState, useCallback } from 'react';
import type { StepPhase } from '@/lib/types';
import type { SolutionStepDetailed } from '@/lib/types';
import { renderSafePreAnswerText } from '@/lib/hintSafety';
import type { Question } from '@/lib/types';

export interface HintSystemProps {
  question: Question;
  /** 当前阶段 */
  phase: StepPhase;
  /** 轻量提示文本 */
  lightHint: string;
  /** 中等提示文本 */
  mediumHint?: string;
  /** 完整步骤（仅在用户点击"看完整推理"或 explain 阶段展示） */
  fullSteps?: SolutionStepDetailed[];
  /** 是否允许直接展示完整提示（答题后或 explain 阶段） */
  allowFullHint?: boolean;
  /** 错误次数（用于递进提示） */
  wrongAttempts?: number;
  /** 点击完整推理时的回调（用于记录 usedFullHint） */
  onFullHintRequested?: () => void;
  onHintLevelUsed?: (level: 'medium' | 'full') => void;
  /** 自定义组件类名 */
  className?: string;
}

export default function HintSystem({
  question,
  phase,
  lightHint,
  mediumHint,
  fullSteps,
  onFullHintRequested,
  className = '',
}: HintSystemProps) {
  const [showMedium, setShowMedium] = useState(false);

  // explain 阶段直接显示完整推理
  const isExplain = phase === 'explain';
  const canShowFull = isExplain;

  // 安全渲染 light hint
  const safeLight = renderSafePreAnswerText(lightHint, question, isExplain);

  // 安全渲染 medium hint
  const safeMedium = mediumHint
    ? renderSafePreAnswerText(mediumHint, question, isExplain)
    : null;

  const handleFullHintClick = useCallback(() => onFullHintRequested?.(), [onFullHintRequested]);

  // 根据错误次数决定是否主动显示 medium

  // 判断是否有完整步骤
  const hasFullSteps = fullSteps && fullSteps.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 答题前的提示由互动求助流程提供。 */}
      {isExplain && safeLight && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0 mt-0.5">💡</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-blue-500 mb-1">小提示</div>
              <p className="text-sm text-blue-800 leading-relaxed">{safeLight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Medium Hint — 需要点击或答错2次以上 */}
      {isExplain && safeMedium && (
        <>
          {!showMedium ? (
            <button
              data-testid="hint-next"
              type="button"
              onClick={() => setShowMedium(true)}
              className="min-h-11 w-full text-center text-sm text-blue-600 font-bold py-2 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              💡 再给一点提示
            </button>
          ) : (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 animate-fadeIn">
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">🔍</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-purple-500 mb-1">更多提示</div>
                  <p className="text-sm text-purple-800 leading-relaxed">{safeMedium}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Full Steps — 需要点击"看完整推理"或 explain 阶段 */}
      {hasFullSteps && !canShowFull && !isExplain && onFullHintRequested && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleFullHintClick}
            className="min-h-11 text-sm text-amber-700 font-bold py-2 px-4 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
          >
            📝 这题我不会，查看完整讲解
          </button>
        </div>
      )}

      {/* 完整步骤展示 */}
      {canShowFull && hasFullSteps && (
        <div className="p-3 bg-green-50 rounded-xl border border-green-200 animate-fadeIn">
          <h4 className="text-sm font-extrabold text-green-700 mb-3 flex items-center gap-1">
            📝 一步一步想
          </h4>
          <div className="space-y-2">
            {fullSteps!.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-green-800">{step.stepTitle}</span>
                  {step.explanation && (
                    <span className="text-gray-700">：{step.explanation}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* explain 阶段 — 直接展示完整推导 */}
      {isExplain && !hasFullSteps && (
        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0 mt-0.5">✅</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-green-600 mb-1">解析</div>
              <p className="text-sm text-green-800 leading-relaxed">
                {question.explanation || '这道题我们用学过的知识就能解答。'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
