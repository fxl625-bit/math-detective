export const PARENT_PASSWORD_STORAGE_KEY = 'math-detective-parent-password-v1';
export const PARENT_PASSWORD_MIN_LENGTH = 6;
export const PARENT_PASSWORD_MAX_LENGTH = 64;
export const PARENT_PASSWORD_ITERATIONS = 120_000;
export const PARENT_PASSWORD_LOCK_MS = 60_000;
const DIGEST_BYTES = 32;
const SALT_BYTES = 16;

export interface ParentPasswordState {
  version: 1;
  salt: string;
  digest: string;
  iterations: number;
  failedAttempts: number;
  lockedUntil: number;
}

export interface ParentPasswordStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ParentPasswordStatus = 'unconfigured' | 'configured' | 'locked' | 'unavailable';
export type ParentPasswordResult = 'success' | 'wrong' | 'locked' | 'unconfigured' | 'invalid' | 'unavailable';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/.test(value)) throw new Error('Invalid password record');
  return Uint8Array.from(value.match(/.{2}/g) || [], byte => Number.parseInt(byte, 16));
}

function validState(value: unknown): value is ParentPasswordState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.version === 1
    && typeof item.salt === 'string' && /^[0-9a-f]{32}$/.test(item.salt)
    && typeof item.digest === 'string' && /^[0-9a-f]{64}$/.test(item.digest)
    && Number.isSafeInteger(item.iterations) && Number(item.iterations) >= 100_000 && Number(item.iterations) <= 2_000_000
    && Number.isSafeInteger(item.failedAttempts) && Number(item.failedAttempts) >= 0 && Number(item.failedAttempts) <= 5
    && Number.isSafeInteger(item.lockedUntil) && Number(item.lockedUntil) >= 0;
}

function readState(storage: ParentPasswordStorage): ParentPasswordState | null {
  const raw = storage.getItem(PARENT_PASSWORD_STORAGE_KEY);
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Invalid password record'); }
  if (!validState(value)) throw new Error('Invalid password record');
  return value;
}

function secureCrypto(provider?: Crypto): Crypto {
  const value = provider || globalThis.crypto;
  if (!value?.subtle || !value.getRandomValues) throw new Error('Secure crypto unavailable');
  return value;
}

async function digest(password: string, salt: Uint8Array, iterations: number, provider?: Crypto): Promise<string> {
  const cryptoProvider = secureCrypto(provider);
  const key = await cryptoProvider.subtle.importKey('raw', new TextEncoder().encode(password) as unknown as BufferSource, 'PBKDF2', false, ['deriveBits']);
  const bits = await cryptoProvider.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations }, key, DIGEST_BYTES * 8);
  return toHex(new Uint8Array(bits));
}

function writeState(storage: ParentPasswordStorage, value: ParentPasswordState): void {
  const serialized = JSON.stringify(value);
  storage.setItem(PARENT_PASSWORD_STORAGE_KEY, serialized);
  if (storage.getItem(PARENT_PASSWORD_STORAGE_KEY) !== serialized) throw new Error('Password storage write could not be verified');
}

export function getParentPasswordStatus(storage: ParentPasswordStorage, now = Date.now()): ParentPasswordStatus {
  try {
    const state = readState(storage);
    if (!state) return 'unconfigured';
    return state.lockedUntil > now ? 'locked' : 'configured';
  } catch {
    return 'unavailable';
  }
}

export async function setupParentPassword(password: string, confirmation: string, storage: ParentPasswordStorage, provider?: Crypto): Promise<ParentPasswordResult> {
  if (password.length < PARENT_PASSWORD_MIN_LENGTH || password.length > PARENT_PASSWORD_MAX_LENGTH || password !== confirmation) return 'invalid';
  let existing: ParentPasswordState | null;
  try { existing = readState(storage); } catch { return 'unavailable'; }
  if (existing) return 'unavailable';
  try {
    const cryptoProvider = secureCrypto(provider);
    const salt = cryptoProvider.getRandomValues(new Uint8Array(SALT_BYTES));
    const state: ParentPasswordState = {
      version: 1, salt: toHex(salt), digest: await digest(password, salt, PARENT_PASSWORD_ITERATIONS, cryptoProvider),
      iterations: PARENT_PASSWORD_ITERATIONS, failedAttempts: 0, lockedUntil: 0,
    };
    if (readState(storage) !== null) return 'unavailable';
    writeState(storage, state);
    return 'success';
  } catch { return 'unavailable'; }
}

export async function verifyParentPassword(password: string, storage: ParentPasswordStorage, now = Date.now(), provider?: Crypto): Promise<ParentPasswordResult> {
  let state: ParentPasswordState | null;
  try { state = readState(storage); } catch { return 'unavailable'; }
  if (!state) return 'unconfigured';
  if (state.lockedUntil > now) return 'locked';
  if (password.length > PARENT_PASSWORD_MAX_LENGTH) return 'wrong';
  try {
    const candidate = await digest(password, fromHex(state.salt), state.iterations, provider);
    const latest = readState(storage);
    if (!latest) return 'unavailable';
    if (latest.lockedUntil > now) return 'locked';
    if (JSON.stringify(latest) !== JSON.stringify(state)) return 'unavailable';
    if (candidate !== state.digest) {
      const failedAttempts = state.failedAttempts + 1;
      writeState(storage, {
        ...state, failedAttempts: Math.min(failedAttempts, 5),
        lockedUntil: failedAttempts >= 5 ? now + PARENT_PASSWORD_LOCK_MS : 0,
      });
      return failedAttempts >= 5 ? 'locked' : 'wrong';
    }
    writeState(storage, { ...state, failedAttempts: 0, lockedUntil: 0 });
    return 'success';
  } catch { return 'unavailable'; }
}

export async function changeParentPassword(currentPassword: string, newPassword: string, confirmation: string, storage: ParentPasswordStorage, provider?: Crypto): Promise<ParentPasswordResult> {
  if (newPassword.length < PARENT_PASSWORD_MIN_LENGTH || newPassword.length > PARENT_PASSWORD_MAX_LENGTH || newPassword !== confirmation) return 'invalid';
  let state: ParentPasswordState | null;
  try { state = readState(storage); } catch { return 'unavailable'; }
  if (!state) return 'unconfigured';
  const verification = await verifyParentPassword(currentPassword, storage, Date.now(), provider);
  if (verification !== 'success') return verification;
  try {
    const latest = readState(storage);
    if (!latest || latest.salt !== state.salt || latest.digest !== state.digest) return 'unavailable';
    const cryptoProvider = secureCrypto(provider);
    const salt = cryptoProvider.getRandomValues(new Uint8Array(SALT_BYTES));
    const next: ParentPasswordState = {
      version: 1, salt: toHex(salt), digest: await digest(newPassword, salt, PARENT_PASSWORD_ITERATIONS, cryptoProvider),
      iterations: PARENT_PASSWORD_ITERATIONS, failedAttempts: 0, lockedUntil: 0,
    };
    const beforeWrite = readState(storage);
    if (!beforeWrite || beforeWrite.salt !== state.salt || beforeWrite.digest !== state.digest) return 'unavailable';
    writeState(storage, next);
    return 'success';
  } catch { return 'unavailable'; }
}
