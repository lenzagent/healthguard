import path from "node:path";
import { defineConfig } from "vitest/config";

// React 19.2: the production CJS build removes React.act, but
// react-dom/test-utils requires it. Must force development build.
// @ts-expect-error — TS types mark NODE_ENV as readonly, but this is needed at runtime
process.env.NODE_ENV = "development";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],

    // React 19.2 requires process.env.NODE_ENV === "development" for
    // the development build (which has React.act). The production build
    // removes React.act, which breaks react-dom/test-utils.
    env: {
      NODE_ENV: "development",
    },

    // Exclude Playwright E2E files from Vitest test discovery
    exclude: [
      "e2e/**",
      "node_modules/**",
      "dist/**",
      ".next/**",
    ],

    // Coverage: target core business logic (lib/) at >80%
    // UI components and screens are covered by component tests
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/context/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/middleware.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "node_modules/**",
        "e2e/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      watermarks: {
        statements: [70, 85],
        functions: [70, 85],
        branches: [65, 80],
        lines: [70, 85],
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": path.resolve(__dirname, "./src/__mocks__/next/server.ts"),
    },
  },
});
