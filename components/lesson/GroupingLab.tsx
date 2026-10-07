'use client';

import { useState } from 'react';

type GroupingMode = 'share' | 'make-groups';

export default function GroupingLab({
  a,
  b,
  setA,
  setB,
  onSupportUsed,
}: {
  a: number;
  b: number;
  setA: (value: number) => void;
  setB: (value: number) => void;
  onSupportUsed: () => void;
}) {
  const [mode, setMode] = useState<GroupingMode>('share');
  const key = `${a}:${b}:${mode}`;
  const [allocation, setAllocation] = useState<{ key: string; history: number[] }>({ key, history: [] });
  const [notice, setNotice] = useState('');
  const history = allocation.key === key ? allocation.history : [];
  const total = a * b;
  const complete = mode === 'share' ? history.length >= total : history.length >= b;
  const assigned = mode === 'share' ? history.length : history.length * a;
  const remaining = total - assigned;
  const counts = Array.from({ length: b }, (_, groupIndex) => mode === 'share'
    ? history.filter((assignedGroup) => assignedGroup === groupIndex).length
    : groupIndex < history.length ? a : 0);

  const commitHistory = (nextHistory: number[]) => {
    setAllocation({ key, history: nextHistory });
    setNotice('');
    onSupportUsed();
  };

  const changeValue = (field: 'a' | 'b', next: number) => {
    if ((field === 'a' ? a : b) === next) return;
    const nextA = field === 'a' ? next : a;
    const nextB = field === 'b' ? next : b;
    setAllocation({ key: `${nextA}:${nextB}:${mode}`, history: [] });
    setNotice('参数已调整，分配操作已重置，请从头开始。');
    (field === 'a' ? setA : setB)(next);
    onSupportUsed();
  };

  const changeMode = (nextMode: GroupingMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setAllocation({ key: `${a}:${b}:${nextMode}`, history: [] });
    setNotice('分配方式已切换，分配操作已重置，请从头开始。');
    onSupportUsed();
  };

  const distributeOneStep = () => {
    if (complete) return;
    const nextGroup = mode === 'share' ? history.length % b : history.length;
    commitHistory([...history, nextGroup]);
  };

  const undo = () => {
    if (history.length === 0) return;
    commitHistory(history.slice(0, -1));
    setNotice('已撤销最近一步。');
  };

  const reset = () => {
    commitHistory([]);
    setNotice('已重新分配，可以从第一步开始。');
  };

  const numberField = (label: string, value: number, field: 'a' | 'b') => (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800">
      {label}
      <input
        type="number"
        min={1}
        max={9}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= 1 && next <= 9) changeValue(field, next);
        }}
        className="min-h-11 w-20 rounded border border-stone-300 p-2 text-center"
      />
    </label>
  );

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-white/80 p-3" aria-label="可操作的分组练习">
      <div className="flex flex-wrap gap-3">
        {numberField('每组个数', a, 'a')}
        {numberField('组数', b, 'b')}
      </div>
      <p>{b} 组，每组 {a} 个，共 {total} 个；{total} 个平均分成 {b} 组，每组 {a} 个。</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="分配方式">
        <button type="button" aria-pressed={mode === 'share'} onClick={() => changeMode('share')} className="min-h-11 rounded-xl border border-amber-500 px-3 py-2 font-semibold">
          平均分：每组轮流放1个
        </button>
        <button type="button" aria-pressed={mode === 'make-groups'} onClick={() => changeMode('make-groups')} className="min-h-11 rounded-xl border border-amber-500 px-3 py-2 font-semibold">
          按每组个数分组
        </button>
      </div>

      <p className="text-sm">{mode === 'share'
        ? '一次取1个，轮流放进下一组；每组都放到相同数量。'
        : `每次取${a}个放成一组，看看一共能分成几组。`}</p>

      <div className="flex flex-wrap gap-3" aria-label="分组示意">
        {counts.map((count, index) => (
          <div key={index} role="group" aria-label={`第${index + 1}组：${count}个`} className="min-w-20 rounded-lg border border-amber-400 p-2">
            <p className="text-sm font-semibold">第{index + 1}组 · {count}个</p>
            <div className="flex min-h-6 flex-wrap gap-1" aria-hidden="true">
              {Array.from({ length: count }, (_, itemIndex) => <span key={itemIndex} className="h-4 w-4 rounded-full border border-amber-700 bg-amber-400" />)}
            </div>
          </div>
        ))}
      </div>

      <div role="status" aria-label="分配数量" data-testid="grouping-conservation" className="font-semibold">
        总数 {total} = 已分配 {assigned} + 未分配 {remaining}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={distributeOneStep} disabled={complete} className="min-h-11 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50">
          {mode === 'share' ? '每组轮流放1个' : `取${a}个成一组`}
        </button>
        <button type="button" onClick={undo} disabled={history.length === 0} className="min-h-11 rounded-xl border border-stone-400 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">
          撤销最近一步
        </button>
        <button type="button" onClick={reset} className="min-h-11 rounded-xl border border-amber-500 px-4 py-2 font-semibold">
          重新分配
        </button>
      </div>
      {complete && <p role="status" className="font-semibold text-green-800">{mode === 'share' ? '每组数量相同，已经分完。' : `已经分成${b}组。`}</p>}
      {notice && <p role="status" aria-live="polite" className="text-sm text-amber-900">{notice}</p>}
    </div>
  );
}
