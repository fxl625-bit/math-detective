'use client';

/**
 * v2.11.0: IntegerInput — numeric text input for integer/decimal/expression/text answers.
 * Replaces the old hardcoded <input type="text" inputMode="decimal"> in EquationAnswerPhase.
 */

import React, { useRef, useEffect } from 'react';

interface IntegerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  decimal?: boolean;
  decimalPlaces?: number;
  unit?: string;
  allowExpression?: boolean;
  inputMode?: 'numeric' | 'decimal' | 'text';
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function IntegerInput({
  value,
  onChange,
  onSubmit,
  allowNegative = false,
  decimal = false,
  unit,
  allowExpression = false,
  inputMode,
  placeholder = '?',
  disabled = false,
  autoFocus = true,
}: IntegerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const resolvedInputMode = inputMode || (decimal ? 'decimal' : 'numeric');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;

    if (resolvedInputMode === 'numeric' && !allowExpression) {
      // Filter to digits and negative sign
      if (allowNegative && v === '-') {
        onChange(v);
        return;
      }
      v = v.replace(/[^0-9.-]/g, '');
    }

    onChange(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <input
        ref={inputRef}
        aria-label="答案"
        data-testid="lesson-answer-input"
        name="answer"
        type={resolvedInputMode === 'text' ? 'text' : 'text'}
        inputMode={resolvedInputMode === 'text' ? 'text' : resolvedInputMode}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-32 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
        placeholder={placeholder}
        autoComplete="off"
      />
      {unit && (
        <span className="text-xl font-bold text-gray-700">{unit}</span>
      )}
    </div>
  );
}
