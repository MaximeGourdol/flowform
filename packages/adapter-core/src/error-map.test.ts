import { describe, expect, it } from 'vitest';
import { addIssue, filterByPaths, normalizePath } from './error-map.js';

describe('normalizePath', () => {
  it('joins string segments with dots', () => {
    expect(normalizePath(['user', 'address', 'city'])).toBe(
      'user.address.city',
    );
  });

  it('renders numeric array indexes with dot notation', () => {
    expect(normalizePath(['items', 0, 'qty'])).toBe('items.0.qty');
  });

  it('unwraps object segments carrying a key (standard schema shape)', () => {
    expect(normalizePath([{ key: 'user' }, { key: 'email' }])).toBe(
      'user.email',
    );
  });

  it('returns an empty string for a root-level issue', () => {
    expect(normalizePath([])).toBe('');
  });
});

describe('addIssue', () => {
  it('creates a new key with the message', () => {
    const map: Record<string, string[]> = {};
    addIssue(map, 'user.email', 'Required');
    expect(map).toEqual({ 'user.email': ['Required'] });
  });

  it('appends multiple messages to the same key', () => {
    const map: Record<string, string[]> = {};
    addIssue(map, 'user.email', 'Required');
    addIssue(map, 'user.email', 'Invalid');
    expect(map).toEqual({ 'user.email': ['Required', 'Invalid'] });
  });
});

describe('filterByPaths', () => {
  const full = {
    'user.email': ['Required'],
    'user.name': ['Too short'],
    'shipping.zip': ['Invalid'],
  };

  it('returns the full map when no paths are given', () => {
    expect(filterByPaths(full, undefined)).toEqual(full);
  });

  it('keeps only the requested paths', () => {
    expect(filterByPaths(full, ['user.email'])).toEqual({
      'user.email': ['Required'],
    });
  });

  it('keeps nested children of a requested path prefix', () => {
    expect(filterByPaths(full, ['user'])).toEqual({
      'user.email': ['Required'],
      'user.name': ['Too short'],
    });
  });

  it('drops everything when no path matches', () => {
    expect(filterByPaths(full, ['nope'])).toEqual({});
  });
});
