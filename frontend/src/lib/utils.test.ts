import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('frontend utils', () => {
  it('formats dates correctly', () => {
    const formatted = formatDate('2025-01-15T12:00:00Z');
    expect(formatted).toContain('2025');
  });
});
