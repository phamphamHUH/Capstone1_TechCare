import { defineConfig } from "vitest/config";

// These mocked controller checks must not run the database integration setup.
export default defineConfig({ test: { environment: "node", include: ["src/tests/isolated/**/*.test.ts"], testTimeout: 15000, hookTimeout: 20000 } });
