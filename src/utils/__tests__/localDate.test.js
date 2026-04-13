import { describe, it, expect, vi, afterEach } from 'vitest';
import { vancouverToday } from '../localDate.js';

afterEach(() => vi.useRealTimers());

describe('vancouverToday', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(vancouverToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns Vancouver-local date, not UTC — 00:30 UTC is still the previous day in Pacific time', () => {
    // 2024-03-15T00:30:00Z = 2024-03-14T16:30 PST (UTC-8)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T00:30:00Z'));
    expect(vancouverToday()).toBe('2024-03-14');
  });

  it('advances at midnight Vancouver time, not midnight UTC', () => {
    // 2024-03-15T08:01:00Z = 2024-03-15T00:01 PST — just ticked over in Vancouver
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T08:01:00Z'));
    expect(vancouverToday()).toBe('2024-03-15');
  });
});
