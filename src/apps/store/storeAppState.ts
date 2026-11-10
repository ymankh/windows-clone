const STATE_PREFIX = "store-app-state";
const MAX_STATE_BYTES = 1_000_000;

const keyFor = (appId: string, windowId: string) => `${STATE_PREFIX}:${appId}:${windowId}`;

export const loadStoreAppState = (appId: string, windowId: string): unknown => {
  try {
    const stored = localStorage.getItem(keyFor(appId, windowId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/** Returns false when the state is too large or storage is unavailable. */
export const saveStoreAppState = (appId: string, windowId: string, state: unknown) => {
  try {
    const serialized = JSON.stringify(state ?? null);
    if (serialized.length > MAX_STATE_BYTES) return false;
    localStorage.setItem(keyFor(appId, windowId), serialized);
    return true;
  } catch {
    return false;
  }
};

export const clearStoreAppState = (appId: string) => {
  try {
    const prefix = `${STATE_PREFIX}:${appId}:`;
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
};
