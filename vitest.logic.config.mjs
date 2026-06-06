import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  test: {
    environment: "node",
    globals: true,
    // No setup files needed for pure logic tests
    setupFiles: [],
    include: ["src/test/anomalyDetection.test.ts", "src/test/alertService.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
