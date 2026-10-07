'use client';

import React, { useRef, useEffect } from 'react';
import { displayPercentInputValue, isValidPercentEntry, serializePercentAnswer } from '@/lib/answerSchema';

interface PercentInputProps {
  value: string;
  onChange: (serializedValue: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  'data-testid'?: string;
}

export function PercentInput({ value, onChange, onSubmit, disabled = false, autoFocus = true, 'data-testid': testId = 'lesson-answer-input' }: PercentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <input
          ref={inputRef}
          aria-label="百分数答案"
          data-testid={testId}
          type="text"
          inputMode="text"
          value={displayPercentInputValue(value)}
          onChange={event => {
            if (isValidPercentEntry(event.target.value)) onChange(serializePercentAnswer(event.target.value));
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          disabled={disabled}
          className="w-32 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
          placeholder="如 92 或 135.3"
          autoComplete="off"
        />
        <span className="text-xl font-bold text-gray-700">%</span>
      </div>
      <p className="text-xs text-gray-500 text-center">只输入百分号前的数值，例如 92 表示 92%；也可粘贴带百分号的答案。</p>
    </div>
  );
}

export default PercentInput;
