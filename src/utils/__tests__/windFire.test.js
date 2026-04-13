import { describe, it, expect } from 'vitest';
import { resolveWindKmh } from '../../constants.js';

describe('resolveWindKmh', () => {
  it('returns current wind when live weather is present', () => {
    const live = { weather: { windKmh: 15 }, forecast: { windMax: [25] } };
    expect(resolveWindKmh(live)).toBe(15);
  });

  it('falls back to forecast wind max when current weather is unavailable (future trip)', () => {
    const live = { weather: null, forecast: { windMax: [25] } };
    expect(resolveWindKmh(live)).toBe(25);
  });

  it('returns null when neither current nor forecast wind is available', () => {
    expect(resolveWindKmh({ weather: null, forecast: null })).toBeNull();
    expect(resolveWindKmh({ weather: null, forecast: { windMax: [] } })).toBeNull();
    expect(resolveWindKmh(null)).toBeNull();
  });

  it('does not fall back to forecast when current wind is 0 (zero is a valid reading)', () => {
    const live = { weather: { windKmh: 0 }, forecast: { windMax: [40] } };
    expect(resolveWindKmh(live)).toBe(0);
  });
});
