import { useContext } from "react";
import { C } from "../constants.js";
import { TripDateCtx } from "../context.js";

export function TripDatePicker() {
  const { tripDate, setTripDate } = useContext(TripDateCtx);
  const today = new Date().toISOString().split('T')[0];

  let daysAway = null;
  let daysLabel = '';
  let daysColor = C.text;
  if (tripDate) {
    const msPerDay = 86400000;
    daysAway = Math.round((new Date(tripDate + 'T12:00:00') - new Date(today + 'T12:00:00')) / msPerDay);
    if (daysAway === 0) { daysLabel = 'Today'; daysColor = C.sage; }
    else if (daysAway === 1) { daysLabel = 'Tomorrow'; daysColor = C.gold; }
    else if (daysAway <= 3) { daysLabel = `${daysAway} days away`; daysColor = C.gold; }
    else if (daysAway <= 14) { daysLabel = `${daysAway} days away`; daysColor = C.text; }
    else { daysLabel = `${daysAway} days away`; daysColor = C.muted; }
  }

  const beyondForecast = daysAway != null && daysAway > 16;

  return (
    <div style={{
      padding: '7px 28px',
      background: C.s1,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      fontFamily: "'JetBrains Mono','Courier New',monospace",
      fontSize: 11,
    }}>
      <span style={{
        fontSize: 10,
        color: C.dim,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        flexShrink: 0,
      }}>Trip date</span>
      <input
        type="date"
        value={tripDate || ''}
        onChange={e => setTripDate(e.target.value)}
        style={{
          background: C.bg,
          color: C.text,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: '3px 7px',
          fontSize: 11,
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          outline: 'none',
          cursor: 'pointer',
        }}
      />
      {daysLabel && (
        <span style={{ color: daysColor }}>{daysLabel}</span>
      )}
      {beyondForecast && (
        <span style={{ color: C.warn }}>· beyond forecast window</span>
      )}
    </div>
  );
}
