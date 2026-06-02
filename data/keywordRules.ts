// ========== 关键词分类规则 ==========

import { KeywordItem, OperationType } from '@/lib/types';

export type KeywordCategory =
  | 'addition_change'
  | 'subtraction_change'
  | 'comparison'
  | 'multiplicative_comparison'
  | 'multiplication_groups'
  | 'division_share'
  | 'mixed_relation';

export interface KeywordClassification {
  keyword: string;
  category: KeywordCategory;
  operationHint: OperationType;
  avoidBinaryPrompt?: boolean; // 不能用"变多/变少"二选一
  g1Prompt?: string;
  g2Prompt?: string;
  g3plusPrompt?: string;
}

// ========== 关键词分类表 ==========

export const KEYWORD_CLASSIFICATIONS: Record<string, KeywordClassification> = {
  // ── 加法变化 ──
  '又来了':   { keyword:'又来了',   category:'addition_change', operationHint:'addition' },
  '又跑来':   { keyword:'又跑来',   category:'addition_change', operationHint:'addition' },
  '又飞来':   { keyword:'又飞来',   category:'addition_change', operationHint:'addition' },
  '又买了':   { keyword:'又买了',   category:'addition_change', operationHint:'addition' },
  '又拿来':   { keyword:'又拿来',   category:'addition_change', operationHint:'addition' },
  '又开了':   { keyword:'又开了',   category:'addition_change', operationHint:'addition' },
  '又进来':   { keyword:'又进来',   category:'addition_change', operationHint:'addition' },
  '又开来':   { keyword:'又开来',   category:'addition_change', operationHint:'addition' },
  '又加了':   { keyword:'又加了',   category:'addition_change', operationHint:'addition' },
  '又给了':   { keyword:'又给了',   category:'addition_change', operationHint:'addition' },
  '一共':     { keyword:'一共',     category:'addition_change', operationHint:'addition' },
  '总共':     { keyword:'总共',     category:'addition_change', operationHint:'addition' },
  '合起来':   { keyword:'合起来',   category:'addition_change', operationHint:'addition' },
  // ── 减法变化 ──
  '飞走了':   { keyword:'飞走了',   category:'subtraction_change', operationHint:'subtraction' },
  '吃掉了':   { keyword:'吃掉了',   category:'subtraction_change', operationHint:'subtraction' },
  '用掉了':   { keyword:'用掉了',   category:'subtraction_change', operationHint:'subtraction' },
  '喝掉了':   { keyword:'喝掉了',   category:'subtraction_change', operationHint:'subtraction' },
  '摘走了':   { keyword:'摘走了',   category:'subtraction_change', operationHint:'subtraction' },
  '游走了':   { keyword:'游走了',   category:'subtraction_change', operationHint:'subtraction' },
  '拿走了':   { keyword:'拿走了',   category:'subtraction_change', operationHint:'subtraction' },
  '走了':     { keyword:'走了',     category:'subtraction_change', operationHint:'subtraction' },
  '还剩':     { keyword:'还剩',     category:'subtraction_change', operationHint:'subtraction' },
  '剩下':     { keyword:'剩下',     category:'subtraction_change', operationHint:'subtraction' },
  // ── 比较 ──
  '比':       { keyword:'比',       category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true,
    g1Prompt:'这个词是在比一比谁多谁少', g2Prompt:'这个词表示两个数量在比较', g3plusPrompt:'这是比较关系，通常用减法求差' },
  '多':       { keyword:'多',       category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true },
  '少':       { keyword:'少',       category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true },
  '大':       { keyword:'大',       category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true },
  '相差':     { keyword:'相差',     category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true },
  '一样多':   { keyword:'一样多',   category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true },
  '多多少':   { keyword:'多多少',   category:'comparison', operationHint:'comparison', avoidBinaryPrompt:true },
  // ── 倍数比较 ──
  '倍':       { keyword:'倍',       category:'multiplicative_comparison', operationHint:'mixed', avoidBinaryPrompt:true,
    g1Prompt:'"倍"可以先想成：几个一样多合起来', g2Prompt:'"倍"表示几份一样多', g3plusPrompt:'"倍"是倍数关系，通常用乘法或除法' },
  '几倍':     { keyword:'几倍',     category:'multiplicative_comparison', operationHint:'mixed', avoidBinaryPrompt:true },
  // ── 乘法分组 ──
  '每盒':     { keyword:'每盒',     category:'multiplication_groups', operationHint:'multiplication', avoidBinaryPrompt:true,
    g1Prompt:'每组一样多，可以一组一组加起来', g2Prompt:'每盒一样多，有几个"一样多"', g3plusPrompt:'这是"几个几"，通常用乘法' },
  '每组':     { keyword:'每组',     category:'multiplication_groups', operationHint:'multiplication', avoidBinaryPrompt:true },
  '每人':     { keyword:'每人',     category:'multiplication_groups', operationHint:'mixed', avoidBinaryPrompt:true },
  '每排':     { keyword:'每排',     category:'multiplication_groups', operationHint:'multiplication', avoidBinaryPrompt:true },
  '每隔':     { keyword:'每隔',     category:'multiplication_groups', operationHint:'mixed', avoidBinaryPrompt:true },
  '几盒':     { keyword:'几盒',     category:'multiplication_groups', operationHint:'multiplication', avoidBinaryPrompt:true },
  // ── 平均分 ──
  '平均分':   { keyword:'平均分',   category:'division_share', operationHint:'division', avoidBinaryPrompt:true,
    g1Prompt:'"平均分"就是每份一样多', g2Prompt:'"平均分"是每份一样多，可以用除法', g3plusPrompt:'"平均分"通常用除法' },
  '每份':     { keyword:'每份',     category:'division_share', operationHint:'division', avoidBinaryPrompt:true },
  '分成':     { keyword:'分成',     category:'division_share', operationHint:'division', avoidBinaryPrompt:true },
  '平均':     { keyword:'平均',     category:'division_share', operationHint:'division', avoidBinaryPrompt:true },
  // ── 加减混合 ──
  '先':       { keyword:'先',       category:'mixed_relation', operationHint:'mixed', avoidBinaryPrompt:true },
  '再':       { keyword:'再',       category:'mixed_relation', operationHint:'mixed', avoidBinaryPrompt:true },
  '然后':     { keyword:'然后',     category:'mixed_relation', operationHint:'mixed', avoidBinaryPrompt:true },
};

export function classifyKeyword(word: string): KeywordClassification | undefined {
  return KEYWORD_CLASSIFICATIONS[word];
}

export function needsAddSubtractPrompt(keywords: KeywordItem[]): boolean {
  return keywords.every(k =>
    KEYWORD_CLASSIFICATIONS[k.word]?.category === 'addition_change' ||
    KEYWORD_CLASSIFICATIONS[k.word]?.category === 'subtraction_change'
  ) && keywords.length > 0;
}

export function getKeywordTypeDescription(kw: KeywordItem): string {
  const cls = KEYWORD_CLASSIFICATIONS[kw.word];
  if (!cls) return kw.type;
  switch (cls.category) {
    case 'addition_change': return '数量变多（加法）';
    case 'subtraction_change': return '数量变少（减法）';
    case 'comparison': return '比较两个数量的关系';
    case 'multiplicative_comparison': return '几份一样多（"倍"的关系）';
    case 'multiplication_groups': return '几个一样多合起来';
    case 'division_share': return '每份一样多（平均分）';
    case 'mixed_relation': return '多步变化，分步来想';
  }
}
