import { useState, useEffect } from "react";
import { DEPARTURE, SITES } from "../data/sites.js";

export function useDriveTimes(departure) {
  const [times, setTimes] = useState({});
  useEffect(() => {
    const { lat, lng } = (departure || DEPARTURE).coords;
    Promise.all(
      SITES.map(async site => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${site.coords.lng},${site.coords.lat}?overview=false`;
          const data = await fetch(url).then(r => r.json());
          const route = data.routes?.[0];
          if (route) return [site.id, { minutes: Math.round(route.duration / 60), km: Math.round(route.distance / 1000) }];
        } catch (_) {}
        return [site.id, null];
      })
    ).then(entries => setTimes(Object.fromEntries(entries)));
  }, [(departure || DEPARTURE).coords.lat, (departure || DEPARTURE).coords.lng]);
  return times;
}
