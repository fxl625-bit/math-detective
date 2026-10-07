'use client';

/**
 * v2.11.0: MoneyInput — G1-G2 grade-appropriate RMB money input.
 *
 * Supports two modes:
 * - yuan_jiao: Two separate fields: [___] 元 [___] 角
 * - decimal_yuan: Single decimal field accepting "1.5" or "1.50"
 *
 * All values are stored as a structured string: "X元Y角" or "X角" or "X.Y元"
 */

import React, { useState, useRef, useEffect } from 'react';

interface MoneyInputProps {
  value: string | Record<string, string>;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputMode: 'yuan_jiao' | 'decimal_yuan';
  disabled?: boolean;
  autoFocus?: boolean;
}

export function MoneyInput({
  value,
  onChange,
  onSubmit,
  inputMode,
  disabled = false,
  autoFocus = true,
}: MoneyInputProps) {
  const strValue = typeof value === 'string' ? value : '';

  if (inputMode === 'decimal_yuan') {
    return (
      <DecimalYuanInput
        value={strValue}
        onChange={onChange}
        onSubmit={onSubmit}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <YuanJiaoInput
      value={strValue}
      onChange={onChange}
      onSubmit={onSubmit}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  );
}

// ========== 元角分离输入 ==========

function YuanJiaoInput({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  autoFocus: boolean;
}) {
  // Parse current value
  const parsed = parseYuanJiao(value);
  const [yuan, setYuan] = useState(parsed.yuan);
  const [jiao, setJiao] = useState(parsed.jiao);
  const yuanRef = useRef<HTMLInputElement>(null);
  const jiaoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) yuanRef.current?.focus();
  }, [autoFocus]);

  const emit = (y: string, j: string) => onChange(formatYuanJiaoValue(y, j));

  const handleYuanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    setYuan(v);
    emit(v, jiao);
  };

  const handleJiaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 1); // 0-9 only
    setJiao(v);
    emit(yuan, v);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'yuan' | 'jiao') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
    // Auto-advance from yuan to jiao on digit entry
    if (field === 'yuan' && e.key >= '0' && e.key <= '9' && yuan.length >= 1) {
      // Already has enough digits, jump to jiao
      setTimeout(() => jiaoRef.current?.focus(), 50);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            ref={yuanRef}
            type="text"
            inputMode="numeric"
            value={yuan}
            onChange={handleYuanChange}
            onKeyDown={e => handleKeyDown(e, 'yuan')}
            disabled={disabled}
            className="w-20 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
            placeholder="0"
            maxLength={4}
          />
          <span className="text-xl font-bold text-gray-700">元</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={jiaoRef}
            type="text"
            inputMode="numeric"
            value={jiao}
            onChange={handleJiaoChange}
            onKeyDown={e => handleKeyDown(e, 'jiao')}
            disabled={disabled}
            className="w-16 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
            placeholder="0"
            maxLength={1}
          />
          <span className="text-xl font-bold text-gray-700">角</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">先填元，再填角。没有就填 0。</p>
    </div>
  );
}

export function formatYuanJiaoValue(y: string, j: string): string {
  if (y === '' && j === '') return '';
  const yNum = Number.parseInt(y, 10) || 0;
  const jNum = Number.parseInt(j, 10) || 0;
  if (yNum === 0 && jNum === 0) return y !== '' ? '0元' : '0角';
  if (yNum === 0) return `${jNum}角`;
  if (jNum === 0) return `${yNum}元`;
  return `${yNum}元${jNum}角`;
}

function parseYuanJiao(value: string): { yuan: string; jiao: string } {
  if (!value) return { yuan: '', jiao: '' };
  const trimmed = value.trim();

  // "1元5角"
  const m1 = trimmed.match(/^(\d+)元(\d+)角$/);
  if (m1) return { yuan: m1[1], jiao: m1[2] };

  // "5角"
  const m2 = trimmed.match(/^(\d+)角$/);
  if (m2) return { yuan: '', jiao: m2[1] };

  // "1元"
  const m3 = trimmed.match(/^(\d+)元$/);
  if (m3) return { yuan: m3[1], jiao: '' };

  // "15" (纯数字，当作角)
  const num = parseInt(trimmed);
  if (!isNaN(num)) {
    return { yuan: String(Math.floor(num / 10)), jiao: String(num % 10) };
  }

  return { yuan: '', jiao: '' };
}

// ========== 小数元输入 ==========

function DecimalYuanInput({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  autoFocus: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits and one decimal point
    const v = e.target.value.replace(/[^0-9.]/g, '');
    onChange(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-32 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
          placeholder="1.50"
          maxLength={10}
        />
        <span className="text-xl font-bold text-gray-700">元</span>
      </div>
      <p className="text-xs text-gray-400 text-center">输入小数，比如 1.5 就是1元5角</p>
    </div>
  );
}
