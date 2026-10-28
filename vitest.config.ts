import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration tests read the services' keys from .env; unit tests run without it.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env: integration tests skip themselves
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "scripts/derisk/**", ".next/**"],
  },
});
