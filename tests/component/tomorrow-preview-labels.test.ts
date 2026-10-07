import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TomorrowPreviewCard from '@/components/TomorrowPreviewCard';
import { STEP_DEFAULT_PHASES, type TomorrowLessonPreview } from '@/lib/types';

const preview: TomorrowLessonPreview = {
  date: '2026-09-30', stepCount: 6,
  stepTypes: Object.keys(STEP_DEFAULT_PHASES) as TomorrowLessonPreview['stepTypes'],
  difficultyRange: { min: 1, max: 3 }, gradeBand: 'G1',
  sampleQuestionPreview: '有 5 个苹果，又拿来 3 个，一共有几个？', estimatedStars: 999,
};

const full = renderToStaticMarkup(createElement(TomorrowPreviewCard, { preview }));
for (const type of preview.stepTypes) assert.ok(!full.includes(type), `Internal step ${type} must not appear in the rendered card`);
assert.match(full, /找比较关系/);
assert.match(full, /独立解题/);
assert.match(full, /明日练习内容/);
for (const variant of ['full', 'compact'] as const) {
  const html = renderToStaticMarkup(createElement(TomorrowPreviewCard, { preview, variant }));
  assert.ok(!/999|⭐|星星/.test(html), 'Old estimated star rewards must never be presented');
  assert.match(html, /1\s*积分/);
}
for (const type of ['future_step', '__proto__', 'constructor']) {
  const html = renderToStaticMarkup(createElement(TomorrowPreviewCard, {
    preview: { ...preview, stepTypes: [type as TomorrowLessonPreview['stepTypes'][number]] },
  }));
  assert.ok(!html.includes(type), 'Unrecognized persisted step types need a readable fallback');
}
console.log('PASS rendered preview labels, unknown cached types, and points copy in both variants');
