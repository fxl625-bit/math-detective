'use client';

/**
 * v2.11.0: ComparisonSymbolInput — > / < / = selection for comparison questions.
 */

import React from 'react';

interface ComparisonSymbolInputProps {
  options: ('>' | '<' | '=')[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const SYMBOL_LABELS: Record<string, { label: string; desc: string }> = {
  '>': { label: '>', desc: '大于' },
  '<': { label: '<', desc: '小于' },
  '=': { label: '=', desc: '等于' },
};

export function ComparisonSymbolInput({
  options,
  value,
  onChange,
  disabled = false,
}: ComparisonSymbolInputProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {options.map(sym => (
        <button
          key={sym}
          type="button"
          aria-pressed={value === sym}
          onClick={() => {
            onChange(sym);
          }}
          disabled={disabled}
          className={`w-20 h-20 rounded-2xl border-2 text-3xl font-extrabold transition-all ${
            value === sym
              ? 'border-amber-500 bg-amber-100 text-amber-700 shadow-lg scale-110'
              : 'border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:bg-amber-50'
          }`}
          title={SYMBOL_LABELS[sym]?.desc}
        >
          {sym}
        </button>
      ))}
    </div>
  );
}
