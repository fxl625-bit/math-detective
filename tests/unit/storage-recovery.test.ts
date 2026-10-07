import assert from 'node:assert/strict';
import { getStorageRecoveryStatus, loadState, saveState } from '@/lib/storage';
import { DEFAULT_GAME_STATE } from '@/lib/types';

const store = new Map<string, string>();
let unavailable = false;
(globalThis as any).window = {};
(globalThis as any).localStorage = {
  getItem(key: string) { if (unavailable) throw new DOMException('disabled', 'SecurityError'); return store.get(key) ?? null; },
  setItem(key: string, value: string) { if (unavailable) throw new DOMException('disabled', 'SecurityError'); store.set(key, value); },
  removeItem(key: string) { store.delete(key); },
};
const damaged = '{"stars":42, damaged';
store.set('math-detective-state', damaged);
assert.equal(loadState().stars, 0);
assert.equal(getStorageRecoveryStatus(), 'corrupt');
assert.equal(saveState({ ...DEFAULT_GAME_STATE, stars: 99 }), false);
assert.equal(store.get('math-detective-state'), damaged, 'corrupt raw data is never overwritten by defaults');
unavailable = true;
loadState();
assert.equal(getStorageRecoveryStatus(), 'unavailable');
assert.equal(saveState(DEFAULT_GAME_STATE), false);
unavailable = false;
store.delete('math-detective-state');
loadState();
assert.equal(getStorageRecoveryStatus(), null, 'a successful read clears the temporary unavailable state');
console.log('storage-recovery: PASS');
