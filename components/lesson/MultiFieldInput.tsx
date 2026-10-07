'use client';

/**
 * v2.11.0: MultiFieldInput — multiple answer fields for questions like
 * "比59大1的数是几？比59小1的数是几？"
 */

import React, { useState, useRef, useEffect } from 'react';
import type { AnswerField } from '@/lib/types';
import { displayPercentInputValue, isValidPercentEntry, serializePercentAnswer } from '@/lib/answerSchema';

interface MultiFieldInputProps {
  fields: AnswerField[];
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function MultiFieldInput({
  fields,
  value,
  onChange,
  onSubmit,
  disabled = false,
}: MultiFieldInputProps) {
  const refs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    // Auto-focus first field
    const firstRef = refs.current.get(fields[0]?.id);
    firstRef?.focus();
  }, [fields]);

  const handleChange = (fieldId: string, v: string) => {
    const field = fields.find(item => item.id === fieldId);
    if (field?.kind === 'percent') {
      if (!isValidPercentEntry(v)) return;
      onChange({ ...value, [fieldId]: serializePercentAnswer(v) });
      return;
    }
    onChange({ ...value, [fieldId]: v });
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldId: string, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If this is the last field, submit
      if (index === fields.length - 1) {
        onSubmit();
      } else {
        // Move to next field
        const nextRef = refs.current.get(fields[index + 1]?.id);
        nextRef?.focus();
      }
    }
  };

  const allFilled = fields.every(f => (value[f.id] || '').trim());

  return (
    <div className="space-y-4">
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-1">
          <label htmlFor={`answer-${field.id}`} className="block text-sm font-bold text-gray-600 text-center">
            {field.label}{field.kind === 'percent' ? '（只填数值，%已标出）' : ''}
            {field.unit && field.kind !== 'percent' && <span className="text-gray-400 ml-1">（{field.unit}）</span>}
          </label>
          <div className="flex justify-center">
            <input
              id={`answer-${field.id}`}
              data-testid={`lesson-answer-input-${field.id}`}
              ref={el => { if (el) refs.current.set(field.id, el); }}
              type="text"
              inputMode={['fraction', 'ratio', 'percent', 'text'].includes(field.kind) ? 'text' : field.kind === 'integer' ? 'numeric' : 'decimal'}
              value={field.kind === 'percent' ? displayPercentInputValue(value[field.id] || '') : value[field.id] || ''}
              onChange={e => handleChange(field.id, e.target.value)}
              onKeyDown={e => handleKeyDown(e, field.id, i)}
              disabled={disabled}
              className="w-32 h-14 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
              placeholder="?"
              autoComplete="off"
            />
            {field.kind === 'percent' && <span className="text-xl font-bold text-gray-700">%</span>}
          </div>
          {field.unit && field.kind !== 'percent' && (
            <p className="text-xs text-gray-400 text-center">单位：{field.unit}</p>
          )}
        </div>
      ))}

      {!allFilled && (
        <p className="text-xs text-amber-500 text-center">
          这道题有 {fields.length} 个问题，全部填完再提交哦～
        </p>
      )}
    </div>
  );
}
