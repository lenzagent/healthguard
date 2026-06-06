"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

export function CameraPermissionScreen() {
  const { setCameraPermission, switchTab } = useApp();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handlePermission = useCallback(async () => {
    setLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setCameraPermission(true);
      showToast("✅ 摄像头已连接", "success");

      // Short delay so user sees their face, then proceed
      setTimeout(() => {
        switchTab("home");
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof DOMException
          ? err.name === "NotAllowedError"
            ? "摄像头权限被拒绝，请在浏览器设置中允许摄像头访问"
            : err.name === "NotFoundError"
              ? "未检测到摄像头设备"
              : `摄像头错误: ${err.message}`
          : "无法访问摄像头";
      setCameraError(message);
      showToast("❌ " + message, "danger");
    } finally {
      setLoading(false);
    }
  }, [setCameraPermission, switchTab, showToast]);

  return (
    <div className="screen-container animate-in">
      <div style={{ textAlign: "center", padding: "40px 20px 20px" }}>
        <div style={{ fontSize: "72px", marginBottom: "20px" }}>📹</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
          需要摄像头权限
        </h1>
        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: 1.6 }}>
          我们需要使用您的电脑摄像头
          <br />
          进行面部视频分析以获取健康指标
        </p>
      </div>

      {/* Camera preview area */}
      <div
        style={{
          background: "#000",
          borderRadius: "16px",
          aspectRatio: "4/3",
          position: "relative",
          overflow: "hidden",
          marginBottom: "16px",
        }}
        aria-label="摄像头预览区域"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: cameraReady ? "block" : "none",
          }}
        />
        {/* Face guide overlay — visible when camera is active */}
        {cameraReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
            aria-label="请将面部置于框内"
          >
            {/* Outer dimming mask */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse 38% 52% at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)",
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
                cx="100"
                cy="130"
                rx="90"
                ry="120"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="2.5"
                strokeDasharray="10 6"
              />
              {/* Corner brackets */}
              <line x1="50" y1="50" x2="80" y2="50" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="50" x2="50" y2="80" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="150" y1="50" x2="120" y2="50" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="150" y1="50" x2="150" y2="80" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="210" x2="80" y2="210" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="210" x2="50" y2="180" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="150" y1="210" x2="120" y2="210" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <line x1="150" y1="210" x2="150" y2="180" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
            </svg>
            {/* Guide text */}
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
        {!cameraReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
            }}
          >
            <span
              style={{ fontSize: "80px", display: "block", marginBottom: "12px" }}
            >
              {cameraError ? "⚠️" : "📷"}
            </span>
            <span style={{ fontSize: "14px", padding: "0 20px", textAlign: "center" }}>
              {cameraError || "摄像头预览将在此显示"}
            </span>
          </div>
        )}
      </div>

      {cameraError && (
        <div
          style={{
            background: "#fee2e2",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#b91c1c",
          }}
          role="alert"
        >
          {cameraError}
        </div>
      )}

      <Card>
        <div style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.6 }}>
          <p>✅ 分析仅在本地进行</p>
          <p>✅ 不录制或上传视频</p>
          <p>✅ 您可随时在设置中撤销权限</p>
        </div>
      </Card>

      <Button
        variant="accent"
        onClick={handlePermission}
        disabled={loading}
      >
        {loading ? "⏳ 正在请求权限..." : cameraError ? "🔄 重试" : "🔓 允许摄像头访问"}
      </Button>
      <p
        style={{
          textAlign: "center",
          marginTop: "8px",
          fontSize: "12px",
          color: "#9ca3af",
        }}
      >
        浏览器将弹出摄像头权限请求
      </p>
    </div>
  );
}
