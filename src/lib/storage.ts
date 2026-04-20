// Thin wrapper around localStorage with graceful fallback when storage is
// unavailable (private mode, disabled cookies, etc.).
const KEY_PREFIX = "atelier.";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(KEY_PREFIX + key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + key);
  } catch {
    // ignore
  }
}

export const storage = {
  get: safeGet,
  set: safeSet,
  remove: safeRemove,
};
