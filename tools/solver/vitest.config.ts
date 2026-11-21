import { defineConfig } from "vitest/config";

/** Separate from `npm test`: solver runs are slow (up to a minute per case). */
export default defineConfig({
  test: { include: ["tools/solver/*.solve.ts"], testTimeout: 3_600_000, disableConsoleIntercept: true },
});
