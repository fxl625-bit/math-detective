'use client';

import { useState } from 'react';
import GroupingLab from '@/components/lesson/GroupingLab';

export type ConceptTool = 'line' | 'groups' | 'fraction' | 'chart' | 'balance' | 'percent' | 'area' | 'angle' | 'circle';
type Grade = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

const DEFAULT_TOOLS: Record<Grade, ConceptTool[]> = {
  G1: ['line', 'line', 'balance', 'area', 'line', 'chart'],
  G2: ['groups', 'groups', 'line', 'line', 'area', 'balance'],
  G3: ['groups', 'balance', 'fraction', 'area', 'line', 'chart'],
  G4: ['line', 'balance', 'fraction', 'angle', 'chart', 'line'],
  G5: ['fraction', 'groups', 'fraction', 'area', 'balance', 'chart'],
  G6: ['fraction', 'groups', 'percent', 'circle', 'chart', 'balance'],
};
const TOOL_NAMES: Record<ConceptTool, string> = {
  line: '数轴', groups: '分组与平均分', fraction: '分数条', chart: '数据条形图',
  balance: '等式天平', percent: '百分格', area: '面积方格', angle: '角度', circle: '圆的半径与周长',
};

export function resolveConceptTool(grade: Grade, unitId: string | null): ConceptTool {
  const match = unitId?.match(/^g([1-6])-u([1-6])$/);
  if (match && `G${match[1]}` === grade) return DEFAULT_TOOLS[grade][Number(match[2]) - 1];
  return DEFAULT_TOOLS[grade][0];
}

export default function ConceptLab({ grade, unitId, onSupportUsed }: {
  grade: Grade;
  unitId: string | null;
  onSupportUsed: (supportId: string) => void;
}) {
  const defaultTool = resolveConceptTool(grade, unitId);
  const lessonKey = `${grade}:${unitId || 'default'}`;
  const [selection, setSelection] = useState({ lessonKey, tool: defaultTool });
  const tool = selection.lessonKey === lessonKey ? selection.tool : defaultTool;
  const [values, setValues] = useState<Record<ConceptTool, { a: number; b: number }>>(() =>
    Object.fromEntries(Object.keys(TOOL_NAMES).map(key => [key, { a: 4, b: 3 }])) as Record<ConceptTool, { a: number; b: number }>);
  const [exampleResetVersion, setExampleResetVersion] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const { a, b } = values[tool];
  const [usedTools, setUsedTools] = useState<string[]>([]);
  const update = (field: 'a' | 'b', next: number) => {
    setValues(previous => {
      const candidate = { ...previous[tool], [field]: next };
      if (tool === 'line') {
        const max = grade === 'G4' ? 10000 : grade === 'G1' && unitId !== 'g1-u2' ? 20 : 100;
        candidate.b = Math.min(candidate.b, direction === 'right' ? max - candidate.a : candidate.a);
      }
      if (tool === 'fraction') candidate.b = Math.min(candidate.b, candidate.a);
      return { ...previous, [tool]: candidate };
    });
    support(tool);
  };
  const setA = (next: number) => update('a', next);
  const setB = (next: number) => update('b', next);
  const support = (selected: ConceptTool) => {
    setSelection({ lessonKey, tool: selected });
    const useKey = `${lessonKey}:${selected}`;
    if (!usedTools.includes(useKey)) {
      setUsedTools(previous => [...previous, useKey]);
      onSupportUsed(`concept_lab:${selected}`);
    }
  };
  const numberInput = (label: string, value: number, updateValue: (n: number) => void, max = 20, min = 1) => (
    <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={event => {
        const next = Number(event.target.value);
        if (Number.isInteger(next) && next >= min && next <= max) updateValue(next);
      }} className="min-h-11 w-20 rounded border border-stone-300 p-2 text-center" />
    </label>
  );
  const row = (filled: number, total: number, label: string) => (
    <div role="img" aria-label={`${label}：${filled}格，共${total}格`} className="flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => <span key={i} aria-hidden="true" className={`h-5 w-5 rounded-sm border border-amber-600 ${i < filled ? 'bg-amber-400' : 'bg-white'}`} />)}
    </div>
  );
  const view = (() => {
    switch (tool) {
      case 'line': {
        const max = grade === 'G4' ? 10000 : grade === 'G1' && unitId !== 'g1-u2' ? 20 : 100;
        const point = direction === 'right' ? a + b : a - b;
        return <div className="space-y-3">{numberInput('起点', a, setA, max, 0)}<label className="block text-sm font-semibold">方向 <select value={direction} onChange={event => { setDirection(event.target.value as 'left' | 'right'); setValues(previous => ({ ...previous, line: { ...previous.line, b: 0 } })); support(tool); }} className="min-h-11 rounded border border-amber-400 bg-white px-3"><option value="right">向右（加）</option><option value="left">向左（减）</option></select></label>{numberInput('走几格', b, setB, direction === 'right' ? max - a : a, 0)}<p>从 {a} 向{direction === 'right' ? '右' : '左'}走 {b} 格，到 {point}。数轴范围 0 到 {max}。</p><input aria-label="数轴位置" type="range" min="0" max={max} value={point} readOnly className="w-full" /></div>;
      }
      case 'groups':
        return <GroupingLab key={exampleResetVersion} a={a} b={b} setA={setA} setB={setB} onSupportUsed={() => support('groups')} />;
      case 'fraction': {
        return <div className="space-y-3">{numberInput('平均分成', a, setA, 12)}{numberInput('取其中', b, setB, a, 0)}<p>把整体平均分成 {a} 份，取 {b} 份，表示 {b}/{a}。缩小总份数时取用份数会同步调低。</p>{row(b, a, '分数条')}</div>;
      }
      case 'chart':
        return <div className="space-y-3">{numberInput('甲的数据', a, setA, 20)}{numberInput('乙的数据', b, setB, 20)}<p>甲 {a}，乙 {b}；{a === b ? '两者相同' : `相差 ${Math.abs(a - b)}`}。每个数按相同的 20 格刻度绘制。</p>{[['甲', a], ['乙', b]].map(([label, value]) => <div key={label} className="flex items-center gap-2"><span>{label}</span><div className="h-6 bg-amber-400" style={{ width: `${Number(value) * 4}%` }} /><span>{value}</span></div>)}</div>;
      case 'balance':
        return <div className="space-y-3">{numberInput('左边', a, setA, 20)}{numberInput('右边', b, setB, 20)}<p>左边 {a}，右边 {b}；{a === b ? '天平平衡' : `较少的一边还需 ${Math.abs(a - b)} 个单位才平衡`}。</p><div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-xl border-2 border-amber-500 p-4">左盘 {a}</div><div className="rounded-xl border-2 border-blue-500 p-4">右盘 {b}</div></div></div>;
      case 'percent': {
        return <div className="space-y-3">{numberInput('百分数（%）', a, setA, 100, 0)}<p>100 格中涂 {a} 格，表示 {a}% = {a}/100。</p><div className="grid grid-cols-10 gap-0.5" role="img" aria-label={`百分格，100格中涂${a}格`}>{Array.from({ length: 100 }, (_, i) => <span key={i} aria-hidden="true" className={`aspect-square border border-stone-300 ${i < a ? 'bg-amber-400' : 'bg-white'}`} />)}</div></div>;
      }
      case 'area':
        return <div className="space-y-3">{numberInput('长（单位格）', a, setA, 10)}{numberInput('宽（单位格）', b, setB, 10)}<p>{a} 列、{b} 行，共 {a * b} 个单位方格，面积为 {a * b} 平方单位。</p><div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${a}, minmax(0, 1.25rem))` }} role="img" aria-label={`${a}列${b}行，面积${a * b}平方单位`}>{Array.from({ length: a * b }, (_, i) => <span key={i} aria-hidden="true" className="h-5 w-5 border border-amber-600 bg-amber-200" />)}</div></div>;
      case 'angle': {
        const degrees = a;
        const radians = -degrees * Math.PI / 180;
        const endX = 80 + 60 * Math.cos(radians), endY = 100 + 60 * Math.sin(radians);
        const kind = degrees === 0 ? '零度角' : degrees === 180 ? '平角' : degrees < 90 ? '锐角' : degrees === 90 ? '直角' : '钝角';
        return <div className="space-y-3">{numberInput('角度（°）', a, setA, 180, 0)}<p>{degrees}°：{kind}；直角是 90°。</p><svg viewBox="0 0 160 120" className="h-40 w-56" role="img" aria-label={`${degrees}度角示意` }><line x1="80" y1="100" x2="140" y2="100" stroke="#92400e" strokeWidth="4" /><line x1="80" y1="100" x2={endX} y2={endY} stroke="#2563eb" strokeWidth="4" /><circle cx="80" cy="100" r="4" fill="#111827" /></svg></div>;
      }
      case 'circle':
        return <div className="space-y-3">{numberInput('半径（厘米）', a, setA, 10)}<p>直径是 {2 * a} 厘米；取 π=3.14，周长约 {(6.28 * a).toFixed(2)} 厘米。</p><svg viewBox="0 0 160 160" className="h-40 w-40" role="img" aria-label={`半径${a}厘米的圆示意图`}><circle cx="80" cy="80" r={a * 6} fill="#fef3c7" stroke="#92400e" strokeWidth="2" /><line x1="80" y1="80" x2={80 + a * 6} y2="80" stroke="#2563eb" strokeWidth="3" /><text x="85" y="72" fontSize="12">r={a}</text></svg></div>;
    }
  })();

  return <section aria-label="概念小实验" className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-stone-800">
    <div><h3 className="font-bold">概念小实验：调整示例数字，试着发现关系</h3><p className="text-sm">这是方法示例，不是当前题目的图解；请回到答题卡自己填写答案。</p></div>
    <label className="block text-sm font-semibold">选择教具 <select value={tool} onChange={e => support(e.target.value as ConceptTool)} className="ml-2 min-h-11 rounded border border-amber-400 bg-white p-2">{Object.entries(TOOL_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <div aria-live="polite">{view}</div>
    <button type="button" onClick={() => { setValues(previous => ({ ...previous, [tool]: { a: 4, b: 3 } })); setExampleResetVersion(previous => previous + 1); setDirection('right'); support(tool); }} className="min-h-11 rounded-xl border border-amber-500 px-4 py-2 font-semibold">复位示例</button>
  </section>;
}
