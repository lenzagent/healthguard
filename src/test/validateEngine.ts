/**
 * Quick validation script for the Health Score Engine.
 * Run with: npx tsx src/test/validateEngine.ts
 *
 * This is a standalone validation that doesn't require vitest.
 * It exercises the engine with realistic data and prints results.
 */

// We need to handle path aliases manually since tsx doesn't resolve @/
import { computeHealthScore } from "../lib/healthScoreEngine";
import type { DailyHealthData } from "../lib/types";

// ── Helpers ────────────────────────────────────────────────

function healthyDay(date: string): DailyHealthData {
  return {
    date,
    sleep: { durationHours: 7.5, deepSleepMinutes: 90, quality: 80 },
    heartRate: { restingBpm: 65, avgDailyBpm: 72 },
    activity: { steps: 10000, activeMinutes: 45, caloriesBurned: 450 },
    weight: { kg: 70, bmi: 22 },
    recovery: { hrvMs: 55 },
    bloodMetrics: { systolic: 118, diastolic: 76, spo2: 98 },
  };
}

function poorDay(date: string): DailyHealthData {
  return {
    date,
    sleep: { durationHours: 4.5, deepSleepMinutes: 25, quality: 30 },
    heartRate: { restingBpm: 95, avgDailyBpm: 105 },
    activity: { steps: 2000, activeMinutes: 5, caloriesBurned: 80 },
    weight: { kg: 95, bmi: 31 },
    recovery: { hrvMs: 18 },
    bloodMetrics: { systolic: 145, diastolic: 92, spo2: 93 },
  };
}

function generateDays(
  count: number,
  startDate: string,
  template: DailyHealthData
): DailyHealthData[] {
  const days: DailyHealthData[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const day = structuredClone(template);
    day.date = dateStr;
    days.push(day);
  }
  return days;
}

// ── Test Cases ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

// Test 1: Insufficient data
console.log("\n📋 Test 1: Insufficient data");
{
  const r = computeHealthScore(generateDays(2, "2026-06-01", healthyDay("2026-06-01")));
  assert(r.insufficientData === true, "insufficientData is true for 2 days");
  assert(r.dataDays === 2, "dataDays is 2");
  assert(r.overall === 0, "overall is 0 when insufficient");
  assert(r.dimensions.length === 0, "no dimensions when insufficient");
}

// Test 2: Minimum 3 days
console.log("\n📋 Test 2: Minimum 3 days");
{
  const r = computeHealthScore(generateDays(3, "2026-06-01", healthyDay("2026-06-01")));
  assert(r.insufficientData === false, "insufficientData is false");
  assert(r.dataDays === 3, "dataDays is 3");
  assert(r.overall > 0, "overall > 0");
  assert(r.dimensions.length === 6, "6 dimensions");
  assert(r.overall <= 100, "overall <= 100");
}

// Test 3: Healthy person scores >= 80
console.log("\n📋 Test 3: Healthy person");
{
  const r = computeHealthScore(generateDays(14, "2026-05-20", healthyDay("2026-05-20")));
  assert(r.overall >= 80, `overall >= 80 (got ${r.overall})`);
  console.log(`  📊 Overall: ${r.overall}, Status: ${r.overall >= 80 ? "优秀" : r.overall >= 60 ? "良好" : "一般"}`);
  for (const d of r.dimensions) {
    console.log(`     ${d.icon} ${d.nameZh}: ${d.rawScore}/100 (weight: ${d.weight}, trend: ${d.trend})`);
  }
}

// Test 4: Poor health scores low
console.log("\n📋 Test 4: Poor health");
{
  const r = computeHealthScore(generateDays(14, "2026-05-20", poorDay("2026-05-20")));
  assert(r.overall < 60, `overall < 60 (got ${r.overall})`);
  assert(r.globalFlags.length > 0, `has global flags (${r.globalFlags.length})`);
  console.log(`  📊 Overall: ${r.overall}`);
  console.log(`  🚩 Flags: ${r.globalFlags.join(", ")}`);
}

// Test 5: Trend detection (improvement)
console.log("\n📋 Test 5: Weekly trend — improvement");
{
  const week1 = generateDays(7, "2026-05-15", poorDay("2026-05-15"));
  const week2 = generateDays(7, "2026-05-22", healthyDay("2026-05-22"));
  const r = computeHealthScore([...week1, ...week2]);
  assert(r.weeklyChange > 0, `weeklyChange positive (got ${r.weeklyChange})`);
  console.log(`  📈 Weekly change: ${r.weeklyChange}`);
}

// Test 6: Trend detection (decline)
console.log("\n📋 Test 6: Weekly trend — decline");
{
  const week1 = generateDays(7, "2026-05-15", healthyDay("2026-05-15"));
  const week2 = generateDays(7, "2026-05-22", poorDay("2026-05-22"));
  const r = computeHealthScore([...week1, ...week2]);
  assert(r.weeklyChange < 0, `weeklyChange negative (got ${r.weeklyChange})`);
  console.log(`  📉 Weekly change: ${r.weeklyChange}`);
}

// Test 7: Explanation generation
console.log("\n📋 Test 7: Explanation");
{
  const r = computeHealthScore(generateDays(14, "2026-05-20", healthyDay("2026-05-20")));
  assert(r.explanation.length > 10, `explanation is non-trivial`);
  assert(r.explanation.includes("综合健康评分"), `explanation mentions 综合健康评分`);
  console.log(`  💬 ${r.explanation}`);
}

// Test 8: Dimension weights sum to 1.0
console.log("\n📋 Test 8: Weight validation");
{
  const r = computeHealthScore(generateDays(7, "2026-06-01", healthyDay("2026-06-01")));
  const total = r.dimensions.reduce((s, d) => s + d.weight, 0);
  assert(Math.abs(total - 1.0) < 0.001, `weights sum to 1.0 (got ${total})`);

  const expected: Record<string, number> = {
    sleep: 0.25, heartRate: 0.2, activity: 0.2,
    weight: 0.15, recovery: 0.1, bloodMetrics: 0.1,
  };
  let allMatch = true;
  for (const d of r.dimensions) {
    if (d.weight !== expected[d.name]) allMatch = false;
  }
  assert(allMatch, "each dimension has correct weight");
}

// Test 9: Score range
console.log("\n📋 Test 9: Score bounds");
{
  const healthy = computeHealthScore(generateDays(14, "2026-05-20", healthyDay("2026-05-20")));
  assert(healthy.overall >= 0 && healthy.overall <= 100, `healthy overall in [0,100] (got ${healthy.overall})`);

  const poor = computeHealthScore(generateDays(14, "2026-05-20", poorDay("2026-05-20")));
  assert(poor.overall >= 0 && poor.overall <= 100, `poor overall in [0,100] (got ${poor.overall})`);

  for (const d of healthy.dimensions) {
    assert(d.rawScore >= 0 && d.rawScore <= 100, `${d.name} rawScore in [0,100] (got ${d.rawScore})`);
  }
}

// Test 10: Sleep duration detection
console.log("\n📋 Test 10: Low sleep detection");
{
  const days = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
  for (let i = 4; i < 7; i++) {
    days[i].sleep.durationHours = 4;
    days[i].sleep.deepSleepMinutes = 30;
  }
  const r = computeHealthScore(days);
  const sleep = r.dimensions.find((d) => d.name === "sleep")!;
  assert(sleep.flags.some((f) => f.includes("睡眠时长不足")), "sleep duration flag raised");
  assert(sleep.rawScore < 80, `sleep score reduced from baseline (got ${sleep.rawScore})`);
}

// Test 11: High HR detection
console.log("\n📋 Test 11: High heart rate detection");
{
  const days = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
  for (let i = 4; i < 7; i++) {
    days[i].heartRate.restingBpm = 95;
  }
  const r = computeHealthScore(days);
  const hr = r.dimensions.find((d) => d.name === "heartRate")!;
  assert(hr.flags.some((f) => f.includes("静息心率偏高")), "HR flag raised");
}

// Test 12: Low activity detection
console.log("\n📋 Test 12: Low activity detection");
{
  const days = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
  for (let i = 4; i < 7; i++) {
    days[i].activity.steps = 2000;
    days[i].activity.activeMinutes = 5;
  }
  const r = computeHealthScore(days);
  const act = r.dimensions.find((d) => d.name === "activity")!;
  assert(act.flags.some((f) => f.includes("步数不足")), "steps flag raised");
  assert(act.rawScore < 85, `activity score reduced from baseline (got ${act.rawScore})`);
}

// ── Summary ────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`${"═".repeat(50)}`);

if (failed > 0) {
  process.exit(1);
}
