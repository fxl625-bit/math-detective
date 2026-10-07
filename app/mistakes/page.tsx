'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, BookOpenCheck, RotateCcw } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { AnswerInputRouter } from '@/components/lesson/AnswerInputRouter';
import DetectiveMascot from '@/components/DetectiveMascot';
import AppCard from '@/components/ui/AppCard';
import PageContainer from '@/components/layout/PageContainer';
import { inferAnswerSchema } from '@/lib/answerSchema';
import { getReviewQuestion, getReviewRecordId, submitMistakeReview } from '@/lib/mistakeReview';

type AnswerValue = string | Record<string, string>;

function formatAnswer(value: unknown, schema: ReturnType<typeof inferAnswerSchema> | null): string {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'object' || Array.isArray(value)) return String(value);

  const fields = value as Record<string, unknown>;
  if (schema?.kind === 'multi_field') {
    const labeledFields = schema.fields
      .filter((field) => Object.prototype.hasOwnProperty.call(fields, field.id))
      .map((field) => `${field.label}：${String(fields[field.id])}`);
    if (labeledFields.length > 0) return labeledFields.join('；');
  }

  try {
    return JSON.stringify(value) ?? '—';
  } catch {
    return Object.entries(fields).map(([key, item]) => `${key}：${String(item)}`).join('；') || '—';
  }
}

function createActionId() {
  const secureUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  return `mistake-review:${secureUuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export default function MistakesPage() {
  const { state, getState, commitGameState } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [corrected, setCorrected] = useState<Record<string, boolean>>({});
  const [intentIds, setIntentIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
  useEffect(() => setMounted(true), []);

  const mistakes = useMemo(() => [...(state.mistakes || [])].reverse(), [state.mistakes]);
  if (!mounted) return <div className="min-h-[55vh] flex items-center justify-center"><p className="font-bold text-blue-700">正在加载错题本…</p></div>;

  function submit(record: (typeof mistakes)[number], recordId: string) {
    if (busy[recordId]) return;
    const answer = answers[recordId] ?? '';
    const actionId = intentIds[recordId] ?? `${createActionId()}:${recordId}`;
    setIntentIds((current) => ({ ...current, [recordId]: actionId }));
    setBusy((current) => ({ ...current, [recordId]: true }));
    const result = submitMistakeReview(getState(), { recordId: getReviewRecordId(record), answer, actionId });
    if (!result.ok) {
      setMessages((current) => ({ ...current, [recordId]: result.message }));
      setBusy((current) => ({ ...current, [recordId]: false }));
      return;
    }
    if (!commitGameState(result.state)) {
      setMessages((current) => ({ ...current, [recordId]: '暂时没有保存成功。答案和这次操作已保留，请点提交重试。' }));
      setBusy((current) => ({ ...current, [recordId]: false }));
      return;
    }
    if (result.correct) {
      setCorrected((current) => ({ ...current, [recordId]: true }));
      setMessages((current) => ({ ...current, [recordId]: result.message }));
      setIntentIds((current) => { const next = { ...current }; delete next[recordId]; return next; });
    } else {
      setMessages((current) => ({ ...current, [recordId]: result.message || '还不正确，再试一次。' }));
      setIntentIds((current) => { const next = { ...current }; delete next[recordId]; return next; });
    }
    setBusy((current) => ({ ...current, [recordId]: false }));
  }

  return (
    <PageContainer className="max-w-4xl space-y-4">
      <header className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-800"><BookOpenCheck size={25} /></div>
        <div><h1 className="text-2xl font-extrabold text-blue-950">错题侦查室</h1><p className="text-sm text-slate-600">认真订正会留下学习记录；每天最多通过订正获得 0.5 积分。</p></div>
      </header>
      {mistakes.length === 0 ? (
        <AppCard variant="green"><div className="py-5 text-center"><h2 className="text-lg font-extrabold text-green-800">目前没有待复习的错题</h2><p className="mt-1 text-sm text-slate-600">完成练习后，首答错误的题目会保留在这里。</p><DetectiveMascot mood="excited" size="sm" /></div></AppCard>
      ) : (
        <>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>{mistakes.length} 道错题</strong> · 答错后可以继续尝试。看答案和解析需要主动展开；订正不会重写原来的首答记录。</div>
          <div className="space-y-3">
            {mistakes.map((record) => {
              const q = getReviewQuestion(record);
              const recordId = getReviewRecordId(record);
              const isOpen = expanded === recordId;
              const isCorrected = corrected[recordId] || Boolean(record.retriedCorrect);
              const schema = q ? inferAnswerSchema(q) : null;
              return <article key={recordId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button type="button" className="flex min-h-16 w-full items-start gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : recordId)}>
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isCorrected ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>{isCorrected ? '✓' : '!'}</span>
                  <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{record.questionText}</span><span className="mt-1 block text-xs text-slate-600">首错答案：{formatAnswer(record.myAnswer, schema)} · {isCorrected ? '已订正' : '待订正'}</span></span>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {isOpen && <div className="space-y-4 border-t border-slate-100 p-4">
                  {q && <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-900">{q.text}</p><p className="mt-1 text-xs text-slate-500">原答案和解析先收起，准备好后再查看。</p><button type="button" className="mt-2 min-h-11 rounded-lg px-3 text-sm font-bold text-blue-800 underline" aria-expanded={Boolean(showSolution[recordId])} onClick={() => setShowSolution((current) => ({ ...current, [recordId]: !current[recordId] }))}>{showSolution[recordId] ? '收起答案与解析' : '查看原答案与解析'}</button>{showSolution[recordId] && <div className="mt-2 border-t border-slate-200 pt-2 text-sm"><p>首次作答：{formatAnswer(record.myAnswer, schema)}</p><p>参考答案：{formatAnswer(record.correctAnswer, schema)}</p><p className="mt-1 text-slate-600">{q.explanation}</p></div>}</div>}
                  {schema ? <div className="space-y-3"><p className="text-sm font-bold text-slate-800">{isCorrected ? '已订正，也可以继续练习；重复练习不会重复加分。' : '自己再想一遍，再提交订正'}</p><AnswerInputRouter schema={schema} value={answers[recordId] ?? ''} onChange={(value) => setAnswers((current) => ({ ...current, [recordId]: value }))} onSubmit={() => submit(record, recordId)} disabled={Boolean(busy[recordId])} autoFocus={false} /><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-bold text-white hover:bg-blue-800 disabled:opacity-50" onClick={() => submit(record, recordId)} disabled={Boolean(busy[recordId])}><RotateCcw size={17} />{busy[recordId] ? '正在保存…' : isCorrected ? '继续练习' : '提交订正'}</button>{messages[recordId] && <p role="status" aria-live="polite" className={`text-sm font-semibold ${/还不对|不正确|保存/.test(messages[recordId]) ? 'text-amber-800' : isCorrected ? 'text-green-800' : 'text-amber-800'}`}>{messages[recordId]}</p>}</div> : <p role="status" className="text-sm text-amber-800">当前版本无法恢复这道旧题的完整作答格式。首错记录保留，但暂不能在线判题。</p>}
                </div>}
              </article>;
            })}
          </div>
        </>
      )}
    </PageContainer>
  );
}
