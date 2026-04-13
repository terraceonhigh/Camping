import { createContext } from "react";

export const DurationCtx  = createContext(14);
export const LiveDataCtx  = createContext(null);
export const SiteCtx      = createContext(null);
export const TripDateCtx  = createContext(null);
export const DietaryCtx   = createContext({ active: new Set(), toggle: () => {} });
