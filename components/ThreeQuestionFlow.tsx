'use client';

/**
 * v2.10.0 Sub-project B: Three Question Flow Component
 *
 * Handles all 6 phases of the three-question method:
 *   known_facts → target → plan → answer → check → explain
 *
 * Critical rule: NO phase returns null. Every phase renders visible content.
 * Default case renders a safe fallback, not null.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, CheckCircle, HelpCircle } from 'lucide-react';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import BottomActionBar from '@/components/layout/BottomActionBar';
import type { Question } from '@/lib/types';
import type { ReasoningFrame } from '@/lib/curriculum/types';
import { checkAnswer } from '@/lib/answerChecker';

export type ThreeQuestionPhase =
  | 'known_facts'
  | 'target'
  | 'plan'
  | 'answer'
  | 'check'
  | 'explain';

interface ThreeQuestionFlowProps {
  question: Question;
  phase: ThreeQuestionPhase;
  reasoningFrame: ReasoningFrame;
  onCorrect: (correct: boolean) => void;
  onPhaseAdvance: () => void;
}

/**
 * Check if a question is compatible with the three-question method.
 * Only word problems / applied problems use this flow.
 * Pure calculation, pattern, shape, etc. should use the standard flow.
 */
export function isThreeQuestionFlowCompatible(question: Question): boolean {
  // Must have reasoningFrame data
  if (!(question as any).reasoningFrame) return false;

  const rf = (question as any).reasoningFrame as ReasoningFrame | undefined;
  if (!rf?.knownFacts?.length) return false;
  if (!rf?.targetQuestion) return false;
  if (!rf?.plan) return false;

  // Not compatible for pure calculation types
  if (question.problemType === 'basic_arithmetic' && question.domain === 'addition_subtraction') {
    // Only if it's a word problem with scene, not a bare equation
    return question.text.length > 15 && !question.equation.startsWith(question.numbers[0]?.toString() || '');
  }

  // Always compatible for applied problems
  const compatibleTypes = ['word_problem', 'two_step_word_problem', 'multi_step', 'information_check'];
  if (compatibleTypes.includes(question.problemType || '')) return true;

  // Compatible for money, comparison, unknown
  const compatibleDomains = ['money', 'comparison', 'logic', 'reasoning'];
  if (compatibleDomains.includes(question.domain)) return true;

  // Default: compatible if it has a reasoningFrame
  return true;
}

export default function ThreeQuestionFlow({
  question,
  phase,
  reasoningFrame,
  onCorrect,
  onPhaseAdvance,
}: ThreeQuestionFlowProps) {
  const [selectedKnownFactIds, setSelectedKnownFactIds] = useState<string[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [checkComplete, setCheckComplete] = useState(false);

  switch (phase) {
    // ===== Phase 1: known_facts =====
    case 'known_facts': {
      const allSelected = selectedKnownFactIds.length === reasoningFrame.knownFacts.length;
      return (
        <div className="space-y-4">
          <AppCard variant="purple">
            <h3 className="font-extrabold text-purple-800 mb-2">① 题目告诉了我们什么？</h3>
            <p className="text-sm text-gray-600 mb-3">{question.text}</p>
            <div className="space-y-2">
              {reasoningFrame.knownFacts.map((fact, i) => {
                const key = `fact-${i}`;
                const isSelected = selectedKnownFactIds.includes(key);
                return (
                  <motion.button
                    key={key}
                    className={`w-full p-3 rounded-xl text-left border-2 transition-all ${
                      isSelected
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}
                    onClick={() => {
                      setSelectedKnownFactIds(prev =>
                        isSelected
                          ? prev.filter(id => id !== key)
                          : [...prev, key]
                      );
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="font-bold">{fact.role}：</span>
                    {fact.text}
                  </motion.button>
                );
              })}
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={!allSelected}
              onClick={onPhaseAdvance}
            >
              全部找到 ✓ 下一步 →
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }

    // ===== Phase 2: target =====
    case 'target': {
      const targetOptions = [
        reasoningFrame.targetQuestion.text,
        `计算${reasoningFrame.targetQuestion.targetQuantity}`,
        `找到题目中的数字`,
      ];
      const correctIdx = 0;
      return (
        <div className="space-y-4">
          <AppCard variant="purple">
            <h3 className="font-extrabold text-purple-800 mb-2">② 题目让我们干什么？</h3>
            <p className="text-sm text-gray-600 mb-3">{question.text}</p>
            <div className="space-y-2">
              {targetOptions.map((opt, i) => (
                <motion.button
                  key={i}
                  className={`w-full p-3 rounded-xl text-left border-2 transition-all ${
                    selectedTargetId === i
                      ? i === correctIdx
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'bg-red-50 border-red-400 text-red-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedTargetId(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={selectedTargetId === null}
              onClick={onPhaseAdvance}
            >
              明确目标 ✓ 下一步 →
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }

    // ===== Phase 3: plan =====
    case 'plan': {
      const planOptions = [
        reasoningFrame.plan.firstStep,
        `直接计算答案`,
        `重新读一遍题目`,
      ];
      const correctIdx = 0;
      return (
        <div className="space-y-4">
          <AppCard variant="purple">
            <h3 className="font-extrabold text-purple-800 mb-2">③ 我准备怎么做？</h3>
            <p className="text-sm text-gray-600 mb-3">{question.text}</p>
            <p className="text-sm text-gray-500 mb-2">
              {reasoningFrame.plan.operationReason}
            </p>
            <div className="space-y-2">
              {planOptions.map((opt, i) => (
                <motion.button
                  key={i}
                  className={`w-full p-3 rounded-xl text-left border-2 transition-all ${
                    selectedPlanId === i
                      ? i === correctIdx
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'bg-red-50 border-red-400 text-red-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedPlanId(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={selectedPlanId === null}
              onClick={onPhaseAdvance}
            >
              规划完成 ✓ 计算答案 →
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }

    // ===== Phase 4: answer =====
    case 'answer': {
      return (
        <div className="space-y-4">
          <AppCard variant="purple">
            <h3 className="font-extrabold text-purple-800 mb-2">④ 计算答案</h3>
            <p className="text-sm text-gray-600 mb-3">{question.text}</p>
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">{question.operation === 'addition' ? '加法' : '减法'}</p>
              <p className="text-2xl font-extrabold text-amber-600 mb-4">
                {question.equation.replace('?', '___')}
              </p>
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const ans = checkAnswer(userAnswer, question);
                    onCorrect(ans.correct);
                  }
                }}
                placeholder="输入答案"
                className="w-32 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
                autoFocus
              />
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton
              variant="success"
              size="lg"
              fullWidth
              disabled={!userAnswer.trim()}
              onClick={() => {
                const ans = checkAnswer(userAnswer, question);
                onCorrect(ans.correct);
              }}
            >
              提交答案
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }

    // ===== Phase 5: check =====
    case 'check': {
      return (
        <div className="space-y-4">
          <AppCard variant="purple">
            <h3 className="font-extrabold text-purple-800 mb-2">⑤ 检查我的答案</h3>
            <p className="text-sm text-gray-600 mb-3">{question.text}</p>
            <div className="space-y-2">
              {[
                { text: '我的答案回答了题目问的问题', key: 'answered' },
                { text: '单位书写正确', key: 'unit' },
                { text: '结果看起来合理', key: 'reasonable' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    id={`check-${item.key}`}
                    className="w-5 h-5 accent-green-500"
                    checked={checkComplete}
                    onChange={() => setCheckComplete(!checkComplete)}
                  />
                  <label htmlFor={`check-${item.key}`} className="text-gray-700">{item.text}</label>
                </div>
              ))}
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={!checkComplete}
              onClick={onPhaseAdvance}
            >
              检查完毕 ✓ 看解析 →
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }

    // ===== Phase 6: explain =====
    case 'explain': {
      return (
        <div className="space-y-4">
          <AppCard variant="green">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-xl font-extrabold text-green-700">三问法破案成功！</h3>
              <p className="text-gray-600 mt-2">{question.explanation}</p>
              {question.solutionSteps?.map((step, i) => (
                <div key={i} className="flex items-center gap-2 p-2 mt-1">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-gray-600">{step}</span>
                </div>
              ))}
              <div className="mt-3 p-3 bg-white rounded-xl text-lg font-extrabold text-amber-600">
                {question.equation.replace('?', String(question.answer))}
              </div>
              <p className="text-sm text-green-600 mt-2">{question.answerSentence}</p>
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
              完成，进入下一关 →
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }

    // ===== SAFETY NET: Never return null =====
    default: {
      return (
        <div className="space-y-4">
          <AppCard variant="amber">
            <div className="text-center py-4">
              <HelpCircle size={32} className="mx-auto mb-2 text-amber-500" />
              <h3 className="text-xl font-extrabold text-amber-700">准备中...</h3>
              <p className="text-gray-600 mt-2">{question.text}</p>
              <div className="mt-3 p-3 bg-white rounded-xl text-lg font-extrabold text-amber-600">
                {question.equation.replace('?', '___')}
              </div>
            </div>
          </AppCard>
          <BottomActionBar>
            <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
              继续 →
            </AppButton>
          </BottomActionBar>
        </div>
      );
    }
  }
}
