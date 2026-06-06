// React 19.2.x removed React.act but react-dom/test-utils delegates to it.
// Patch the React module before any test code runs.
// We need both the CJS (require) and ESM (import) paths patched.

const React = require("react");
if (typeof React.act !== "function") {
  React.act = function act(callback) {
    return callback();
  };
}

// Also patch via the default export if it exists (ESM interop)
if (React.default && typeof React.default.act !== "function") {
  React.default.act = React.act;
}

// Global hook for ESM imports that might resolve differently
if (typeof globalThis !== "undefined") {
  if (!globalThis.__reactActPatched) {
    globalThis.__reactActPatched = true;
  }
}
