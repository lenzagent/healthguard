import type {
  HealthMetric,
  TrendData,
  HealthScore,
  Alert,
  DeviceBrand,
  ReportIndicator,
  ReportRecord,
  ReportCategory,
  ReportComparison,
  ConsentRecord,
  UserProfile,
  SyncDataType,
  SyncDataTypeInfo,
  DailySummary,
  SummaryPreferences,
  DailyHealthData,
} from "@/lib/types";

export const SYNC_DATA_TYPES: SyncDataTypeInfo[] = [
  { key: "heart_rate", label: "心率", icon: "❤️", unit: "bpm", description: "静息心率、运动心率" },
  { key: "blood_pressure", label: "血压", icon: "🩸", unit: "mmHg", description: "收缩压/舒张压" },
  { key: "spo2", label: "血氧", icon: "🫁", unit: "%", description: "血氧饱和度" },
  { key: "steps", label: "步数", icon: "🚶", unit: "步", description: "每日步数与活动量" },
  { key: "sleep", label: "睡眠", icon: "😴", unit: "小时", description: "睡眠时长与质量" },
  { key: "weight", label: "体重", icon: "⚖️", unit: "kg", description: "体重与BMI" },
  { key: "blood_glucose", label: "血糖", icon: "🩸", unit: "mmol/L", description: "空腹/餐后血糖" },
  { key: "temperature", label: "体温", icon: "🌡️", unit: "°C", description: "基础体温" },
  { key: "ecg", label: "心电图", icon: "💓", unit: "mV", description: "单导联心电图" },
];

const BASE_DATA_TYPES: SyncDataType[] = ["heart_rate", "blood_pressure", "spo2", "steps", "sleep"];

export const mockUser: UserProfile = {
  name: "小明",
  age: 30,
  gender: "男",
  height: 175,
  weight: 73,
  conditions: ["轻度脂肪肝"],
  familyHistory: ["高血压", "糖尿病"],
};

export const mockMetrics: HealthMetric[] = [
  {
    type: "heart-rate",
    icon: "❤️",
    label: "心率",
    value: 72,
    unit: "bpm",
    status: "normal",
    color: "#ef4444",
  },
  {
    type: "blood-pressure",
    icon: "🩸",
    label: "血压",
    value: "120/80",
    unit: "mmHg",
    status: "normal",
    color: "#3b82f6",
  },
  {
    type: "spo2",
    icon: "🫁",
    label: "血氧",
    value: 98,
    unit: "% SpO₂",
    status: "normal",
    color: "#06b6d4",
  },
];

export const mockHealthScore: HealthScore = {
  overall: 76,
  change: 2,
  factors: [
    { name: "😴 睡眠质量", score: 18, maxScore: 25, color: "#3b82f6" },
    { name: "❤️ 心率健康", score: 18, maxScore: 20, color: "#22c55e" },
    { name: "🚶 活动水平", score: 12, maxScore: 20, color: "#f59e0b" },
    { name: "⚖️ 体重管理", score: 12, maxScore: 15, color: "#3b82f6" },
    { name: "🔄 恢复状态", score: 6, maxScore: 10, color: "#f59e0b" },
    { name: "🩸 血液指标", score: 10, maxScore: 10, color: "#9ca3af" },
  ],
};

export const mockTrends: Record<string, TrendData> = {
  "heart-rate": {
    metric: "heart-rate",
    title: "❤️ 心率",
    values: [
      { day: "一", value: 68 },
      { day: "二", value: 70 },
      { day: "三", value: 75 },
      { day: "四", value: 72 },
      { day: "五", value: 108 },
      { day: "六", value: 71 },
      { day: "日", value: 73 },
    ],
    unit: "bpm",
    color: "#ef4444",
    avg: 72,
    min: 68,
    max: 108,
  },
  "blood-pressure": {
    metric: "blood-pressure",
    title: "🩸 血压",
    values: [
      { day: "一", value: 118 },
      { day: "二", value: 120 },
      { day: "三", value: 122 },
      { day: "四", value: 120 },
      { day: "五", value: 135 },
      { day: "六", value: 119 },
      { day: "日", value: 120 },
    ],
    unit: "mmHg",
    color: "#3b82f6",
    avg: 120,
    min: 118,
    max: 135,
  },
  spo2: {
    metric: "spo2",
    title: "🫁 血氧",
    values: [
      { day: "一", value: 97 },
      { day: "二", value: 98 },
      { day: "三", value: 97 },
      { day: "四", value: 98 },
      { day: "五", value: 96 },
      { day: "六", value: 99 },
      { day: "日", value: 98 },
    ],
    unit: "%",
    color: "#06b6d4",
    avg: 98,
    min: 96,
    max: 99,
  },
  stress: {
    metric: "stress",
    title: "🧠 压力",
    values: [
      { day: "一", value: 35 },
      { day: "二", value: 40 },
      { day: "三", value: 45 },
      { day: "四", value: 45 },
      { day: "五", value: 60 },
      { day: "六", value: 38 },
      { day: "日", value: 45 },
    ],
    unit: "%",
    color: "#f59e0b",
    avg: 44,
    min: 35,
    max: 60,
  },
};

export const mockAlerts: Alert[] = [
  {
    id: "alert-1",
    level: "red",
    title: "🔴 心率异常偏高",
    description:
      "今日静息心率 108 bpm，超出正常范围（60-100 bpm）。可能与睡眠不足（昨夜仅睡5h32min）有关。",
    time: "今天 09:15",
    source: "Apple Watch",
  },
  {
    id: "alert-2",
    level: "yellow",
    title: "🟡 睡眠质量下降趋势",
    description:
      "连续3天深睡时长低于45分钟（正常≥60分钟）。本周平均睡眠评分较上周下降8%。",
    time: "6月3日 07:30",
    source: "趋势检测",
  },
  {
    id: "alert-3",
    level: "green",
    title: "🟢 血压恢复正常",
    description:
      "上周血压偏高（135/88）已恢复至正常水平（118/76）。继续保持健康的作息和饮食习惯。",
    time: "6月2日 08:00",
    source: "自动解除",
  },
];

export const mockDevices: DeviceBrand[] = [
  {
    id: "apple",
    name: "Apple Health",
    icon: "🍎",
    connected: true,
    supportedDataTypes: ["heart_rate", "blood_pressure", "spo2", "steps", "sleep", "weight", "blood_glucose", "temperature", "ecg"],
    syncState: {
      lastSyncAt: "今天 09:30",
      status: "success",
      progress: 100,
      errorMessage: null,
      syncedDays: 30,
      totalDays: 30,
      enabledDataTypes: ["heart_rate", "spo2", "steps", "sleep", "weight"],
    },
  },
  {
    id: "huawei",
    name: "华为运动健康",
    icon: "⌚",
    connected: true,
    supportedDataTypes: ["heart_rate", "blood_pressure", "spo2", "steps", "sleep", "weight", "temperature"],
    syncState: {
      lastSyncAt: "今天 08:15",
      status: "success",
      progress: 100,
      errorMessage: null,
      syncedDays: 30,
      totalDays: 30,
      enabledDataTypes: ["heart_rate", "spo2", "steps", "sleep"],
    },
  },
  {
    id: "xiaomi",
    name: "小米健康",
    icon: "📱",
    connected: false,
    supportedDataTypes: ["heart_rate", "spo2", "steps", "sleep", "weight"],
    syncState: {
      lastSyncAt: null,
      status: "idle",
      progress: 0,
      errorMessage: null,
      syncedDays: 0,
      totalDays: 30,
      enabledDataTypes: ["heart_rate", "steps", "sleep"],
    },
  },
  {
    id: "oppo",
    name: "OPPO健康",
    icon: "💚",
    connected: false,
    supportedDataTypes: ["heart_rate", "spo2", "steps", "sleep"],
    syncState: {
      lastSyncAt: null,
      status: "idle",
      progress: 0,
      errorMessage: null,
      syncedDays: 0,
      totalDays: 30,
      enabledDataTypes: ["heart_rate", "steps", "sleep"],
    },
  },
  {
    id: "vivo",
    name: "vivo健康",
    icon: "🔵",
    connected: false,
    supportedDataTypes: ["heart_rate", "spo2", "steps", "sleep"],
    syncState: {
      lastSyncAt: null,
      status: "idle",
      progress: 0,
      errorMessage: null,
      syncedDays: 0,
      totalDays: 30,
      enabledDataTypes: ["heart_rate", "steps", "sleep"],
    },
  },
  {
    id: "google",
    name: "Google Fit",
    icon: "🏃",
    connected: false,
    supportedDataTypes: ["heart_rate", "blood_pressure", "spo2", "steps", "sleep", "weight", "blood_glucose"],
    syncState: {
      lastSyncAt: null,
      status: "idle",
      progress: 0,
      errorMessage: null,
      syncedDays: 0,
      totalDays: 30,
      enabledDataTypes: ["heart_rate", "steps", "sleep", "weight"],
    },
  },
];

// ── S1: Report Categories ──────────────────────────────────

export const mockReportCategories: ReportCategory[] = [
  { id: "blood-routine", name: "血常规", icon: "🩸", description: "白细胞、红细胞、血小板等血液细胞分析" },
  { id: "liver-function", name: "肝功能", icon: "🫁", description: "转氨酶、胆红素等肝脏代谢指标" },
  { id: "kidney-function", name: "肾功能", icon: "🫘", description: "肌酐、尿素氮等肾脏滤过功能指标" },
  { id: "lipids", name: "血脂", icon: "🫀", description: "胆固醇、甘油三酯等血脂代谢指标" },
  { id: "glucose", name: "血糖", icon: "🍬", description: "空腹血糖、糖化血红蛋白等糖代谢指标" },
  { id: "thyroid", name: "甲状腺功能", icon: "🦋", description: "TSH、T3、T4等甲状腺激素水平" },
  { id: "urinalysis", name: "尿常规", icon: "🧪", description: "尿液pH、蛋白、糖等泌尿系统指标" },
  { id: "tumor-markers", name: "肿瘤标志物", icon: "🔬", description: "AFP、CEA等肿瘤筛查指标" },
  { id: "hepatitis-b", name: "乙肝两对半", icon: "🦠", description: "乙肝表面抗原、抗体等五项" },
  { id: "electrolytes", name: "电解质", icon: "⚡", description: "钾、钠、氯、钙等电解质平衡" },
  { id: "cardiac", name: "心肌酶谱", icon: "💓", description: "肌酸激酶、乳酸脱氢酶等心肌指标" },
  { id: "general", name: "一般检查", icon: "📏", description: "身高、体重、BMI、血压、心率等基础指标" },
  { id: "imaging", name: "影像学", icon: "📷", description: "胸片、B超等影像学检查发现" },
];

// ── S1: Comprehensive Report Indicators (99% coverage) ─────

export const mockReportIndicators: ReportIndicator[] = [
  // ── 一般检查 ─────────────────────────────────
  { name: "BMI", nameEn: "BMI", value: "23.8", range: "正常 18.5-24.0", status: "normal", category: "general",
    interpretation: "身体质量指数(BMI)是衡量体重是否健康的国际通用指标。您的BMI处于正常范围，说明体重管理良好。作为参考，BMI<18.5为偏瘦，18.5-24为正常，24-28为超重，≥28为肥胖。",
    wearableCorrelation: "您的Apple Watch数据显示过去30天日均步数8,234步，日均消耗2,156大卡，与当前BMI水平一致，说明您的日常活动量对体重维持起到了积极作用。",
    recommendation: "保持当前体重管理习惯，继续维持每周≥150分钟中等强度运动。" },
  { name: "心率", nameEn: "Heart Rate", value: "72 bpm", range: "正常 60-100 bpm", status: "normal", category: "general",
    interpretation: "静息心率反映心脏在休息状态下的工作负担。72 bpm处于正常范围中段，通常表明心血管系统运行良好，心肌收缩效率正常。运动员静息心率可低至40-60 bpm。",
    wearableCorrelation: "您的穿戴设备数据显示近7天静息心率均值71 bpm（波动范围68-75），与体检结果高度一致，心率变异性(HRV)为48ms，表明自主神经调节功能良好。",
    recommendation: "继续保持，若静息心率持续>85或<55 bpm，建议咨询医生。" },
  { name: "血压", nameEn: "Blood Pressure", value: "118/76", range: "正常 <120/80 mmHg", status: "normal", category: "general",
    interpretation: "血压由收缩压(高压)和舒张压(低压)组成。118/76 mmHg属于理想血压范围。收缩压反映心脏泵血时的血管压力，舒张压反映心脏放松时的血管压力。",
    wearableCorrelation: "华为健康数据显示近30天平均血压117/75 mmHg，周末略有升高（与社交活动相关），整体趋势平稳。",
    recommendation: "维持低盐饮食（每日<6g盐），定期监测。若收缩压持续>130或舒张压>85，请就医。" },

  // ── 血常规 ─────────────────────────────────
  { name: "白细胞计数 (WBC)", nameEn: "WBC", value: "6.8", range: "正常 4.0-10.0 ×10⁹/L", status: "normal", category: "blood-routine",
    interpretation: "白细胞是免疫系统的核心防线，负责对抗感染和外来病原体。6.8×10⁹/L处于正常范围中段，表明免疫功能正常，没有活动性感染或炎症迹象。",
    wearableCorrelation: null,
    recommendation: "正常范围，无需特殊关注。" },
  { name: "红细胞计数 (RBC)", nameEn: "RBC", value: "5.1", range: "正常 4.5-5.5 ×10¹²/L", status: "normal", category: "blood-routine",
    interpretation: "红细胞负责携带氧气到全身组织。5.1×10¹²/L处于男性正常范围，说明造血功能和骨髓功能正常，无贫血迹象。",
    wearableCorrelation: "您的血氧饱和度(SpO₂)日常均值为98%，与红细胞携氧能力正常一致。",
    recommendation: "继续保持均衡饮食，确保铁、叶酸和维生素B12摄入充足。" },
  { name: "血红蛋白 (HGB)", nameEn: "Hemoglobin", value: "152", range: "正常 130-175 g/L", status: "normal", category: "blood-routine",
    interpretation: "血红蛋白是红细胞内携带氧气的蛋白质。152 g/L在男性正常范围内，说明血液携氧能力良好。低于正常值可能提示缺铁性贫血或其他类型贫血。",
    wearableCorrelation: null,
    recommendation: "正常范围，富含铁的食物（红肉、深绿色蔬菜）有助于维持健康水平。" },
  { name: "血小板计数 (PLT)", nameEn: "Platelets", value: "245", range: "正常 125-350 ×10⁹/L", status: "normal", category: "blood-routine",
    interpretation: "血小板参与血液凝固过程，是止血和伤口愈合的关键。245×10⁹/L在正常范围内，表明凝血功能正常。",
    wearableCorrelation: null,
    recommendation: "正常范围，无需特殊关注。" },

  // ── 肝功能 ─────────────────────────────────
  { name: "谷丙转氨酶 (ALT)", nameEn: "ALT", value: "38", range: "正常 9-50 U/L", status: "normal", category: "liver-function",
    interpretation: "谷丙转氨酶主要存在于肝细胞内，是反映肝细胞损伤最敏感的指标之一。38 U/L处于正常范围中上段，可能与轻度脂肪肝有关。当肝细胞受损时，ALT会释放入血导致升高。",
    wearableCorrelation: "您的体重管理数据（BMI 23.8）接近正常上限，当前ALT水平与轻度脂肪肝的病史相符，但尚未达到需要药物干预的水平。",
    recommendation: "控制体重、减少酒精和高脂食物摄入。3个月后复查肝功能，如果ALT持续升高建议做肝脏B超。" },
  { name: "谷草转氨酶 (AST)", nameEn: "AST", value: "30", range: "正常 15-40 U/L", status: "normal", category: "liver-function",
    interpretation: "谷草转氨酶存在于肝脏、心肌和骨骼肌中。30 U/L处于正常范围。AST/ALT比值为0.79，属于典型的肝脏代谢异常模式（比值<1），与轻度脂肪肝的表现一致。",
    wearableCorrelation: null,
    recommendation: "与ALT联合监控，保持规律运动有助于改善脂肪肝。" },
  { name: "总胆红素 (TBIL)", nameEn: "Total Bilirubin", value: "14.2", range: "正常 5.1-19.0 μmol/L", status: "normal", category: "liver-function",
    interpretation: "总胆红素是红细胞分解后的产物，经肝脏代谢后排出体外。14.2 μmol/L处于正常范围，表明肝脏代谢和胆道排泄功能正常。",
    wearableCorrelation: null,
    recommendation: "正常范围，无需特殊关注。" },

  // ── 肾功能 ─────────────────────────────────
  { name: "肌酐 (Cr)", nameEn: "Creatinine", value: "82", range: "正常 59-104 μmol/L", status: "normal", category: "kidney-function",
    interpretation: "肌酐是肌肉代谢的废物，通过肾脏排出体外。82 μmol/L处于正常范围，血肌酐水平稳定说明肾小球滤过功能正常。您的估算肾小球滤过率(eGFR)约为95 mL/min/1.73m²。",
    wearableCorrelation: null,
    recommendation: "保持充足饮水（每日1.5-2L），避免长期使用可能损害肾脏的药物。" },
  { name: "尿酸 (UA)", nameEn: "Uric Acid", value: "420 ↑", range: "正常 208-428 μmol/L", status: "borderline", category: "kidney-function",
    interpretation: "尿酸是嘌呤代谢的终产物，主要通过肾脏排泄。您的尿酸值420 μmol/L接近男性正常上限。高尿酸血症可能增加痛风、肾结石和心血管疾病风险。",
    wearableCorrelation: "穿戴数据显示您过去30天外卖频率较高（每周4.2次），高嘌呤食物（肉类、海鲜）摄入可能较多，与尿酸水平偏高相关。",
    recommendation: "减少高嘌呤食物（动物内脏、海鲜、红肉）摄入，增加饮水至每日>2L促进尿酸排泄。戒酒（尤其是啤酒）。3个月后复查。" },

  // ── 血脂四项 ─────────────────────────────────
  { name: "总胆固醇 (TC)", nameEn: "Total Cholesterol", value: "5.6 ↑", range: "正常 <5.2 mmol/L", status: "borderline", category: "lipids",
    interpretation: "总胆固醇是血液中所有脂蛋白胆固醇的总和。5.6 mmol/L属于边缘升高（5.2-6.2为边缘升高，≥6.2为高胆固醇血症）。这提示您的心血管疾病风险轻度增加。",
    wearableCorrelation: "您过去30天日均步数下降18%（从9,800→8,000步），运动量减少与血脂升高存在关联。数据显示外卖频率增加至每周4.2次，高油高脂饮食是血脂升高的重要诱因。",
    recommendation: "减少饱和脂肪（肥肉、油炸食品）和反式脂肪摄入，增加可溶性纤维（燕麦、豆类）。每日有氧运动30分钟以上。6个月后复查。" },
  { name: "甘油三酯 (TG)", nameEn: "Triglycerides", value: "2.1 ↑", range: "正常 <1.7 mmol/L", status: "borderline", category: "lipids",
    interpretation: "甘油三酯是血液中最常见的脂肪形式，主要来自食物中的脂肪和碳水化合物。2.1 mmol/L属于边缘升高（1.7-2.3为边缘升高，≥2.3为升高），是心血管疾病的独立危险因素。",
    wearableCorrelation: "与您的穿戴数据高度一致：近30天日均步数从10,200步降至8,200步（降幅19.6%），外卖频率增加，运动消耗减少约300大卡/天。",
    recommendation: "减少精制碳水化合物（白米、白面、含糖饮料）和酒精。晚餐控制在睡前3小时完成。增加Omega-3摄入（深海鱼、亚麻籽）。3个月后复查血脂四项。" },
  { name: "高密度脂蛋白 (HDL-C)", nameEn: "HDL Cholesterol", value: "1.08", range: "正常 ≥1.0 mmol/L", status: "normal", category: "lipids",
    interpretation: "高密度脂蛋白被称为\"好胆固醇\"，负责将血管壁上的胆固醇运回肝脏代谢。1.08 mmol/L处于合格水平边缘（男性≥1.0为合格，≥1.6为理想）。HDL-C越高，心血管保护作用越强。",
    wearableCorrelation: "有氧运动是提升HDL-C最有效的方式。您近期运动量下降可能影响HDL-C水平。数据显示每周运动天数从5天降至3天。",
    recommendation: "增加有氧运动（每周至少150分钟中等强度），多吃富含不饱和脂肪酸的食物（坚果、橄榄油、牛油果）。" },
  { name: "低密度脂蛋白 (LDL-C)", nameEn: "LDL Cholesterol", value: "3.6 ↑", range: "正常 <3.4 mmol/L", status: "borderline", category: "lipids",
    interpretation: "低密度脂蛋白被称为\"坏胆固醇\"，是动脉粥样硬化的主要致病因素。3.6 mmol/L属于边缘升高（3.4-4.1为边缘升高），会缓慢在血管壁沉积形成斑块，增加心梗和脑卒中风险。",
    wearableCorrelation: null,
    recommendation: "这是本次体检最需要关注的指标之一。严格控制饮食中的饱和脂肪和胆固醇，增加植物固醇摄入。如生活方式干预6个月后LDL-C仍≥3.4，考虑咨询医生是否需要药物治疗。" },

  // ── 血糖 ─────────────────────────────────
  { name: "空腹血糖 (FPG)", nameEn: "Fasting Glucose", value: "5.2", range: "正常 3.9-6.1 mmol/L", status: "normal", category: "glucose",
    interpretation: "空腹血糖反映基础胰岛素功能和糖代谢状态。5.2 mmol/L在正常范围内。注意：5.6-6.1 mmol/L为糖尿病前期（空腹血糖受损），≥7.0 mmol/L应考虑糖尿病诊断。",
    wearableCorrelation: null,
    recommendation: "正常范围，但鉴于血脂偏高和脂肪肝病史，建议每年监测空腹血糖，保持健康饮食和规律运动。" },
  { name: "糖化血红蛋白 (HbA1c)", nameEn: "HbA1c", value: "5.3", range: "正常 <5.7%", status: "normal", category: "glucose",
    interpretation: "糖化血红蛋白反映过去2-3个月的平均血糖水平，是评估长期血糖控制的金标准。5.3%处于正常范围（<5.7%正常，5.7-6.4%糖尿病前期，≥6.5%糖尿病）。",
    wearableCorrelation: null,
    recommendation: "正常范围，继续保持当前生活方式。如有糖尿病家族史，建议每年检查一次HbA1c。" },

  // ── 甲状腺功能 ─────────────────────────────────
  { name: "促甲状腺激素 (TSH)", nameEn: "TSH", value: "2.1", range: "正常 0.5-4.5 mIU/L", status: "normal", category: "thyroid",
    interpretation: "TSH是评估甲状腺功能的首选指标。2.1 mIU/L处于正常范围中段，表明甲状腺功能正常，垂体-甲状腺轴调节功能良好。",
    wearableCorrelation: "您的静息心率(71-75 bpm)正常，与甲状腺功能正常一致。甲状腺功能异常（尤其甲亢）常表现为心率异常增快或减慢。",
    recommendation: "正常范围，无需特殊关注。" },
  { name: "游离T3 (FT3)", nameEn: "Free T3", value: "4.8", range: "正常 3.1-6.8 pmol/L", status: "normal", category: "thyroid",
    interpretation: "游离T3是甲状腺激素的活性形式，直接调控新陈代谢速率。4.8 pmol/L处于正常范围，表明基础代谢率正常。",
    wearableCorrelation: null,
    recommendation: "正常范围，无需特殊关注。" },
  { name: "游离T4 (FT4)", nameEn: "Free T4", value: "15.2", range: "正常 12-22 pmol/L", status: "normal", category: "thyroid",
    interpretation: "游离T4是甲状腺分泌的主要激素，在外周转化为活性T3。15.2 pmol/L处于正常范围，甲状腺激素储备充足。",
    wearableCorrelation: null,
    recommendation: "正常范围，无需特殊关注。" },

  // ── 尿常规 ─────────────────────────────────
  { name: "尿蛋白 (PRO)", nameEn: "Urine Protein", value: "阴性(-)", range: "正常 阴性", status: "normal", category: "urinalysis",
    interpretation: "尿蛋白检测评估肾脏是否有蛋白漏出。阴性结果正常，表明肾小球滤过膜完整，没有蛋白尿。蛋白尿是肾脏疾病的早期信号。",
    wearableCorrelation: null,
    recommendation: "正常范围，每年体检时常规复查即可。" },
  { name: "尿糖 (GLU)", nameEn: "Urine Glucose", value: "阴性(-)", range: "正常 阴性", status: "normal", category: "urinalysis",
    interpretation: "尿糖阴性说明血糖水平正常，肾糖阈未超过。当血糖>10 mmol/L时可能出现尿糖阳性。",
    wearableCorrelation: null,
    recommendation: "与空腹血糖正常结果一致，无需特殊关注。" },

  // ── 肿瘤标志物 ─────────────────────────────────
  { name: "甲胎蛋白 (AFP)", nameEn: "AFP", value: "5.2", range: "正常 <7.0 ng/mL", status: "normal", category: "tumor-markers",
    interpretation: "AFP是肝癌筛查的常用标志物。5.2 ng/mL处于正常范围，肝癌风险低。但需注意，AFP正常不能完全排除肝癌，对于有乙肝或肝硬化病史者需结合B超检查。",
    wearableCorrelation: null,
    recommendation: "正常范围，对于有脂肪肝病史者，建议每年联合肝脏B超检查。" },
  { name: "癌胚抗原 (CEA)", nameEn: "CEA", value: "2.8", range: "正常 <5.0 ng/mL", status: "normal", category: "tumor-markers",
    interpretation: "CEA是广谱肿瘤标志物，主要用于结直肠癌筛查和监测。2.8 ng/mL处于正常范围。吸烟者CEA可能轻度升高。",
    wearableCorrelation: null,
    recommendation: "正常范围。45岁后建议增加肠镜筛查（每5-10年一次）。" },

  // ── 乙肝两对半 ─────────────────────────────────
  { name: "乙肝表面抗原 (HBsAg)", nameEn: "HBsAg", value: "阴性(-)", range: "正常 阴性", status: "normal", category: "hepatitis-b",
    interpretation: "HBsAg阴性表明您目前没有乙肝病毒感染，也没有携带乙肝病毒。这是最重要的乙肝筛查指标。",
    wearableCorrelation: null,
    recommendation: "确认乙肝表面抗体(HBsAb)水平。如抗体阴性，建议接种乙肝疫苗。" },
  { name: "乙肝表面抗体 (HBsAb)", nameEn: "HBsAb", value: "阳性(+)", range: "阳性表明有免疫力", status: "normal", category: "hepatitis-b",
    interpretation: "HBsAb阳性表明您体内有乙肝保护性抗体，可能是接种疫苗后产生或既往感染后康复。这是保护性指标，说明您对乙肝病毒有免疫力。",
    wearableCorrelation: null,
    recommendation: "抗体阳性无需接种疫苗。建议每3-5年复查抗体滴度，如转阴可考虑加强针。" },

  // ── 电解质 ─────────────────────────────────
  { name: "钾 (K)", nameEn: "Potassium", value: "4.1", range: "正常 3.5-5.3 mmol/L", status: "normal", category: "electrolytes",
    interpretation: "钾离子对维持神经肌肉兴奋性和心脏节律至关重要。4.1 mmol/L处于正常范围。低钾可致乏力、心律失常；高钾可致心脏骤停（多见于肾功能不全者）。",
    wearableCorrelation: "您的心率数据（71-75 bpm）规律，心律正常，与血钾水平正常一致。",
    recommendation: "正常范围，均衡饮食（香蕉、土豆、菠菜等富含钾）即可维持正常水平。" },
  { name: "钠 (Na)", nameEn: "Sodium", value: "140", range: "正常 135-145 mmol/L", status: "normal", category: "electrolytes",
    interpretation: "钠离子调节体内水分平衡和神经信号传导。140 mmol/L处于正常范围。长期高钠饮食可致高血压。",
    wearableCorrelation: "您的血压(118/76 mmHg)正常，说明目前钠摄入量在合理范围内。",
    recommendation: "保持每日食盐<6g，注意加工食品和外卖中的\"隐藏盐\"。" },

  // ── 心肌酶谱 ─────────────────────────────────
  { name: "肌酸激酶 (CK)", nameEn: "Creatine Kinase", value: "120", range: "正常 38-174 U/L", status: "normal", category: "cardiac",
    interpretation: "肌酸激酶存在于心肌、骨骼肌和脑组织中。120 U/L处于正常范围，说明无明显心肌或骨骼肌损伤。剧烈运动后CK可暂时性升高2-5倍。",
    wearableCorrelation: null,
    recommendation: "正常范围。如果出现胸痛、心悸等症状应及时就医，不要仅依赖单次检测结果。" },

  // ── 影像学 ─────────────────────────────────
  { name: "胸部X光", nameEn: "Chest X-Ray", value: "未见异常", range: "正常", status: "normal", category: "imaging",
    interpretation: "胸部X光检查未见异常，心肺轮廓清晰，无肺部结节、肿块、炎症或气胸等异常发现。",
    wearableCorrelation: "与血氧饱和度(98%)正常和心率正常一致，心肺功能良好。",
    recommendation: "正常范围，建议每年体检时常规复查。" },
  { name: "腹部B超", nameEn: "Abdominal Ultrasound", value: "轻度脂肪肝", range: "正常肝脏无脂肪浸润", status: "borderline", category: "imaging",
    interpretation: "腹部B超提示轻度脂肪肝，即肝细胞内脂肪含量超过5%。这是最常见的肝脏异常，通常与超重、高脂饮食、缺乏运动有关，属于可逆性病变。若不干预，可能进展为脂肪性肝炎→肝纤维化→肝硬化。",
    wearableCorrelation: "与您的血脂边缘升高（TC 5.6、TG 2.1）、BMI 23.8和运动量下降趋势完全吻合，这些因素是脂肪肝的主要诱因。",
    recommendation: "减重5-10%是逆转脂肪肝最有效的方法。每周≥150分钟有氧运动+2次力量训练。减少果糖摄入（果汁、含糖饮料尤其有害）。6个月后复查肝功能+腹部B超。" },
];

// ── S1: Mock Report Records (for multi-report comparison) ──

export const mockReportRecords: ReportRecord[] = [
  {
    id: "report-2025",
    title: "2025年度体检报告",
    uploadDate: "2025-12-15",
    examDate: "2025-11-20",
    hospital: "某三甲医院体检中心",
    ocrAccuracy: 98.5,
    indicators: mockReportIndicators,
    aiSummary: "本次体检整体情况良好。需要关注的核心问题是血脂代谢异常（总胆固醇5.6 mmol/L、甘油三酯2.1 mmol/L、LDL-C 3.6 mmol/L均处于边缘升高）和尿酸接近上限（420 μmol/L），这与腹部B超发现的轻度脂肪肝相符。您的日常穿戴数据（步数下降18%、外卖频率增加至每周4.2次）为这些异常提供了生活方式的解释。好消息是心、肾、甲状腺、血糖等核心指标均在正常范围，血压和心率理想。",
    aiRecommendations: [
      "饮食调整：减少外卖频率至每周≤2次，增加Omega-3摄入（深海鱼、亚麻籽），减少高嘌呤食物",
      "运动计划：每日快走30分钟+每周2次有氧运动，目标恢复日均10,000步",
      "减重目标：6个月内减重3-5kg（BMI从23.8降至22.5左右）",
      "复查计划：3个月后复查血脂四项+尿酸，6个月后复查肝功能+腹部B超",
    ],
    wearableCorrelationSummary: "穿戴数据（Apple Watch + 华为健康）显示过去30天：日均步数从10,200降至8,200步（降幅19.6%）；外卖频率增加至4.2次/周；运动消耗减少约300大卡/天。这些趋势与血脂升高、尿酸边缘升高和脂肪肝密切相关。心率、血压、血氧等指标均在正常范围且与体检结果一致。",
  },
  {
    id: "report-2024",
    title: "2024年度体检报告",
    uploadDate: "2025-12-10",
    examDate: "2024-10-15",
    hospital: "某三甲医院体检中心",
    ocrAccuracy: 97.2,
    indicators: [
      { name: "BMI", nameEn: "BMI", value: "22.5", range: "正常 18.5-24.0", status: "normal", category: "general", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "心率", nameEn: "Heart Rate", value: "68 bpm", range: "正常 60-100 bpm", status: "normal", category: "general", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "血压", nameEn: "Blood Pressure", value: "115/75", range: "正常 <120/80 mmHg", status: "normal", category: "general", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "总胆固醇 (TC)", nameEn: "Total Cholesterol", value: "4.8", range: "正常 <5.2 mmol/L", status: "normal", category: "lipids", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "甘油三酯 (TG)", nameEn: "Triglycerides", value: "1.4", range: "正常 <1.7 mmol/L", status: "normal", category: "lipids", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "低密度脂蛋白 (LDL-C)", nameEn: "LDL Cholesterol", value: "2.9", range: "正常 <3.4 mmol/L", status: "normal", category: "lipids", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "高密度脂蛋白 (HDL-C)", nameEn: "HDL Cholesterol", value: "1.25", range: "正常 ≥1.0 mmol/L", status: "normal", category: "lipids", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "空腹血糖 (FPG)", nameEn: "Fasting Glucose", value: "5.0", range: "正常 3.9-6.1 mmol/L", status: "normal", category: "glucose", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "尿酸 (UA)", nameEn: "Uric Acid", value: "360", range: "正常 208-428 μmol/L", status: "normal", category: "kidney-function", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "谷丙转氨酶 (ALT)", nameEn: "ALT", value: "25", range: "正常 9-50 U/L", status: "normal", category: "liver-function", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "腹部B超", nameEn: "Abdominal Ultrasound", value: "未见异常", range: "正常", status: "normal", category: "imaging", interpretation: "", wearableCorrelation: null, recommendation: "" },
    ],
    aiSummary: "2024年体检各项指标均正常。",
    aiRecommendations: ["保持健康生活方式。"],
    wearableCorrelationSummary: "2024年日均步数约10,200步，运动活跃。",
  },
  {
    id: "report-2023",
    title: "2023年度体检报告",
    uploadDate: "2025-12-08",
    examDate: "2023-09-20",
    hospital: "某二甲医院体检科",
    ocrAccuracy: 95.8,
    indicators: [
      { name: "BMI", nameEn: "BMI", value: "21.8", range: "正常 18.5-24.0", status: "normal", category: "general", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "总胆固醇 (TC)", nameEn: "Total Cholesterol", value: "4.5", range: "正常 <5.2 mmol/L", status: "normal", category: "lipids", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "甘油三酯 (TG)", nameEn: "Triglycerides", value: "1.2", range: "正常 <1.7 mmol/L", status: "normal", category: "lipids", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "空腹血糖 (FPG)", nameEn: "Fasting Glucose", value: "4.9", range: "正常 3.9-6.1 mmol/L", status: "normal", category: "glucose", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "尿酸 (UA)", nameEn: "Uric Acid", value: "340", range: "正常 208-428 μmol/L", status: "normal", category: "kidney-function", interpretation: "", wearableCorrelation: null, recommendation: "" },
      { name: "谷丙转氨酶 (ALT)", nameEn: "ALT", value: "22", range: "正常 9-50 U/L", status: "normal", category: "liver-function", interpretation: "", wearableCorrelation: null, recommendation: "" },
    ],
    aiSummary: "2023年各项指标均在理想范围。",
    aiRecommendations: ["保持健康生活方式。"],
    wearableCorrelationSummary: "2023年运动活跃，日均步数约11,000步。",
  },
];

// ── S1: Report Comparison Data ─────────────────────────────

export const mockReportComparison: ReportComparison = {
  reports: mockReportRecords,
  indicators: ["BMI", "总胆固醇 (TC)", "甘油三酯 (TG)", "LDL-C", "空腹血糖 (FPG)", "尿酸 (UA)", "ALT"],
  timeline: [
    { date: "2023-09-20", label: "2023体检", values: { "总胆固醇 (TC)": 4.5, "甘油三酯 (TG)": 1.2, "空腹血糖 (FPG)": 4.9, "尿酸 (UA)": 340, "ALT": 22, "BMI": 21.8, "LDL-C": 2.5, "HDL-C": 1.35 } },
    { date: "2024-10-15", label: "2024体检", values: { "总胆固醇 (TC)": 4.8, "甘油三酯 (TG)": 1.4, "空腹血糖 (FPG)": 5.0, "尿酸 (UA)": 360, "ALT": 25, "BMI": 22.5, "LDL-C": 2.9, "HDL-C": 1.25 } },
    { date: "2025-11-20", label: "2025体检", values: { "总胆固醇 (TC)": 5.6, "甘油三酯 (TG)": 2.1, "空腹血糖 (FPG)": 5.2, "尿酸 (UA)": 420, "ALT": 38, "BMI": 23.8, "LDL-C": 3.6, "HDL-C": 1.08 } },
  ],
  trendAnalysis: "对比三年体检数据，观察到明确的恶化趋势：BMI从21.8→22.5→23.8持续上升（三年涨幅9.2%）；血脂四项全面恶化：总胆固醇从4.5→4.8→5.6（三年涨幅24.4%），甘油三酯从1.2→1.4→2.1（三年涨幅75%），LDL-C从2.5→2.9→3.6（三年涨幅44%）；尿酸从340→360→420（三年涨幅23.5%）；ALT从22→25→38（三年涨幅72.7%）。2024→2025年恶化速度明显加快，与穿戴数据显示的运动量骤降和外卖频率增加高度吻合。好消息是血糖仍维持在正常范围（4.9→5.0→5.2），但呈缓慢上升趋势，需警惕。综合来看，2025年是转折点，急需在饮食和运动上进行系统性干预，否则明年多个指标可能进入临床异常范围。",
};

// ── S1: Consent Records for PIPL Compliance ───────────────

export const mockConsentRecords: ConsentRecord[] = [
  { id: "consent-001", reportId: "report-2025", consentType: "ocr-processing", granted: true, timestamp: "2025-12-15T10:30:00+08:00" },
  { id: "consent-002", reportId: "report-2025", consentType: "ai-analysis", granted: true, timestamp: "2025-12-15T10:30:00+08:00" },
  { id: "consent-003", reportId: "report-2025", consentType: "data-storage", granted: true, timestamp: "2025-12-15T10:30:00+08:00" },
  { id: "consent-004", reportId: "report-2025", consentType: "wearable-correlation", granted: true, timestamp: "2025-12-15T10:30:00+08:00" },
];

export function generateResultData() {
  const hr = Math.round(68 + Math.random() * 8);
  const bpSys = Math.round(115 + Math.random() * 10);
  const bpDia = Math.round(75 + Math.random() * 8);
  const spo2 = Math.round(97 + Math.random() * 2);
  const stress = Math.round(35 + Math.random() * 20);

  const allNormal =
    hr <= 100 && bpSys <= 130 && bpDia <= 85 && spo2 >= 95 && stress <= 60;

  return {
    emoji: allNormal ? "✅" : "⚠️",
    title: allNormal ? "检测完成" : "检测完成 · 需关注",
    subtitle: allNormal ? "各项指标正常" : "部分指标需要关注",
    metrics: {
      hr,
      bp: `${bpSys}/${bpDia}`,
      spo2,
      stress,
    },
    advice: allNormal
      ? "各项指标均在正常范围。压力水平略高，建议每隔45分钟起身活动5分钟，做深呼吸练习。"
      : "心率偏快，建议休息5分钟后重新检测。注意饮食和作息。",
  };
}

// ── M3: Daily Health Summary Mock Data ──────────────────────

export const mockSummaryPreferences: SummaryPreferences = {
  enabled: true,
  pushTime: "08:00",
  timezone: "Asia/Shanghai",
  includeSleep: true,
  includeExercise: true,
  includeTrends: true,
  includeAnomalies: true,
  language: "zh-CN",
};

export const mockDailySummary: DailySummary = {
  id: "summary-20240604",
  date: "2026-06-04",
  generatedAt: "2026-06-04T08:00:00+08:00",
  greeting: "早上好，小明！新的一天开始了 ☀️",
  overallMessage: "今日健康评分 78 分，比昨天提升 2 分。睡眠质量良好，继续保持！",
  healthScore: 78,
  healthScoreChange: 2,
  sleep: {
    durationHours: 7.5,
    quality: "good",
    deepSleepMinutes: 52,
    deepSleepTarget: 60,
    comparisonPercent: 8,
    insights:
      "昨晚睡眠时长 7 小时 30 分钟，深睡 52 分钟，接近推荐的 60 分钟标准。睡眠效率 92%，入睡潜伏期 15 分钟，整体质量良好。",
    suggestion:
      "深睡时长略低于推荐值，建议睡前 1 小时避免使用电子设备，保持卧室温度在 18-22°C 之间，有助于增加深睡比例。",
  },
  exercise: {
    recommendedMinutes: 45,
    recommendedType: "有氧运动 + 力量训练",
    intensity: "moderate",
    reason:
      "根据你过去 7 天的活动数据，平均每天活动量 35 分钟，略低于推荐标准。今日天气晴朗，适合户外运动。你的心率恢复能力良好，可以适当增加运动强度。",
    caution:
      "注意：你上周五心率出现过异常偏高（108 bpm），运动时请保持心率在 130-150 bpm 之间，如感到不适请立即停止。",
  },
  trends: [
    {
      metricName: "睡眠质量",
      metricIcon: "😴",
      direction: "up",
      description:
        "过去 7 天你的睡眠质量呈上升趋势，平均评分从 72 分提升至 78 分。入睡时间更加规律（波动在 ±20 分钟内）。",
      suggestion: "继续保持规律作息，周末也尽量不熬夜，维持生物钟稳定。",
    },
    {
      metricName: "静息心率",
      metricIcon: "❤️",
      direction: "stable",
      description:
        "静息心率维持在 68-75 bpm 区间，属于正常范围。除上周五因睡眠不足出现过一次偏高外，整体趋势平稳。",
      suggestion: "每周进行 2-3 次有氧运动，有助于进一步降低静息心率至 60-65 bpm 的理想区间。",
    },
  ],
  anomalies: [
    {
      metricName: "心率",
      metricIcon: "❤️",
      alertLevel: "yellow",
      currentValue: "108 bpm",
      normalRange: "60-100 bpm",
      description:
        "6 月 3 日（上周五）静息心率异常偏高至 108 bpm，与当天睡眠严重不足（仅 5h32min）高度相关。此后已恢复正常。",
      recommendation:
        "建议关注睡眠与心率的关系。如果睡眠充足时仍出现心率偏高，请及时咨询医生。",
    },
  ],
  disclaimer:
    "本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。如有健康疑虑，请咨询专业医生。",
};

// ── M2: 30-Day Daily Health Data (for scoring engine) ─────

/**
 * Generate realistic 30-day mock daily health data with natural variations.
 *
 * The data simulates a user whose health has been gradually declining:
 * - Steps decreasing from ~10,000 to ~7,000
 * - Sleep quality declining slightly
 * - Weight trending up slightly
 * - A few outlier days (poor sleep → high HR → low activity)
 * - Generally normal vitals
 */
export function generateMockDailyData(days: number = 30): DailyHealthData[] {
  const data: DailyHealthData[] = [];
  const today = new Date("2026-06-04");

  // Seed a pseudo-random state so data is deterministic
  let seed = 42;
  const rand = (min: number, max: number): number => {
    seed = (seed * 16807) % 2147483647;
    return min + ((seed / 2147483647) * (max - min));
  };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay(); // 0=Sun

    // ── Sleep ────────────────────────────────────
    // Baseline: 7.5h, declining slightly over the month
    const declineFactor = 1 - (days - 1 - i) / (days * 3); // mild decline from 1.0 to ~0.9
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseSleep = 7.5 * declineFactor + (isWeekend ? 0.5 : 0);

    // Some outlier days
    const dayIndex = days - 1 - i;
    let sleepDuration: number;
    let deepSleep: number;
    let sleepQuality: number;

    if (dayIndex === 3 || dayIndex === 17) {
      // Very poor sleep days
      sleepDuration = 4.2 + rand(-0.5, 0.5);
      deepSleep = 25 + rand(-5, 5);
      sleepQuality = 30 + rand(-10, 10);
    } else if (dayIndex === 8 || dayIndex === 25) {
      // Slightly poor sleep
      sleepDuration = 5.5 + rand(-0.5, 0.5);
      deepSleep = 45 + rand(-5, 10);
      sleepQuality = 55 + rand(-10, 10);
    } else {
      sleepDuration = baseSleep + rand(-0.8, 0.8);
      deepSleep = (isWeekend ? 95 : 80) + rand(-20, 25);
      sleepQuality = (isWeekend ? 85 : 72) + rand(-12, 15);
    }

    // ── Heart Rate ───────────────────────────────
    const baseRestingBpm = 66 + (1 - declineFactor) * 8; // trending up
    let restingBpm: number;

    if (dayIndex === 3 || dayIndex === 17) {
      // High HR after poor sleep
      restingBpm = 92 + rand(-3, 5);
    } else if (dayIndex === 4 || dayIndex === 18) {
      // Still elevated
      restingBpm = 78 + rand(-3, 3);
    } else {
      restingBpm = baseRestingBpm + rand(-4, 4);
    }
    const avgDailyBpm: number = restingBpm + rand(5, 15);

    // ── Activity ──────────────────────────────────
    const baseSteps = 10500 * declineFactor;
    let steps: number;
    let activeMinutes: number;

    if (dayIndex === 3 || dayIndex === 17) {
      // Very low activity (poor sleep hangover)
      steps = 1800 + rand(-300, 500);
      activeMinutes = 5 + rand(-2, 8);
    } else if (dayIndex === 4 || dayIndex === 18) {
      // Low activity
      steps = 4500 + rand(-500, 1000);
      activeMinutes = 15 + rand(-5, 10);
    } else if (isWeekend) {
      steps = baseSteps + rand(-2000, 2000);
      activeMinutes = 40 + rand(-15, 25);
    } else {
      steps = baseSteps + rand(-2000, 1500);
      activeMinutes = 35 + rand(-15, 20);
    }
    const caloriesBurned = Math.round(steps * 0.04 + rand(-50, 50));

    // ── Weight ────────────────────────────────────
    // Trending up from 72.5 to 73.8
    const baseWeight = 72.5 + ((days - 1 - i) / (days - 1)) * 1.3;
    const kg = baseWeight + rand(-0.3, 0.3);
    const heightM = 1.75;
    const bmi = kg / (heightM * heightM);

    // ── Recovery (HRV) ────────────────────────────
    let hrvMs: number;
    if (dayIndex === 3 || dayIndex === 17) {
      hrvMs = 18 + rand(-3, 5); // very low
    } else if (dayIndex === 4 || dayIndex === 18) {
      hrvMs = 32 + rand(-5, 5); // low
    } else {
      hrvMs = 48 * declineFactor + 5 + rand(-8, 10);
    }

    // ── Blood Metrics ─────────────────────────────
    const baseSystolic = 116 + (1 - declineFactor) * 6;
    const baseDiastolic = 74 + (1 - declineFactor) * 3;
    const systolic = Math.round(baseSystolic + rand(-3, 3));
    const diastolic = Math.round(baseDiastolic + rand(-2, 3));
    const spo2 = Math.round(97 + rand(-1, 2));

    data.push({
      date,
      sleep: {
        durationHours: Math.round(sleepDuration * 10) / 10,
        deepSleepMinutes: Math.round(deepSleep),
        quality: Math.round(clamp01(sleepQuality)),
      },
      heartRate: {
        restingBpm: Math.round(restingBpm),
        avgDailyBpm: Math.round(avgDailyBpm),
      },
      activity: {
        steps: Math.round(steps),
        activeMinutes: Math.round(activeMinutes),
        caloriesBurned: Math.round(caloriesBurned),
      },
      weight: {
        kg: Math.round(kg * 10) / 10,
        bmi: Math.round(bmi * 10) / 10,
      },
      recovery: {
        hrvMs: Math.round(hrvMs),
      },
      bloodMetrics: {
        systolic,
        diastolic,
        spo2,
      },
    });
  }

  return data;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Pre-generated 30-day dataset for immediate use */
export const mockDailyHealthData: DailyHealthData[] = generateMockDailyData(30);

/**
 * Get the latest day's data as a summary.
 */
export function getLatestDayData(
  data: DailyHealthData[]
): DailyHealthData | null {
  if (data.length === 0) return null;
  return data[data.length - 1];
}
