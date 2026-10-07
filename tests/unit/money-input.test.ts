import assert from 'node:assert/strict';
import { formatYuanJiaoValue } from '@/components/lesson/MoneyInput';
assert.equal(formatYuanJiaoValue('', ''), '');
assert.equal(formatYuanJiaoValue('0', ''), '0元');
assert.equal(formatYuanJiaoValue('', '0'), '0角');
assert.equal(formatYuanJiaoValue('0', '0'), '0元');
assert.equal(formatYuanJiaoValue('2', '0'), '2元');
assert.equal(formatYuanJiaoValue('2', '5'), '2元5角');
console.log('money-input: PASS');
