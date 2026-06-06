# HealthGuard Cross-Platform Packaging

## Current State (2026-06-06)

HealthGuard is a **Next.js PWA** with **Android Capacitor** wrapping and **Electron desktop**
packaging via electron-builder.

| Platform | Status | Format |
|----------|--------|--------|
| Web (PWA) | ✅ Active | SSR via Next.js |
| Android | ✅ Active | Capacitor APK |
| Windows | ✅ Configured | NSIS installer (electron-builder) |
| macOS | ✅ Configured | DMG + notarization (electron-builder) |
| Linux | ✅ Configured | AppImage + .deb (electron-builder) |

## Implementation Status

### 1. Electron Wrapper ✅ (2026-06-06)

- `electron/main.js` — Main process, loads Next.js (dev server in dev, SSR in production)
- `electron/preload.js` — Secure context bridge with contextIsolation + sandbox
- `build/entitlements.mac.plist` — macOS hardened runtime entitlements (camera, mic, network)
- `package.json` — electron-builder configuration for all 3 platforms
- Dependencies: `electron ^33.2.1`, `electron-builder ^25.1.8`

### 2. Code Signing

| Platform | Requirement | Status |
|----------|-------------|--------|
| Windows | EV Code Signing Certificate (~$300-400/yr) | ❌ Deferred (MVP ships unsigned) |
| macOS | Apple Developer ID + notarization | ✅ Apple Developer Program approved; CI needs APPLE_ID/APPLE_TEAM_ID secrets |
| Linux | GPG signing key (optional, free) | ❌ Deferred (MVP) |

### 3. Python Backend

HealthGuard's backend is **Next.js API routes (TypeScript)**, not Python. There is no
Python service to bundle. The PyInstaller reference in LPW-17 is N/A.

## What CI Verifies Today

### Local verification
Run `bash scripts/ci/verify-build.sh` to verify:

1. Next.js production build on the current platform
2. Build size < 500MB
3. PWA assets (manifest, icons, service worker)
4. TypeScript type checking
5. Unit tests (326 tests)
6. App startup (dev server responds on :3000)
7. Android APK build (with `--platform=android`)

### GitHub Actions CI

Three workflows are configured:
- `.github/workflows/ci.yml` — Cross-platform build + test + E2E + Lighthouse
- `.github/workflows/android-build.yml` — Android APK builds
- `.github/workflows/desktop-build.yml` — Windows NSIS, macOS DMG, Linux AppImage/deb

### Desktop packaging scripts
- `pnpm electron:dev` — Run Electron with Next.js dev server
- `pnpm electron:build` — Build Next.js + package for current platform
- `pnpm electron:build:win` / `:mac` / `:linux` — Platform-specific builds
- `pnpm electron:build:all` — Build for all 3 platforms

## Next Steps

1. **Trigger CI**: Push to `main` to trigger `desktop-build.yml` workflow
2. **Configure secrets**: Add `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` for macOS notarization
3. **Auto-update** (post-MVP): Implement with `electron-updater` using GitHub Releases
4. **Code signing** (post-MVP): Acquire Windows EV cert, configure Linux GPG
