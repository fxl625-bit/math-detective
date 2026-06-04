'use client';

import { useState } from 'react';
import type { Question, SubAnswer } from '@/lib/types';
import { checkMultiAnswer, type AnswerCheckResult } from '@/lib/answerChecker';

interface MultiAnswerInputProps {
  question: Question;
  onSubmit: (input: Record<string, string>, questionId: string) => void;
  onWrongAnswer?: (input: Record<string, string>) => void;
}

/**
 * 多答案输入组件 (v2.7)
 *
 * 当 answerType === 'multi_answer' 时使用。
 * 根据 question.subAnswers 动态生成多个输入框。
 */
export default function MultiAnswerInput({ question, onSubmit, onWrongAnswer }: MultiAnswerInputProps) {
  const subAnswers = question.subAnswers || [];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sub of subAnswers) {
      init[sub.id] = '';
    }
    return init;
  });
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AnswerCheckResult | null>(null);
  const [shakeFields, setShakeFields] = useState<Set<string>>(new Set());

  const allFilled = subAnswers.every(s => values[s.id]?.trim());

  const handleChange = (id: string, val: string) => {
    if (submitted) return;
    setValues(prev => ({ ...prev, [id]: val }));
    setResult(null);
  };

  const handleSubmit = () => {
    if (!allFilled || submitted) return;

    const checkResult = checkMultiAnswer(values, question);
    setResult(checkResult);

    if (checkResult.correct) {
      setSubmitted(true);
      onSubmit(values, question.id);
    } else {
      // 标记错误字段抖动
      const wrongIds = new Set<string>();
      if (checkResult.fieldResults) {
        for (const [id, fr] of Object.entries(checkResult.fieldResults)) {
          if (!fr.correct) wrongIds.add(id);
        }
      }
      setShakeFields(wrongIds);
      setTimeout(() => setShakeFields(new Set()), 500);

      if (onWrongAnswer) onWrongAnswer(values);
    }
  };

  if (submitted && result?.correct) {
    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="font-extrabold text-green-700 text-lg">全部回答正确！</h3>
        <div className="mt-3 space-y-2">
          {subAnswers.map(sub => (
            <div key={sub.id} className="bg-white rounded-xl p-3 text-base">
              <span className="font-bold text-blue-600">{sub.label}：</span>
              <span className="font-extrabold text-amber-600">{sub.answer}{sub.unit || ''}</span>
            </div>
          ))}
        </div>
        {question.answerSentence && (
          <p className="text-sm text-gray-600 mt-3">{question.answerSentence}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
        <h3 className="font-extrabold text-amber-800 text-lg mb-4">
          📝 这道题有 {subAnswers.length} 个问题，请分别回答：
        </h3>

        <div className="space-y-4">
          {subAnswers.map((sub, i) => {
            const isShaking = shakeFields.has(sub.id);
            const fieldCorrect = result?.fieldResults?.[sub.id]?.correct;

            return (
              <div key={sub.id}>
                <label className="block text-base font-bold text-gray-700 mb-1">
                  {i + 1}. {sub.label}：
                  {sub.unit && <span className="text-gray-500 font-normal">（单位：{sub.unit}）</span>}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={values[sub.id] || ''}
                  onChange={e => handleChange(sub.id, e.target.value)}
                  disabled={submitted}
                  className={`w-full p-3 text-lg font-bold rounded-xl border-2 text-center transition-all ${
                    isShaking
                      ? 'border-red-400 bg-red-50 animate-[shake_0.3s]'
                      : fieldCorrect === true
                      ? 'border-green-400 bg-green-50'
                      : fieldCorrect === false
                      ? 'border-red-400 bg-red-50'
                      : 'border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                  }`}
                  placeholder={`输入${sub.label}`}
                />
              </div>
            );
          })}
        </div>

        {/* 反馈信息 */}
        {result && !result.correct && (
          <div className="mt-4 p-3 rounded-xl text-base font-bold bg-amber-100 text-amber-800 border-2 border-amber-300">
            {result.feedback}
          </div>
        )}

        {/* 提交按钮 */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!allFilled || submitted}
            className={`px-8 py-3 font-bold rounded-xl text-lg shadow-md transition-colors ${
              allFilled && !submitted
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            提交答案
          </button>
        </div>
      </div>
    </div>
  );
}
