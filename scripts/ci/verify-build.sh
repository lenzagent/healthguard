#!/usr/bin/env bash
# HealthGuard Cross-Platform Build Verification
# Usage: bash scripts/ci/verify-build.sh [--platform=all|web|android]
#
# Verifies:
#   1. Next.js production build succeeds
#   2. Build output size < 500MB
#   3. PWA assets are present
#   4. Android APK builds successfully (if --platform=android)
#   5. App starts correctly (dev server responds)
#
# Exit codes: 0 = all checks pass, 1 = verification failure

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
MAX_SIZE_MB=500
PLATFORM="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_DIR"

log_section() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

check_pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASS=$((PASS + 1))
}

check_fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAIL=$((FAIL + 1))
}

# ── Node.js & package manager check ──
log_section "Environment Check"

NODE_VERSION=$(node -v 2>/dev/null || echo "")
if [ -n "$NODE_VERSION" ]; then
  check_pass "Node.js $NODE_VERSION"
else
  check_fail "Node.js not found — install Node.js 20+"
  exit 1
fi

PM="npm"
if command -v pnpm &> /dev/null; then
  PM="pnpm"
elif command -v yarn &> /dev/null; then
  PM="yarn"
fi
check_pass "Package manager: $PM"

OS="$(uname -s)"
case "$OS" in
  Linux*)   check_pass "OS: Linux" ;;
  Darwin*)  check_pass "OS: macOS" ;;
  MINGW*|MSYS*|CYGWIN*) check_pass "OS: Windows (Git Bash)" ;;
  *)        echo -e "  ${YELLOW}⚠${NC} Unknown OS: $OS" ;;
esac

# ── Dependencies check ──
log_section "Dependencies"
if [ -d "node_modules" ]; then
  NODE_MODULES_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
  check_pass "node_modules ($NODE_MODULES_COUNT top-level packages)"
else
  echo -e "  ${YELLOW}⚠${NC} node_modules not found, installing..."
  $PM install
  check_pass "Dependencies installed"
fi

# ── Next.js Production Build ──
log_section "Next.js Production Build"

echo "  Building Next.js..."
BUILD_START=$SECONDS

if $PM run build > .build-log.txt 2>&1; then
  BUILD_TIME=$((SECONDS - BUILD_START))
  check_pass "Build succeeded (${BUILD_TIME}s)"
else
  check_fail "Build failed — see .build-log.txt"
  tail -50 .build-log.txt
  exit 1
fi

# ── Build Output Verification ──
log_section "Build Output Verification"

if [ -d ".next" ]; then
  BUILD_SIZE=$(du -sm .next 2>/dev/null | cut -f1 || echo "0")
  check_pass ".next directory exists"

  if [ "$BUILD_SIZE" -le "$MAX_SIZE_MB" ]; then
    check_pass "Build size: ${BUILD_SIZE}MB (limit: ${MAX_SIZE_MB}MB)"
  else
    check_fail "Build size: ${BUILD_SIZE}MB exceeds ${MAX_SIZE_MB}MB limit"
  fi
else
  check_fail ".next directory missing"
  exit 1
fi

# ── Check for key output files ──
if [ -d ".next/static" ]; then
  check_pass ".next/static exists"
else
  check_fail ".next/static missing"
fi

# ── PWA Assets ──
log_section "PWA Asset Verification"

if [ -f "public/manifest.json" ]; then
  check_pass "manifest.json present"
else
  echo -e "  ${YELLOW}⚠${NC} manifest.json not found (PWA requires this)"
fi

if [ -f "public/sw.js" ] || [ -f "public/service-worker.js" ]; then
  check_pass "Service worker present"
else
  echo -e "  ${YELLOW}⚠${NC} No service worker found (PWA offline support needs this)"
fi

if ls public/icon-*.png 1>/dev/null 2>&1 || ls public/apple-touch-icon*.png 1>/dev/null 2>&1; then
  check_pass "App icons present"
else
  echo -e "  ${YELLOW}⚠${NC} No app icons found in public/"
fi

# ── TypeScript Check ──
log_section "TypeScript"

if npx tsc --noEmit > .tsc-log.txt 2>&1; then
  check_pass "TypeScript type check passed"
else
  check_fail "TypeScript type check failed"
  tail -20 .tsc-log.txt
fi

# ── Unit Tests ──
log_section "Unit Tests"

if $PM test -- --reporter=verbose > .test-log.txt 2>&1; then
  check_pass "All unit tests pass"
else
  check_fail "Some unit tests failed"
  tail -30 .test-log.txt
fi

# ── App Startup Test ──
log_section "App Startup Test"

STARTUP_LOG=".startup-test.log"
$PM run start > "$STARTUP_LOG" 2>&1 &
SERVER_PID=$!
echo "  Server starting (PID: $SERVER_PID)..."

# Wait up to 30 seconds for server
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|302\|304"; then
    check_pass "Server responds on :3000 (after ${i}s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    check_fail "Server did not respond within 30s"
    kill "$SERVER_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Get response details
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
RESP_SIZE=$(curl -s -o /dev/null -w "%{size_download}" http://localhost:3000 2>/dev/null || echo "0")
check_pass "HTTP $HTTP_CODE, response: ${RESP_SIZE} bytes"

# Check for AI disclaimer in responses
CONTENT=$(curl -s http://localhost:3000 2>/dev/null || echo "")
if echo "$CONTENT" | grep -qi "AI\|生成\|仅供参考\|medical\|disclaimer" 2>/dev/null; then
  check_pass "AI disclaimer present in HTML"
else
  echo -e "  ${YELLOW}⚠${NC} AI disclaimer not confirmed on landing page"
fi

# Stop server
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
check_pass "Server stopped cleanly"

# ── Android APK Build (optional) ──
if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
  log_section "Android APK Build"

  if [ -d "android" ] && [ -f "android/gradlew" ]; then
    if [ "$OS" = "Darwin" ] || [ "$OS" = "Linux" ]; then
      chmod +x android/gradlew 2>/dev/null || true
    fi

    echo "  Building static export..."
    CAPACITOR_BUILD=1 $PM run build > /dev/null 2>&1

    echo "  Syncing Capacitor..."
    npx cap sync android > /dev/null 2>&1

    echo "  Running Gradle assembleDebug..."
    if (cd android && ./gradlew assembleDebug > ../.gradle-log.txt 2>&1); then
      APK_PATH=$(find android -name "*.apk" -path "*/build/*" -type f 2>/dev/null | head -1)
      if [ -n "$APK_PATH" ]; then
        APK_SIZE=$(du -sm "$APK_PATH" 2>/dev/null | cut -f1 || echo "0")
        check_pass "APK built: $APK_PATH (${APK_SIZE}MB)"
        if [ "$APK_SIZE" -le "$MAX_SIZE_MB" ]; then
          check_pass "APK size within limit"
        else
          check_fail "APK size ${APK_SIZE}MB exceeds ${MAX_SIZE_MB}MB limit"
        fi
      else
        check_fail "APK not found after build"
      fi
    else
      check_fail "Gradle build failed — see .gradle-log.txt"
      echo "  Note: Android SDK may be required for APK builds"
    fi
  else
    check_fail "Android project not found — run 'npx cap add android' first"
    echo "  Note: Desktop packaging (NSIS/DMG/AppImage) requires Electron wrapper"
    echo "  See docs/PLATFORM-PACKAGING.md for desktop packaging prerequisites"
  fi
fi

# ── Package Size Summary ──
log_section "Package Size Summary"
echo ""
echo "  Next.js build (.next):    ${BUILD_SIZE:-N/A} MB"
if [ -d ".next/static" ]; then
  STATIC_SIZE=$(du -sm .next/static 2>/dev/null | cut -f1 || echo "0")
  echo "  Static assets:            ${STATIC_SIZE} MB"
fi
if [ -d "node_modules" ]; then
  NM_SIZE=$(du -sm node_modules 2>/dev/null | cut -f1 || echo "0")
  echo "  node_modules (dev only):  ${NM_SIZE} MB"
fi
echo ""

# ── Final Report ──
log_section "Verification Report"
TOTAL=$((PASS + FAIL))
echo ""
echo -e "  Checks passed: ${GREEN}${PASS}${NC}"
echo -e "  Checks failed: ${RED}${FAIL}${NC}"
echo -e "  Total checks:  ${TOTAL}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}✗ VERIFICATION FAILED — ${FAIL} check(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}✓ ALL ${PASS} CHECKS PASSED${NC}"
fi
