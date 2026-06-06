"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { pushSample, resetPPG, type PPGResult } from "@/lib/ppgProcessor";

export function HealthCheckMonitoringScreen() {
  const { navigate, goBack } = useApp();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ppgResultRef = useRef<PPGResult>({ hr: null, confidence: 0, signalStrength: 0, spo2: null, spo2Confidence: 0, systolic: null, diastolic: null, bpConfidence: 0, waveform: [] });
  const [elapsed, setElapsed] = useState(0);
  const [liveHr, setLiveHr] = useState("--");
  const [liveSpo2, setLiveSpo2] = useState("--");
  const [liveBp, setLiveBp] = useState("--/--");
  const [cameraActive, setCameraActive] = useState(false);
  const [realSignal, setRealSignal] = useState(0); // 0-100 real signal intensity
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const TOTAL = 30;

  // Acquire camera
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
        resetPPG(); // Reset PPG buffer when camera starts
      } catch {
        showToast("⚠️ 摄像头不可用，使用模拟模式", "warning");
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time video frame analysis — extracts actual color signal from face region
  useEffect(() => {
    if (!cameraActive) return;
    let animId: number;

    function analyzeFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animId = requestAnimationFrame(analyzeFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Sample the center face-guide region (where user's face should be)
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      // Extract center oval region (face guide area)
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h * 0.45);
      const rx = Math.floor(w * 0.19);
      const ry = Math.floor(h * 0.26);
      let totalG = 0;
      let totalR = 0;
      let count = 0;

      const imageData = ctx.getImageData(cx - rx, cy - ry, rx * 2, ry * 2);
      for (let i = 0; i < imageData.data.length; i += 4) {
        totalR += imageData.data[i];     // Red channel
        totalG += imageData.data[i + 1]; // Green channel (most PPG-sensitive)
        count++;
      }

      if (count > 0) {
        const avgG = totalG / count;
        const avgR = totalR / count;
        const avgB = (totalG / count) * 0.7; // estimate blue from green (most webcams have 2 green, 1 red, 1 blue per 2x2 block)
        // Actually compute blue properly
        let totalB = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          totalB += imageData.data[i + 2]; // Blue channel
        }
        const avgBlue = totalB / count;

        // Feed all channels into PPG processor
        const ppgResult = pushSample(avgG, avgR, avgBlue);
        ppgResultRef.current = ppgResult;
        setRealSignal(ppgResult.signalStrength);

        // Update HR from PPG
        if (ppgResult.hr !== null && ppgResult.confidence > 20) {
          setLiveHr(String(ppgResult.hr));
        }

        // Update SpO2 from PPG
        if (ppgResult.spo2 !== null && ppgResult.spo2Confidence > 10) {
          setLiveSpo2(String(ppgResult.spo2));
        }

        // Update BP from PPG waveform ML model
        if (ppgResult.systolic !== null && ppgResult.diastolic !== null && ppgResult.bpConfidence > 10) {
          setLiveBp(`${ppgResult.systolic}/${ppgResult.diastolic}`);
        }
      }

      animId = requestAnimationFrame(analyzeFrame);
    }

    animId = requestAnimationFrame(analyzeFrame);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive]);

  // Countdown timer + physiological value simulation
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= TOTAL) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return TOTAL;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Navigate to results when done
  useEffect(() => {
    if (elapsed >= TOTAL) {
      // Clean up camera before navigating
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      navigate("check-result");
    }
  }, [elapsed, navigate]);

  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    showToast("检测已取消", "warning");
    goBack();
  };

  const pct = Math.round((elapsed / TOTAL) * 100);
  const progressColor = pct < 50 ? "low" : pct < 80 ? "mid" : "high";

  return (
    <div>
      <TopNav
        title="正在检测..."
        action={{ label: "✕ 取消", onClick: handleCancel }}
        showBack={false}
      />
      <div className="screen-container animate-in">
        {/* Camera preview with real video */}
        <div
          style={{
            background: "#111827",
            borderRadius: "16px",
            aspectRatio: "4/3",
            position: "relative",
            overflow: "hidden",
            marginBottom: "16px",
          }}
        >
          {/* Real camera video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: cameraActive ? "block" : "none",
            }}
          />
          {/* Hidden canvas for frame analysis */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Data source indicator */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              zIndex: 5,
            }}
          >
            <span
              style={{
                background: cameraActive ? "rgba(34,197,94,0.85)" : "rgba(251,146,60,0.85)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {cameraActive ? "📹 实时PPG分析" : "⚠️ 模拟模式"}
            </span>
            <span
              style={{
                background: cameraActive ? "rgba(34,197,94,0.85)" : "rgba(251,146,60,0.85)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {cameraActive ? "❤️ 心率: PPG实测" : "📊 模拟数据"}
            </span>
            <span
              style={{
                background: cameraActive ? "rgba(34,197,94,0.85)" : "rgba(251,146,60,0.85)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {cameraActive ? "🫁 血氧: 红/蓝比实测" : "🫁 血氧: 模拟"}
            </span>
          </div>

          {/* Face guide overlay — visible when camera is active */}
          {cameraActive && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 2,
              }}
              aria-label="请将面部置于框内"
            >
              {/* Outer dimming mask */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse 38% 52% at 50% 45%, transparent 55%, rgba(0,0,0,0.4) 100%)",
                }}
              />
              {/* Guide oval border */}
              <svg
                viewBox="0 0 200 260"
                style={{
                  width: "55%",
                  height: "68%",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <ellipse
                  cx="100" cy="130" rx="90" ry="120"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2.5"
                  strokeDasharray="10 6"
                />
                <line x1="50" y1="50" x2="80" y2="50" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="50" y1="50" x2="50" y2="80" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="150" y1="50" x2="120" y2="50" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="150" y1="50" x2="150" y2="80" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="50" y1="210" x2="80" y2="210" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="50" y1="210" x2="50" y2="180" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="150" y1="210" x2="120" y2="210" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                <line x1="150" y1="210" x2="150" y2="180" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <div
                style={{
                  position: "absolute",
                  bottom: "16%",
                  textAlign: "center",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                }}
              >
                🧑 请将面部置于框内
              </div>
            </div>
          )}

          {/* Fallback when no camera */}
          {!cameraActive && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <div style={{ textAlign: "center", padding: "20px" }}>
                <span
                  style={{ fontSize: "60px", display: "block", marginBottom: "8px" }}
                >
                  😐
                </span>
                <p style={{ fontSize: "13px" }}>请保持面部稳定</p>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                  （模拟模式）
                </p>
              </div>
            </div>
          )}

          {/* LIVE indicator */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 600,
              background: "rgba(0,0,0,0.5)",
              padding: "4px 10px",
              borderRadius: "20px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                background: "#ef4444",
                borderRadius: "50%",
              }}
              className="animate-pulse-dot"
            />{" "}
            LIVE
          </div>

          {/* Overlay metrics */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", gap: "24px", color: "#fff" }}>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                  data-testid="live-hr"
                >
                  {liveHr}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.9, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  心率 bpm
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                  data-testid="live-spo2"
                >
                  {liveSpo2}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.9, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  血氧 %
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                    color: "#f97316",
                  }}
                  data-testid="live-bp"
                >
                  {liveBp}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.9, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  血压 mmHg
                </div>
              </div>
            </div>
            {cameraActive && (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "#fff",
                  opacity: 0.8,
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                请保持面部稳定，正对摄像头
              </p>
            )}
          </div>
        </div>

        {/* Real-time PPG signal analysis */}
        {cameraActive && (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                📹 PPG信号分析
              </span>
              <div style={{ display: "flex", gap: "12px", fontSize: "11px" }}>
                <span style={{ color: "#6b7280" }}>
                  信号: <strong style={{ color: realSignal > 30 ? "#22c55e" : "#f59e0b", fontFamily: "var(--font-mono)" }}>{realSignal}%</strong>
                </span>
                <span style={{ color: "#6b7280" }}>
                  置信: <strong style={{ color: ppgResultRef.current.confidence > 50 ? "#22c55e" : ppgResultRef.current.confidence > 20 ? "#f59e0b" : "#ef4444", fontFamily: "var(--font-mono)" }}>{ppgResultRef.current.confidence}%</strong>
                </span>
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "#e5e7eb",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${realSignal}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: realSignal > 50 ? "#22c55e" : realSignal > 20 ? "#f59e0b" : "#ef4444",
                  transition: "width 200ms ease",
                }}
              />
            </div>
            <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
              绿色通道 → 去趋势 → 带通滤波(0.7-4Hz) → 自相关 → BPM
            </p>
          </div>
        )}

        {/* Progress */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            ⏱️ 检测进度
          </div>
          <ProgressBar value={pct} color={progressColor} label="检测进度" />
          <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
            剩余 {TOTAL - elapsed} 秒
          </p>
        </div>
      </div>
    </div>
  );
}
