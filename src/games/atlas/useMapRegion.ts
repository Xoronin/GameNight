import {
  useEffect,
  useState,
} from "react";
import { loadMapRegions } from "../../data/atlasMapLoader";
import type {
  MapRegion,
  MapRegionId,
} from "../../data/atlasMapPaths";

/**
 * Loads one region's outlines, lazily.
 *
 * Returns null while the chunk is still arriving, so a caller can show
 * a placeholder rather than an empty frame.
 */
export function useMapRegion(
  region: MapRegionId | null,
): MapRegion | null {
  const [shapes, setShapes] =
    useState<MapRegion | null>(
      null,
    );

  useEffect(() => {
    if (!region) {
      return;
    }

    let active = true;

    void loadMapRegions().then(
      (regions) => {
        if (active) {
          setShapes(
            regions[region],
          );
        }
      },
    );

    return () => {
      active = false;
    };
  }, [region]);

  return shapes;
}
