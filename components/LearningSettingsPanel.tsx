'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { getAvailableLearningUnits } from '@/lib/curriculum/unitCoverage';
import type { LearningSettings, ParentSettings } from '@/lib/types';
import ParentAccessBoundary from '@/components/ParentAccessBoundary';
import { isParentAccessGranted } from '@/hooks/useParentAccess';

const gradeOptions = [
  { value: 'G1', label: '一年级' }, { value: 'G2', label: '二年级' },
  { value: 'G3', label: '三年级' }, { value: 'G4', label: '四年级' },
  { value: 'G5', label: '五年级' }, { value: 'G6', label: '六年级' },
] as const;
const rowUnits = new Set(['g2-u1', 'g2-u2']);

export interface LearningSettingsPanelProps {
  settings: LearningSettings;
  courseStatus?: 'not-started' | 'in-progress' | 'completed';
  onSave: (patch: Partial<ParentSettings>) => boolean | void | Promise<boolean | void>;
  onClose?: () => void;
}

function LearningSettingsEditor({ settings, courseStatus = 'not-started', onSave, onClose }: LearningSettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setDraft(settings); }, [settings]);

  const selectableUnits = useMemo(() => getAvailableLearningUnits(draft.grade), [draft.grade]);

  function update(patch: Partial<LearningSettings>) {
    setDraft((current) => ({ ...current, ...patch }));
    setStatus('');
    setError('');
  }

  function changeGrade(grade: LearningSettings['grade']) {
    const firstUnit = getAvailableLearningUnits(grade)[0];
    update({ grade, unitId: firstUnit?.id ?? null });
  }

  async function save() {
    if (!isParentAccessGranted()) { setError('家长验证已过期，请重新验证后再保存。'); return; }
    setSaving(true);
    setStatus('');
    setError('');
    const semesterOverride = draft.semesterSource === 'manual' ? draft.semester : undefined;
    const patch: Partial<ParentSettings> = {
      gradeBand: draft.grade,
      textbookEdition: draft.textbookEdition,
      dailyGoal: draft.dailyGoal,
      semesterOverride,
      learningSettings: { ...draft },
    };
    try {
      const result = await onSave(patch);
      if (result === false) throw new Error('保存失败，请检查设备存储空间后重试。');
      setStatus(courseStatus === 'in-progress'
        ? '设置已保存。当前课程按原题序完成；完成后新课程使用这些设置。'
        : courseStatus === 'completed'
          ? '设置已保存。当前已完成课程保留原记录；下一课程使用这些设置。'
          : '设置已保存。今天尚未开始的课程会按新设置准备。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '设置未能保存，请重试。');
    } finally {
      setSaving(false);
    }
  }

  const rowMode = draft.learnedTableRange === null ? 'unknown' : draft.learnedTableRange.length === 0 ? 'none' : 'selected';
  const chosenRows = new Set(draft.learnedTableRange ?? []);
  const gradeName = gradeOptions.find((option) => option.value === draft.grade)?.label ?? draft.grade;

  return (
    <section aria-labelledby="learning-settings-title" className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">学习设置</p>
          <h2 id="learning-settings-title" className="mt-1 text-xl font-extrabold text-stone-900">为新课程选择学习范围</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">正在学习 {gradeName}；已开始的课程会保持原样，保存后供之后的新课程使用。</p>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="关闭学习设置" className="grid min-h-11 min-w-11 place-items-center rounded-full text-stone-500 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600"><X size={20} /></button>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-stone-800">年级
          <select data-testid="grade-select" value={draft.grade} onChange={(event) => changeGrade(event.target.value as LearningSettings['grade'])} className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
            {gradeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-stone-800">学习单元
          <select data-testid="unit-select" value={draft.unitId ?? ''} onChange={(event) => update({ unitId: event.target.value || null })} className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
            <option value="">请选择已接入题目的单元</option>
            {selectableUnits.map((unit) => <option value={unit.id} key={unit.id}>{unit.title}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-stone-500">仅列出已有对应题目内容的单元；没有逐页教材映射。</span>
        </label>

        <label className="block text-sm font-semibold text-stone-800">学期
          <select data-testid="semester-select" value={draft.semesterSource === 'manual' ? draft.semester : 'auto'} onChange={(event) => {
            const value = event.target.value;
            update(value === 'auto' ? { semesterSource: 'auto' } : { semester: value as 'upper' | 'lower', semesterSource: 'manual' });
          }} className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
            <option value="auto">按日期自动选择（当前{draft.semester === 'upper' ? '上' : '下'}学期）</option>
            <option value="upper">上学期</option><option value="lower">下学期</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-stone-500">当前单元是通用能力训练，可用于两个学期，不代表逐册同步。</span>
        </label>
        <label className="block text-sm font-semibold text-stone-800">教材偏好
          <select value={draft.textbookEdition} onChange={(event) => update({ textbookEdition: event.target.value as LearningSettings['textbookEdition'] })} className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
            <option value="generic_cn">通用内容</option><option value="PEP">人教版偏好</option><option value="BNUP">北师大版偏好</option><option value="XISHi">西师版偏好</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-stone-500">教材选择会保留为偏好；目前内容未验证逐页对应关系。</span>
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-stone-800">挑战节奏</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([
            ['guided', '引导练习', '多一些操作表征与渐进提示'],
            ['balanced', '均衡练习', '按当前学习证据安排'],
            ['stretch', '进阶挑战', '先修掌握充分时增加挑战'],
          ] as const).map(([value, label, detail]) => (
            <label key={value} className={`flex min-h-16 cursor-pointer items-start gap-2 rounded-xl border p-3 ${draft.challengePreference === value ? 'border-amber-500 bg-amber-50' : 'border-stone-200'}`}>
              <input type="radio" name="challenge-preference" value={value} checked={draft.challengePreference === value} onChange={() => update({ challengePreference: value })} className="mt-1 accent-amber-600" />
              <span><span className="block text-sm font-bold text-stone-800">{label}</span><span className="block text-xs text-stone-600">{detail}</span></span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">所有节奏都会保留提高题和奥数入门；进阶设置不会越过已学范围。</p>
      </fieldset>

      {rowUnits.has(draft.unitId ?? '') && (
        <fieldset className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <legend className="px-1 text-sm font-bold text-stone-800">已学过的乘法口诀行</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <label className="flex min-h-11 items-center gap-2"><input type="radio" name="table-range-state" checked={rowMode === 'unknown'} onChange={() => update({ learnedTableRange: null })} className="accent-amber-600" />还不确定</label>
            <label className="flex min-h-11 items-center gap-2"><input type="radio" name="table-range-state" checked={rowMode === 'none'} onChange={() => update({ learnedTableRange: [] })} className="accent-amber-600" />还没学过</label>
          </div>
          <p className="mt-2 text-xs text-stone-600">确认学过的口诀行（可多选）：</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((row) => (
              <label key={row} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border text-sm font-semibold ${chosenRows.has(row) ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-stone-200 bg-white text-stone-700'}`}>
                <input type="checkbox" aria-label={`${row}的口诀`} checked={chosenRows.has(row)} onChange={(event) => {
                  const next = new Set(chosenRows);
                  event.target.checked ? next.add(row) : next.delete(row);
                  update({ learnedTableRange: [...next].sort((a, b) => a - b) });
                }} className="accent-amber-600" />{row}的口诀
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-5 rounded-2xl bg-stone-50 p-4">
        <label className="block text-sm font-bold text-stone-800">家长每日练习目标
          <input type="number" min={0} max={30} inputMode="numeric" value={draft.dailyGoal} onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) update({ dailyGoal: Math.min(30, Math.max(0, Math.floor(parsed))) });
          }} className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 sm:max-w-40" />
        </label>
        <p className="mt-2 text-xs leading-5 text-stone-600">原目标值会保留。核心日课固定 6 个任务；超过部分是自选加练，不影响核心课完成。</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button data-testid="save-learning-settings" type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-600 px-5 font-bold text-white hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60"><Check size={18} />{saving ? '正在保存…' : '保存学习设置'}</button>
        {status && <p role="status" className="text-sm text-green-800">{status}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}

export default function LearningSettingsPanel(props: LearningSettingsPanelProps) {
  return <ParentAccessBoundary onCancel={props.onClose}>
    <LearningSettingsEditor {...props} />
  </ParentAccessBoundary>;
}
