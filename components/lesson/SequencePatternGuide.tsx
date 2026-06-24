'use client';

import { useState } from 'react';
import type { Question } from '@/lib/types';
import DetectiveMascot from '@/components/DetectiveMascot';
import HintSystem from '@/components/lesson/HintSystem';
import MultiAnswerInput from '@/components/lesson/MultiAnswerInput';
import { resolveAnswerType } from '@/lib/answerChecker';

interface SequencePatternGuideProps {
  question: Question;
  phase: string;
  gradeBand?: string;
  onPhaseAdvance: () => void;
  onPhaseBack?: () => void;
  onSubmitAnswer?: (inputAnswer: string, questionId: string) => void;
}

/**
 * 等差数列/规律题引导组件 (v2.7)
 *
 * 用于 problemType === 'sequence_arithmetic' 或 'pattern'。
 *
 * 分层解释：
 * - G1/G2: 不讲公式，用逐步数和配对法
 * - G3+: 可以展示公式，但先解释来源
 */
export default function SequencePatternGuide({
  question,
  phase,
  gradeBand = 'G1',
  onPhaseAdvance,
  onPhaseBack,
  onSubmitAnswer,
}: SequencePatternGuideProps) {
  const isLowGrade = gradeBand === 'G1' || gradeBand === 'G2';

  // 解析数列信息
  const numbers = question.numbers || [];
  const seqNumbers = numbers.filter(n => n !== Math.max(...numbers)); // 排除 "20" 这个索引
  const targetN = numbers[numbers.length - 1]; // 最后一个通常是目标项数

  // 计算公差
  let commonDiff = 0;
  if (seqNumbers.length >= 2) {
    commonDiff = seqNumbers[1] - seqNumbers[0];
  }

  // 计算第N项和前N项和
  const firstTerm = seqNumbers[0] || 0;
  const nthTerm = firstTerm + (targetN - 1) * commonDiff;
  const seqSum = ((firstTerm + nthTerm) * targetN) / 2;

  // Phase: read
  if (phase === 'read') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="thinking" size="md" message="仔细看这列数，找出它的规律！" />
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <h3 className="font-extrabold text-amber-800 text-lg mb-3">📋 案件卷宗</h3>
          <p className="text-gray-800 text-base leading-relaxed">{question.text}</p>
        </div>
        {/* 轻提示 */}
        <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
          <h4 className="font-bold text-blue-700 text-sm mb-1">💡 小提示</h4>
          <p className="text-blue-600 text-sm">
            先看看每两个相邻数字之间差多少。
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onPhaseAdvance}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg shadow-md transition-colors"
          >
            读懂了，开始找规律！🔍
          </button>
        </div>
      </div>
    );
  }

  // Phase: understand_clues — 展示规律分析
  if (phase === 'understand_clues' || phase === 'find_numbers' || phase === 'find_keywords') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="thinking" size="md" message="先看看相邻两个数之间有什么规律？" />

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
          <h3 className="font-extrabold text-blue-800 text-lg mb-3">🔢 数列的规律</h3>

          {/* 展示相邻差 */}
          <div className="space-y-2 mb-4">
            {seqNumbers.slice(0, -1).map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-base">
                <span className="px-2 py-1 bg-amber-100 rounded-lg font-bold text-amber-700">{n}</span>
                <span className="text-gray-500">→</span>
                <span className="px-2 py-1 bg-amber-100 rounded-lg font-bold text-amber-700">{seqNumbers[i + 1]}</span>
                <span className="text-green-600 font-bold">多了 {seqNumbers[i + 1] - n}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-3 text-base">
            <span className="font-bold text-blue-600">发现：</span>
            <span className="text-gray-700">每次都多 <span className="font-extrabold text-amber-600">{commonDiff}</span></span>
          </div>
        </div>

        {/* 分层提示 */}
        <HintSystem
          question={question}
          phase={phase}
          lightHint="先看看每两个相邻数字之间差多少。"
          mediumHint="从3到7多了4，从7到11也多了4。每次都多4！"
          fullSteps={question.structuredHints?.fullSteps}
        />

        <div className="flex justify-between">
          {onPhaseBack && (
            <button onClick={onPhaseBack} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors">
              ← 返回读题
            </button>
          )}
          <button onClick={onPhaseAdvance} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg shadow-md transition-colors">
            规律找到了！🔍
          </button>
        </div>
      </div>
    );
  }

  // Phase: logic_elimination / choose_operation — 分步推理
  if (phase === 'logic_elimination' || phase === 'choose_operation' || phase === 'build_equation') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="thinking" size="md" message={isLowGrade ? "一步一步来，先算第20个数！" : "用公式算出第20个数和前20个数的和！"} />

        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5">
          <h3 className="font-extrabold text-purple-800 text-lg mb-3">🧠 分步推理</h3>

          {isLowGrade ? (
            /* G1/G2: 不讲公式，用逐步法 */
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-bold text-purple-700 mb-2">第1步：找规律</h4>
                <p className="text-gray-700 text-base">
                  每次多 <span className="font-extrabold text-amber-600">{commonDiff}</span>。
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-bold text-purple-700 mb-2">第2步：数一数</h4>
                <p className="text-gray-700 text-base">
                  第1个：{firstTerm}，第2个：{firstTerm + commonDiff}，第3个：{firstTerm + commonDiff * 2}……
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-bold text-purple-700 mb-2">第3步：算第{targetN}个</h4>
                <p className="text-gray-700 text-base">
                  从第1个到第{targetN}个，走了 {targetN - 1} 次，每次多{commonDiff}。
                </p>
                <p className="text-gray-700 text-base mt-1">
                  所以第{targetN}个比第1个多：{targetN - 1} × {commonDiff} = {(targetN - 1) * commonDiff}
                </p>
                <p className="text-gray-700 text-base mt-1">
                  第{targetN}个 = {firstTerm} + {(targetN - 1) * commonDiff} = <span className="font-extrabold text-amber-600">{nthTerm}</span>
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-bold text-purple-700 mb-2">第4步：算前{targetN}个数的和</h4>
                <p className="text-gray-700 text-base">
                  配对法：第1个 + 第{targetN}个 = {firstTerm} + {nthTerm} = {firstTerm + nthTerm}
                </p>
                <p className="text-gray-700 text-base mt-1">
                  第2个 + 第{targetN - 1}个 = {firstTerm + commonDiff} + {nthTerm - commonDiff} = {firstTerm + nthTerm}
                </p>
                <p className="text-gray-700 text-base mt-1">
                  每一对都是 {firstTerm + nthTerm}！
                </p>
                <p className="text-gray-700 text-base mt-1">
                  {targetN}个数可以分成 {targetN / 2} 对。
                </p>
                <p className="text-gray-700 text-base mt-1">
                  总和 = {firstTerm + nthTerm} × {targetN / 2} = <span className="font-extrabold text-amber-600">{seqSum}</span>
                </p>
              </div>
            </div>
          ) : (
            /* G3+: 展示公式 */
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-bold text-purple-700 mb-2">第{targetN}项公式</h4>
                <p className="text-gray-700 text-base">
                  a<sub>{targetN}</sub> = {firstTerm} + ({targetN} - 1) × {commonDiff} = {firstTerm} + {(targetN - 1) * commonDiff} = <span className="font-extrabold text-amber-600">{nthTerm}</span>
                </p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-bold text-purple-700 mb-2">前{targetN}项和公式</h4>
                <p className="text-gray-700 text-base">
                  S<sub>{targetN}</sub> = ({firstTerm} + {nthTerm}) × {targetN} ÷ 2 = {firstTerm + nthTerm} × {targetN} ÷ 2 = <span className="font-extrabold text-amber-600">{seqSum}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 分层提示 */}
        <HintSystem
          question={question}
          phase={phase}
          lightHint="先看看每两个相邻数字之间差多少。"
          mediumHint="从3到7多了4，从7到11也多了4。每次都多4！"
          fullSteps={question.structuredHints?.fullSteps}
        />

        <div className="flex justify-between">
          {onPhaseBack && (
            <button onClick={onPhaseBack} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors">
              ← 返回找规律
            </button>
          )}
          <button onClick={onPhaseAdvance} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg shadow-md transition-colors">
            推理完成！✨
          </button>
        </div>
      </div>
    );
  }

  // Phase: answer — 多答案输入
  if (phase === 'answer' || phase === 'ranking_answer') {
    const answerType = resolveAnswerType(question);

    if (answerType === 'multi_answer' && question.subAnswers?.length) {
      return (
        <div className="space-y-6">
          <DetectiveMascot mood="excited" size="md" message="把你的答案填进去吧！" />
          <MultiAnswerInput
            question={question}
            onSubmit={(input, qId) => {
              if (onSubmitAnswer) {
                // 将多答案转为 JSON 字符串传递给统一事务
                onSubmitAnswer(JSON.stringify(input), qId);
              }
            }}
          />
        </div>
      );
    }

    // 降级：单答案输入
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="excited" size="md" message="算出答案了吗？填进去吧！" />
        <SingleAnswerFallback
          question={question}
          onSubmit={(val) => {
            if (onSubmitAnswer) onSubmitAnswer(val, question.id);
          }}
        />
      </div>
    );
  }

  // Phase: explain — 展示完整推理
  if (phase === 'explain') {
    return (
      <div className="space-y-6">
        <DetectiveMascot mood="excited" size="md" message="太棒了！来看看完整的推理过程吧！" />

        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5">
          <h3 className="font-extrabold text-green-800 text-lg mb-3">🎯 完整推理</h3>
          <p className="text-gray-800 text-base leading-relaxed mb-4">{question.explanation}</p>

          {question.subAnswers?.length ? (
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
              <h4 className="font-extrabold text-green-700 mb-2">最终答案</h4>
              {question.subAnswers.map(sub => (
                <p key={sub.id} className="text-base">
                  <span className="font-bold text-blue-600">{sub.label}：</span>
                  <span className="font-extrabold text-amber-600">{sub.answer}{sub.unit || ''}</span>
                </p>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-extrabold text-green-700 mb-2">最终答案</h4>
              <p className="text-lg font-extrabold text-amber-600">{question.answerSentence}</p>
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
      <DetectiveMascot mood="thinking" size="md" message="正在加载数列分析..." />
      <p className="text-sm text-gray-500 mt-2">phase: {phase}</p>
      <button onClick={onPhaseAdvance} className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-xl">
        继续
      </button>
    </div>
  );
}

// ========== 单答案降级组件 ==========

function SingleAnswerFallback({ onSubmit }: { question: Question; onSubmit: (val: string) => void }) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!value.trim() || submitted) return;
    setSubmitted(true);
    onSubmit(value.trim());
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={submitted}
        className="w-full p-3 text-lg font-bold rounded-xl border-2 border-amber-300 bg-white text-center focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        placeholder="输入答案"
      />
      <div className="mt-3 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || submitted}
          className={`px-8 py-3 font-bold rounded-xl text-lg shadow-md transition-colors ${
            value.trim() && !submitted
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          提交答案
        </button>
      </div>
    </div>
  );
}
