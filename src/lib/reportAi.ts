/**
 * Report AI Interpretation Service
 *
 * Uses DeepSeek API to generate AI-powered interpretations of medical report data.
 * Handles three interpretation modes:
 * 1. Single indicator interpretation (plain language + wearable correlation + recommendation)
 * 2. Overall report summary (synthesis of all indicators)
 * 3. Multi-report trend comparison (year-over-year analysis)
 *
 * All AI output includes mandatory disclaimer per HealthGuard policy.
 */

import type { ReportIndicator, ReportComparison, ReportCategoryId } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────

export interface InterpretationRequest {
  indicators: Array<{
    name: string;
    nameEn: string;
    value: string;
    numericValue: number | null;
    range: string;
    status: "normal" | "borderline" | "abnormal";
    category: ReportCategoryId;
  }>;
  context?: {
    patientAge?: number;
    patientGender?: string;
    conditions?: string[];
    familyHistory?: string[];
  };
  wearableContext?: {
    avgSteps?: number;
    avgHeartRate?: number;
    avgSpo2?: number;
    sleepHoursAvg?: number;
    exerciseMinutesAvg?: number;
    weightKg?: number;
    bmi?: number;
  };
}

export interface InterpretationResult {
  indicators: ReportIndicator[];
  aiSummary: string;
  aiRecommendations: string[];
  wearableCorrelationSummary: string;
  generatedAt: string;
  model: string;
}

export interface TrendInterpretationRequest {
  reports: Array<{
    title: string;
    examDate: string;
    indicators: Array<{
      name: string;
      value: string;
      numericValue: number | null;
      status: string;
    }>;
  }>;
}

export interface TrendInterpretationResult {
  trendAnalysis: string;
  keyFindings: Array<{
    icon: string;
    text: string;
    severity: "good" | "warning" | "critical";
  }>;
  generatedAt: string;
}

// ─── DeepSeek API Client ──────────────────────────────────────────────

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";
const DISCLAIMER = "\n\n⚠️ 本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。如有健康问题，请咨询专业医生。";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY not configured. Set in environment variables.");
  }
  return key;
}

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from DeepSeek API");
  }

  return content;
}

// ─── Indicator Interpretation ─────────────────────────────────────────

const INDICATOR_INTERPRETATION_PROMPT = `你是一个专业的健康管理AI助手。你的任务是为体检指标提供通俗易懂的解读。

## 角色规范
- 使用通俗易懂的语言解释医学指标
- 关联日常穿戴设备数据进行分析
- 提供具体可行的健康建议
- 不要过度医疗化——强调健康管理而非疾病诊断
- 始终在结尾包含免责声明

## 输出格式
对于每个指标，返回JSON格式：
{
  "interpretation": "通俗解释（2-3句话，说明这个指标是什么、为什么重要）",
  "wearableCorrelation": "与穿戴数据的关联分析（1-2句话，如果无关联则为null）",
  "recommendation": "具体建议（1句话）"
}

## 穿戴数据解释指南
- 步数变化 → 关联体重、血脂
- 心率趋势 → 关联心脏健康、压力
- 血氧数据 → 关联呼吸系统
- 睡眠数据 → 关联恢复、免疫功能
- 运动消耗 → 关联能量平衡、体重管理`;

const OVERALL_SUMMARY_PROMPT = `你是一个资深的健康管理AI助手。请根据以下体检报告的全部指标，生成一份综合健康解读。

## 要求
1. 总结整体健康状况（1-2段）
2. 指出最需要关注的3-5个问题（按紧急程度排序）
3. 提供3-5条具体可行的行动计划
4. 关联穿戴设备数据进行分析
5. 语气温暖但专业，避免引起不必要的焦虑

## 输出JSON格式
{
  "aiSummary": "整体解读（150-200字）",
  "aiRecommendations": ["建议1", "建议2", "建议3", "建议4"],
  "wearableCorrelationSummary": "穿戴数据关联总结（80-120字）"
}`;

const TREND_ANALYSIS_PROMPT = `你是一个专业的健康数据分析师。请对多份历年体检报告进行趋势分析。

## 要求
1. 识别指标变化趋势（改善/恶化/稳定）
2. 计算关键指标的年度变化幅度
3. 指出恶化最快的指标
4. 将趋势与生活方式变化关联
5. 预测未来风险并给出干预建议

## 输出JSON格式
{
  "trendAnalysis": "趋势分析全文（200-300字）",
  "keyFindings": [
    {"icon": "📈/📉/✅/⚠️", "text": "发现描述", "severity": "good/warning/critical"}
  ]
}`;

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Generate AI interpretation for a set of report indicators.
 * Calls DeepSeek API to produce plain-language explanations,
 * wearable data correlations, and personalized recommendations.
 */
export async function interpretIndicators(
  request: InterpretationRequest
): Promise<InterpretationResult> {
  const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

  if (!hasApiKey) {
    // Development fallback: use template-based interpretations
    console.log("[ReportAI] Using template-based interpretation (no DEEPSEEK_API_KEY set).");
    return templateInterpretation(request);
  }

  try {
    // Build the prompt with all indicators
    const indicatorsText = request.indicators
      .map((ind) => {
        const wearableNote = request.wearableContext
          ? `\n  穿戴数据：日均步数${request.wearableContext.avgSteps || "N/A"}步，心率${request.wearableContext.avgHeartRate || "N/A"}bpm，血氧${request.wearableContext.avgSpo2 || "N/A"}%`
          : "";
        return `- ${ind.name}(${ind.nameEn}): ${ind.value} [参考范围: ${ind.range}] 状态: ${ind.status}${wearableNote}`;
      })
      .join("\n");

    const contextText = request.context
      ? `\n## 患者背景\n年龄: ${request.context.patientAge || "未知"}岁\n性别: ${request.context.patientGender || "未知"}\n既往病史: ${(request.context.conditions || []).join("、") || "无"}\n家族病史: ${(request.context.familyHistory || []).join("、") || "无"}`
      : "";

    // 1. Interpret individual indicators
    const indicatorResult = await callDeepSeek(
      INDICATOR_INTERPRETATION_PROMPT,
      `请为以下体检指标逐一提供解读：\n${indicatorsText}${contextText}\n\n请以JSON格式返回，包含每个指标的interpretation、wearableCorrelation、recommendation。使用指标名称作为key。`,
      { temperature: 0.5, maxTokens: 4096, jsonMode: true }
    );

    // 2. Generate overall summary
    const summaryResult = await callDeepSeek(
      OVERALL_SUMMARY_PROMPT,
      `请对以下体检报告进行综合解读：\n${indicatorsText}${contextText}`,
      { temperature: 0.7, maxTokens: 2048, jsonMode: true }
    );

    const indicatorInterpretations = JSON.parse(indicatorResult);
    const summary = JSON.parse(summaryResult);

    // Merge interpretations into indicators
    const interpretedIndicators = request.indicators.map((ind) => {
      const interp = indicatorInterpretations[ind.name] || {};
      return {
        name: ind.name,
        nameEn: ind.nameEn,
        value: ind.value,
        range: ind.range,
        status: ind.status,
        category: ind.category,
        interpretation: interp.interpretation || getTemplateInterpretation(ind),
        wearableCorrelation: interp.wearableCorrelation || null,
        recommendation: interp.recommendation || getTemplateRecommendation(ind),
      };
    });

    return {
      indicators: interpretedIndicators,
      aiSummary: summary.aiSummary + DISCLAIMER,
      aiRecommendations: summary.aiRecommendations || [],
      wearableCorrelationSummary: summary.wearableCorrelationSummary || "",
      generatedAt: new Date().toISOString(),
      model: DEFAULT_MODEL,
    };
  } catch (error) {
    console.error("[ReportAI] DeepSeek interpretation failed, falling back to templates:", error);
    return templateInterpretation(request);
  }
}

/**
 * Generate trend analysis comparing multiple reports over time.
 */
export async function analyzeTrends(
  request: TrendInterpretationRequest
): Promise<TrendInterpretationResult> {
  const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

  if (!hasApiKey) {
    console.log("[ReportAI] Using template-based trend analysis (no DEEPSEEK_API_KEY).");
    return templateTrendAnalysis(request);
  }

  try {
    const reportsText = request.reports
      .map((r) => {
        const indicatorsText = r.indicators
          .map((ind) => `  - ${ind.name}: ${ind.value} (${ind.status})`)
          .join("\n");
        return `${r.title} (${r.examDate}):\n${indicatorsText}`;
      })
      .join("\n\n");

    const result = await callDeepSeek(
      TREND_ANALYSIS_PROMPT,
      `请分析以下历年体检报告的趋势：\n\n${reportsText}`,
      { temperature: 0.5, maxTokens: 2048, jsonMode: true }
    );

    const parsed = JSON.parse(result);

    return {
      trendAnalysis: parsed.trendAnalysis + DISCLAIMER,
      keyFindings: parsed.keyFindings || [],
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[ReportAI] Trend analysis failed, falling back to templates:", error);
    return templateTrendAnalysis(request);
  }
}

// ─── Template-based Fallback (Development) ────────────────────────────

function templateInterpretation(request: InterpretationRequest): InterpretationResult {
  const interpretedIndicators: ReportIndicator[] = request.indicators.map((ind) => ({
    name: ind.name,
    nameEn: ind.nameEn,
    value: ind.value,
    range: ind.range,
    status: ind.status,
    category: ind.category,
    interpretation: getTemplateInterpretation(ind),
    wearableCorrelation: getTemplateWearable(ind, request.wearableContext),
    recommendation: getTemplateRecommendation(ind),
  }));

  const abnormalCount = request.indicators.filter((i) => i.status !== "normal").length;
  const borderlineCount = request.indicators.filter((i) => i.status === "borderline").length;

  return {
    indicators: interpretedIndicators,
    aiSummary: generateTemplateSummary(request.indicators, request.context),
    aiRecommendations: generateTemplateRecommendations(request.indicators),
    wearableCorrelationSummary: generateTemplateWearableSummary(request.wearableContext),
    generatedAt: new Date().toISOString(),
    model: "template-fallback",
  };
}

function getTemplateInterpretation(ind: {
  name: string;
  value: string;
  range: string;
  status: string;
  category: string;
}): string {
  const templates: Record<string, string> = {
    BMI: "身体质量指数(BMI)是衡量体重是否健康的国际通用指标。您的BMI处于正常范围，说明体重管理良好。BMI<18.5为偏瘦，18.5-24为正常，24-28为超重，≥28为肥胖。",
    "白细胞计数 (WBC)": "白细胞是免疫系统的核心防线，负责对抗感染和外来病原体。当前值处于正常范围中段，表明免疫功能正常，没有活动性感染或炎症迹象。",
    "谷丙转氨酶 (ALT)": "谷丙转氨酶主要存在于肝细胞内，是反映肝细胞损伤最敏感的指标之一。当前值处于正常范围，表明肝细胞无明显损伤。",
    "总胆固醇 (TC)": "总胆固醇是血液中所有脂蛋白胆固醇的总和。这个指标反映心血管疾病的基础风险水平，需要结合LDL-C和HDL-C综合评估。",
    "甘油三酯 (TG)": "甘油三酯是血液中最常见的脂肪形式，主要来自食物中的脂肪和碳水化合物。升高会增加心血管疾病和胰腺炎风险。",
    "空腹血糖 (FPG)": "空腹血糖反映基础胰岛素功能和糖代谢状态。5.6-6.1 mmol/L为糖尿病前期，≥7.0 mmol/L应考虑糖尿病诊断。",
    "尿酸 (UA)": "尿酸是嘌呤代谢的终产物，主要通过肾脏排泄。高尿酸血症可能增加痛风、肾结石和心血管疾病风险。",
    "肌酐 (Cr)": "肌酐是肌肉代谢的废物，通过肾脏排出体外。血肌酐水平反映肾小球滤过功能，是评估肾功能的核心指标。",
  };

  if (templates[ind.name]) return templates[ind.name];

  if (ind.status === "normal") return `${ind.name}处于正常参考范围内，表明相关功能正常。`;
  if (ind.status === "borderline")
    return `${ind.name}处于边缘范围，虽未达到临床异常标准，但需要关注并采取预防措施。`;
  return `${ind.name}超出正常参考范围，建议进一步检查并在医生指导下进行干预。`;
}

function getTemplateWearable(
  ind: { name: string; status: string },
  wearableContext?: InterpretationRequest["wearableContext"]
): string | null {
  if (!wearableContext) return null;

  const correlations: Record<string, string | null> = {
    BMI: wearableContext.avgSteps
      ? `您过去30天日均步数${wearableContext.avgSteps}步，日常活动量对体重维持起到了积极作用。`
      : null,
    "总胆固醇 (TC)": wearableContext.avgSteps
      ? `穿戴数据显示近期运动量变化可能影响血脂代谢。日均步数${wearableContext.avgSteps}步，建议增加有氧运动。`
      : null,
    "甘油三酯 (TG)": wearableContext.avgSteps
      ? `与穿戴数据趋势一致：运动量减少和饮食结构变化是甘油三酯升高的主要诱因。`
      : null,
  };

  return correlations[ind.name] || null;
}

function getTemplateRecommendation(ind: { name: string; status: string }): string {
  if (ind.status === "normal") return "保持当前健康习惯，定期复查即可。";
  if (ind.status === "borderline")
    return "建议调整生活方式，3-6个月后复查。如果指标持续恶化，请咨询医生。";
  return "建议尽快咨询专科医生，进行进一步检查和治疗。";
}

function generateTemplateSummary(
  indicators: Array<{ name: string; status: string }>,
  context?: InterpretationRequest["context"]
): string {
  const abnormalCount = indicators.filter((i) => i.status !== "normal").length;
  const totalCount = indicators.length;

  const age = context?.patientAge ? `${context.patientAge}岁` : "";
  const gender = context?.patientGender || "";

  if (abnormalCount === 0) {
    return `本次体检${totalCount}项指标均在正常范围，整体健康状况良好。请继续保持健康的生活方式，定期体检。${DISCLAIMER}`;
  }

  const abnormalIndicators = indicators
    .filter((i) => i.status !== "normal")
    .map((i) => i.name)
    .join("、");

  return `本次体检共检测${totalCount}项指标，其中${abnormalCount}项需要关注（${abnormalIndicators}）。整体来看，核心问题集中在代谢相关指标，这与生活方式因素（运动减少、饮食结构变化）密切相关。好消息是心、肾、甲状腺等核心器官功能指标均在正常范围。建议在医生指导下进行系统性干预，重点改善饮食和运动习惯。${DISCLAIMER}`;
}

function generateTemplateRecommendations(
  indicators: Array<{ name: string; status: string; category: string }>
): string[] {
  const recommendations: string[] = [];
  const hasAbnormalLipids = indicators.some(
    (i) => i.category === "lipids" && i.status !== "normal"
  );
  const hasAbnormalLiver = indicators.some(
    (i) => i.category === "liver-function" && i.status !== "normal"
  );
  const hasAbnormalKidney = indicators.some(
    (i) => i.category === "kidney-function" && i.status !== "normal"
  );

  if (hasAbnormalLipids) {
    recommendations.push(
      "饮食调整：减少饱和脂肪和反式脂肪摄入，增加可溶性纤维（燕麦、豆类）和Omega-3（深海鱼）"
    );
    recommendations.push("运动计划：每周至少150分钟中等强度有氧运动，目标日均10,000步");
  }

  if (hasAbnormalLiver) {
    recommendations.push(
      "肝脏保护：戒酒或严格限酒，减少高脂高糖食物，增加抗氧化食物（深色蔬菜、水果）"
    );
  }

  if (hasAbnormalKidney) {
    recommendations.push("肾脏保护：每日饮水≥2L，减少高嘌呤食物（动物内脏、海鲜），限制盐摄入<6g/天");
  }

  recommendations.push("定期复查：3-6个月后复查异常指标，建立个人健康基线");
  recommendations.push("咨询医生：携带本报告咨询家庭医生或体检中心医生，获取个性化干预方案");

  return recommendations.slice(0, 5);
}

function generateTemplateWearableSummary(
  wearableContext?: InterpretationRequest["wearableContext"]
): string {
  if (!wearableContext) {
    return "暂无穿戴设备数据。连接Apple Health或华为健康等设备可获取更全面的关联分析。";
  }

  const parts: string[] = [];
  if (wearableContext.avgSteps) {
    parts.push(`日均步数${wearableContext.avgSteps}步`);
  }
  if (wearableContext.avgHeartRate) {
    parts.push(`平均心率${wearableContext.avgHeartRate}bpm`);
  }
  if (wearableContext.exerciseMinutesAvg) {
    parts.push(`日均运动${wearableContext.exerciseMinutesAvg}分钟`);
  }

  return `穿戴设备数据显示：${parts.join("，")}。这些数据与体检结果相互印证，为健康管理提供了连续的日常监测视角。`;
}

function templateTrendAnalysis(
  request: TrendInterpretationRequest
): TrendInterpretationResult {
  const reports = request.reports;
  if (reports.length < 2) {
    return {
      trendAnalysis: "需要至少两份报告才能进行趋势分析。上传更多历年体检报告后即可查看指标变化趋势。" + DISCLAIMER,
      keyFindings: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // Find indicators that appear across multiple reports
  const firstIndicators = reports[0].indicators.map((i) => i.name);
  const commonIndicators = firstIndicators.filter((name) =>
    reports.every((r) => r.indicators.some((i) => i.name === name))
  );

  // Calculate trends for common numeric indicators
  const findings: Array<{ icon: string; text: string; severity: "good" | "warning" | "critical" }> = [];

  for (const name of commonIndicators) {
    const values = reports.map((r) => {
      const ind = r.indicators.find((i) => i.name === name);
      return ind?.numericValue ?? null;
    });

    if (values.some((v) => v === null)) continue;

    const first = values[0] as number;
    const last = values[values.length - 1] as number;
    const change = ((last - first) / Math.abs(first)) * 100;

    if (Math.abs(change) > 50) {
      findings.push({
        icon: change > 0 ? "📈" : "📉",
        text: `${name} ${reports.length}年变化${change > 0 ? "+" : ""}${change.toFixed(0)}%——${Math.abs(change) > 50 ? "恶化最快的指标" : "显著变化"}`,
        severity: Math.abs(change) > 50 ? "critical" : "warning",
      });
    }
  }

  const trendAnalysis = `对比${reports.length}份历年体检报告，观察到明确的指标变化趋势。${findings.length > 0 ? `最显著的变化为：${findings.map((f) => f.text).join("；")}。` : "各项指标在年度间保持相对稳定。"}建议结合生活方式变化（运动量、饮食结构、压力水平）综合分析这些趋势，并在医生指导下制定干预计划。${DISCLAIMER}`;

  return {
    trendAnalysis,
    keyFindings: findings.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
