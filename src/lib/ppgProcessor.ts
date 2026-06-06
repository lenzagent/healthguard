/**
 * PPG Processor — Real-time photoplethysmography signal analysis from facial video.
 */

import { extractWaveformFeatures, estimateBP } from "./bpEstimator";

export interface PPGResult {
  hr: number | null;
  confidence: number;
  signalStrength: number;
  spo2: number | null;
  spo2Confidence: number;
  systolic: number | null;    // mmHg
  diastolic: number | null;   // mmHg
  bpConfidence: number;
  waveform: number[];
}

const SAMPLE_RATE = 60;
const WINDOW_SECONDS = 8;   // shorter window for better transient response
const MAX_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS;
const MIN_SAMPLES = SAMPLE_RATE * 2;
const DETREND_WINDOW = 30;
const HR_MIN = 40;
const HR_MAX = 220;
const SPO2_MIN_SAMPLES = SAMPLE_RATE * 3;
const HR_HISTORY_SIZE = 3;  // reduced from 5 for faster tracking

// Median filter buffer for HR stability
let hrHistory: number[] = [];
let lastHR: number | null = null;  // for adaptive smoothing

// Circular buffers for multi-channel signals
let bufferG: number[] = []; // green (HR)
let bufferR: number[] = []; // red   (SpO2)
let bufferB: number[] = []; // blue  (SpO2 reference)
let timestamps: number[] = [];

// ─── Smoothing state for stable outputs ─────────────────
let hrEma = 0;
let hrEmaWeight = 0;
let spo2Ema = 0;
let spo2EmaWeight = 0;

export function resetPPG() {
  bufferG = [];
  bufferR = [];
  bufferB = [];
  timestamps = [];
  hrEma = 0;
  hrEmaWeight = 0;
  spo2Ema = 0;
  spo2EmaWeight = 0;
  hrHistory = [];
}

/** Push RGB samples from face region. Returns current PPG + SpO2 analysis. */
export function pushSample(greenValue: number, redValue?: number, blueValue?: number): PPGResult {
  const now = performance.now();

  if (timestamps.length > 0 && now - timestamps[timestamps.length - 1] < 1000 / (SAMPLE_RATE + 10)) {
    // Allow slight oversampling — actual rate may be below 60fps depending on hardware
    return analyze();
  }

  bufferG.push(greenValue);
  if (redValue !== undefined) bufferR.push(redValue);
  if (blueValue !== undefined) bufferB.push(blueValue);
  timestamps.push(now);

  while (bufferG.length > MAX_SAMPLES) { bufferG.shift(); }
  while (bufferR.length > MAX_SAMPLES) { bufferR.shift(); }
  while (bufferB.length > MAX_SAMPLES) { bufferB.shift(); }
  while (timestamps.length > MAX_SAMPLES) { timestamps.shift(); }

  return analyze();
}

function analyze(): PPGResult {
  const n = bufferG.length;
  const signalStrength = n > 0
    ? Math.min(100, Math.round((bufferG.reduce((a, b) => a + b, 0) / n / 255) * 100))
    : 0;
  const waveform: number[] = [];
  const emptyResult: PPGResult = {
    hr: null, confidence: 0, signalStrength,
    spo2: null, spo2Confidence: 0,
    systolic: null, diastolic: null, bpConfidence: 0,
    waveform,
  };

  if (n < MIN_SAMPLES) return emptyResult;

  // ─── HR from green channel ─────────────────────────────
  const detrended = detrendSignal(bufferG, n);
  const filtered = bandpassFilter(detrended, n);
  const { hr, confidence: hrConf } = estimateHR(filtered, n);

  // ─── SpO2 from red/blue ratio ──────────────────────────
  let spo2: number | null = null;
  let spo2Conf = 0;

  if (bufferR.length >= SPO2_MIN_SAMPLES && bufferB.length >= SPO2_MIN_SAMPLES) {
    const result = estimateSpO2(bufferR, bufferB);
    spo2 = result.spo2;
    spo2Conf = result.confidence;
  }

  // ─── BP from waveform features + ML linear regression ──
  let systolic: number | null = null;
  let diastolic: number | null = null;
  let bpConf = 0;

  if (hr && hrConf > 30 && n >= SAMPLE_RATE * 3) {
    const features = extractWaveformFeatures(filtered, SAMPLE_RATE, hr);
    const bpResult = estimateBP(features, {}); // uses default demographics
    systolic = bpResult.systolic;
    diastolic = bpResult.diastolic;
    bpConf = bpResult.confidence;
  }

  // Waveform: last ~5s of filtered green signal
  const wfLen = Math.min(n, SAMPLE_RATE * 5);
  for (let i = n - wfLen; i < n; i++) {
    waveform.push(Math.round(filtered[i] * 100) / 100);
  }

  return {
    hr, confidence: hrConf, signalStrength,
    spo2, spo2Confidence: spo2Conf,
    systolic, diastolic, bpConfidence: bpConf,
    waveform,
  };
}

// ─── Signal processing helpers ──────────────────────────

function detrendSignal(signal: number[], n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - DETREND_WINDOW);
    const end = Math.min(n, i + DETREND_WINDOW);
    let sum = 0;
    for (let j = start; j < end; j++) sum += signal[j];
    out[i] = signal[i] - sum / (end - start);
  }
  return out;
}

function bandpassFilter(signal: Float64Array, n: number): Float64Array {
  // High-pass ~0.7 Hz
  const hp = new Float64Array(n);
  const alphaH = Math.exp(-2 * Math.PI * 0.7 / SAMPLE_RATE);
  hp[0] = signal[0];
  for (let i = 1; i < n; i++) {
    hp[i] = alphaH * hp[i - 1] + alphaH * (signal[i] - signal[i - 1]);
  }
  // Low-pass ~4 Hz
  const lp = new Float64Array(n);
  const alphaL = 1 - Math.exp(-2 * Math.PI * 4 / SAMPLE_RATE);
  lp[0] = hp[0];
  for (let i = 1; i < n; i++) {
    lp[i] = lp[i - 1] + alphaL * (hp[i] - lp[i - 1]);
  }
  // Zero-mean
  let mean = 0;
  for (let i = 0; i < n; i++) mean += lp[i];
  mean /= n;
  for (let i = 0; i < n; i++) lp[i] -= mean;
  return lp;
}

/**
 * Upgraded HR estimation using DFT (Discrete Fourier Transform) with
 * quadratic interpolation for sub-bin frequency resolution.
 *
 * DFT is evaluated only over the HR frequency band (0.67–3.67 Hz = 40–220 bpm),
 * making it O(N*B) where B ≈ 180 bins — fast enough for real-time.
 *
 * Quadratic interpolation around the peak bin gives ~0.1 bpm resolution.
 */
function estimateHR(filtered: Float64Array, n: number): { hr: number | null; confidence: number } {
  const actualRate = 1000 * n / (timestamps[n - 1] - timestamps[0] + 1);

  // Apply Hann window to reduce spectral leakage
  const windowed = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowed[i] = filtered[i] * hann;
  }

  // DFT over HR band: 0.67 Hz (40 bpm) to 3.67 Hz (220 bpm)
  // Step size: 0.5 bpm → 0.0083 Hz → excellent resolution
  const fMin = HR_MIN / 60;           // 0.67 Hz
  const fMax = HR_MAX / 60;           // 3.67 Hz
  const BPM_STEP = 0.5;
  const freqStep = BPM_STEP / 60;     // 0.0083 Hz
  const numBins = Math.floor((fMax - fMin) / freqStep) + 1;

  // Compute DFT magnitude for each frequency bin
  let maxMag = 0;
  let maxIdx = 0;
  const magnitudes = new Float64Array(numBins);

  for (let k = 0; k < numBins; k++) {
    const f = fMin + k * freqStep;
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const angle = 2 * Math.PI * f * i / actualRate;
      re += windowed[i] * Math.cos(angle);
      im -= windowed[i] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im);
    magnitudes[k] = mag;
    if (mag > maxMag) { maxMag = mag; maxIdx = k; }
  }

  // Signal quality metrics
  let sigPower = 0;
  for (let i = 0; i < n; i++) sigPower += filtered[i] * filtered[i];
  sigPower /= n;

  // SNR: ratio of peak magnitude to mean magnitude
  let meanMag = 0;
  for (let k = 0; k < numBins; k++) meanMag += magnitudes[k];
  meanMag /= numBins;
  const snr = meanMag > 0 ? maxMag / meanMag : 0;

  // Quadratic interpolation for sub-bin precision
  // Fit parabola through (idx-1, mag[idx-1]), (idx, mag[idx]), (idx+1, mag[idx+1])
  let peakFreq = fMin + maxIdx * freqStep;
  if (maxIdx > 0 && maxIdx < numBins - 1) {
    const alpha = magnitudes[maxIdx - 1];
    const beta = magnitudes[maxIdx];
    const gamma = magnitudes[maxIdx + 1];
    const denom = alpha - 2 * beta + gamma;
    if (Math.abs(denom) > 1e-10) {
      const delta = (alpha - gamma) / (2 * denom);
      peakFreq = fMin + (maxIdx + delta) * freqStep;
    }
  }

  const rawHR = peakFreq * 60;

  // Confidence scoring
  const snrConf = Math.min(1, (snr - 1.5) / 3);  // SNR > 4.5 = full confidence
  const sampleConf = Math.min(1, (n - MIN_SAMPLES) / (MAX_SAMPLES - MIN_SAMPLES));
  const rawConf = Math.round(Math.min(100, Math.max(0, snrConf * 60 + sampleConf * 40)));

  // Signal quality gate: require minimum SNR
  if (snr < 1.8 || sigPower < 0.01) {
    // Bad signal — return null HR but keep tracking
    return { hr: null, confidence: Math.round(Math.max(0, rawConf * 0.5)) };
  }

  // Validate HR is in physiological range
  if (rawHR < HR_MIN || rawHR > HR_MAX) {
    return { hr: null, confidence: Math.round(rawConf * 0.3) };
  }

  let hr = rawHR;

  // Adaptive EMA: faster tracking when HR is trending (post-exercise recovery)
  let alpha = 0.5; // base: 50% new + 50% old (vs. old 0.25)
  if (lastHR !== null && hrEmaWeight > 0.5) {
    const trend = Math.abs(rawHR - lastHR);
    if (trend > 15) {
      alpha = 0.8;  // rapid change detected → trust new data heavily
    } else if (trend > 8) {
      alpha = 0.65; // moderate change
    }
  }
  lastHR = rawHR;

  if (hrEmaWeight < 0.5) {
    hrEma = hr;
    hrEmaWeight = 1;
  } else {
    hrEma = hrEma * (1 - alpha) + hr * alpha;
  }

  // Median filter for outlier rejection (window=3)
  hrHistory.push(Math.round(hrEma));
  if (hrHistory.length > HR_HISTORY_SIZE) hrHistory.shift();
  hr = Math.round(hrEma); // use EMA directly; median only if stable
  if (hrHistory.length >= 3) {
    const spread = Math.max(...hrHistory) - Math.min(...hrHistory);
    if (spread <= 10) {
      // Stable signal → median is safe
      const sorted = [...hrHistory].sort((a, b) => a - b);
      hr = sorted[Math.floor(sorted.length / 2)];
    }
    // If spread > 10, stick with raw EMA (avoid median lag during transitions)
  }

  // Clamp
  hr = Math.min(HR_MAX, Math.max(HR_MIN, hr));

  return { hr, confidence: rawConf };
}

/**
 * Improved SpO2 estimation using red/blue channel ratio-of-ratios.
 *
 * With webcam RGB (no IR), red (~600-700nm) is the sensing channel
 * and blue (~450-500nm) is the reference.
 *
 * R_ratio = (AC_red/DC_red) / (AC_blue/DC_blue)
 *
 * Calibration: SpO2 ≈ c0 - c1 * R_ratio
 * For webcam RGB, c0≈105, c1≈18 (tuned for typical USB webcam)
 * Standard medical: c0≈110, c1≈25 (red/IR)
 *
 * Also applies bandpass to AC components for cleaner pulsatile extraction,
 * EMA smoothing, and SNR-based adaptive weighting.
 */
function estimateSpO2(
  red: number[],
  blue: number[]
): { spo2: number | null; confidence: number } {
  const n = Math.min(red.length, blue.length);
  if (n < SPO2_MIN_SAMPLES) return { spo2: null, confidence: 0 };

  // DC: use robust median instead of mean (less sensitive to outliers)
  const sortedR = [...red].sort((a, b) => a - b);
  const sortedB = [...blue].sort((a, b) => a - b);
  const dcR = sortedR[Math.floor(n / 2)];
  const dcB = sortedB[Math.floor(n / 2)];
  if (dcB < 2 || dcR < 2) return { spo2: null, confidence: 0 };

  // AC: bandpass-filter the signals to isolate the pulse component
  const detR = detrendSignal(red, n);
  const detB = detrendSignal(blue, n);
  const bpR = bandpassFilter(detR, n);
  const bpB = bandpassFilter(detB, n);

  // AC amplitude = standard deviation of bandpassed signal (more robust than RMS)
  let acR = 0, acB = 0;
  for (let i = 0; i < n; i++) { acR += bpR[i] * bpR[i]; acB += bpB[i] * bpB[i]; }
  acR = Math.sqrt(acR / n);
  acB = Math.sqrt(acB / n);

  // Minimum detectable signal
  if (acB < 0.005 * dcB) return { spo2: null, confidence: 0 };

  // Ratio of ratios
  const ratioR = (acR / dcR) / (acB / dcB);

  // Adjusted calibration for webcam RGB sensors
  // c0=105 (intercept), c1=18 (slope) — tuned for typical USB webcam sensitivity
  // Closer to real smartwatch values than the original 110/25 constants
  const C0 = 105;
  const C1 = 18;
  let spo2 = C0 - C1 * ratioR;

  // Adaptive correction: when ratio is very high (weak red pulsation),
  // the estimate tends to drift low — apply gentle correction
  if (ratioR > 3.0) {
    spo2 += (ratioR - 3.0) * 2;
  } else if (ratioR < 1.0) {
    spo2 -= (1.0 - ratioR) * 2;
  }

  // EMA smoothing for temporal stability
  const alpha = 0.25;
  if (spo2EmaWeight < 0.5) {
    spo2Ema = spo2;
    spo2EmaWeight = 1;
  } else {
    spo2Ema = spo2Ema * (1 - alpha) + spo2 * alpha;
  }
  spo2 = spo2Ema;

  // Clamp to physiological range (slightly wider to avoid clamping bias)
  const clamped = Math.round(Math.min(100, Math.max(88, spo2)));

  // Confidence based on SNR and signal stability
  const snrR = acR / (dcR + 0.01);
  const snrB = acB / (dcB + 0.01);
  const snr = Math.min(1, (snrR + snrB) / 0.03);
  const sampleConf = Math.min(1, (n - SPO2_MIN_SAMPLES) / (MAX_SAMPLES - SPO2_MIN_SAMPLES));
  const confidence = Math.round(Math.min(100, snr * 60 + sampleConf * 40));

  return { spo2: clamped, confidence };
}
