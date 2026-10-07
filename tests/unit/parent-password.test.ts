import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  changeParentPassword, getParentPasswordStatus, PARENT_PASSWORD_STORAGE_KEY,
  setupParentPassword, verifyParentPassword,
} from '../../lib/parentPassword';

class MemoryStorage {
  values = new Map<string, string>();
  failWrites = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('storage unavailable');
    this.values.set(key, value);
  }
}

async function main() {
  const provider = webcrypto as unknown as Crypto;
  const storage = new MemoryStorage();
  assert.equal(getParentPasswordStatus(storage), 'unconfigured');
  assert.equal(await setupParentPassword('135790', '135790', storage, provider), 'success');
  assert.equal(getParentPasswordStatus(storage), 'configured');
  assert.equal(storage.getItem(PARENT_PASSWORD_STORAGE_KEY)?.includes('135790'), false);
  const originalRecord = storage.getItem(PARENT_PASSWORD_STORAGE_KEY);
  assert.equal(await setupParentPassword('222222', '222222', storage, provider), 'unavailable');
  assert.equal(storage.getItem(PARENT_PASSWORD_STORAGE_KEY), originalRecord, 'setup must not replace an existing password');

  assert.equal(await verifyParentPassword('wrong', storage, 1_000, provider), 'wrong');
  assert.equal(JSON.parse(storage.getItem(PARENT_PASSWORD_STORAGE_KEY)!).failedAttempts, 1);
  assert.equal(await verifyParentPassword('135790', storage, 2_000, provider), 'success');
  assert.equal(JSON.parse(storage.getItem(PARENT_PASSWORD_STORAGE_KEY)!).failedAttempts, 0);

  const lockStart = 50_000;
  for (let attempt = 1; attempt < 5; attempt += 1) {
    assert.equal(await verifyParentPassword('nope', storage, lockStart, provider), 'wrong');
  }
  assert.equal(await verifyParentPassword('nope', storage, lockStart, provider), 'locked');
  assert.equal(getParentPasswordStatus(storage, lockStart + 1), 'locked');
  assert.equal(await verifyParentPassword('135790', storage, lockStart + 59_999, provider), 'locked');
  assert.equal(await verifyParentPassword('135790', storage, lockStart + 60_000, provider), 'success');

  const reloadedStorage = storage;
  assert.equal(await verifyParentPassword('135790', reloadedStorage, Date.now(), provider), 'success', 'credentials survive a page reload');
  assert.equal(await changeParentPassword('wrong', 'newpass1', 'newpass1', storage, provider), 'wrong');
  assert.equal(await changeParentPassword('135790', 'newpass1', 'mismatch', storage, provider), 'invalid');
  assert.equal(await changeParentPassword('135790', 'newpass1', 'newpass1', storage, provider), 'success');
  assert.equal(await verifyParentPassword('135790', storage, Date.now(), provider), 'wrong');
  assert.equal(await verifyParentPassword('newpass1', storage, Date.now(), provider), 'success');

  const malformed = new MemoryStorage();
  malformed.values.set(PARENT_PASSWORD_STORAGE_KEY, '{bad json');
  assert.equal(getParentPasswordStatus(malformed), 'unavailable');
  assert.equal(await setupParentPassword('anything', 'anything', malformed, provider), 'unavailable');
  assert.equal(await verifyParentPassword('anything', malformed, Date.now(), provider), 'unavailable');

  const failedWrite = new MemoryStorage();
  failedWrite.failWrites = true;
  assert.equal(await setupParentPassword('123456', '123456', failedWrite, provider), 'unavailable');
  assert.equal(failedWrite.getItem(PARENT_PASSWORD_STORAGE_KEY), null, 'a failed write must not create an authenticated state');

  console.log('Parent password service checks passed.');
}

void main();
