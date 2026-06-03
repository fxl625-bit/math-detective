'use client';

import React, { useState, useMemo } from 'react';
import { Question, RankingOption, SolutionStepDetailed, Statement } from '@/lib/types';
import DetectiveMascot from './DetectiveMascot';

interface LogicRankingGuideProps {
  question: Question;
  phase: string;
  onPhaseAdvance: () => void;
  onPhaseBack?: () => void;
  onSubmitAnswer?: (inputAnswer: string, questionId: string) => void;
}

type HintLevelShown = 'none' | 'light' | 'medium' | 'full';

export default function LogicRankingGuide({
  question,
  phase,
  onPhaseAdvance,
  onPhaseBack,
  onSubmitAnswer,
}: LogicRankingGuideProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintLevel, setHintLevel] = useState<HintLevelShown>('light');
  const [submitted, setSubmitted] = useState(false);

  const people = question.people || [];
  const statements = question.statements || [];
  const structuredHints = question.structuredHints;
  const rankingOptions: RankingOption[] = question.rankingOptions || [];
  const correctRanking = question.correctRanking;

  // v2.6.6: 使用题目自带的 rankingOptions，不再运行时生成
  // 如果没有 rankingOptions，fallback 生成简单选项
  const displayOptions: RankingOption[] = useMemo(() => {
    if (rankingOptions.length >= 2) return rankingOptions;
    if (!correctRanking || people.length < 2) return [];
    const order = correctRanking.order || [
      correctRanking.first, correctRanking.second, correctRanking.third,
      correctRanking.fourth, correctRanking.fifth,
    ].filter(Boolean) as string[];
    if (order.length < 2) return [];
    const correctLabel = order.map((name, i) => `第${i + 1}名：${name}`).join('，');
    return [{ id: 'A', label: correctLabel, order, correct: true }];
  }, [rankingOptions, correctRanking, people]);

  // Reset state when phase changes
  React.useEffect(() => {
    setSelectedOptionId(null);
    setFeedback(null);
    setIsCorrect(false);
    setSubmitted(false);
    if (phase === 'read') setHintLevel('light');
  }, [phase]);

  // ========== Hint helpers ==========

  const showLightHint = () => setHintLevel('light');
  const showMediumHint = () => setHintLevel('medium');
  const showFullHint = () => {
    setHintLevel('full');
    console.warn('[UX] User requested full reasoning before answering');
  };

  const handleSelectOption = (optionId: string) => {
    if (submitted) return;
    setSelectedOptionId(optionId);
    setFeedback(null);
  };

  const handleSubmitRanking = () => {
    if (!selectedOptionId || submitted) return;
    setSubmitted(true);

    const selected = displayOptions.find(o => o.id === selectedOptionId);
    if (!selected) return;

    if (selected.correct) {
      setIsCorrect(true);
      setFeedback('🎉 完全正确！你是个逻辑推理小侦探！');
      // 通知状态机
      if (onSubmitAnswer) {
        onSubmitAnswer(selected.order.join(','), question.id);
      }
      // 延迟推进到 explain
      setTimeout(() => onPhaseAdvance(), 600);
    } else {
      setIsCorrect(false);
      // 温和反馈，不直接爆答案
      const hintMessage = structuredHints?.medium ||
        '再想想哦~ 先看小红说的话，她不是第一，也不是最后。';
      setFeedback(hintMessage);
      // 允许重选
      setTimeout(() => setSubmitted(false), 800);
    }
  };

  const handleRetry = () => {
    setSelectedOptionId(null);
    setFeedback(null);
    setIsCorrect(false);
    setSubmitted(false);
  };

  // ========== Phase: read ==========
  if (phase === 'read') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="thinking" size="md" message="仔细读题，看看有哪些人物？他们说了什么？" />
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <h3 className="font-extrabold text-amber-800 text-lg mb-3">📋 案件卷宗</h3>
          <p className="text-gray-800 text-base leading-relaxed">{question.text}</p>
        </div>
        {/* 轻提示 */}
        <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
          <h4 className="font-bold text-blue-700 text-sm mb-1">💡 小提示</h4>
          <p className="text-blue-600 text-sm">
            {structuredHints?.light || '先想想题目在问什么。'}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={onPhaseAdvance}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg shadow-md transition-colors"
          >
            读懂了，开始推理！🔍
          </button>
        </div>
      </div>
    );
  }

  // ========== Phase: understand_clues ==========
  if (phase === 'understand_clues') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="thinking" size="md" message="先看看每个人说了什么，每句话告诉我们什么信息？" />

        {/* 人物列表 */}
        {people.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
            <h3 className="font-extrabold text-blue-800 text-lg mb-3">👥 人物</h3>
            <div className="flex flex-wrap gap-3">
              {people.map((person, i) => (
                <span key={i} className="px-4 py-2 bg-blue-100 text-blue-800 font-bold rounded-full text-base">
                  {person}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 陈述 — 不展示 means（那等同于答案） */}
        {statements.length > 0 && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5">
            <h3 className="font-extrabold text-purple-800 text-lg mb-3">🗣️ 话语线索</h3>
            <div className="space-y-3">
              {statements.map((s: Statement, i: number) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="font-bold text-purple-700 text-base mb-1">
                    {s.speaker}说：
                  </p>
                  <p className="text-gray-700 text-base italic">
                    &ldquo;{s.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 分层提示 */}
        <HintPanel
          level={hintLevel}
          structuredHints={structuredHints}
          onShowMedium={showMediumHint}
          onShowFull={showFullHint}
        />

        <div className="flex justify-between">
          {onPhaseBack && (
            <button onClick={onPhaseBack} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors">
              ← 返回读题
            </button>
          )}
          <button onClick={onPhaseAdvance} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg shadow-md transition-colors">
            线索都看懂了！🔍
          </button>
        </div>
      </div>
    );
  }

  // ========== Phase: logic_elimination — 不直接展示答案！ ==========
  if (phase === 'logic_elimination') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="thinking" size="md" message="用排除法，一步一步找出每个人的位置！" />

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <h3 className="font-extrabold text-amber-800 text-lg mb-3">🧠 怎么想？</h3>
          <p className="text-gray-700 text-base leading-relaxed">
            这道题不是直接算数字，而是要根据每个人说的话，用排除法一步一步推理。
          </p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>先看谁说的话最容易确定位置</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>排除掉不可能的位置</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>剩下就是正确答案</span>
            </li>
          </ul>
        </div>

        {/* 分层提示 — 这里不放完整步骤！ */}
        <HintPanel
          level={hintLevel}
          structuredHints={structuredHints}
          onShowMedium={showMediumHint}
          onShowFull={showFullHint}
        />

        <div className="flex justify-between">
          {onPhaseBack && (
            <button onClick={onPhaseBack} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors">
              ← 返回看线索
            </button>
          )}
          <button onClick={onPhaseAdvance} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg shadow-md transition-colors">
            我知道答案了！✨
          </button>
        </div>
      </div>
    );
  }

  // ========== Phase: ranking_answer — 选择题交互 ==========
  if (phase === 'ranking_answer') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="excited" size="md" message="选出正确的名次顺序吧！" />

        {/* 轻提示 */}
        {!submitted && (
          <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
            <h4 className="font-bold text-blue-700 text-sm mb-1">💡 小提示</h4>
            <p className="text-blue-600 text-sm">
              {structuredHints?.light || '先找谁的位置最容易确定。'}
            </p>
          </div>
        )}

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <h3 className="font-extrabold text-amber-800 text-lg mb-4">
            请选出正确的名次顺序
          </h3>

          {/* 排名选项 */}
          <div className="space-y-3 mb-4">
            {displayOptions.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isRevealed = submitted && option.correct;
              const isWrongSelected = submitted && !isCorrect && isSelected;

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  disabled={submitted}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all text-base font-bold ${
                    isRevealed
                      ? 'border-green-500 bg-green-50 text-green-800 ring-4 ring-green-200'
                      : isWrongSelected
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : isSelected
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-200 bg-white hover:border-amber-400 hover:bg-amber-50 text-gray-800'
                  } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="mr-3 text-lg font-extrabold">{option.id}.</span>
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* 反馈 */}
          {feedback && (
            <div className={`p-4 rounded-xl text-base font-bold mb-4 ${
              isCorrect
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : 'bg-amber-100 text-amber-800 border-2 border-amber-300'
            }`}>
              {feedback}
            </div>
          )}

          {/* 重试和提交按钮 */}
          <div className="flex justify-between">
            {onPhaseBack && !submitted && (
              <button onClick={onPhaseBack} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors">
                ← 再看看推理
              </button>
            )}
            {!isCorrect && submitted && (
              <button onClick={handleRetry} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors">
                🔄 再选一次
              </button>
            )}
            <button
              onClick={handleSubmitRanking}
              disabled={!selectedOptionId || submitted}
              className={`px-8 py-3 font-bold rounded-xl text-lg shadow-md transition-colors ${
                selectedOptionId && !submitted
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {submitted && isCorrect ? '✓ 回答正确！' : '提交答案'}
            </button>
          </div>

          {/* 提交后：允许看完整推理 */}
          {isCorrect && submitted && (
            <div className="mt-4 text-center">
              <button onClick={showFullHint} className="px-4 py-2 text-sm text-blue-600 underline hover:text-blue-800">
                看完整推理过程
              </button>
            </div>
          )}
        </div>

        {/* 如果用户在看答案前点了看完整推理 */}
        {hintLevel === 'full' && structuredHints?.fullSteps && (
          <FullReasoningPanel steps={structuredHints.fullSteps} />
        )}
      </div>
    );
  }

  // ========== Phase: explain — 展示完整推理 ==========
  if (phase === 'explain') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="excited" size="md" message="太棒了！来看看完整的推理过程吧！" />

        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5">
          <h3 className="font-extrabold text-green-800 text-lg mb-3">🎯 完整推理</h3>
          <p className="text-gray-800 text-base leading-relaxed mb-4">{question.explanation}</p>

          {structuredHints?.fullSteps && structuredHints.fullSteps.length > 0 && (
            <div className="space-y-3 mb-4">
              <h4 className="font-bold text-green-700">一步一步想：</h4>
              {structuredHints.fullSteps.map((step: SolutionStepDetailed, i: number) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-green-500 text-white font-bold rounded-full text-sm">
                      {i + 1}
                    </span>
                    <h3 className="font-extrabold text-green-800 text-base">{step.stepTitle}</h3>
                  </div>
                  <p className="text-gray-700 text-base leading-relaxed ml-11">{step.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {correctRanking && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-extrabold text-green-700 mb-2">最终名次</h4>
              <div className="space-y-1 text-base">
                <p>🥇 第一名：{correctRanking.first}</p>
                {correctRanking.second && <p>🥈 第二名：{correctRanking.second}</p>}
                {correctRanking.third && <p>🥉 第三名：{correctRanking.third}</p>}
                {correctRanking.fourth && <p>第四名：{correctRanking.fourth}</p>}
                {correctRanking.fifth && <p>第五名：{correctRanking.fifth}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onPhaseAdvance}
            className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl text-lg shadow-lg transition-colors"
          >
            学会了！继续破案 🎉
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="text-center p-8">
      <DetectiveMascot mood="thinking" size="md" message="正在加载逻辑推理..." />
    </div>
  );
}

// ========== 分层提示面板 ==========

function HintPanel({
  level,
  structuredHints,
  onShowMedium,
  onShowFull,
}: {
  level: HintLevelShown;
  structuredHints?: Question['structuredHints'];
  onShowMedium: () => void;
  onShowFull: () => void;
}) {
  // 未初始化
  if (level === 'none') return null;

  return (
    <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4 space-y-3">
      <h4 className="font-bold text-blue-700 text-sm">💡 小提示</h4>

      {/* Light — 始终显示 */}
      <p className="text-blue-600 text-sm">
        {structuredHints?.light || '先看谁的位置最容易确定。'}
      </p>

      {/* Medium — 用户点击后显示 */}
      {level === 'medium' && structuredHints?.medium && (
        <div className="bg-white border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">{structuredHints.medium}</p>
        </div>
      )}

      {/* Full — 用户点击"看完整推理"后显示 */}
      {level === 'full' && structuredHints?.fullSteps && (
        <FullReasoningPanel steps={structuredHints.fullSteps} />
      )}

      {/* 按钮 */}
      <div className="flex flex-wrap gap-2">
        {level === 'light' && structuredHints?.medium && (
          <button
            onClick={onShowMedium}
            className="px-3 py-1.5 text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            💡 再给一点提示
          </button>
        )}
        {(level === 'light' || level === 'medium') && structuredHints?.fullSteps && (
          <button
            onClick={onShowFull}
            className="px-3 py-1.5 text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
          >
            🔍 看完整推理
          </button>
        )}
      </div>
    </div>
  );
}

// ========== 完整推理面板 ==========

function FullReasoningPanel({ steps }: { steps: SolutionStepDetailed[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 space-y-3">
      <h4 className="font-extrabold text-purple-800 text-sm">📝 一步一步想</h4>
      {steps.map((step: SolutionStepDetailed, i: number) => (
        <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-6 h-6 bg-purple-500 text-white font-bold rounded-full text-xs">
              {i + 1}
            </span>
            <h5 className="font-bold text-purple-700 text-sm">{step.stepTitle}</h5>
          </div>
          <p className="text-gray-700 text-sm ml-8">{step.explanation}</p>
        </div>
      ))}
    </div>
  );
}
