'use client';

import { useRef, useState } from 'react';
import { createDataSnapshot, downloadExportFile } from '@/lib/dataExport';
import { parseBackup, restoreBackup, type BackupPreview } from '@/lib/dataTransfer';
import type { GameState } from '@/lib/types';
import { getPointsBalance } from '@/lib/familyPoints';
import ParentAccessBoundary from '@/components/ParentAccessBoundary';
import { isParentAccessGranted } from '@/hooks/useParentAccess';

export default function DataTransferPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function chooseFile(file?: File) {
    setPreview(null);
    setError('');
    setMessage('');
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('备份文件超过 5 MB 限制');
      setPreview(parseBackup(await file.text()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取备份文件');
    }
  }

  function exportCurrent() {
    setError('');
    setMessage('');
    try {
      const payload = createDataSnapshot();
      downloadExportFile(payload);
      setMessage('当前数据备份已下载。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '备份失败，未生成文件');
    }
  }

  function confirmRestore() {
    if (!preview || busy || !isParentAccessGranted()) { if (preview && !isParentAccessGranted()) setError('家长验证已过期，请重新验证后导入。'); return; }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      restoreBackup(preview, window.localStorage);
      setMessage('恢复完成，正在重新载入学习数据…');
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '恢复失败，原数据已保留或回滚');
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="data-transfer-title" className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 id="data-transfer-title" className="text-lg font-bold text-slate-800">数据备份与恢复</h2>
      <p className="mt-1 text-sm text-slate-600">导入前请核对年级、课程进度和积分。恢复前会为当前数据保留安全备份。</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={exportCurrent} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">下载当前数据备份</button>
      </div>
      <div className="mt-3">
      <ParentAccessBoundary>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">选择备份文件</button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} aria-label="选择 Math Detective 备份文件" />
      {preview && (
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-slate-700" aria-live="polite">
          <h3 className="font-bold text-slate-800">导入预览{preview.legacy ? ' · 旧版格式（校验范围有限）' : ''}</h3>
          <p className="mt-2">年级：{({ G1: '一年级', G2: '二年级', G3: '三年级', G4: '四年级', G5: '五年级', G6: '六年级' } as Record<string, string>)[preview.grade] ?? preview.grade}　·　课程日期：{preview.date}</p>
          <p>课程进度：{preview.completed}/{preview.total}　·　家庭积分：{getPointsBalance(preview.payload.data.learningState as unknown as GameState)}</p>
          <p className="mt-2 text-xs text-slate-600">确认后将以备份快照替换本应用数据，重复导入不会叠加奖励。</p>
          <button type="button" disabled={busy} onClick={confirmRestore} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 font-bold text-white disabled:opacity-50">备份当前数据并恢复</button>
        </div>
      )}
      </ParentAccessBoundary>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    </section>
  );
}
