import { useSyncExternalStore } from "react";
import {
  getConnection,
  subscribeToConnection,
} from "../lib/realtime";

/*
 * The connection state, and the generation number that hooks put in their
 * effect dependencies so a recovery re-subscribes and refetches.
 */
export function useConnection() {
  return useSyncExternalStore(
    subscribeToConnection,
    getConnection,
    getConnection,
  );
}

/** Just the generation, for hooks that only need to refetch. */
export function useRealtimeGeneration() {
  return useConnection()
    .generation;
}
