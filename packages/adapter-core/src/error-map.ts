import type { ErrorMap } from '@flowform/core';
import type { StandardPathSegment } from './types.js';

export type MutableErrorMap = Record<string, string[]>;

const segmentKey = (segment: PropertyKey | StandardPathSegment): PropertyKey =>
  typeof segment === 'object' ? segment.key : segment;

export const normalizePath = (
  segments: readonly (PropertyKey | StandardPathSegment)[],
): string => segments.map((segment) => String(segmentKey(segment))).join('.');

export const addIssue = (
  map: MutableErrorMap,
  path: string,
  message: string,
): void => {
  const existing = map[path];
  if (existing === undefined) {
    map[path] = [message];
    return;
  }
  existing.push(message);
};

export const filterByPaths = (
  map: ErrorMap,
  paths: readonly string[] | undefined,
): ErrorMap => {
  if (paths === undefined) {
    return map;
  }
  const out: MutableErrorMap = {};
  for (const [key, messages] of Object.entries(map)) {
    const matches = paths.some(
      (path) => key === path || key.startsWith(`${path}.`),
    );
    if (matches) {
      out[key] = [...messages];
    }
  }
  return out;
};
