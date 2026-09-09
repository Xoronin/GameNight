import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /* Pure logic tests — no DOM needed, so no jsdom dependency. */
    environment: "node",
    include: ["src/**/*.test.ts"],

    /*
     * src/lib/supabase.ts throws at import time when these are missing,
     * so anything importing a service would fail to load. The values are
     * never connected to: the tests only call pure functions.
     */
    env: {
      VITE_SUPABASE_URL:
        "https://test.invalid",
      VITE_SUPABASE_ANON_KEY:
        "test-anon-key",
    },
  },
});
