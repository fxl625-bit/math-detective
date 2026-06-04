'use client';

/**
 * 家长题型测试模式 (v2.7)
 *
 * 覆盖所有 problemType × answerType 组合，
 * 支持自动测试正确答案提交。
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react';
import { allQuestions } from '@/data/questions';
import { allStories } from '@/data/stories';
import { checkAnswer, resolveAnswerType } from '@/lib/answerChecker';
import { isQuestionCompatibleWithTheme, inferSceneType, inferThemeTags } from '@/lib/storySystem';
import { textRevealsAnswer, hintRevealsAnswer } from '@/lib/hintSafety';
import type { Question, ProblemType, AnswerType } from '@/lib/types';
import type { CaseStory } from '@/lib/storySystem';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import PageContainer from '@/components/layout/PageContainer';

// ========== 类型定义 ==========

interface TestResult {
  questionId: string;
  problemType: string;
  answerType: string;
  passed: boolean;
  reason?: string;
  hasVisual: boolean;
  hasExtraInfo: boolean;
  leaksAnswer: boolean;
  hasSubAnswers: boolean;
}

// ========== 主组件 ==========

export default function TestModePage() {
  const [filter, setFilter] = useState<string>('all');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 统计所有 problemType 和 answerType
  const stats = useMemo(() => {
    const problemTypes = new Map<string, number>();
    const answerTypes = new Map<string, number>();
    let noProblemType = 0;
    let noAnswerType = 0;

    for (const q of allQuestions) {
      const pt = q.problemType || '(未标注)';
      const at = resolveAnswerType(q);
      problemTypes.set(pt, (problemTypes.get(pt) || 0) + 1);
      answerTypes.set(at, (answerTypes.get(at) || 0) + 1);
      if (!q.problemType) noProblemType++;
      if (!q.answerType) noAnswerType++;
    }

    return { problemTypes, answerTypes, noProblemType, noAnswerType };
  }, []);

  // 自动测试所有题目
  const runAutoTest = useCallback(() => {
    setRunning(true);
    const testResults: TestResult[] = [];

    for (const q of allQuestions) {
      const answerType = resolveAnswerType(q);
      const problemType = q.problemType || '(未标注)';

      // 构造正确输入
      let correctInput: string | Record<string, string>;
      if (answerType === 'multi_answer' && q.subAnswers?.length) {
        const input: Record<string, string> = {};
        for (const sub of q.subAnswers) {
          input[sub.id] = String(sub.answer);
        }
        correctInput = input;
      } else if (answerType === 'ranking' && q.correctRanking) {
        const order = q.correctRanking.order || [
          q.correctRanking.first, q.correctRanking.second, q.correctRanking.third,
        ].filter(Boolean);
        correctInput = order.join(',');
      } else if (answerType === 'not_enough_information') {
        correctInput = '信息不足';
      } else {
        correctInput = String(q.answer);
      }

      // 调用统一 checker
      const result = checkAnswer(correctInput, q);

      // 检查泄题
      let leaksAnswer = false;
      if (q.hints?.length) {
        leaksAnswer = hintRevealsAnswer(q.hints[0], q) || false;
      }
      if (q.structuredHints?.light) {
        leaksAnswer = leaksAnswer || textRevealsAnswer(q.structuredHints.light, q);
      }

      testResults.push({
        questionId: q.id,
        problemType,
        answerType,
        passed: result.correct,
        reason: result.correct ? undefined : result.feedback || '正确答案未通过',
        hasVisual: !!q.visualKey,
        hasExtraInfo: !!(q.extraNumbers?.length || q.noisePhrases?.length),
        leaksAnswer,
        hasSubAnswers: !!(q.subAnswers?.length),
      });
    }

    setResults(testResults);
    setRunning(false);
  }, []);

  // 过滤结果
  const filteredResults = useMemo(() => {
    if (filter === 'all') return results;
    if (filter === 'failed') return results.filter(r => !r.passed);
    if (filter === 'leaked') return results.filter(r => r.leaksAnswer);
    return results.filter(r => r.problemType === filter || r.answerType === filter);
  }, [results, filter]);

  // 统计
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  const leakCount = results.filter(r => r.leaksAnswer).length;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/rewards" className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors flex-shrink-0">
          <ArrowLeft size={20} className="text-amber-700" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-amber-800">🧪 题型测试模式</h1>
          <p className="text-xs text-gray-500">v2.7 — 家长专用，覆盖所有 problemType × answerType</p>
        </div>
      </div>

      {/* 覆盖统计 */}
      <AppCard variant="blue">
        <h3 className="font-extrabold text-blue-800 mb-3">📊 题库覆盖统计</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-bold text-blue-700 mb-1">ProblemType 分布</h4>
            <div className="space-y-1">
              {Array.from(stats.problemTypes.entries()).sort((a, b) => b[1] - a[1]).map(([pt, count]) => (
                <div key={pt} className="flex justify-between">
                  <span className={pt === '(未标注)' ? 'text-red-600' : 'text-gray-700'}>{pt}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-blue-700 mb-1">AnswerType 分布</h4>
            <div className="space-y-1">
              {Array.from(stats.answerTypes.entries()).sort((a, b) => b[1] - a[1]).map(([at, count]) => (
                <div key={at} className="flex justify-between">
                  <span className="text-gray-700">{at}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          共 {allQuestions.length} 题 | {stats.noProblemType} 题未标注 problemType | {stats.noAnswerType} 题未标注 answerType
        </div>
      </AppCard>

      {/* 主题覆盖率 */}
      <AppCard variant="gray">
        <h3 className="font-extrabold text-gray-700 mb-3">🎯 主题覆盖率</h3>
        <div className="space-y-2">
          {allStories.map(story => {
            const compatible = allQuestions.filter(q => isQuestionCompatibleWithTheme(q, story));
            const byGrade = compatible.filter(q => story.gradeBand.includes(q.gradeBand));
            const enough = byGrade.length >= 6;
            return (
              <div key={story.id} className={`flex items-center justify-between p-2 rounded-lg ${enough ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {enough ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                  <span className="text-sm font-bold">{story.title}</span>
                  <span className="text-xs text-gray-500">[{story.gradeBand.join(',')}]</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={enough ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {byGrade.length} 题
                  </span>
                  {story.allowedSceneTypes && (
                    <span className="text-gray-400">scene: {story.allowedSceneTypes.slice(0, 3).join(',')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AppCard>

      {/* 操作按钮 */}
      <div className="flex gap-3 flex-wrap">
        <AppButton
          variant="primary"
          onClick={runAutoTest}
          disabled={running}
        >
          {running ? '测试中...' : '▶ 自动测试正确答案提交'}
        </AppButton>
        {results.length > 0 && (
          <>
            <AppButton variant="ghost" onClick={() => setFilter('all')}>
              全部 ({results.length})
            </AppButton>
            <AppButton variant="ghost" onClick={() => setFilter('failed')}>
              ❌ 失败 ({failCount})
            </AppButton>
            <AppButton variant="ghost" onClick={() => setFilter('leaked')}>
              ⚠️ 泄题 ({leakCount})
            </AppButton>
          </>
        )}
      </div>

      {/* 测试结果汇总 */}
      {results.length > 0 && (
        <AppCard variant={failCount === 0 ? 'green' : 'amber'}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-extrabold text-green-600">{passCount}</div>
              <div className="text-xs text-gray-500">✅ 通过</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-red-600">{failCount}</div>
              <div className="text-xs text-gray-500">❌ 失败</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-600">{leakCount}</div>
              <div className="text-xs text-gray-500">⚠️ 泄题</div>
            </div>
          </div>
        </AppCard>
      )}

      {/* 测试结果列表 */}
      {filteredResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-gray-700">测试结果 ({filteredResults.length})</h3>
          {filteredResults.map(r => (
            <div
              key={r.questionId}
              className={`p-3 rounded-xl border-2 text-sm cursor-pointer transition-colors ${
                r.passed && !r.leaksAnswer
                  ? 'border-green-200 bg-green-50'
                  : !r.passed
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
              onClick={() => setExpandedId(expandedId === r.questionId ? null : r.questionId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {r.passed ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <span className="font-bold">{r.questionId}</span>
                  <span className="px-2 py-0.5 bg-blue-100 rounded text-xs font-bold text-blue-700">{r.problemType}</span>
                  <span className="px-2 py-0.5 bg-purple-100 rounded text-xs font-bold text-purple-700">{r.answerType}</span>
                  {r.leaksAnswer && (
                    <span className="px-2 py-0.5 bg-amber-100 rounded text-xs font-bold text-amber-700">⚠️泄题</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {r.hasVisual && <span>🖼️</span>}
                  {r.hasExtraInfo && <span>📎</span>}
                  {r.hasSubAnswers && <span>📋</span>}
                </div>
              </div>
              {expandedId === r.questionId && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  {r.reason && (
                    <p className="text-red-600 font-bold">失败原因: {r.reason}</p>
                  )}
                  <p className="text-gray-600">
                    {allQuestions.find(q => q.id === r.questionId)?.text?.slice(0, 100)}...
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 无结果提示 */}
      {results.length === 0 && !running && (
        <AppCard>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🧪</div>
            <h3 className="font-extrabold text-gray-700 mb-2">点击上方按钮开始测试</h3>
            <p className="text-sm text-gray-500">
              自动测试会遍历所有 {allQuestions.length} 道题，填入正确答案并验证是否通过。
            </p>
          </div>
        </AppCard>
      )}
    </PageContainer>
  );
}
