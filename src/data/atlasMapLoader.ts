import type {
  MapRegion,
  MapRegionId,
} from "./atlasMapPaths";

/*
 * The country outlines are around 50 KB gzipped — worth having, but not
 * worth making every player download before a map round has even come
 * up. They live in their own chunk, fetched the first time a map round
 * renders and cached for the rest of the session.
 *
 * Only the UI needs them: the service picks a region and its countries
 * from the roster's own continent field, so round creation never pulls
 * the outlines in.
 */

let cache: Record<
  MapRegionId,
  MapRegion
> | null = null;

let inFlight: Promise<
  Record<MapRegionId, MapRegion>
> | null = null;

export function loadMapRegions(): Promise<
  Record<MapRegionId, MapRegion>
> {
  if (cache) {
    return Promise.resolve(cache);
  }

  if (!inFlight) {
    inFlight = import(
      "./atlasMapPaths"
    ).then((module) => {
      cache = module.mapRegions;

      return cache;
    });
  }

  return inFlight;
}
