// Canonical JSON and a 64-bit FNV-1a style hash built from Math.imul, for golden files.

export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(o[k])).join(',') + '}';
}

/** Two independent 32-bit FNV-1a lanes over UTF-16 code units, printed as 16 hex digits. */
export function hash64(str: string): string {
  let a = 0x811c9dc5 | 0;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
    b ^= b >>> 15;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(a) + hex(b);
}

export function specHash(spec: unknown): string {
  return hash64(canonicalJson(spec));
}
