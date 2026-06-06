"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockReportRecords } from "@/data/mockData";
import { useToast } from "@/components/ui/Toast";

const ACCEPTED_TYPES = "image/jpeg,image/png,application/pdf";

export function ReportUploadScreen() {
  const { navigate } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [consents, setConsents] = useState({
    ocr: false,
    ai: false,
    storage: false,
    wearable: false,
  });
  const [showConsent, setShowConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const allConsented = Object.values(consents).every(Boolean);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUpload = () => {
    if (!allConsented) {
      setShowConsent(true);
      return;
    }
    triggerFileInput();
  };

  const acceptAll = () => {
    setConsents({ ocr: true, ai: true, storage: true, wearable: true });
    setShowConsent(false);
    triggerFileInput();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type client-side
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      showToast("不支持的文件格式。请上传 JPG、PNG 或 PDF 文件。", "error");
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      showToast("文件过大，最大支持 20MB。", "error");
      return;
    }

    setUploading(true);

    try {
      // Attempt to upload via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("consent_ocr", String(consents.ocr || allConsented));
      formData.append("consent_ai", String(consents.ai || allConsented));
      formData.append("consent_storage", String(consents.storage || allConsented));
      formData.append("consent_wearable", String(consents.wearable));

      const response = await fetch("/api/reports/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`OCR识别完成，准确率 ${data.data.ocr.accuracy.toFixed(1)}%`, "success");
        // Navigate to processing then result
        navigate("report-processing");
        // The processing screen will auto-navigate to results
      } else {
        // API returned error — fall back to mock flow for development
        console.warn("[ReportUpload] API upload failed, using mock flow");
        navigate("report-processing");
      }
    } catch {
      // Network error — fall back to mock flow for development
      console.warn("[ReportUpload] API unavailable, using mock flow");
      navigate("report-processing");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <TopNav title="体检报告解读" showBack />
      <div className="screen-container animate-in">
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "24px" }}>
          <StepDot num={1} active />
          <StepLine />
          <StepDot num={2} />
          <StepLine />
          <StepDot num={3} />
        </div>

        {/* Upload zone */}
        <div
          onClick={uploading ? undefined : handleUpload}
          tabIndex={0}
          role="button"
          aria-label="点击上传体检报告"
          onKeyDown={(e) => { if (e.key === "Enter") handleUpload(); }}
          style={{
            border: "2px dashed #d1d5db", borderRadius: "16px", padding: "32px 20px",
            textAlign: "center", cursor: uploading ? "wait" : "pointer",
            background: uploading ? "#f3f4f6" : "#fafafa", marginBottom: "16px",
            transition: "all 150ms ease", opacity: uploading ? 0.7 : 1,
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>
            {uploading ? "⏳" : "📄"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
            {uploading ? "正在上传..." : "点击上传体检报告"}
          </div>
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>
            支持 JPG、PNG、PDF 格式 · 最多10页 · 最大20MB
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelected}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {/* Upload methods */}
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280", marginBottom: "10px" }}>
          选择上传方式
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {[
            { icon: "📸", label: "拍照上传" },
            { icon: "🖼️", label: "相册选择" },
            { icon: "📁", label: "PDF导入" },
          ].map((m) => (
            <Button key={m.label} variant="secondary" size="sm" onClick={handleUpload}>
              <span style={{ display: "block", fontSize: "28px", marginBottom: "6px" }}>{m.icon}</span>
              {m.label}
            </Button>
          ))}
        </div>

        {/* PIPL Consent Box */}
        {showConsent && (
          <div style={{
            background: "#fff", borderRadius: "12px", padding: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", marginBottom: "16px",
            border: "2px solid #3b82f6", animation: "fadeSlideIn 200ms ease",
          }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
              🔒 隐私保护授权（PIPL合规）
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 }}>
              根据《中华人民共和国个人信息保护法》，我们需要您的明确同意来处理体检报告数据：
            </p>
            {[
              { key: "ocr" as const, label: "OCR文字识别", desc: "使用光学字符识别技术提取报告中的体检指标数据。原始图片在识别完成后自动删除。" },
              { key: "ai" as const, label: "AI智能解读", desc: "使用AI大模型分析您的体检数据，生成通俗解释和健康建议。AI分析结果仅供参考。" },
              { key: "storage" as const, label: "数据加密存储", desc: "识别结果加密存储于中国境内服务器。您可随时在隐私设置中查看、导出或删除数据。" },
              { key: "wearable" as const, label: "穿戴数据关联", desc: "将体检指标与您的日常穿戴设备数据（心率、步数、睡眠等）进行关联分析。" },
            ].map((item) => (
              <label key={item.key} style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                padding: "10px 0", borderBottom: "1px solid #f3f4f6",
                cursor: "pointer", fontSize: "13px",
              }}>
                <input
                  type="checkbox"
                  checked={consents[item.key]}
                  onChange={(e) => setConsents((c) => ({ ...c, [item.key]: e.target.checked }))}
                  style={{ marginTop: "2px", accentColor: "#3b82f6" }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{item.label}</div>
                  <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{item.desc}</div>
                </div>
              </label>
            ))}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <Button variant="primary" size="sm" onClick={acceptAll} fullWidth>
                ✅ 全部同意并继续
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowConsent(false)}>
                取消
              </Button>
            </div>
          </div>
        )}

        {/* Privacy commitment summary (always visible) */}
        <div style={{
          background: "#f0f9ff", borderRadius: "8px", padding: "10px 14px",
          fontSize: "12px", color: "#1e40af", marginBottom: "16px", lineHeight: 1.6,
        }}>
          <strong>🔒 隐私保护承诺：</strong>
          体检报告经OCR识别后，仅用于AI健康分析；
          原始图片在识别完成后自动删除；
          识别结果加密存储于中国境内服务器，您可随时删除。
        </div>

        {/* Historical reports */}
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280", marginBottom: "10px" }}>
          历史报告
        </div>
        {mockReportRecords.map((record, i) => (
          <Card key={record.id} onClick={() => navigate("report-result")}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>📋</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                  {record.title}
                  {i === 0 && (
                    <span style={{
                      fontSize: "10px", background: "#eff6ff", color: "#3b82f6",
                      padding: "2px 6px", borderRadius: "4px", marginLeft: "6px",
                    }}>
                      最新
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                  上传于 {record.uploadDate} · 已解读 · OCR准确率 {record.ocrAccuracy}%
                </div>
              </div>
              <span style={{ color: "#d1d5db" }}>›</span>
            </div>
          </Card>
        ))}

        {/* Compare button */}
        {mockReportRecords.length >= 2 && (
          <div style={{ marginBottom: "16px" }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("report-compare")}>
              📊 对比历年报告 →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ num, active = false }: { num: number; active?: boolean }) {
  return (
    <div style={{
      width: "32px", height: "32px", borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "14px", fontWeight: 600,
      background: active ? "#3b82f6" : "#e5e7eb",
      color: active ? "#fff" : "#9ca3af",
      transition: "all 200ms ease",
    }}>{num}</div>
  );
}
function StepLine() {
  return <div style={{ width: "40px", height: "2px", background: "#e5e7eb" }} />;
}
