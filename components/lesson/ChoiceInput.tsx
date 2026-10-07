'use client';

/**
 * v2.11.0: ChoiceInput — multiple choice answer input.
 */

import React from 'react';
import type { AnswerOption } from '@/lib/types';

interface ChoiceInputProps {
  options: AnswerOption[];
  multiple: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChoiceInput({
  options,
  multiple,
  value,
  onChange,
  onSubmit,
  disabled = false,
}: ChoiceInputProps) {
  const selected = multiple ? value.split(',').filter(Boolean) : [value];

  const toggleOption = (optId: string) => {
    if (multiple) {
      const next = selected.includes(optId)
        ? selected.filter(s => s !== optId)
        : [...selected, optId];
      onChange(next.join(','));
    } else {
      onChange(optId);
    }
  };

  const isSelected = (optId: string) => selected.includes(optId);

  return (
    <div className="space-y-2">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={isSelected(opt.id)}
          onClick={() => toggleOption(opt.id)}
          disabled={disabled}
          className={`w-full p-4 text-left rounded-xl border-2 transition-all text-lg font-bold ${
            isSelected(opt.id)
              ? 'border-amber-500 bg-amber-100 text-amber-800 shadow-md'
              : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
      {multiple && (
        <p className="text-xs text-gray-400 text-center mt-2">
          可选多个答案，选完后按下方按钮提交
        </p>
      )}
    </div>
  );
}
