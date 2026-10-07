'use client';

/**
 * v2.11.0: AnswerInputRouter
 *
 * Routes to the correct input component based on answerSchema.kind.
 * This is the SINGLE decision point for answer UI — no component should
 * decide on its own what input to render based on stepType.
 */

import React from 'react';
import type { AnswerSchema } from '@/lib/types';
import { MoneyInput } from './MoneyInput';
import { MultiFieldInput } from './MultiFieldInput';
import { IntegerInput } from './IntegerInput';
import { ChoiceInput } from './ChoiceInput';
import { ComparisonSymbolInput } from './ComparisonSymbolInput';
import { PercentInput } from './PercentInput';

export interface AnswerInputRouterProps {
  schema: AnswerSchema;
  value: string | Record<string, string>;
  onChange: (value: string | Record<string, string>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function AnswerInputRouter({
  schema,
  value,
  onChange,
  onSubmit,
  disabled = false,
  autoFocus = true,
}: AnswerInputRouterProps) {
  switch (schema.kind) {
    case 'integer':
      return (
        <IntegerInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          min={schema.min}
          max={schema.max}
          allowNegative={schema.allowNegative}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'decimal':
      return (
        <IntegerInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          decimal={true}
          decimalPlaces={schema.decimalPlaces}
          unit={schema.unit}
          min={schema.min}
          max={schema.max}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'money':
      return (
        <MoneyInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          inputMode={schema.inputMode}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'multi_field':
      return (
        <MultiFieldInput
          fields={schema.fields}
          value={typeof value === 'object' ? value : {}}
          onChange={onChange}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'choice':
      return (
        <ChoiceInput
          options={schema.options}
          multiple={schema.multiple}
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'comparison_symbol':
      return (
        <ComparisonSymbolInput
          options={schema.options}
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'expression':
      return (
        <IntegerInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          allowExpression={true}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'text':
      return (
        <IntegerInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          inputMode="text"
          placeholder="请输入完整答案"
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'fraction':
    case 'ratio':
      return (
        <IntegerInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          inputMode="text"
          placeholder={schema.kind === 'fraction' ? '如 1/2' : '如 2:3'}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'percent':
      return (
        <PercentInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    case 'not_enough_information':
      return (
        <ChoiceInput
          options={[
            { id: 'not_enough', label: '信息不够，没法算', value: '信息不足' },
            { id: 'can_solve', label: '可以算出来', value: '可以算' },
          ]}
          multiple={false}
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'ordering':
      return (
        <IntegerInput
          value={typeof value === 'string' ? value : ''}
          onChange={v => onChange(v)}
          onSubmit={onSubmit}
          inputMode="text"
          placeholder="按顺序填写，用逗号分隔"
          disabled={disabled}
          autoFocus={autoFocus}
        />
      );

    default:
      return (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-center">
          <p className="text-red-600 font-bold">Answer Schema Error</p>
          <p className="text-sm text-red-500">Unsupported schema kind: {(schema as any).kind}</p>
        </div>
      );
  }
}
