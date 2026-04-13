import { useState, useEffect } from "react";
import { DEPARTURE, SITES } from "../data/sites.js";

export function useDriveTimes(departure) {
  const [times, setTimes] = useState({});
  const { lat, lng } = (departure || DEPARTURE).coords;
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all(
      SITES.map(async site => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${site.coords.lng},${site.coords.lat}?overview=false`;
          const data = await fetch(url, { signal }).then(r => r.json());
          const route = data.routes?.[0];
          if (route) return [site.id, { minutes: Math.round(route.duration / 60), km: Math.round(route.distance / 1000) }];
        } catch (_) {}
        return [site.id, null];
      })
    ).then(entries => {
      if (!signal.aborted) setTimes(Object.fromEntries(entries));
    });
    return () => controller.abort();
  }, [lat, lng]);
  return times;
}
