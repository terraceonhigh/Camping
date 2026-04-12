import { useState, useEffect, createContext, useContext, useCallback } from "react";

const DurationCtx = createContext(14);
const LiveDataCtx = createContext(null);

function useLiveData() {
  const [data, setData] = useState({ weather: null, astronomy: null, forecast: null, fireBans: null, loading: true, error: null, lastUpdated: null });

  const fetchAll = useCallback(async () => {
    try {
      const [weatherRes, bansRes] = await Promise.allSettled([
        fetch('https://wttr.in/Vancouver?format=j1').then(r => r.json()),
        fetch('/api/bc-fire-bans').then(r => r.json()),
      ]);

      const w = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
      const bans = bansRes.status === 'fulfilled' ? bansRes.value : null;

      setData({
        weather: w?.current_condition?.[0] || null,
        astronomy: w?.weather?.[0]?.astronomy?.[0] || null,
        forecast: w?.weather || null,
        fireBans: bans?.features || null,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (e) {
      setData(prev => ({ ...prev, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return data;
}

function LiveStatusBar() {
  const live = useContext(LiveDataCtx);
  if (!live || live.loading) return (
    <div style={{ padding: '8px 28px', background: C.s1, borderBottom: `1px solid ${C.border}`,
      fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>
      Loading live data...
    </div>
  );
  if (live.error) return null;

  const w = live.weather;
  const astro = live.astronomy;
  const bans = live.fireBans;
  const hasBans = bans && bans.length > 0;

  return (
    <div style={{ padding: '10px 28px', background: C.s1, borderBottom: `1px solid ${C.border}`,
      display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
      fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>

      {w && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: C.text }}>{w.temp_C}°C</span>
          <span style={{ color: C.muted }}>feels {w.FeelsLikeC}°C</span>
          <span style={{ color: C.muted }}>{w.weatherDesc?.[0]?.value}</span>
          <span style={{ color: C.muted }}>wind {w.windspeedKmph} km/h {w.winddir16Point}</span>
          <span style={{ color: C.muted }}>humidity {w.humidity}%</span>
        </div>
      )}

      {astro && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center',
          borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
          <span style={{ color: C.amber }}>sunrise {astro.sunrise}</span>
          <span style={{ color: C.dim }}>sunset {astro.sunset}</span>
        </div>
      )}

      <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
        {hasBans ? (
          <span style={{ color: C.warn, fontWeight: 600 }}>
            ⚠ {bans.length} active fire ban{bans.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ color: C.sage }}>✓ No active fire bans</span>
        )}
      </div>

      {live.lastUpdated && (
        <span style={{ color: C.dim, marginLeft: 'auto', fontSize: 10 }}>
          updated {live.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

const C = {
  bg:     '#17140d', s1: '#201c13', s2: '#292418', s3: '#343020',
  text:   '#f0e4c8', muted: '#9c8b6c', dim: '#5a5040', amber: '#df7618',
  gold:   '#c8a44a', sage: '#7aaa7c', warn: '#e8b840', bc: '#68a8ca',
  border: '#38301e', border2: '#272012',
};

const TAG_META = {
  gf:          { label: 'GF',    bg: '#c8a44a22', color: '#c8a44a' },
  pescatarian: { label: 'fish',  bg: '#68a8ca22', color: '#68a8ca' },
  vegetarian:  { label: 'veg',   bg: '#7aaa7c22', color: '#7aaa7c' },
  vegan:       { label: 'vegan', bg: '#7aaa7c22', color: '#7aaa7c' },
};

const DURATION_LABELS = [
  { max: 3,  label: 'Evening fire' },
  { max: 5,  label: 'Into the night' },
  { max: 7,  label: 'Late night' },
  { max: 11, label: 'Overnight' },
  { max: 13, label: 'Near-dawn' },
  { max: 16, label: 'Afternoon to sunrise \u2605', star: true },
  { max: 23, label: 'Full overnight' },
  { max: 29, label: 'Day & a night' },
  { max: 36, label: 'Weekend retreat' },
];

const THRESHOLDS = [
  { h: 4,  label: 'layering' },
  { h: 6,  label: 'late night' },
  { h: 8,  label: 'overnight' },
  { h: 12, label: 'pre-dawn' },
  { h: 14, label: '\u2605 sunrise', star: true },
  { h: 15, label: 'morning after' },
  { h: 24, label: 'full day' },
];

function getDurationLabel(h) {
  return DURATION_LABELS.find(d => h <= d.max) || DURATION_LABELS[DURATION_LABELS.length - 1];
}

const DIETARY = [
  { tag: 'celiac', color: C.gold, label: 'Celiac (mild, 20 ppm)',
    detail: 'GF products recommended. Strict cross-contamination protocols not required. Shared skewers fine. Wheat beer off-limits.' },
  { tag: 'pescatarian', color: C.bc, label: 'Pescatarian',
    detail: 'No land meat. Dedicated fish/seafood skewers needed. Colour-code skewers.' },
];

const TREE = [
  { id: 'preflight', label: 'Pre-Flight Checks', emoji: '\u2713', minHours: 0,
    desc: 'Must resolve before departure', children: [
    { label: 'Fire & Environment', children: [
      { label: 'BC fire ban status \u2014 bcwildfire.ca', note: 'Check day-of, not just day-before', type: 'bc', liveKey: 'fireBans' },
      { label: 'Burn restrictions / air quality advisories' },
    ]},
    { label: 'Site', children: [
      { label: 'Campsite reservation confirmed', note: 'DiscoverCamping.ca' },
      { label: 'Park opening status', note: 'bcparks.ca' },
      { label: 'Highway and road conditions', note: 'DriveBC.ca' },
    ]},
    { label: 'Weather', children: [
      { label: '48-hour forecast', note: 'rain, wind, overnight low', liveKey: 'forecast' },
      { label: 'Rain plan confirmed', note: 'Tarp rigged on arrival if >40% precip', liveKey: 'rainRisk' },
    ]},
    { label: 'Gear', children: [
      { label: 'Headlamp batteries tested' },
      { label: 'Phone & power banks fully charged' },
      { label: 'Ice box pre-chilled', note: '1\u20132 hrs before loading food' },
    ]},
    { label: 'Guests', children: [
      { label: 'Dietary confirmed', note: 'celiac 20ppm + pescatarian', dietary: ['celiac','pescatarian'] },
      { label: 'Firewood purchase delegated', note: 'Buy near site \u2014 BC 10km rule', type: 'bc' },
      { label: 'Designated driver / overnight plan confirmed', type: 'warn' },
    ]},
    { label: 'Timing', children: [
      { label: 'Departure set for 3:00\u20134:00 PM arrival' },
      { label: 'Sunrise alarm pre-set', note: '4:30 AM' },
    ]},
  ]},
  { id: 'smores', label: "S'mores", emoji: '\ud83c\udf6b', minHours: 0,
    desc: 'Root-level ritual \u2014 elevated above The Meal', children: [
    { label: 'Marshmallows' },
    { label: 'Chocolate', note: 'Dark or milk' },
    { label: 'Graham crackers', note: 'Carry GF grahams separately; standard GF label (20ppm) safe for celiac guest', dietary: ['celiac'] },
    { label: 'Roasting sticks', dep: 'The Fire' },
  ]},
  { id: 'fire', label: 'The Fire', emoji: '\ud83d\udd25', minHours: 0,
    desc: 'Central dep \u2014 anchors Meal, Night, Sunrise, Music', children: [
    { label: 'BC Regulatory', type: 'bc', children: [
      { label: 'Fire ban status', note: 'Category 1 in designated rings. Bans activate <24hrs notice.', type: 'bc', dep: 'Pre-Flight \u2192 Fire & Env.' },
      { label: 'Campfire permit', note: 'Provincial Parks: fee covers it. FLNRORD: free permit at bcwildfire.ca. Backcountry: always required.', type: 'bc' },
      { label: 'Firewood transport rule (10 km)', note: 'BC Wildfire Act. Do not bring wood from Vancouver. Buy at or within 10km of site.', type: 'warn' },
      { label: 'Fire ring rule', note: 'Designated metal ring only. No ground fires, no moved rocks.' },
      { label: 'Extinguishing requirement', note: 'Cold to touch \u2014 drown, stir, check with bare hand.' },
    ]},
    { label: 'Fuel', children: [
      { label: 'Firewood', note: '2\u20133 bundles min (14-hr arc). Hardwood preferred. Reserve 1 bundle for 4:30 AM rebuild.' },
      { label: 'Kindling', note: 'Often missing from bundles \u2014 #1 reason fires fail. Buy fatwood near site.', type: 'warn' },
      { label: 'Tinder', note: 'Firestarter cubes, WetFire, or newspaper. Pack in sealed zip-lock \u2014 April humidity 70\u201385%.' },
    ]},
    { label: 'Ignition', children: [
      { label: 'Butane lighter (primary)' },
      { label: 'Waterproof matches (backup)', note: 'Separate dry bag' },
      { label: 'Fire starter cubes or fatwood', note: 'Bridges tinder to kindling in damp' },
    ]},
    { label: 'Fire Structure Knowledge', type: 'know', children: [
      { label: 'Modified teepee for April damp', note: 'Tinder centre, kindling teepee, two logs A-frame. Elevate off ground on bark.' },
      { label: 'Light from windward side' },
      { label: 'Allow kindling 5\u20137 min before large wood' },
      { label: 'Transition to log cabin / parallel log for sustained coals' },
    ]},
    { label: 'Wind Management', children: [
      { label: 'April: 10\u201320 km/h; higher at Porteau Cove' },
      { label: 'Body windbreak or tarp baffle during lighting' },
      { label: 'Abandon attempt if sustained >30 km/h', type: 'warn' },
    ]},
    { label: 'Damp Conditions Mitigation', children: [
      { label: 'Dry bark platform under tinder' },
      { label: 'Clear standing water from ring before building' },
      { label: 'Spare tinder in dry bag until needed' },
    ]},
    { label: 'Tending Equipment', children: [
      { label: 'Fire poker (metal rod or 60cm+ stick)' },
      { label: 'Work gloves (heat-resistant)' },
      { label: 'Camp axe or hatchet (optional)' },
      { label: 'Headlamp', dep: 'Shared Dep' },
    ]},
    { label: 'Safety Equipment', children: [
      { label: 'Water bucket or large pot', note: 'Min 8L. Fill on arrival.', type: 'warn' },
      { label: 'Small folding shovel' },
      { label: '1m clear radius around fire ring' },
      { label: 'Identify nearest water source on arrival' },
      { label: 'Brief group on extinguishing before first light' },
    ]},
  ]},
  { id: 'meal', label: 'The Meal', emoji: '\ud83c\udf62', minHours: 0,
    desc: 'Depends on The Fire (heat) and Cold Chain (proteins)', children: [
    { label: 'Dinner', children: [
      { label: 'Skewers / roasting sticks', children: [
        { label: 'Sausages', dep: 'Cold Chain', dietary: ['pescatarian'] },
        { label: 'Fish / shrimp', note: 'Shrimp, salmon chunks', dep: 'Cold Chain' },
        { label: 'Halloumi', note: 'GF, vegetarian, grills directly on skewer' },
        { label: 'Vegetables', note: 'Peppers, mushrooms, zucchini. GF + pescatarian-safe.' },
      ]},
      { label: 'Pre-made chili or stew', note: 'Made at home, reheated in pot over fire.', dietary: ['celiac'] },
      { label: 'Corn tortillas', note: 'GF. Universal base \u2014 wraps anything.' },
    ]},
    { label: 'Sweets', children: [
      { label: 'Bananas' },
      { label: 'Nutella' },
      { label: 'Chocolate', dep: "S'mores (shared)" },
      { label: 'Marshmallows', dep: "S'mores (shared)" },
      { label: 'Corn tortillas', dep: 'The Meal \u2192 Dinner' },
      { label: 'Butter', dep: 'The Meal \u2192 Cooking Gear' },
      { label: 'Brown sugar', note: 'Optional \u2014 for grilled banana' },
    ]},
    { label: 'Snacks', children: [
      { label: 'Early Evening (6\u20139 PM)', children: [
        { label: 'Cheese' },
        { label: 'GF crackers', dietary: ['celiac'] },
        { label: 'Fruit (apples, oranges)' },
        { label: 'Hummus + cut vegetables', note: 'No cold chain required in April ambient temps' },
      ]},
      { label: 'Late Night (10 PM\u20132 AM)', minHours: 6, children: [
        { label: 'Hot chocolate packets', dep: 'The Meal \u2192 Drinks' },
        { label: 'Spiced nuts' },
        { label: 'Jerky', note: 'Check marinade labels for gluten', dietary: ['celiac'] },
      ]},
      { label: 'Pre-Dawn (4:30 AM)', minHours: 12, children: [
        { label: 'Granola bars', note: 'Check labels', dietary: ['celiac'] },
        { label: 'Dates or dried fruit' },
        { label: 'Trail mix' },
      ]},
    ]},
    { label: 'Drinks', children: [
      { label: 'Coffee (percolator or instant)' },
      { label: 'Hot chocolate packets' },
      { label: 'Beer, wine, or spirits', dietary: ['celiac'] },
      { label: 'Water', note: '2L per person minimum' },
    ]},
    { label: 'Morning Fuel', minHours: 12, children: [
      { label: 'Coffee / thermos' },
      { label: 'Pastries or granola bars', dietary: ['celiac'] },
    ]},
    { label: 'Cold Chain', type: 'dep', children: [
      { label: 'Ice box / passive cooler', note: 'April ambient temps help. Preferred over 12V fridge.' },
      { label: 'Ice + dry ice on top for longevity' },
      { label: 'Raw proteins in sealed containers', note: 'Bottom of cooler, coldest zone.', dietary: ['pescatarian'] },
    ]},
    { label: 'Cooking Gear', children: [
      { label: 'Medium pot', dep: 'The Fire' },
      { label: 'Metal skewers', note: 'Colour-code one set for fish only', dietary: ['pescatarian'] },
      { label: 'Cutting board and knife' },
      { label: 'Plates, bowls, utensils (or disposable)' },
      { label: 'Trash bags + dish soap' },
    ]},
  ]},
  { id: 'night', label: 'The Night', emoji: '\ud83c\udf19', minHours: 8,
    desc: 'The 12\u20133 AM window. Car / tent / fire devotee.', children: [
    { label: 'Sleeping Gear', children: [
      { label: 'Sleeping bag rated 0\u20135\u00b0C per person', note: 'April overnight lows 5\u20137\u00b0C in Metro Vancouver' },
      { label: 'Sleeping pad (R-2.0 min, R-3.0+ recommended)', note: 'R-values are additive \u2014 stack a cheap foam pad (R-1.2) under an inflatable (R-2.5) = R-3.7', type: 'know' },
      { label: 'Real pillow', note: 'Compressible camping pillow or your home pillow in a stuff sack. Bunched-up jackets = "never again."' },
      { label: 'Earplugs (foam)', note: 'Campground noise, tent rustling, wildlife. $2 and transformative for beginners.' },
      { label: 'Eye mask', note: 'April sunrise ~6:15 AM \u2014 tent fabric transmits all of it' },
    ]},
    { label: 'Shelter', children: [
      { label: 'Car Camping', note: 'Warmest, driest. 1\u20132 car spots available (carpool).', children: [
        { label: 'Fold rear seats flat, remove headrests', note: 'Test the setup at home. Fill seat-to-cargo gaps with rolled towels.' },
        { label: 'Self-inflating pad (2"+ thick) on folded seats', note: 'Simpler than car-specific air mattress. R-value 2.0+.' },
        { label: 'Window covers (Reflectix or pop-up shades)', note: 'Privacy + insulation. Trace windows with newspaper, cut to shape.' },
        { label: 'Crack windows 1\u20132" on opposite sides', note: 'Cross-ventilation for condensation. Each person exhales ~1L moisture/night.', type: 'know' },
        { label: 'Rain guards / wind deflectors', note: '~$30/set, stick-on. Allow cracked windows in rain. #1 car-sleep accessory.' },
        { label: 'Park with head-end slightly uphill', note: 'Use phone level app \u2014 if >3\u00b0 slope, add foam wedge under foot end.', type: 'know' },
        { label: 'NEVER run engine while sleeping', note: 'CO is colourless, odourless, lethal. Exhaust pools under vehicle and seeps through cracked windows.', type: 'warn' },
      ]},
      { label: 'Tent', note: '2\u20134 person, double-wall with rain fly.', children: [
        { label: 'Footprint / groundsheet under tent', note: 'Must be slightly smaller than tent floor to avoid rain pooling between layers.' },
        { label: 'Practice setup at home before the trip', note: '10-min YouTube video for your specific model. Fumbling by headlamp at 10pm = #1 "never again" trigger.', type: 'know' },
        { label: 'Pitch on high, flat ground', note: 'Cold air pools in depressions. Under tree canopy if possible \u2014 canopy radiates heat, reduces dew.', type: 'know' },
        { label: 'Stake rain fly taut with all guylines', note: 'Saggy fly = fly touches inner wall = condensation wicks through.', type: 'know' },
        { label: 'Orient door away from prevailing wind', note: 'Typically W/SW in Metro Vancouver April.', type: 'know' },
        { label: 'Open upper rain fly vents even if cold', note: 'Ventilation tradeoff is always worth it for condensation control.', type: 'know' },
        { label: 'Wet gear stays in the vestibule', note: 'Boots and rain shells \u2014 never inside the tent.', type: 'know' },
      ]},
    ]},
    { label: 'Layering (per person)', minHours: 4, children: [
      { label: 'Moisture-wicking base layer' },
      { label: 'Fleece or insulated mid layer' },
      { label: 'Waterproof rain shell', note: 'Non-negotiable' },
      { label: 'Warm hat and gloves' },
      { label: '2\u20133 pairs of socks' },
      { label: 'Dedicated dry sleep socks', note: 'Not the ones worn during the day. Dry feet = warm body.' },
      { label: 'Extra dry layer in ziplock', note: 'If clothes get damp from evening dew, having something completely dry at bedtime is a morale multiplier.' },
    ]},
    { label: 'Communal Shelter', children: [
      { label: "Tarp (10\u00d712' minimum)" },
      { label: 'Rope or paracord for rigging' },
    ]},
    { label: 'Fire Schedule', type: 'know', children: [
      { label: 'Evening burn: upside-down fire lay', note: 'Largest logs on bottom, kindling on top. Self-feeds downward ~4hrs without tending.', type: 'know', dep: 'The Fire' },
      { label: 'Budget 2\u20133 bundles for full evening (5\u20136 hrs)', dep: 'The Fire \u2192 Fuel' },
      { label: 'Quiet hours: extinguish fire completely', note: 'BC Parks rule. Drown-stir-drown-feel. If too hot to touch, too hot to leave.', type: 'warn' },
      { label: 'Morning re-light from scratch', note: 'Keep dry kindling + newspaper in sealed bag overnight. Do not attempt overnight maintenance.', dep: 'The Fire \u2192 Ignition' },
    ]},
    { label: 'Wildlife Protocol', type: 'warn', children: [
      { label: 'Black bears active in April', note: 'Males emerge March\u2013April, hungry and food-motivated. Assume bears are active at any Metro Van campground.', type: 'warn' },
      { label: 'Raccoons \u2014 the more likely nuisance', note: 'Bold at established campgrounds. Will open cooler latches and unzip tent vestibules.' },
      { label: 'Food lockup: all food + scented items in locked vehicle', note: 'Includes toothpaste, sunscreen, deodorant. "Bare Campsite" rule: nothing out when sleeping.', type: 'bc', dep: 'The Meal \u2192 Cold Chain' },
      { label: 'Do NOT hang food at frontcountry campgrounds', note: 'Counterintuitive but official BC Parks policy \u2014 hanging attracts wildlife to the campground.', type: 'bc' },
      { label: 'Trash in bear-proof bins or locked vehicle', note: 'Never at the site overnight.' },
    ]},
    { label: 'Comfort Kit (per person)', note: 'The gap between "never again" and "when\'s the next one."', children: [
      { label: 'Headlamp with red-light mode', note: 'One per person. Red mode preserves night vision. Clip to tent loop, not buried in bag.', dep: 'Shared Dep' },
      { label: 'Camp chair', note: 'Standing around a fire for 6 hours is miserable. Borrow if needed \u2014 everyone needs a seat.' },
      { label: 'Hot water bottle (Nalgene)', note: 'Fill with boiling water, wrap in sock, put in sleeping bag 15 min before bed.' },
      { label: 'Hand/toe warmers (chemical)', note: 'Cheap insurance for cold sleepers. Toss one in the foot of the sleeping bag.' },
      { label: 'Camp towel (small)', note: 'Wipe condensation from car windows or tent walls in the morning.' },
    ]},
    { label: 'Quiet Hours & Etiquette', type: 'bc', children: [
      { label: 'BC Parks quiet hours: 11 PM \u2013 7 AM', note: 'Some parks differ (e.g., Alice Lake 10 PM). Check specific park page.', type: 'bc' },
      { label: 'Speaker off or whisper volume at quiet hours', note: 'Sound carries extremely well over water and between sites. #1 campground complaint.' },
      { label: 'Campfires out before sleeping', note: 'Enforced. Fines apply.', type: 'warn', dep: 'The Night \u2192 Fire Schedule' },
      { label: 'Alcohol: legal only at registered campsite', note: 'No open alcohol in common areas.', type: 'bc' },
    ]},
    { label: 'Safety Protocol', children: [
      { label: 'CO warning: never run engine or use propane inside car/tent', note: 'Colourless, odourless, lethal. Not even "just for heat." Battery CO detector ~$25 if anyone sleeps in car.', type: 'warn' },
      { label: 'Mark tent guylines with reflective cord or glow sticks', note: 'If tent is near foot traffic path.' },
      { label: 'Clear bathroom path before dark', note: 'Walk the route once by headlamp. Designate a direction for overnight bathroom trips.' },
      { label: 'Head count before lights-out' },
      { label: 'Nobody walks alone beyond campsite perimeter', note: 'Within campsite solo is fine. Trail walks: pairs.', type: 'know' },
      { label: 'First aid kit', note: 'Bandages, antiseptic, blister pads, ibuprofen, antihistamine, tweezers.' },
      { label: 'Nearest hospital saved offline', note: 'Cell coverage variable \u2014 Porteau Cove: good; Golden Ears interior: spotty.' },
      { label: 'Set up camp fully BEFORE dark', note: 'Tents, sleeping gear, food storage, fire prep. All done in daylight. Non-negotiable for mixed-experience groups.', type: 'warn' },
    ]},
  ]},
  { id: 'sunrise', label: 'The Sunrise', emoji: '\ud83c\udf05', minHours: 14,
    desc: 'Aspirational \u2014 plan for 2\u20133 motivated early risers, not the whole group.', children: [
    { label: 'Timing', children: [
      { label: 'Alarm: 60\u201375 min before sunrise', note: 'Late April sunrise ~5:50\u20136:10 AM. Early April ~6:30\u20136:50 AM. Adjust to actual trip date.', liveKey: 'sunrise' },
      { label: 'Civil twilight starts 30\u201335 min before sunrise', note: 'Sky starts colouring then. Best colour is 10\u201315 min before sun crests.', type: 'know' },
      { label: 'Be in position during civil twilight', note: 'Not after sunrise \u2014 the best light happens before.' },
    ]},
    { label: 'Viewing Location', children: [
      { label: 'Pre-scout east-facing vantage the evening before', note: 'None of the candidate sites have classic ocean-sunrise views.', dep: 'Site Selection' },
      { label: 'Porteau Cove: west-facing campsites', note: 'Sunrise is behind you, over mountains. But alpenglow on Howe Sound + Anvil Island is spectacular. Pier is best vantage.', type: 'know' },
      { label: 'Golden Ears / Alice Lake: forested, enclosed', note: 'Walk to lakeshore for open sky. Sunrise light filters through trees \u2014 pleasant but not dramatic.' },
      { label: 'Sasamat Lake: NE shore, faces SW', note: 'Calm lake catches early light. Peaceful, not dramatic.' },
    ]},
    { label: 'Pre-Dawn Protocol', type: 'know', children: [
      { label: 'Prep grab-and-go pile the night before', note: 'Clothing, headlamp, thermos, chair \u2014 all in one spot. No rummaging in the dark.' },
      { label: 'Red-light headlamp only', note: 'White light destroys night vision (20\u201330 min to recover) and blinds sleeping campers through tent walls.', dep: 'Shared Dep' },
      { label: 'Zipper discipline: one slow continuous motion', note: 'Tent zippers are the loudest pre-dawn sound.' },
      { label: 'Footwear staged outside tent in a bag' },
      { label: 'No talking at camp \u2014 whisper only. Regroup at viewing spot.' },
    ]},
    { label: 'Coffee at the viewpoint', children: [
      { label: 'Thermos pre-filled the night before', note: 'No stove, no kettle, no boiling water at 4:30 AM. Silence is part of the experience.', dep: 'The Meal \u2192 Drinks' },
      { label: 'Bring a camp chair or blanket to wrap in', dep: 'The Night \u2192 Comfort Kit' },
    ]},
    { label: 'Full layering on', dep: 'The Night \u2192 Layering' },
    { label: 'Pre-dawn fire rebuild (optional)', note: 'Loud \u2014 crackling, blowing on coals. Only if the viewing spot is at the fire pit, not near tents.', dep: 'The Fire' },
    { label: 'Photography', type: 'know', children: [
      { label: 'Clean phone lens (overnight condensation)' },
      { label: 'Lock exposure on brightest sky \u2014 let foreground silhouette', note: 'Silhouettes of friends holding coffee, the fire\u2019s last embers with dawn sky behind.' },
      { label: 'Shoot every few minutes \u2014 light changes fast', note: 'Underwhelming at 5:40 can be extraordinary at 5:47.' },
      { label: 'Include human elements', note: 'A person holding coffee > an empty sky. Campfire foreground + dawn sky = the shot.' },
      { label: 'Also put the phone down', note: 'The point is the experience.' },
    ]},
  ]},
  { id: 'music', label: 'Music & Games', emoji: '\ud83c\udfb8', minHours: 0,
    desc: 'Orbits The Fire. Arc: upbeat evening \u2192 mellow late night \u2192 contemplative pre-dawn.', children: [
    { label: 'Guitar', note: 'Everett \u2014 see HAN-2', children: [
      { label: 'Clip-on tuner (Snark or similar)', note: 'Cold makes strings go flat unpredictably. Retune between songs.' },
      { label: 'Let guitar acclimate 30 min in closed case', note: 'Prevents finish checking from rapid temp change.', type: 'know' },
      { label: 'Case stays closed when not playing', note: 'Damp can swell the top. One night won\u2019t cause permanent damage, but don\u2019t leave it out.' },
      { label: 'If rain threatens: guitar in case immediately', note: 'A garbage bag over the case is a reasonable backup.' },
    ]},
    { label: 'Bluetooth speaker', children: [
      { label: 'IPX7-rated (waterproof)', note: 'JBL Flip series or Anker Soundcore. Survives rain and spills.' },
      { label: 'Battery: 8\u201310 usable hours in April cold', note: 'Cold (<5\u00b0C) cuts battery 20\u201330%. Plan at 30\u201340% volume.' },
      { label: 'Power bank as backup charger', dep: 'Shared Dep' },
      { label: 'Strategy: guitar for singalongs, speaker for ambient', note: 'Extends both guitar player stamina and battery life.', type: 'know' },
    ]},
    { label: 'Playlist Arc', type: 'know', children: [
      { label: 'Evening (3\u20137 PM): upbeat acoustic, indie folk', note: 'Setup energy, cooking soundtrack.' },
      { label: 'Dusk/dinner (7\u20139 PM): guitar singalong block', note: 'Wagon Wheel, Country Roads, Sweet Caroline, Stand By Me, Free Fallin\u2019.' },
      { label: 'Late night (9 PM\u2013midnight): low-key instrumental, jazz, lo-fi', note: 'Conversation volume. Speaker barely audible.' },
      { label: 'Pre-dawn (midnight\u20134 AM): ambient, classical guitar, or silence', note: 'Bon Iver territory. Or just the fire and the night.' },
    ]},
    { label: 'Card & Board Games', children: [
      { label: 'Waterproof playing cards', note: 'Hoyle or similar, ~$8. One deck enables dozens of games. Resist wind better than paper.' },
      { label: 'Love Letter', note: '16 cards, fast rounds (5 min), easy to teach. 2\u20136 players.' },
      { label: 'Coup', note: '15 cards, bluffing/deduction. 2\u20136 players.' },
      { label: 'The Mind', note: 'Cooperative, eerie, works great at night. 2\u20134 players.' },
      { label: "We're Not Really Strangers", note: 'Conversation card game. Perfect for firelight \u2014 read one card at a time.' },
      { label: 'Bluff / Liar\u2019s Dice', note: '5 dice + cup per person. Works in total darkness.' },
    ]},
    { label: 'Verbal / No-Equipment Games', type: 'know', children: [
      { label: 'Mafia / Werewolf', note: 'Purely verbal with eyes-closed mechanic. 4\u20136 players ideal. Works perfectly in firelight.' },
      { label: 'Contact', note: 'One person picks a secret word, others ask cryptic clue questions.' },
      { label: 'Two Truths and a Lie', note: 'Good icebreaker for mixed friend groups.' },
      { label: 'Fortunately/Unfortunately', note: 'Alternating storytelling. Hilarious.' },
    ]},
    { label: 'Stargazing', children: [
      { label: 'Stellarium Mobile (free app)', note: 'Point phone at sky, identifies constellations in real time.' },
      { label: 'April sky: Leo overhead, Summer Triangle rising pre-dawn', note: 'Orion setting in west early evening. Vega, Deneb, Altair rising east by 4 AM.', type: 'know' },
      { label: 'Invent your own constellations', note: 'Name them after people in the group. Low-effort, high-memory-making.', type: 'know' },
    ]},
    { label: 'Practical', children: [
      { label: 'Headlamp on red mode for game lighting', dep: 'Shared Dep' },
      { label: 'LED lantern on low at centre of game circle', note: 'Firelight alone is enough for Uno but not standard playing cards.' },
      { label: 'Flat surface: cooler lid, cutting board, or camp chair tray', note: 'Cards on the ground = lost cards.' },
      { label: 'If windy: pivot to verbal games', note: 'Have the backup plan ready. Wind is the enemy of card games.', type: 'know' },
    ]},
    { label: 'Sage bundle', note: 'Toss into fire \u2014 mosquito deterrent, smells excellent' },
  ]},
  { id: 'morning', label: 'The Morning After', emoji: '\u2615', minHours: 15,
    desc: 'Post-sunrise. Break camp, hit a diner.', children: [
    { label: 'Breakfast Run', children: [
      { label: "Fergie's Caf\u00e9, Squamish", note: 'Opens 6:30 AM. GF options.', dietary: ['celiac'] },
      { label: 'Peaked Pies, Squamish', note: 'Opens 7:00 AM' },
      { label: 'Dutch Pannekoek Haus, Chilliwack', note: 'Opens 8:00 AM', dietary: ['celiac'] },
      { label: 'Sunflower Bakery Caf\u00e9, Squamish', note: 'Opens 7:00 AM. GF options available.', dietary: ['celiac'] },
    ]},
    { label: 'Camp Breakdown', children: [
      { label: 'Extinguish fire completely', note: 'Drown, stir, drown, feel with back of hand. If warm, repeat.', dep: 'The Fire \u2192 Safety' },
      { label: 'Full-site trash sweep', note: 'Grid-walk the campsite. Micro-trash (bottle caps, foil bits, twist ties) is most commonly missed.' },
      { label: 'Pack out ALL waste', note: 'Including food scraps, fruit peels, eggshells. Double-bag wet trash.' },
      { label: 'Greywater: strain solids, scatter water 200ft from water source', note: 'Pack out the strained food particles.', type: 'bc' },
      { label: 'Restore site to natural state', note: 'Replace moved rocks/logs. Fluff matted grass. Scatter leaves/needles over bare spots.' },
      { label: 'Check bear cache / food locker emptied', dep: 'The Night \u2192 Wildlife' },
      { label: 'Final walk-through before departure' },
    ]},
    { label: 'Post-Trip Gear Care', note: 'Do same-day \u2014 mildew starts within 24\u201348 hours.', children: [
      { label: 'Tent: set up at home to dry before storing', note: 'Storing wet = mildew = ruined tent.' },
      { label: 'Sleeping bags: hang or drape, never stuff wet' },
      { label: 'Tarps: hang to dry' },
      { label: 'Cooler: drain at site, wash with baking soda at home', note: 'If fish/meat stored: dilute bleach wash, rinse thoroughly.' },
      { label: 'Car: tarp/garbage bags in trunk before loading wet gear' },
    ]},
    { label: 'Trip Memory', children: [
      { label: 'Shared photo album (Google Photos or Apple Shared)', note: 'Create before the trip, share link in group chat. Everyone uploads.' },
      { label: 'Group photo before breaking camp', note: 'Easiest to forget in the departure rush.' },
    ]},
  ]},
];

const RECIPES = [
  { name: 'Shrimp Tacos', timing: 'Dinner',
    ingredients: ['Shrimp', 'Corn tortillas', 'Peppers + onions', 'Butter + garlic', 'Hot sauce + lime'],
    method: 'Skewer shrimp, grill over coals 2 min/side. Warm tortillas briefly over grate. Saut\u00e9 peppers and onions in pot with butter and garlic. Assemble.',
    tags: ['pescatarian','gf'], effort: 'Low' },
  { name: 'Halloumi & Veggie Skewers', timing: 'Dinner',
    ingredients: ['Halloumi', 'Peppers + onions + zucchini', 'Butter + garlic', 'Hot sauce + lime'],
    method: 'Cube halloumi, thread with veg. Grill over medium coals 3\u20134 min/side until grill marks appear. Finish with lime.',
    tags: ['vegetarian','gf','pescatarian'], effort: 'Low' },
  { name: 'Sausage Wraps', timing: 'Dinner',
    ingredients: ['Sausages', 'Corn tortillas', 'Peppers + onions', 'Hot sauce + lime'],
    method: 'Roast sausages on sticks over coals. Warm tortillas. Load with saut\u00e9ed peppers and onions. Hit with hot sauce.',
    tags: ['gf'], effort: 'Very Low' },
  { name: 'Butter Garlic Shrimp', timing: 'Dinner / Late Night',
    ingredients: ['Shrimp', 'Butter + garlic', 'Corn tortillas'],
    method: 'Melt butter in pot. Add crushed garlic, 1 min. Add shrimp, toss until pink (3\u20134 min). Serve in tortilla or directly from pot.',
    tags: ['pescatarian','gf'], effort: 'Low' },
  { name: 'Late-Night Quesadillas', timing: 'Late Night',
    ingredients: ['Corn tortillas', 'Cheese', 'Sausage (optional)'],
    method: 'Layer cheese (+ sliced sausage if desired) between two tortillas. Hold flat over dying coals or balance on fire ring edge. Flip once.',
    tags: ['gf'], effort: 'Very Low' },
  { name: 'Pre-Dawn Scrambled Eggs', timing: 'Pre-Dawn (4:30 AM)',
    ingredients: ['Eggs', 'Butter + garlic', 'Cheese'],
    method: 'Crack eggs into pot with butter over rebuilt coals. Stir continuously. Add cheese before done. Fast, warm, fortifying.',
    tags: ['vegetarian','gf','pescatarian'], effort: 'Low' },
  { name: "S'mores", timing: 'Late Night',
    ingredients: ['Marshmallows', 'Chocolate', 'Graham crackers'],
    method: 'Roast marshmallow until golden. Sandwich with chocolate between crackers. Carry GF grahams separately for celiac guest.',
    tags: ['vegetarian'], effort: 'None',
    note: 'Terminal branch \u2014 ingredients do not recombine with the savoury set.' },
];

const INGREDIENTS = [
  { name: 'Corn tortillas',            tags: ['gf','vegan'],        recipes: ['Shrimp Tacos','Sausage Wraps','Butter Garlic Shrimp','Late-Night Quesadillas'] },
  { name: 'Shrimp',                    tags: ['pescatarian','gf'],  recipes: ['Shrimp Tacos','Butter Garlic Shrimp'] },
  { name: 'Halloumi',                  tags: ['vegetarian','gf'],   recipes: ['Halloumi & Veggie Skewers'] },
  { name: 'Peppers, onions, zucchini', tags: ['vegan','gf'],        recipes: ['Shrimp Tacos','Halloumi & Veggie Skewers','Sausage Wraps'] },
  { name: 'Eggs',                      tags: ['vegetarian','gf'],   recipes: ['Pre-Dawn Scrambled Eggs'] },
  { name: 'Cheese',                    tags: ['vegetarian','gf'],   recipes: ['Late-Night Quesadillas','Pre-Dawn Scrambled Eggs'] },
  { name: 'Sausages',                  tags: [],                    recipes: ['Sausage Wraps','Late-Night Quesadillas (opt.)'] },
  { name: 'Butter + garlic',           tags: ['vegetarian','gf'],   recipes: ['Shrimp Tacos','Halloumi & Veggie Skewers','Butter Garlic Shrimp','Pre-Dawn Scrambled Eggs'] },
  { name: 'Hot sauce + lime',          tags: ['vegan','gf'],        recipes: ['Shrimp Tacos','Halloumi & Veggie Skewers','Sausage Wraps','Butter Garlic Shrimp'] },
];

const NICE_TO_HAVES = [
  'Bluetooth speaker for music',
  'Cards or games for around the fire',
  'Thermoses for keeping coffee hot',
  'Extra tarps for ground cover',
  'Portable phone charger',
  'String lights for camp ambiance',
  'Folding camp chairs (2\u20133 minimum)',
  'Lantern for camp area lighting',
  'Star map app or printed constellation guide',
  'Sketchbooks or journals for the slow hours',
];

const SHARED_DEPS = [
  { dep: 'Site Selection',  needs: ['The Fire','The Sunrise','The Sunrise \u2192 Viewing'] },
  { dep: 'The Fire',        needs: ['The Meal','The Night','The Sunrise','Music & Games',"S'mores"] },
  { dep: "S'mores",         needs: ['The Meal \u2192 Sweets (chocolate, marshmallows)'] },
  { dep: 'Cold Chain',      needs: ['The Meal \u2192 Dinner (proteins)','The Night \u2192 Wildlife (food lockup)'] },
  { dep: 'Layering System', needs: ['The Night','The Sunrise'] },
  { dep: 'Headlamps',       needs: ['The Night','The Sunrise','The Fire (tending)','Music & Games'] },
  { dep: 'Firewood',        needs: ['The Fire','The Meal (cooking heat)','The Night \u2192 Fire Schedule'] },
  { dep: 'Camp Chairs',     needs: ['The Night \u2192 Comfort Kit','The Sunrise','Music & Games'] },
  { dep: 'Power Bank',      needs: ['Music & Games \u2192 Speaker','Pre-Flight \u2192 Gear'] },
  { dep: 'Wildlife Protocol', needs: ['The Night','The Morning After \u2192 Breakdown'] },
];

//  Helpers 
function Tag({ t }) {
  const m = TAG_META[t];
  if (!m) return null;
  return <span style={{ fontSize: 10, background: m.bg, color: m.color,
    borderRadius: 3, padding: '1px 5px', marginLeft: 4 }}>{m.label}</span>;
}
function DietBadge({ d }) {
  const color = d === 'celiac' ? C.gold : C.bc;
  return <span style={{ fontSize: 10, color, border: `1px solid ${color}44`,
    borderRadius: 3, padding: '1px 5px', marginLeft: 5 }}>\u26a0 {d}</span>;
}
function DepBadge({ label }) {
  return <span style={{ fontSize: 10, color: C.sage, border: `1px solid ${C.sage}44`,
    borderRadius: 3, padding: '1px 5px', marginLeft: 5 }}>\u2192 {label}</span>;
}

//  Duration Slider 
function DurationSlider({ hours, setHours }) {
  const dl = getDurationLabel(hours);
  const pct = ((hours - 1) / 35) * 100;
  return (
    <div style={{ padding: '16px 28px 12px', background: C.s1,
      borderBottom: `1px solid ${C.border}` }}>
      <style>{`
        .dur-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;
          border-radius:2px;outline:none;cursor:pointer;
          background:linear-gradient(to right,${C.amber} ${pct}%,${C.border} ${pct}%)}
        .dur-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
          width:14px;height:14px;border-radius:50%;background:${C.amber};
          cursor:pointer;box-shadow:0 0 8px ${C.amber}88}
        .dur-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
          background:${C.amber};cursor:pointer;border:none}
      `}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 34, fontWeight: 700, color: C.amber, lineHeight: 1 }}>{hours}h</span>
        <span style={{ fontSize: 13, color: dl.star ? C.amber : C.muted,
          fontStyle: dl.star ? 'normal' : 'italic' }}>{dl.label}</span>
      </div>
      <input type="range" min={1} max={36} value={hours} className="dur-slider"
        onChange={e => setHours(+e.target.value)} />
      <div style={{ position: 'relative', height: 28, marginTop: 4 }}>
        {THRESHOLDS.map(t => {
          const left = ((t.h - 1) / 35) * 100;
          const active = hours >= t.h;
          return (
            <div key={t.h} style={{ position: 'absolute', left: `${left}%`,
              transform: 'translateX(-50%)', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 1, height: 5,
                background: active ? (t.star ? C.amber : C.muted) : C.dim }} />
              <span style={{ fontSize: 9, color: active ? (t.star ? C.amber : C.muted) : C.dim,
                whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>{t.h}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function resolveLive(liveKey, live) {
  if (!live || live.loading || !liveKey) return null;
  const w = live.weather;
  const astro = live.astronomy;
  const forecast = live.forecast;
  const bans = live.fireBans;

  if (liveKey === 'fireBans') {
    if (!bans) return null;
    return bans.length === 0
      ? { text: 'No active bans', color: C.sage }
      : { text: `${bans.length} active ban${bans.length !== 1 ? 's' : ''}`, color: C.warn };
  }
  if (liveKey === 'forecast' && forecast) {
    const today = forecast[0];
    const tomorrow = forecast[1];
    if (!today) return null;
    const minT = today.mintempC;
    const maxT = today.maxtempC;
    const rain = today.hourly?.reduce((max, h) => Math.max(max, +h.chanceofrain || 0), 0);
    const wind = today.hourly?.reduce((max, h) => Math.max(max, +h.windspeedKmph || 0), 0);
    let parts = [`${minT}–${maxT}°C`];
    if (rain != null) parts.push(`rain ${rain}%`);
    if (wind != null) parts.push(`gusts ${wind} km/h`);
    if (tomorrow) parts.push(`tmrw ${tomorrow.mintempC}–${tomorrow.maxtempC}°C`);
    return { text: parts.join(' · '), color: C.bc };
  }
  if (liveKey === 'rainRisk' && forecast) {
    const maxRain = forecast[0]?.hourly?.reduce((max, h) => Math.max(max, +h.chanceofrain || 0), 0);
    if (maxRain == null) return null;
    if (maxRain >= 60) return { text: `⚠ ${maxRain}% rain — consider rescheduling`, color: C.warn };
    if (maxRain >= 40) return { text: `${maxRain}% rain — tarp required`, color: C.gold };
    return { text: `${maxRain}% rain — looking good`, color: C.sage };
  }
  if (liveKey === 'sunrise' && astro) {
    return { text: `Sunrise ${astro.sunrise} · Alarm ${astro.sunrise.replace(/(\d+):/, (_, h) => `${Math.max(1, +h - 1)}:`)}`, color: C.amber };
  }
  return null;
}

function LiveBadge({ liveKey }) {
  const live = useContext(LiveDataCtx);
  const resolved = resolveLive(liveKey, live);
  if (!resolved) return null;
  return (
    <span style={{ fontSize: 10, color: resolved.color, background: `${resolved.color}15`,
      border: `1px solid ${resolved.color}33`, borderRadius: 3, padding: '1px 6px',
      marginLeft: 6, fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap' }}>
      LIVE: {resolved.text}
    </span>
  );
}

//  TreeNode
function TreeNode({ node, depth = 0 }) {
  const hours = useContext(DurationCtx);
  const [open, setOpen] = useState(depth === 0);
  const allChildren = node.children || [];
  const visible = allChildren.filter(c => !c.minHours || hours >= c.minHours);
  const hiddenCount = allChildren.length - visible.length;
  const hasKids = visible.length > 0;
  const typeColor = node.type === 'bc' ? C.bc : node.type === 'warn' ? C.warn
    : node.type === 'dep' ? C.sage : node.type === 'know' ? '#b07fe0' : C.text;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 14 }}>
      <div onClick={() => hasKids && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 7,
          padding: '3px 6px', borderRadius: 4,
          cursor: hasKids ? 'pointer' : 'default', color: typeColor,
          fontSize: depth === 0 ? 12.5 : 12,
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          transition: 'background 0.12s' }}
        onMouseEnter={e => { if (hasKids) e.currentTarget.style.background = C.s3; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ flexShrink: 0, color: C.dim, fontSize: 10, marginTop: 3 }}>
          {hasKids ? (open ? '\u25be' : '\u25b8') : '\u00b7'}
        </span>
        <div style={{ flex: 1 }}>
          <span>{node.label}</span>
          {node.liveKey && <LiveBadge liveKey={node.liveKey} />}
          {node.dep && <DepBadge label={node.dep} />}
          {node.dietary?.map(d => <DietBadge key={d} d={d} />)}
          {hiddenCount > 0 && (
            <span style={{ fontSize: 10, color: C.dim, marginLeft: 8, fontStyle: 'italic' }}>
              +{hiddenCount} at higher duration
            </span>
          )}
          {node.note && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' }}>
              {node.note}
            </div>
          )}
        </div>
      </div>
      {hasKids && open && (
        <div style={{ borderLeft: `1px solid ${C.border2}`, marginLeft: 13,
          paddingLeft: 3, marginTop: 1, marginBottom: 2 }}>
          {visible.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

//  Tree View 
function TreeView() {
  const hours = useContext(DurationCtx);
  const [openNodes, setOpenNodes] = useState({ preflight: true, fire: true });
  const toggle = id => setOpenNodes(o => ({ ...o, [id]: !o[id] }));
  const visible = TREE.filter(n => !n.minHours || hours >= n.minHours);
  const hidden  = TREE.filter(n => n.minHours && hours < n.minHours);

  return (
    <div>
      {visible.map(node => (
        <div key={node.id} style={{ marginBottom: 10, border: `1px solid ${C.border}`,
          borderRadius: 8, overflow: 'hidden' }}>
          <div onClick={() => toggle(node.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px', background: C.s1, cursor: 'pointer',
              userSelect: 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = C.s2}
            onMouseLeave={e => e.currentTarget.style.background = C.s1}
          >
            <span style={{ fontSize: 16 }}>{node.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 17, fontWeight: 600, color: C.amber, letterSpacing: '0.02em' }}>
                {node.label}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{node.desc}</div>
            </div>
            <span style={{ color: C.dim, fontSize: 12 }}>{openNodes[node.id] ? '\u25be' : '\u25b8'}</span>
          </div>
          {openNodes[node.id] && (
            <div style={{ padding: '10px 14px 12px', background: C.bg }}>
              {node.children.map((c, i) => <TreeNode key={i} node={c} depth={0} />)}
            </div>
          )}
        </div>
      ))}
      {hidden.length > 0 && (
        <div style={{ padding: '10px 16px', border: `1px dashed ${C.border}`,
          borderRadius: 8, color: C.dim, fontSize: 11,
          fontFamily: "'JetBrains Mono',monospace",
          display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {hidden.map(n => (
            <span key={n.id}>
              {n.emoji} {n.label}
              <span style={{ marginLeft: 5, fontSize: 10 }}>unlocks at {n.minHours}h</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

//  Recipe Card 
function RecipeCard({ r }) {
  const [open, setOpen] = useState(false);
  const effortColor = r.effort === 'None' ? C.muted : r.effort === 'Very Low' ? C.sage
    : r.effort === 'Low' ? C.amber : C.warn;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden',
      background: C.s1, marginBottom: 10 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = C.s2}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
              fontSize: 16, fontWeight: 600, color: C.text }}>{r.name}</span>
            {r.tags.map(t => <Tag key={t} t={t} />)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: C.muted }}>{r.timing}</span>
            <span style={{ fontSize: 11, color: effortColor,
              border: `1px solid ${effortColor}44`, borderRadius: 3, padding: '1px 6px' }}>
              {r.effort}
            </span>
            <span style={{ color: C.dim, fontSize: 11 }}>{open ? '\u25be' : '\u25b8'}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border2}` }}>
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 5 }}>Ingredients</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.ingredients.map(ing => (
                <span key={ing} style={{ fontSize: 12, background: C.s3, color: C.muted,
                  borderRadius: 4, padding: '3px 8px',
                  fontFamily: "'JetBrains Mono',monospace" }}>{ing}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 5 }}>Method</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{r.method}</div>
          </div>
          {r.note && (
            <div style={{ marginTop: 10, fontSize: 11, color: C.dim, fontStyle: 'italic',
              borderTop: `1px solid ${C.border2}`, paddingTop: 8 }}>{r.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

//  Recipes View 
function RecipesView() {
  return (
    <div>
      <div style={{ marginBottom: 20, padding: '12px 16px', background: C.s1,
        borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 15, color: C.amber, marginBottom: 8 }}>Nine ingredients \u2192 seven dishes</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {INGREDIENTS.map(ing => (
            <div key={ing.name} style={{ fontSize: 11, background: C.s2, borderRadius: 5,
              padding: '4px 10px', border: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>{ing.name}</span>
              {ing.tags.map(t => <Tag key={t} t={t} />)}
              <span style={{ color: C.dim, fontSize: 10, marginLeft: 6 }}>
                \u2192 {ing.recipes.length} dish{ing.recipes.length !== 1 ? 'es' : ''}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.dim }}>
          Butter + garlic and hot sauce + lime each appear in 4 dishes. Corn tortillas are the universal base.
        </div>
      </div>
      {RECIPES.map(r => <RecipeCard key={r.name} r={r} />)}
    </div>
  );
}

//  Nice-to-Haves View 
function NiceToHavesView() {
  const [checked, setChecked] = useState({});
  const toggle = i => setChecked(c => ({ ...c, [i]: !c[i] }));
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.s1, padding: '16px 20px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: 17, color: C.amber, marginBottom: 14 }}>Nice-to-Haves</div>
      {NICE_TO_HAVES.map((item, i) => (
        <div key={i} onClick={() => toggle(i)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 4px',
            cursor: 'pointer', borderBottom: `1px solid ${C.border2}`, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = C.s2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 16, height: 16, border: `1px solid ${checked[i] ? C.amber : C.dim}`,
            borderRadius: 3, background: checked[i] ? C.amber : 'transparent', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {checked[i] && <span style={{ color: C.bg, fontSize: 11, fontWeight: 700 }}>\u2713</span>}
          </div>
          <span style={{ fontSize: 13, color: checked[i] ? C.dim : C.text,
            fontFamily: "'JetBrains Mono',monospace",
            textDecoration: checked[i] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
            {i + 1}. {item}
          </span>
        </div>
      ))}
    </div>
  );
}

//  Shared Deps View 
function SharedDepsView() {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.s1, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
        fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 17, color: C.amber }}>
        Shared Dependencies
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.s2 }}>
            {['Dependency','Required By'].map(h => (
              <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10,
                color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono',monospace", fontWeight: 400,
                borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHARED_DEPS.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border2}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.s2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '9px 16px', fontSize: 13, color: C.sage,
                fontFamily: "'JetBrains Mono',monospace" }}>{row.dep}</td>
              <td style={{ padding: '9px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {row.needs.map(n => (
                    <span key={n} style={{ fontSize: 11, background: C.s3, color: C.muted,
                      borderRadius: 3, padding: '2px 8px',
                      fontFamily: "'JetBrains Mono',monospace" }}>{n}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

//  Root App 
export default function App() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [tab, setTab]     = useState('tree');
  const [hours, setHours] = useState(14);
  const liveData = useLiveData();

  const TABS = [
    { id: 'tree',    label: '\u29c1  Dep Tree' },
    { id: 'recipes', label: '\ud83c\udf62  Recipes' },
    { id: 'ntg',     label: '\u2736  Nice-to-Haves' },
    { id: 'deps',    label: '\u27f3  Shared Deps' },
  ];

  return (
    <DurationCtx.Provider value={hours}>
    <LiveDataCtx.Provider value={liveData}>
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh',
        fontFamily: "'JetBrains Mono','Courier New',monospace" }}>

        {/* Header */}
        <div style={{ background: C.s1, borderBottom: `1px solid ${C.border}`,
          padding: '22px 28px 18px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 28, fontWeight: 700, color: C.amber,
            letterSpacing: '0.02em', lineHeight: 1 }}>A Nice Camping Trip</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Dependency Tree \u00b7 April Edition \u00b7 Metro Vancouver \u00b7 Automobile Access
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {DIETARY.map(d => (
              <div key={d.tag} style={{ fontSize: 11, color: d.color,
                border: `1px solid ${d.color}33`, borderRadius: 5, padding: '5px 11px',
                background: `${d.color}0e`, maxWidth: 560 }}>
                <span style={{ fontWeight: 600 }}>\u26a0 {d.label}: </span>
                <span style={{ color: C.muted }}>{d.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Status Bar */}
        <LiveStatusBar />

        {/* Duration Slider */}
        <DurationSlider hours={hours} setHours={setHours} />

        {/* Tab Bar */}
        <div style={{ display: 'flex', background: C.s1,
          borderBottom: `1px solid ${C.border}`, padding: '0 28px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', outline: 'none',
              borderBottom: tab === t.id ? `2px solid ${C.amber}` : '2px solid transparent',
              color: tab === t.id ? C.amber : C.muted,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
              padding: '11px 16px', cursor: 'pointer', marginBottom: -1,
              transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 28px 40px', maxWidth: 880, margin: '0 auto' }}>
          {tab === 'tree'    && <TreeView />}
          {tab === 'recipes' && <RecipesView />}
          {tab === 'ntg'     && <NiceToHavesView />}
          {tab === 'deps'    && <SharedDepsView />}
        </div>
      </div>
    </LiveDataCtx.Provider>
    </DurationCtx.Provider>
  );
}

