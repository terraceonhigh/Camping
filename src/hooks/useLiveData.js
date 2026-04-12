import { useState, useEffect, useCallback } from "react";
import { fmtTime } from "../constants.js";

function computeMoonPhase(date) {
  // Meeus algorithm — days since known new moon (Jan 6 2000 18:14 UTC)
  const JD = (date.getTime() / 86400000) + 2440587.5;
  const daysSince = JD - 2451550.09765;
  const pos = ((daysSince % 29.53058867) + 29.53058867) % 29.53058867;
  const illumination = (1 - Math.cos(2 * Math.PI * pos / 29.53058867)) / 2;
  const names = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
  const phase = names[Math.round(pos / 29.53058867 * 8) % 8];
  return { pos, illumination, phase };
}

// DFO IWLS: find nearest tidal station in bbox, then fetch high/low predictions
async function fetchTides(lat, lng, tripDate) {
  const bbox = `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`;
  const stations = await fetch(
    `https://api.iwls.dfo-mpo.gc.ca/api/v1/stations?type=TIDAL&bbox=${bbox}&limit=1`
  ).then(r => r.json());
  const station = Array.isArray(stations) ? stations[0] : null;
  if (!station?.id) return null;

  const from = new Date(tripDate + 'T00:00:00');
  const to   = new Date(tripDate + 'T23:59:59');
  const predictions = await fetch(
    `https://api.iwls.dfo-mpo.gc.ca/api/v1/stations/${station.id}/data` +
    `?time-series-code=wlp-hilo&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
  ).then(r => r.json());

  return {
    station: station.officialName || station.code,
    stationCode: station.code,
    predictions: Array.isArray(predictions) ? predictions.map(p => ({
      time: fmtTime(p.eventDate),
      value: Math.round(p.value * 10) / 10,
      iso: p.eventDate,
    })) : [],
  };
}

export function useLiveData(lat, lng, bcparksSlug, open511Road, tripDate) {
  const [data, setData] = useState({
    weather: null, forecast: null, sunrise: null, sunset: null,
    fireBans: null, activeFires: null, aqhi: null,
    parkStatus: null, parkOpenNote: null, parkAdvisories: null, reservationUrl: null,
    roadEvents: null, moonPhase: null,
    weatherAlerts: null, tides: null, uvIndex: null,
    hasCampfireBan: null,
    tripDate: null,
    loading: true, error: null, lastUpdated: null,
  });

  const fetchAll = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const date  = tripDate || today;
    const isToday = date === today;

    const hasCoords = lat != null && lng != null;
    const coordLat  = hasCoords ? lat  : 49.2827;
    const coordLng  = hasCoords ? lng  : -123.1207;

    const queries = [
      // 0: Open-Meteo — current + forecast + UV
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coordLat}&longitude=${coordLng}` +
        (isToday
          ? `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m&forecast_days=3`
          : `&start_date=${date}&end_date=${date}`) +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max` +
        `&hourly=precipitation_probability&timezone=America%2FVancouver`
      ).then(r => r.json()),

      // 1: Sunrise-Sunset (sunrise-sunset.org)
      fetch(
        `https://api.sunrise-sunset.org/json?lat=${coordLat}&lng=${coordLng}&formatted=0&date=${date}`
      ).then(r => r.json()),

      // 2: BCWS ArcGIS — campfire bans (layer 14)
      fetch(
        `https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/14/query` +
        `?where=1%3D1&geometry=${coordLng-0.5}%2C${coordLat-0.5}%2C${coordLng+0.5}%2C${coordLat+0.5}` +
        `&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=FIRE_STATUS_CODE%2CFIRE_ZONE_CODE&f=json`
      ).then(r => r.json()),

      // 3: BCWS ArcGIS — active fire count nearby (layer 0)
      fetch(
        `https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/0/query` +
        `?where=1%3D1&geometry=${coordLng-1}%2C${coordLat-1}%2C${coordLng+1}%2C${coordLat+1}` +
        `&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=FIRE_NAME%2CFIRE_STATUS&returnCountOnly=true&f=json`
      ).then(r => r.json()),

      // 4: MSC GeoMet — AQHI real-time observation (Environment and Climate Change Canada)
      fetch(
        `https://geomet.weather.gc.ca/api/collections/aqhi-observations-realtime/items` +
        `?bbox=${coordLng-1}%2C${coordLat-1}%2C${coordLng+1}%2C${coordLat+1}&limit=1&f=json`
      ).then(r => r.json()),

      // 5: MSC GeoMet — ECCC weather alerts (Environment and Climate Change Canada)
      fetch(
        `https://geomet.weather.gc.ca/api/collections/alerts/items` +
        `?bbox=${coordLng-1}%2C${coordLat-1}%2C${coordLng+1}%2C${coordLat+1}&f=json`
      ).then(r => r.json()),

      // 6: BC Parks GraphQL — Strapi v4 format (only if slug provided)
      bcparksSlug
        ? fetch('https://bcparks.api.gov.bc.ca/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `{
              protectedAreas(filters: { slug: { eq: "${bcparksSlug}" } }) {
                data { attributes {
                  hasCampfireBan campfireBanEffectiveDate
                  publicAdvisories { data { attributes {
                    title description isSafetyRelated effectiveDate endDate
                  } } }
                  parkOperation { data { attributes {
                    isActive openNote serviceNote reservationUrl
                    gateOpenTime gateCloseTime
                  } } }
                } }
              }
            }` }),
          }).then(r => r.json())
        : Promise.resolve(null),

      // 7: DriveBC Open511 — road events (CORS: Access-Control-Allow-Origin: *)
      open511Road
        ? fetch(`https://api.open511.gov.bc.ca/events?road_name=${encodeURIComponent(open511Road)}&status=ACTIVE&format=json`)
            .then(r => r.json())
        : Promise.resolve(null),

      // 8: DFO IWLS — tidal predictions for nearest station (only when site selected)
      hasCoords
        ? fetchTides(coordLat, coordLng, date)
        : Promise.resolve(null),
    ];

    const results = await Promise.allSettled(queries);
    const [meteoRes, astroRes, bansRes, firesRes, aqhiRes, alertsRes, parksRes, drivebcRes, tidesRes] = results;

    const meteo   = meteoRes.status   === 'fulfilled' ? meteoRes.value   : null;
    const astro   = astroRes.status   === 'fulfilled' ? astroRes.value   : null;
    const bans    = bansRes.status    === 'fulfilled' ? bansRes.value    : null;
    const fires   = firesRes.status   === 'fulfilled' ? firesRes.value   : null;
    const aqhi    = aqhiRes.status    === 'fulfilled' ? aqhiRes.value    : null;
    const alerts  = alertsRes.status  === 'fulfilled' ? alertsRes.value  : null;
    const parks   = parksRes.status   === 'fulfilled' ? parksRes.value   : null;
    const drivebc = drivebcRes.status === 'fulfilled' ? drivebcRes.value : null;
    const tides   = tidesRes.status   === 'fulfilled' ? tidesRes.value   : null;

    const cur   = meteo?.current;
    const daily = meteo?.daily;

    const sunriseISO = astro?.results?.civil_twilight_begin;
    const sunsetISO  = astro?.results?.sunset;

    const aqhiVal    = aqhi?.features?.[0]?.properties?.aqhi ?? null;
    const parkAttrs  = parks?.data?.protectedAreas?.data?.[0]?.attributes ?? null;
    const parkOp     = parkAttrs?.parkOperation?.data?.attributes ?? null;
    const roadEvents = drivebc?.events || null;

    // ECCC alerts: features array
    const alertFeatures = alerts?.features ?? null;

    setData({
      weather: cur ? {
        tempC:    Math.round(cur.temperature_2m),
        feelsC:   Math.round(cur.apparent_temperature),
        code:     cur.weather_code,
        windKmh:  Math.round(cur.wind_speed_10m),
        windDir:  cur.wind_direction_10m,
        humidity: cur.relative_humidity_2m,
      } : null,
      forecast: daily ? {
        codes:    daily.weather_code,
        maxTemps: daily.temperature_2m_max,
        minTemps: daily.temperature_2m_min,
        popMax:   daily.precipitation_probability_max,
        windMax:  daily.wind_speed_10m_max,
        uvMax:    daily.uv_index_max,
        times:    daily.time,
      } : null,
      sunrise: sunriseISO ? fmtTime(sunriseISO) : null,
      sunset:  sunsetISO  ? fmtTime(sunsetISO)  : null,
      fireBans:       bans?.features ?? null,
      activeFires:    fires?.count ?? null,
      aqhi:           aqhiVal,
      parkStatus:     parkOp?.isActive === true ? 'Open' : parkOp?.isActive === false ? 'Closed' : null,
      parkOpenNote:   parkOp?.openNote ?? null,
      parkAdvisories: parkAttrs?.publicAdvisories?.data?.map(d => d.attributes) ?? null,
      hasCampfireBan: parkAttrs?.hasCampfireBan ?? null,
      reservationUrl: parkOp?.reservationUrl ?? null,
      roadEvents,
      moonPhase: computeMoonPhase(new Date(date + 'T12:00:00')),
      weatherAlerts: alertFeatures,
      tides,
      uvIndex: daily?.uv_index_max?.[0] ?? null,
      tripDate: date,
      loading: false, error: null, lastUpdated: new Date(),
    });
  }, [lat, lng, bcparksSlug, open511Road, tripDate]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return data;
}
