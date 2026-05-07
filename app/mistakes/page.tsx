'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RotateCcw, Check, Dumbbell } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import DetectiveMascot from '@/components/DetectiveMascot';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import PageContainer from '@/components/layout/PageContainer';
import { getQuestionById } from '@/data/questions';
import { generateReinforceChallenge, type ReinforceChallenge } from '@/lib/mistakeReinforce';

export default function MistakesPage() {
  const { state, completeQuestion, retryCorrect } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});
  const [retryResults, setRetryResults] = useState<Record<string, boolean>>({});
  const [reinforceChallenges, setReinforceChallenges] = useState<Record<string, ReinforceChallenge | null>>({});
  const [activeReinforce, setActiveReinforce] = useState<string | null>(null);
  const [reinforceAnswers, setReinforceAnswers] = useState<Record<string, string>>({});
  const [reinforceDone, setReinforceDone] = useState<Record<string, boolean>>({});
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-screen" />;

  const mistakes = [...state.mistakes].reverse();

  function startReinforce(recordId: string, qId: string) {
    const mistake = state.mistakes.find(m => m.questionId + '_' + m.date === recordId);
    if (!mistake) return;
    const challenge = generateReinforceChallenge(mistake, state.completedQuestions);
    setReinforceChallenges(prev => ({ ...prev, [recordId]: challenge }));
    setActiveReinforce(recordId);
    setReinforceAnswers({});
    setReinforceDone({});
  }

  function submitReinforceAnswer(recordId: string, qIdx: number, userAnswer: string, correctAnswer: number | string) {
    const key = `${recordId}_${qIdx}`;
    const isCorrect = String(userAnswer).trim() === String(correctAnswer);
    setReinforceAnswers(prev => ({ ...prev, [key]: userAnswer }));
    setReinforceDone(prev => {
      const updated = { ...prev, [key]: isCorrect };
      return updated;
    });
    if (isCorrect) {
      completeQuestion(`${recordId}_reinforce_${qIdx}`, true);
    }
  }

  function completeReinforce(recordId: string, questionId: string) {
    const challenge = reinforceChallenges[recordId];
    if (!challenge) return;
    const allCorrect = challenge.questions.every((_, i) => {
      const key = `${recordId}_${i}`;
      return reinforceDone[key];
    });
    if (allCorrect) {
      retryCorrect(questionId);
    }
    setActiveReinforce(null);
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-extrabold text-blue-800">📒 错题本</h1>

      {mistakes.length === 0 ? (
        <AppCard variant="green">
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-lg font-extrabold text-green-700">还没有错题！</h2>
            <p className="text-sm text-gray-500 mt-2">真厉害，继续保持哦！</p>
            <DetectiveMascot mood="excited" size="sm" />
          </div>
        </AppCard>
      ) : (
        <>
          <AppCard>
            <h3 className="text-sm font-bold text-gray-500 mb-2">错误类型统计</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                state.mistakes.reduce<Record<string, number>>((acc, m) => {
                  acc[m.errorType] = (acc[m.errorType] || 0) + 1;
                  return acc;
                }, {})
              ).map(([type, count]) => (
                <span key={type} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                  {type}: {count}次
                </span>
              ))}
            </div>
          </AppCard>

          <div className="space-y-3">
            {mistakes.map((record, idx) => {
              const q = getQuestionById(record.questionId);
              const isExpanded = expandedIdx === idx;
              const recordId = record.questionId + '_' + record.date;
              const isRetried = record.retriedCorrect || retryResults[recordId];
              const challenge = reinforceChallenges[recordId];
              const isReinforcing = activeReinforce === recordId;

              function handleRetry() {
                if (!q) return;
                const answer = parseInt(retryAnswers[recordId]);
                if (isNaN(answer)) return;
                const correct = answer === q.answer;
                setRetryResults((prev) => ({ ...prev, [recordId]: correct }));
                if (correct) {
                  retryCorrect(record.questionId);
                  completeQuestion(record.questionId, true);
                }
              }

              return (
                <motion.div key={recordId} className="card-detective overflow-hidden"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <button className="w-full p-4 text-left flex items-start gap-3"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isRetried ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {isRetried ? <Check size={16} /> : '✕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm line-clamp-1">{record.questionText}</div>
                      <div className="text-xs text-gray-500 mt-0.5">你的答案：{record.myAnswer} | 正确答案：{record.correctAnswer}</div>
                      <div className="text-xs text-red-400 mt-0.5">{record.errorType}</div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div className="px-4 pb-4" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        {q && (
                          <div className="bg-amber-50 rounded-xl p-3 mb-3">
                            <div className="text-sm font-bold text-gray-600 mb-1">完整题目：</div>
                            <p className="text-sm text-gray-700">{q.text}</p>
                            <div className="text-sm font-bold text-gray-600 mt-2 mb-1">解析：</div>
                            <p className="text-sm text-gray-600">{q.explanation}</p>
                            <div className="text-center font-extrabold text-amber-600 mt-2">
                              算式：{q.equation.replace('?', String(q.answer))}
                            </div>
                          </div>
                        )}

                        {!isRetried && !isReinforcing && (
                          <div className="space-y-2">
                            <div className="text-sm font-bold text-gray-600 mb-2">重新挑战：</div>
                            <div className="flex gap-2">
                              <input type="number" inputMode="numeric" placeholder="输入答案"
                                value={retryAnswers[recordId] || ''}
                                onChange={(e) => setRetryAnswers((prev) => ({ ...prev, [recordId]: e.target.value }))}
                                className="flex-1 h-10 px-3 border-2 border-amber-200 rounded-xl text-center font-bold focus:border-amber-400 focus:outline-none" />
                              <AppButton variant="primary" size="sm" onClick={handleRetry}>
                                <RotateCcw size={16} /> 提交
                              </AppButton>
                            </div>
                            {retryResults[recordId] === false && (
                              <p className="text-sm text-amber-600 mt-1">不对哦，再试试～正确答案是 {q?.answer}</p>
                            )}
                            <div className="pt-2 border-t border-gray-100">
                              <AppButton variant="ghost" size="sm" fullWidth
                                onClick={() => startReinforce(recordId, record.questionId)}>
                                <Dumbbell size={16} /> 再练一次（同类题3道挑战）
                              </AppButton>
                            </div>
                          </div>
                        )}

                        {isReinforcing && challenge && (
                          <div className="space-y-3">
                            <div className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                              🎯 同类题再练：{challenge.targetSkill}（{challenge.questions.length}道题）
                            </div>
                            {challenge.questions.map((rq, qIdx) => {
                              const key = `${recordId}_${qIdx}`;
                              const isAnswered = key in reinforceAnswers;
                              const isCorrect = reinforceDone[key];
                              return (
                                <div key={key} className="bg-gray-50 rounded-xl p-3">
                                  <p className="text-sm text-gray-700 mb-2">{qIdx + 1}. {rq.text}</p>
                                  {!isAnswered ? (
                                    <div className="flex gap-2">
                                      <input type="number" inputMode="numeric" placeholder="输入答案"
                                        onChange={(e) => {
                                          // store temp
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            submitReinforceAnswer(recordId, qIdx, val, rq.answer);
                                          }
                                        }}
                                        className="flex-1 h-10 px-3 border-2 border-amber-200 rounded-xl text-center font-bold focus:border-amber-400 focus:outline-none" />
                                      <AppButton variant="primary" size="sm" onClick={() => {
                                        const input = document.querySelector(`#reinforce-${key}`) as HTMLInputElement;
                                        if (input) submitReinforceAnswer(recordId, qIdx, input.value, rq.answer);
                                      }}>
                                        <Check size={16} />
                                      </AppButton>
                                    </div>
                                  ) : (
                                    <div className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                      {isCorrect ? '✅ 答对了！' : `❌ 正确答案是 ${rq.answer} — ${rq.answerSentence}`}
                                    </div>
                                  )}
                                  <input type="hidden" id={`reinforce-${key}`} />
                                </div>
                              );
                            })}
                            <AppButton variant="success" size="sm" fullWidth onClick={() => completeReinforce(recordId, record.questionId)}>
                              完成再练 ✓
                            </AppButton>
                          </div>
                        )}

                        {isRetried && <div className="text-center text-green-600 font-bold text-sm">✅ 已掌握！这道题不会再错了！</div>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </PageContainer>
  );
}
