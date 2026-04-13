import { describe, it, expect } from 'vitest';
import { sunriseAlarm } from '../../constants.js';

describe('sunriseAlarm', () => {
  it('subtracts 30 minutes in the normal case', () => {
    expect(sunriseAlarm('06:40')).toBe('06:10');
    expect(sunriseAlarm('07:45')).toBe('07:15');
  });

  it('borrows from the hour when minutes underflow', () => {
    // This was the bug: 06:10 - 30 was incorrectly returning 06:00
    expect(sunriseAlarm('06:10')).toBe('05:40');
    expect(sunriseAlarm('06:00')).toBe('05:30');
    expect(sunriseAlarm('05:20')).toBe('04:50');
  });

  it('handles an exact 30-minute boundary', () => {
    expect(sunriseAlarm('06:30')).toBe('06:00');
    expect(sunriseAlarm('07:00')).toBe('06:30');
  });

  it('pads single-digit minutes', () => {
    expect(sunriseAlarm('06:05')).toBe('05:35');
  });
});
