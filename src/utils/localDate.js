/**
 * Returns today's date in Vancouver local time as YYYY-MM-DD.
 * Using toISOString() gives UTC, which rolls over several hours early
 * each evening Pacific time. en-CA locale produces the correct format.
 */
export function vancouverToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
}
