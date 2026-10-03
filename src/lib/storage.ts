/** localStorage that never throws (blocked storage, private mode, quota): reads fall back to null, writes are skipped. */
export function readStored(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writeStored(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* remembering is a convenience, not a requirement */ }
}
