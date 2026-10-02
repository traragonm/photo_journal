import { printRotations } from '@/theme';

/** Stable 32-bit FNV-1a hash so a given id always maps to the same tilt. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic print tilt in degrees for an entry id. Never jumps between renders. */
export function rotationFor(id: string): number {
  return printRotations[hashString(id) % printRotations.length];
}
