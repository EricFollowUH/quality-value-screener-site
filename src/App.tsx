import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  ChartLine,
  X
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { aShareFallbackSnapshot } from "./aShareFallbackData";
import { fallbackSnapshot } from "./fallbackData";
import type { ScoreDimension, Snapshot, StockScore } from "./types";

type Market = "us" | "cn";

type SearchCandidate = {
  ticker: string;
  name: string;
  exchange?: string;
  score?: number;
};

type CompanyBrief = {
  business: string;
  outlook: string;
};

const dimensions: Array<{ key: ScoreDimension; label: string; short: string }> = [
  { key: "growth", label: "高增长", short: "Growth" },
  { key: "quality", label: "高质量", short: "Quality" },
  { key: "cashFlow", label: "高现金流", short: "FCF" },
  { key: "valuation", label: "低估值", short: "Value" },
  { key: "risk", label: "低风险", short: "Risk" },
  { key: "sustainability", label: "可持续", short: "Moat" }
];

function resolveApiBase() {
  if (typeof window === "undefined") return "";
  const { hostname, protocol } = window.location;
  const hasLocalApi = hostname === "quality-value-screener-site.vercel.app" || hostname === "localhost" || hostname === "127.0.0.1";
  return protocol === "file:" || !hasLocalApi ? "https://quality-value-screener-site.vercel.app" : "";
}

const apiBase = resolveApiBase();

const marketCopy: Record<Market, {
  label: string;
  title: string;
  compareTitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  externalSearchLabel: string;
  primaryDataLabel: string;
  filingLabel: string;
}> = {
  us: {
    label: "美股",
    title: "行业化质量价值筛选",
    compareTitle: "多股票质量价值对比",
    searchLabel: "股票搜索 / 加入对比",
    searchPlaceholder: "MSFT, ADBE, TSLA 或公司名",
    externalSearchLabel: "打开 Yahoo 查询候选标的",
    primaryDataLabel: "Yahoo Finance",
    filingLabel: "SEC Search"
  },
  cn: {
    label: "A股",
    title: "A股质量价值筛选",
    compareTitle: "A股多标的质量价值对比",
    searchLabel: "A股搜索 / 加入对比",
    searchPlaceholder: "600519, 宁德时代, 银行",
    externalSearchLabel: "打开东方财富查询候选标的",
    primaryDataLabel: "东方财富",
    filingLabel: "巨潮资讯"
  }
};

const industryKeywords = new Set([
  "ai",
  "bank",
  "banks",
  "biotech",
  "chip",
  "chips",
  "cloud",
  "consumer",
  "energy",
  "financial",
  "gas",
  "healthcare",
  "industrial",
  "insurance",
  "oil",
  "payment",
  "reit",
  "reits",
  "retail",
  "saas",
  "semiconductor",
  "semiconductors",
  "software",
  "utility",
  "utilities"
]);

[
  "a股",
  "白酒",
  "消费",
  "新能源",
  "电池",
  "银行",
  "保险",
  "医药",
  "医疗",
  "半导体",
  "芯片",
  "制造",
  "公用",
  "电力",
  "券商",
  "金融"
].forEach((keyword) => industryKeywords.add(keyword));

const templateSearchKey: Record<string, string> = {
  "AI / cloud / platform technology": "ai",
  "Banks": "banks",
  "Biotech / drug development": "biotech",
  "Consumer brands / staples": "consumer",
  "Energy / oil and gas": "energy",
  "Healthcare": "healthcare",
  "Industrials / manufacturing": "industrial",
  "Insurance": "insurance",
  "Payment networks / financial infrastructure": "payment",
  "REITs": "reit",
  "Retail / e-commerce": "retail",
  "SaaS / enterprise software": "saas",
  "Semiconductors / chip design": "semiconductor",
  "Utilities": "utilities"
};

const aShareTemplateSearchKey: Record<string, string> = {
  "白酒 / 高端消费": "白酒",
  "新能源 / 电池": "新能源",
  "先进制造 / 消费制造": "制造",
  "银行": "银行",
  "保险": "保险",
  "医药医疗": "医药",
  "半导体 / 硬科技": "半导体",
  "软件 / 云服务": "软件",
  "电力 / 公用事业": "电力",
  "券商 / 金融服务": "券商",
  "工程机械 / 工业制造": "制造",
  "周期资源 / 化工": "周期资源"
};

const industryOptions = [
  "All",
  "SaaS / enterprise software",
  "AI / cloud / platform technology",
  "Semiconductors / chip design",
  "Payment networks / financial infrastructure",
  "Banks",
  "Insurance",
  "REITs",
  "Energy / oil and gas",
  "Healthcare",
  "Biotech / drug development",
  "Retail / e-commerce",
  "Consumer brands / staples",
  "Industrials / manufacturing",
  "Utilities",
  "General quality/value"
];

const aShareIndustryOptions = [
  "All",
  "白酒 / 高端消费",
  "新能源 / 电池",
  "先进制造 / 消费制造",
  "银行",
  "保险",
  "医药医疗",
  "半导体 / 硬科技",
  "软件 / 云服务",
  "电力 / 公用事业",
  "券商 / 金融服务",
  "工程机械 / 工业制造",
  "周期资源 / 化工",
  "General quality/value"
];

const scoreScaleRows = [
  { score: "5", tone: "很强", meaning: "明显优于行业与历史基准，且质量较高。" },
  { score: "4", tone: "强", meaning: "优于常规水平，但仍需核对估值或周期风险。" },
  { score: "3", tone: "中性", meaning: "证据混合，适合作为观察对象继续跟踪。" },
  { score: "2", tone: "弱", meaning: "存在明显短板，除非有清晰反转逻辑。" },
  { score: "0-1", tone: "很弱", meaning: "公开数据暂不支持优先研究。" }
];

const modelDimensionRows = [
  {
    dimension: "高增长",
    focus: "收入增速、利润增速、行业景气度",
    use: "识别增长是否来自核心业务，而不是一次性因素或并购。"
  },
  {
    dimension: "高质量",
    focus: "毛利率、经营利润率、ROE / ROIC",
    use: "判断商业模式、定价权和资本回报是否足够好。"
  },
  {
    dimension: "高现金流",
    focus: "FCF 收益率、FCF 利润率、经营现金流转化",
    use: "检验利润能否真正转成现金，避免只看会计利润。"
  },
  {
    dimension: "低估值",
    focus: "P/E、EV/EBITDA、FCF yield、行业专用倍数",
    use: "评估价格是否给了安全边际，而不是机械寻找低倍数。"
  },
  {
    dimension: "低风险",
    focus: "现金、债务、净债务/EBITDA、监管和周期风险",
    use: "确认资产负债表能否承受逆风和估值回撤。"
  },
  {
    dimension: "可持续",
    focus: "护城河、留存、生态、客户集中度、管理执行",
    use: "判断当前优势是否可以持续，而不是短期景气。"
  }
];

const modelTierRows = [
  { total: "25-30", label: "高质量候选", action: "值得进入更深研究和估值建模。" },
  { total: "20-24", label: "有吸引力", action: "先找主要风险，再要求足够安全边际。" },
  { total: "15-19", label: "普通观察", action: "只有明确催化或反转逻辑时才继续跟踪。" },
  { total: "<15", label: "低优先级", action: "通常不优先，除非是专项反转研究。" }
];

const companyBriefs: Record<string, CompanyBrief> = {
  "000333": {
    business: "家电和智能制造龙头，覆盖空调、厨电、机器人、工业自动化和海外业务。",
    outlook: "来自海外扩张、利润率修复、B 端工业技术和稳健分红，但需关注地产链需求。"
  },
  "002594": {
    business: "新能源汽车、电池和电子业务公司，垂直整合能力较强。",
    outlook: "取决于销量增长、毛利率修复、海外扩张和价格竞争缓和。"
  },
  "300750": {
    business: "动力电池和储能电池龙头，客户覆盖全球新能源车和储能市场。",
    outlook: "取决于全球电动车渗透、储能需求、材料价格和电池技术路线竞争。"
  },
  "600036": {
    business: "股份制商业银行龙头，优势在零售金融、财富管理和资产质量控制。",
    outlook: "取决于净息差、信贷质量、财富管理恢复和分红稳定性。"
  },
  "600519": {
    business: "高端白酒龙头，核心资产是茅台品牌、渠道控制和稀缺供给。",
    outlook: "取决于高端消费需求、渠道价格稳定、分红回报和估值安全边际。"
  },
  ADBE: {
    business: "数字创意和文档软件公司，核心产品覆盖 Creative Cloud、Document Cloud 和企业数字体验。",
    outlook: "增长取决于 AI 创作工具、订阅提价能力和企业营销云需求能否抵消成熟软件增速放缓。"
  },
  AMD: {
    business: "CPU、GPU 和数据中心芯片设计公司，覆盖服务器、PC、游戏和嵌入式市场。",
    outlook: "前景取决于数据中心 GPU 放量、服务器份额提升，以及半导体周期复苏的持续性。"
  },
  AMT: {
    business: "通信铁塔和数字基础设施 REIT，收入主要来自长期租约和移动网络覆盖需求。",
    outlook: "前景取决于 5G/数据流量增长、租约续签、利率环境和资产负债表管理。"
  },
  AMZN: {
    business: "电商、AWS 云计算、广告和会员生态平台，利润核心来自 AWS 与广告业务。",
    outlook: "增长看 AWS 复苏、AI 云需求、零售效率改善和广告变现能力。"
  },
  AVGO: {
    business: "半导体和基础设施软件公司，产品覆盖网络芯片、定制 ASIC、无线芯片和 VMware。",
    outlook: "前景取决于 AI 网络/定制芯片需求、软件整合效率和客户集中度风险。"
  },
  COST: {
    business: "会员制仓储零售商，依靠高周转、低毛利和会员费构建稳定模式。",
    outlook: "增长来自门店扩张、会员续费和客单稳定性，但估值通常要求较高执行确定性。"
  },
  CRM: {
    business: "企业 CRM 和云软件平台，覆盖销售、服务、营销、数据和 AI 自动化工具。",
    outlook: "前景取决于企业 IT 支出、AI 功能变现和利润率提升能否持续。"
  },
  CRCL: {
    business: "稳定币和区块链金融基础设施公司，核心围绕 USDC 发行、流通和相关服务。",
    outlook: "前景取决于稳定币监管、USDC 采用率、利率环境和与传统支付网络的竞争。"
  },
  GOOGL: {
    business: "搜索、广告、YouTube、Android、Google Cloud 和 AI 平台公司。",
    outlook: "增长取决于广告韧性、云业务盈利、AI 搜索体验和监管压力的平衡。"
  },
  HD: {
    business: "家装建材零售商，服务 DIY 消费者和专业承包商。",
    outlook: "前景取决于住房周转、维修需求、专业客户增长和利率对家装消费的影响。"
  },
  JPM: {
    business: "大型综合银行，覆盖消费者银行、投行、交易、资产管理和商业银行。",
    outlook: "前景取决于净息差、信贷周期、资本要求和市场业务表现。"
  },
  LLY: {
    business: "全球制药公司，重点产品覆盖糖尿病、减重、肿瘤和免疫等领域。",
    outlook: "增长主要看 GLP-1 药物产能、适应症扩展和管线兑现，同时需关注高估值风险。"
  },
  MA: {
    business: "全球支付网络公司，连接发卡行、收单机构、商户和消费者。",
    outlook: "前景来自电子支付渗透、跨境消费和增值服务，但需关注监管与新支付轨道竞争。"
  },
  META: {
    business: "社交平台和数字广告公司，核心资产包括 Facebook、Instagram、WhatsApp 和 AI 推荐系统。",
    outlook: "前景取决于广告增长、AI 投放效率、资本开支回报和 Reality Labs 投入纪律。"
  },
  MSFT: {
    business: "企业软件、云计算、操作系统、生产力工具和 AI 平台公司。",
    outlook: "增长主要看 Azure、Copilot、企业软件续费和 AI 基础设施投入回报。"
  },
  MU: {
    business: "存储芯片公司，主要生产 DRAM、NAND，并受益于数据中心和 AI HBM 需求。",
    outlook: "前景高度依赖存储周期、HBM 供需、资本开支纪律和价格修复。"
  },
  NEE: {
    business: "公用事业和可再生能源公司，核心包括 Florida Power & Light 和清洁能源资产。",
    outlook: "前景取决于电力需求、利率、监管回报和可再生项目执行。"
  },
  NKE: {
    business: "全球运动品牌，覆盖鞋服、直营渠道、批发渠道和数字销售。",
    outlook: "前景取决于产品创新、库存消化、渠道修复和中国等国际市场需求。"
  },
  NOW: {
    business: "企业工作流自动化软件公司，平台覆盖 IT、员工、客户和行业流程。",
    outlook: "增长看大客户扩张、AI 工作流产品变现和企业自动化预算。"
  },
  NVDA: {
    business: "AI 加速芯片、GPU、网络和软件生态公司，核心面向数据中心与高性能计算。",
    outlook: "增长取决于 AI 资本开支持续性、供应能力、竞争格局和客户自研芯片替代风险。"
  },
  ORCL: {
    business: "数据库、企业软件和云基础设施公司，客户基础集中在大型企业。",
    outlook: "前景取决于云基础设施扩张、数据库迁移和 AI 训练/推理需求。"
  },
  PLTR: {
    business: "数据分析和 AI 操作系统软件公司，服务政府、国防和企业客户。",
    outlook: "增长取决于 AIP 商业化、大客户扩张和高估值下的利润兑现。"
  },
  TSLA: {
    business: "电动车、能源存储和自动驾驶技术公司，也在布局机器人和 AI 计算。",
    outlook: "前景取决于交付增长、毛利率修复、自动驾驶商业化和全球价格竞争。"
  },
  UNH: {
    business: "美国医疗保险和医疗服务集团，核心包括 UnitedHealthcare 与 Optum。",
    outlook: "前景取决于医疗成本控制、Medicare Advantage 利润率、监管压力和 Optum 服务增长。"
  },
  V: {
    business: "全球支付网络公司，连接消费者、商户、银行和金融机构。",
    outlook: "增长来自电子支付渗透和跨境交易恢复，但需关注费率监管与实时支付竞争。"
  },
  XOM: {
    business: "综合能源公司，覆盖上游油气、炼化、化工和低碳项目。",
    outlook: "前景取决于油气价格、资本纪律、股东回报和能源转型投入回报。"
  }
};

const maxCompareTickers = 12;
const usTickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;
const aShareTickerPattern = /^(00|30|60|68)\d{4}$/;

function tier(score: number) {
  if (score >= 25) return { label: "高质量候选", className: "tier-high" };
  if (score >= 20) return { label: "有吸引力", className: "tier-mid" };
  if (score >= 15) return { label: "普通观察", className: "tier-watch" };
  return { label: "低优先级", className: "tier-low" };
}

function fmtPrice(value: number | null, market: Market) {
  if (value == null) return "n/a";
  const prefix = market === "cn" ? "¥" : "$";
  return `${prefix}${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "本周快照";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function fmtPctMetric(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtMultiple(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return value.toFixed(1);
}

function fmtMoneyMetric(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "暂无";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toFixed(0);
}

function scoreTone(score: number) {
  if (score >= 5) return "很强";
  if (score >= 4) return "强";
  if (score >= 3) return "中性";
  if (score >= 2) return "弱";
  return "很弱";
}

function compactReason(stock: StockScore, dimension: ScoreDimension) {
  const metrics = stock.metrics || {};
  const score = stock[dimension];

  switch (dimension) {
    case "growth":
      return `${scoreTone(score)}。营收增速 ${fmtPctMetric(metrics.revenueGrowth)}，利润增速 ${fmtPctMetric(metrics.earningsGrowth)}。`;
    case "quality":
      return `${scoreTone(score)}。毛利率 ${fmtPctMetric(metrics.grossMargins)}，经营利润率 ${fmtPctMetric(metrics.operatingMargins)}，ROE ${fmtPctMetric(metrics.returnOnEquity)}。`;
    case "cashFlow": {
      const fcfYield = metrics.fcfYield ?? (metrics.freeCashflow != null && metrics.marketCap ? metrics.freeCashflow / metrics.marketCap : null);
      const fcfMargin = metrics.freeCashflow != null && metrics.totalRevenue ? metrics.freeCashflow / metrics.totalRevenue : null;
      const conversion = metrics.freeCashflow != null && metrics.operatingCashflow ? metrics.freeCashflow / metrics.operatingCashflow : null;
      return `${scoreTone(score)}。FCF 收益率 ${fmtPctMetric(fcfYield)}，FCF 利润率 ${fmtPctMetric(fcfMargin)}，现金转化 ${fmtPctMetric(conversion)}。`;
    }
    case "valuation": {
      const pe = metrics.trailingPE ?? metrics.forwardPE ?? null;
      const fcfYield = metrics.fcfYield ?? (metrics.freeCashflow != null && metrics.marketCap ? metrics.freeCashflow / metrics.marketCap : null);
      return `${scoreTone(score)}。P/E ${fmtMultiple(pe)}，FCF 收益率 ${fmtPctMetric(fcfYield)}，仅作相对吸引力参考。`;
    }
    case "risk": {
      const netDebtToEbitda =
        metrics.totalCash != null && metrics.totalDebt != null && metrics.ebitda
          ? (metrics.totalDebt - metrics.totalCash) / metrics.ebitda
          : null;
      return `${scoreTone(score)}。现金 ${fmtMoneyMetric(metrics.totalCash)}，债务 ${fmtMoneyMetric(metrics.totalDebt)}，净债务/EBITDA ${fmtMultiple(netDebtToEbitda)}。`;
    }
    case "sustainability":
      return `${scoreTone(score)}。按 ${stock.template} 模板评估，重点看增长、利润率和行业护城河能否延续。`;
    default:
      return stock.reasons?.[dimension] || "公开数据不足，暂按中性处理。";
  }
}

function fallbackCompanyBrief(stock: StockScore): CompanyBrief {
  const industry = stock.industry || stock.sector || "所在行业";

  switch (stock.template) {
    case "SaaS / enterprise software":
      return {
        business: `${stock.name} 属于企业软件或 SaaS 公司，主要通过软件订阅、平台服务或企业客户方案创造收入。`,
        outlook: "前景取决于客户续费、净收入留存、AI 功能变现和企业 IT 预算韧性。"
      };
    case "AI / cloud / platform technology":
      return {
        business: `${stock.name} 属于云、平台或 AI 相关科技公司，业务通常依赖规模化用户、数据和基础设施。`,
        outlook: "前景取决于 AI 投入能否转化为收入、平台生态能否扩大，以及资本开支回报。"
      };
    case "Semiconductors / chip design":
      return {
        business: `${stock.name} 属于半导体设计或芯片相关公司，主要受产品周期、客户需求和供应链影响。`,
        outlook: "前景取决于数据中心、AI、终端需求和行业库存周期是否继续改善。"
      };
    case "Payment networks / financial infrastructure":
      return {
        business: `${stock.name} 属于支付网络或金融基础设施公司，收入通常来自交易量、服务费和增值服务。`,
        outlook: "前景取决于电子支付渗透、跨境交易、监管环境和新支付技术竞争。"
      };
    case "Banks":
      return {
        business: `${stock.name} 属于银行业，核心看存贷款、手续费收入、资本实力和信用风险管理。`,
        outlook: "前景取决于利率路径、信贷质量、资本要求和客户资金稳定性。"
      };
    case "Insurance":
      return {
        business: `${stock.name} 属于保险行业，核心看承保纪律、投资收益、资本充足和赔付风险。`,
        outlook: "前景取决于保费增长、赔付率、利率环境和准备金质量。"
      };
    case "REITs":
      return {
        business: `${stock.name} 属于 REIT 或地产资产运营公司，核心看租金、出租率、资产质量和杠杆。`,
        outlook: "前景取决于利率、租户需求、债务到期压力和物业供需格局。"
      };
    case "Energy / oil and gas":
      return {
        business: `${stock.name} 属于能源或油气行业，业绩通常受商品价格、产量和资本纪律影响。`,
        outlook: "前景取决于油气价格、成本曲线、资产质量和股东回报纪律。"
      };
    case "Healthcare":
      return {
        business: `${stock.name} 属于医疗健康行业，业务通常围绕医疗服务、保险、药品或设备需求展开。`,
        outlook: "前景取决于需求刚性、成本控制、监管政策和产品/服务组合质量。"
      };
    case "Biotech / drug development":
      return {
        business: `${stock.name} 属于生物科技或药物研发公司，核心看管线、临床进展和现金 runway。`,
        outlook: "前景取决于关键临床节点、监管审批、融资能力和商业化路径。"
      };
    case "Retail / e-commerce":
      return {
        business: `${stock.name} 属于零售或电商公司，核心看客流、客单、库存和渠道效率。`,
        outlook: "前景取决于消费需求、库存周转、毛利率和线上线下渠道执行。"
      };
    case "Consumer brands / staples":
      return {
        business: `${stock.name} 属于消费品牌或必需消费品公司，核心看品牌、渠道和定价能力。`,
        outlook: "前景取决于销量、价格、成本压力和品牌护城河能否保持。"
      };
    case "Industrials / manufacturing":
      return {
        business: `${stock.name} 属于工业或制造业公司，业绩通常与订单、产能利用率和供应链效率相关。`,
        outlook: "前景取决于订单周期、利润率、资本开支回报和下游需求。"
      };
    case "Utilities":
      return {
        business: `${stock.name} 属于公用事业公司，核心看监管资产、准许回报、负债和股息覆盖。`,
        outlook: "前景取决于电力需求、利率、监管回报和基础设施投资执行。"
      };
    default:
      return {
        business: `${stock.name} 属于 ${industry}，当前按 ${stock.template} 模板进行质量价值初筛。`,
        outlook: "前景取决于行业需求、盈利质量、现金流稳定性和估值安全边际。"
      };
  }
}

function companyBrief(stock: StockScore): CompanyBrief {
  return companyBriefs[stock.ticker] || fallbackCompanyBrief(stock);
}

function cleanOutlookText(outlook: string) {
  return outlook
    .replace(/^前景取决于/, "取决于")
    .replace(/^增长取决于/, "取决于")
    .replace(/^增长主要看/, "主要看")
    .replace(/^增长看/, "看")
    .replace(/^增长来自/, "来自")
    .replace(/^前景来自/, "来自")
    .replace(/^前景高度依赖/, "高度依赖");
}

function yahooUrl(ticker: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

function secUrl(ticker: string) {
  return `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(ticker)}`;
}

function eastMoneyUrl(ticker: string) {
  const prefix = ticker.startsWith("6") ? "sh" : "sz";
  return `https://quote.eastmoney.com/${prefix}${encodeURIComponent(ticker)}.html`;
}

function cninfoUrl(ticker: string, name?: string) {
  const keyword = name ? `${ticker} ${name}` : ticker;
  return `https://www.cninfo.com.cn/new/fulltextSearch?notautosubmit=&keyWord=${encodeURIComponent(keyword)}`;
}

function fallbackSnapshotForMarket(market: Market) {
  return market === "cn" ? aShareFallbackSnapshot : fallbackSnapshot;
}

function snapshotEndpoint(market: Market) {
  return market === "cn" ? "/api/ashare-snapshot" : "/api/snapshot";
}

function searchEndpoint(market: Market) {
  return market === "cn" ? "/api/ashare-search" : "/api/search";
}

function industryOptionsForMarket(market: Market) {
  return market === "cn" ? aShareIndustryOptions : industryOptions;
}

function templateSearchKeyForMarket(market: Market) {
  return market === "cn" ? aShareTemplateSearchKey : templateSearchKey;
}

function normalizeTicker(value: string, market: Market) {
  const ticker = value.trim().toUpperCase();
  return market === "cn" ? ticker.replace(/\D/g, "") : ticker;
}

function isTicker(value: string, market: Market) {
  return market === "cn" ? aShareTickerPattern.test(value) : usTickerPattern.test(value);
}

function primaryDataUrl(market: Market, ticker: string) {
  return market === "cn" ? eastMoneyUrl(ticker) : yahooUrl(ticker);
}

function filingSearchUrl(market: Market, ticker: string, name?: string) {
  return market === "cn" ? cninfoUrl(ticker, name) : secUrl(ticker);
}

function sourceText(snapshot: Snapshot, usingFallback: boolean) {
  return usingFallback
    ? "本地兜底快照；等待服务端实时数据"
    : snapshot.source;
}

function shouldLiveLookup(value: string, scores: StockScore[], candidates: SearchCandidate[], market: Market) {
  const ticker = normalizeTicker(value, market);
  if (!isTicker(ticker, market)) return "";
  const keyword = ticker.toLowerCase();
  if (market === "us" && industryKeywords.has(keyword)) return "";
  const alreadyLoaded = scores.some((item) => item.ticker === ticker);
  const exactCandidate = candidates.some((candidate) => candidate.ticker === ticker);
  if (market === "cn") return ticker;
  if (!alreadyLoaded && !exactCandidate) return "";
  return ticker;
}

function shouldIndustryLookup(value: string) {
  const keyword = value.trim().toLowerCase();
  if (!keyword || !industryKeywords.has(keyword)) return "";
  return keyword;
}

function parseTickerList(value: string, market: Market) {
  return Array.from(
    new Set(
      value
        .split(/[\s,，;；]+/)
        .map((part) => normalizeTicker(part, market))
        .filter((part) => isTicker(part, market))
    )
  );
}

export default function App() {
  const [market, setMarket] = useState<Market>("us");
  const [snapshot, setSnapshot] = useState<Snapshot>(fallbackSnapshot);
  const [usingFallback, setUsingFallback] = useState(true);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All");
  const [selectedTicker, setSelectedTicker] = useState(fallbackSnapshot.featuredTickers[0]);
  const [minScore, setMinScore] = useState(0);
  const [lookupTicker, setLookupTicker] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [searchCandidates, setSearchCandidates] = useState<SearchCandidate[]>([]);
  const [candidateStatus, setCandidateStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [loadedIndustryKey, setLoadedIndustryKey] = useState("");
  const [compareTickers, setCompareTickers] = useState<string[]>([]);
  const [showModelGuide, setShowModelGuide] = useState(false);

  useEffect(() => {
    let alive = true;
    const fallback = fallbackSnapshotForMarket(market);
    setSnapshot(fallback);
    setUsingFallback(true);
    setQuery("");
    setIndustry("All");
    setSelectedTicker(fallback.featuredTickers[0]);
    setMinScore(0);
    setLookupTicker("");
    setLookupStatus("idle");
    setLookupMessage("");
    setSearchCandidates([]);
    setCandidateStatus("idle");
    setLoadedIndustryKey("");
    setCompareTickers([]);

    fetch(`${apiBase}${snapshotEndpoint(market)}`)
      .then((response) => {
        if (!response.ok) throw new Error("snapshot unavailable");
        return response.json();
      })
      .then((data: Snapshot) => {
        if (!alive || !Array.isArray(data.scores) || data.scores.length === 0) return;
        setSnapshot((current) => {
          const incoming = new Map(data.scores.map((score) => [score.ticker, score]));
          const preserved = current.scores.filter((score) => !incoming.has(score.ticker));
          return {
            ...data,
            scores: [...data.scores, ...preserved]
          };
        });
        setUsingFallback(false);
        setLoadedIndustryKey("");
        setSelectedTicker((current) => current || data.featuredTickers[0] || data.scores[0].ticker);
      })
      .catch(() => {
        setUsingFallback(true);
      });
    return () => {
      alive = false;
    };
  }, [market]);

  const normalizedIndustryQuery = useMemo(() => shouldIndustryLookup(query), [query]);
  const normalizedTemplateQuery = useMemo(() => {
    if (query.trim()) return "";
    return templateSearchKeyForMarket(market)[industry] || "";
  }, [industry, market, query]);
  const serverIndustryQuery = normalizedIndustryQuery || normalizedTemplateQuery;
  const activeIndustryOptions = useMemo(() => industryOptionsForMarket(market), [market]);
  const copy = marketCopy[market];

  const sortedScores = useMemo(
    () => [...snapshot.scores].sort((a, b) => b.totalScore - a.totalScore),
    [snapshot.scores]
  );

  const normalizedTickerQuery = useMemo(() => {
    return shouldLiveLookup(query, snapshot.scores, searchCandidates, market);
  }, [market, query, searchCandidates, snapshot.scores]);

  const compareSet = useMemo(() => new Set(compareTickers), [compareTickers]);
  const comparisonMode = compareTickers.length > 0;

  useEffect(() => {
    const value = query.trim();
    if (!value || normalizedIndustryQuery || value.length < 2) {
      setSearchCandidates([]);
      setCandidateStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCandidateStatus("loading");
      fetch(`${apiBase}${searchEndpoint(market)}?q=${encodeURIComponent(value)}`, {
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) throw new Error("company search unavailable");
          return response.json();
        })
        .then((data: { matches?: SearchCandidate[] }) => {
          setSearchCandidates(Array.isArray(data.matches) ? data.matches : []);
          setCandidateStatus("done");
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSearchCandidates([]);
          setCandidateStatus("error");
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [market, normalizedIndustryQuery, query]);

  useEffect(() => {
    if (!normalizedTickerQuery) {
      setLookupTicker("");
      setLookupStatus("idle");
      setLookupMessage("");
      return;
    }

    const alreadyLoaded = snapshot.scores.some((item) => item.ticker === normalizedTickerQuery);
    if (alreadyLoaded) {
      setLookupTicker(normalizedTickerQuery);
      setLookupStatus("done");
      setCompareTickers((current) => {
        if (current.includes(normalizedTickerQuery)) return current;
        return [...current, normalizedTickerQuery].slice(0, maxCompareTickers);
      });
      setSelectedTicker(normalizedTickerQuery);
      setQuery("");
      setSearchCandidates([]);
      setLookupMessage(`${normalizedTickerQuery} 已加入对比`);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLookupTicker(normalizedTickerQuery);
      setLookupStatus("loading");
      setLookupMessage(`正在实时查询 ${normalizedTickerQuery}`);
      fetch(`${apiBase}${snapshotEndpoint(market)}?tickers=${encodeURIComponent(normalizedTickerQuery)}`, {
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) throw new Error("lookup unavailable");
          return response.json();
        })
        .then((data: Snapshot) => {
          const score = data.scores?.[0];
          if (!score || score.totalScore === 0) {
            throw new Error(score?.reasons?.growth || `${normalizedTickerQuery} 暂无可用公开数据`);
          }
          setSnapshot((current) => {
            const withoutExisting = current.scores.filter((item) => item.ticker !== score.ticker);
            return {
              ...current,
              generatedAt: data.generatedAt || current.generatedAt,
              cadence: data.cadence || current.cadence,
              source: data.source || current.source,
              scores: [score, ...withoutExisting]
            };
          });
          setLoadedIndustryKey("");
          setIndustry("All");
          setSelectedTicker(score.ticker);
          setCompareTickers((current) => {
            if (current.includes(score.ticker)) return current;
            return [...current, score.ticker].slice(0, maxCompareTickers);
          });
          setUsingFallback(false);
          setQuery("");
          setSearchCandidates([]);
          setLookupStatus("done");
          setLookupMessage(`${score.ticker} 已加入对比`);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setLookupStatus("error");
          setLookupMessage(error instanceof Error ? error.message : `${normalizedTickerQuery} 查询失败`);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [market, normalizedTickerQuery, snapshot.scores]);

  useEffect(() => {
    if (!serverIndustryQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLookupTicker("");
      setLookupStatus("loading");
      setLookupMessage(`正在实时计算 ${serverIndustryQuery} 行业股票池`);
      fetch(`${apiBase}${snapshotEndpoint(market)}?q=${encodeURIComponent(serverIndustryQuery)}`, {
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) throw new Error("industry lookup unavailable");
          return response.json();
        })
        .then((data: Snapshot) => {
          if (!Array.isArray(data.scores) || data.scores.length === 0) {
            throw new Error(`${serverIndustryQuery} 暂无可用公开数据`);
          }
          setSnapshot(data);
          setUsingFallback(false);
          setLoadedIndustryKey(serverIndustryQuery);
          setSelectedTicker(data.scores[0].ticker);
          setLookupStatus("done");
          setLookupMessage(`${serverIndustryQuery} 已按服务端实时数据更新`);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setLookupStatus("error");
          setLookupMessage(error instanceof Error ? error.message : `${serverIndustryQuery} 查询失败`);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [market, serverIndustryQuery]);

  const localStockMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || normalizedIndustryQuery) return [];
    return sortedScores
      .filter((item) => item.ticker.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle))
      .slice(0, 5);
  }, [normalizedIndustryQuery, query, sortedScores]);

  const remoteCandidates = useMemo(() => {
    const loadedTickers = new Set(localStockMatches.map((item) => item.ticker));
    return searchCandidates.filter((candidate) => !loadedTickers.has(candidate.ticker)).slice(0, 5);
  }, [localStockMatches, searchCandidates]);

  const searchHint = useMemo(() => {
    const value = query.trim();
    if (!value) return "";
    if (normalizedIndustryQuery) return `${value} 识别为行业关键词，正在使用服务端行业股票池。`;
    const parsedTickers = parseTickerList(value, market);
    const hasSeparator = /[\s,，;；]/.test(value);
    const exactTicker = parsedTickers.length === 1 && (snapshot.scores.some((item) => item.ticker === parsedTickers[0]) || searchCandidates.some((candidate) => candidate.ticker === parsedTickers[0]));
    if ((hasSeparator && parsedTickers.length) || exactTicker) return `识别到 ${parsedTickers.length} 个 ticker，按 Enter 或 + 加入对比。`;
    if (candidateStatus === "loading") return "正在匹配公司名和代码。";
    const count = localStockMatches.length + remoteCandidates.length;
    if (count > 0) return `匹配到 ${count} 个候选，点击加入对比。`;
    if (candidateStatus === "error") return "候选搜索暂不可用。";
    return "没有匹配的公司名或代码。";
  }, [candidateStatus, localStockMatches.length, market, normalizedIndustryQuery, query, remoteCandidates.length, searchCandidates, snapshot.scores]);

  const filtered = useMemo(() => {
    if (comparisonMode) {
      return sortedScores.filter((item) => compareSet.has(item.ticker) && item.totalScore >= minScore);
    }
    const needle = query.trim().toLowerCase();
    const isIndustrySearchResult = Boolean(normalizedIndustryQuery && loadedIndustryKey === normalizedIndustryQuery);
    const selectedIndustryKey = templateSearchKeyForMarket(market)[industry] || "";
    const isSelectedIndustryUniverse = Boolean(!needle && selectedIndustryKey && loadedIndustryKey === selectedIndustryKey);
    return sortedScores.filter((item) => {
      const matchesText =
        !needle ||
        isIndustrySearchResult ||
        item.ticker.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle);
      const matchesIndustry = industry === "All" || isSelectedIndustryUniverse || item.template === industry;
      return matchesText && matchesIndustry && item.totalScore >= minScore;
    });
  }, [compareSet, comparisonMode, industry, loadedIndustryKey, market, minScore, normalizedIndustryQuery, query, sortedScores]);

  const featured = useMemo(() => {
    if (comparisonMode) return filtered.slice(0, 5);
    const set = new Set(snapshot.featuredTickers);
    const items = snapshot.scores.filter((item) => set.has(item.ticker));
    return items.length ? items : sortedScores.slice(0, 5);
  }, [comparisonMode, filtered, snapshot.featuredTickers, snapshot.scores, sortedScores]);

  const selected = useMemo(
    () => sortedScores.find((item) => item.ticker === selectedTicker) || filtered[0] || sortedScores[0],
    [filtered, selectedTicker, sortedScores]
  );
  const selectedBrief = useMemo(() => (selected ? companyBrief(selected) : null), [selected]);

  const radarData = useMemo(
    () =>
      dimensions.map((dimension) => ({
        metric: dimension.label,
        score: selected?.[dimension.key] || 0,
        fullMark: 5
      })),
    [selected]
  );

  const barData = useMemo(
    () =>
      filtered.slice(0, 12).map((item) => ({
        ticker: item.ticker,
        score: item.totalScore,
        template: item.template
      })),
    [filtered]
  );

  const summary = useMemo(() => {
    const source = comparisonMode ? filtered : sortedScores;
    const high = source.filter((item) => item.totalScore >= 25).length;
    const avg = source.reduce((sum, item) => sum + item.totalScore, 0) / Math.max(source.length, 1);
    const templates = new Set(source.map((item) => item.template)).size;
    return { high, avg, templates };
  }, [comparisonMode, filtered, sortedScores]);

  const lookupCandidateTicker = normalizedTickerQuery || localStockMatches[0]?.ticker || remoteCandidates[0]?.ticker || selected?.ticker || (market === "cn" ? "600519" : "MSFT");
  const customPrimaryUrl = primaryDataUrl(market, lookupCandidateTicker);
  const addTickersToCompare = async (tickers: string[]) => {
    const requested = Array.from(new Set(tickers.map((ticker) => normalizeTicker(ticker, market)).filter((ticker) => isTicker(ticker, market)))).slice(0, maxCompareTickers);
    if (!requested.length) {
      setLookupStatus("error");
      setLookupMessage("请输入股票代码，或从候选中选择公司。");
      return;
    }

    const knownTickers = new Set(snapshot.scores.map((item) => item.ticker));
    const known = requested.filter((ticker) => knownTickers.has(ticker));
    const missing = requested.filter((ticker) => !knownTickers.has(ticker));
    let added = [...known];
    let rejected: string[] = [];

    if (missing.length) {
      setLookupTicker(missing.join(", "));
      setLookupStatus("loading");
      setLookupMessage(`正在实时计算 ${missing.join(", ")}`);
      try {
        const response = await fetch(`${apiBase}${snapshotEndpoint(market)}?tickers=${encodeURIComponent(missing.join(","))}`);
        if (!response.ok) throw new Error("lookup unavailable");
        const data: Snapshot = await response.json();
        const validScores = (data.scores || []).filter((score) => score.totalScore > 0);
        rejected = missing.filter((ticker) => !validScores.some((score) => score.ticker === ticker));
        if (validScores.length) {
          setSnapshot((current) => {
            const incoming = new Map(validScores.map((score) => [score.ticker, score]));
            const existing = current.scores.filter((item) => !incoming.has(item.ticker));
            return {
              ...current,
              generatedAt: data.generatedAt || current.generatedAt,
              cadence: data.cadence || current.cadence,
              source: data.source || current.source,
              scores: [...validScores, ...existing]
            };
          });
          added = [...added, ...validScores.map((score) => score.ticker)];
          setUsingFallback(false);
          setLoadedIndustryKey("");
          setIndustry("All");
        }
      } catch (error) {
        setLookupStatus("error");
        setLookupMessage(error instanceof Error ? error.message : "实时计算失败");
        return;
      }
    }

    if (!added.length) {
      setLookupStatus("error");
      setLookupMessage(rejected.length ? `未找到 ${rejected.join(", ")}` : "没有可加入的股票。");
      return;
    }

    setCompareTickers((current) => Array.from(new Set([...current, ...added])).slice(0, maxCompareTickers));
    setSelectedTicker(added[0]);
    setQuery("");
    setSearchCandidates([]);
    setCandidateStatus("idle");
    setLookupTicker("");
    setLookupStatus("done");
    setLookupMessage(rejected.length ? `已加入 ${added.join(", ")}；未找到 ${rejected.join(", ")}` : `已加入 ${added.join(", ")} 对比`);
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.trim()) setIndustry("All");
  };
  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    if (value !== "All") {
      setQuery("");
      setSearchCandidates([]);
      setCandidateStatus("idle");
      setCompareTickers([]);
    }
  };
  const handleAddCurrentInput = () => {
    const raw = query.trim();
    const hasSeparator = /[\s,，;；]/.test(raw);
    const parsed = parseTickerList(raw, market);
    const exactParsed = hasSeparator
      ? parsed
      : parsed.filter((ticker) => snapshot.scores.some((item) => item.ticker === ticker) || searchCandidates.some((candidate) => candidate.ticker === ticker));
    const fallbackTicker = localStockMatches[0]?.ticker || remoteCandidates[0]?.ticker || "";
    const tickers = exactParsed.length ? exactParsed : fallbackTicker ? [fallbackTicker] : [];
    void addTickersToCompare(tickers);
  };
  const handleCandidatePick = (ticker: string) => {
    void addTickersToCompare([ticker]);
  };
  const handleRemoveCompareTicker = (ticker: string) => {
    const next = compareTickers.filter((item) => item !== ticker);
    setCompareTickers(next);
    if (selectedTicker === ticker) setSelectedTicker(next[0] || filtered[0]?.ticker || sortedScores[0]?.ticker || fallbackSnapshot.featuredTickers[0]);
  };
  const handleClearCompare = () => {
    setCompareTickers([]);
    setLookupMessage("");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="eyebrow">Quality Value</p>
            <h1>Stock Screener</h1>
          </div>
        </div>

        <section className="market-switch" aria-label="市场切换">
          {(["us", "cn"] as Market[]).map((item) => (
            <button
              key={item}
              type="button"
              className={market === item ? "active" : ""}
              onClick={() => setMarket(item)}
            >
              {marketCopy[item].label}
            </button>
          ))}
        </section>

        <section className="control-group">
          <label htmlFor="search">{copy.searchLabel}</label>
          <div className="input-row">
            <Search size={18} />
            <input
              id="search"
              value={query}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddCurrentInput();
              }}
            />
            <button className="input-action" type="button" onClick={handleAddCurrentInput} aria-label="加入对比">
              <Plus size={16} />
            </button>
          </div>
          {searchHint ? <p className="search-hint">{searchHint}</p> : null}
          {localStockMatches.length || remoteCandidates.length ? (
            <div className="search-suggestions" aria-label="搜索候选">
              {localStockMatches.map((item) => (
                <button key={`local-${item.ticker}`} className="suggestion-button" onClick={() => handleCandidatePick(item.ticker)}>
                  <strong>{item.ticker}</strong>
                  <span>{item.name}</span>
                  <small>加入</small>
                </button>
              ))}
              {remoteCandidates.map((candidate) => (
                <button key={`remote-${candidate.ticker}`} className="suggestion-button" onClick={() => handleCandidatePick(candidate.ticker)}>
                  <strong>{candidate.ticker}</strong>
                  <span>{candidate.name}</span>
                  <small>加入</small>
                </button>
              ))}
            </div>
          ) : null}
          <a className="text-link" href={customPrimaryUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            {copy.externalSearchLabel}
          </a>
          {lookupMessage ? (
            <p className={`lookup-message ${lookupStatus}`}>{lookupMessage}</p>
          ) : null}
        </section>

        <section className="control-group compare-group">
          <div className="compare-head">
            <label>对比池</label>
            {compareTickers.length ? (
              <button type="button" onClick={handleClearCompare}>
                清空
              </button>
            ) : null}
          </div>
          {compareTickers.length ? (
            <div className="compare-chips" aria-label="已加入对比的股票">
              {compareTickers.map((ticker) => (
                <span className={`compare-chip ${selectedTicker === ticker ? "active" : ""}`} key={ticker}>
                  <button type="button" onClick={() => setSelectedTicker(ticker)}>
                    {ticker}
                  </button>
                  <button type="button" onClick={() => handleRemoveCompareTicker(ticker)} aria-label={`移除 ${ticker}`}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="compare-empty">输入多个 ticker 后按 Enter，或点击候选加入。</p>
          )}
        </section>

        <section className="control-group">
          <label htmlFor="industry">行业模板</label>
          <div className="select-row">
            <Filter size={17} />
            <select id="industry" value={industry} onChange={(event) => handleIndustryChange(event.target.value)}>
              {activeIndustryOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "全部行业模板" : item}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </section>

        <section className="control-group">
          <div className="slider-head">
            <label htmlFor="min-score">最低总分</label>
            <strong>{minScore}</strong>
          </div>
          <input
            id="min-score"
            type="range"
            min="0"
            max="30"
            step="1"
            value={minScore}
            onChange={(event) => setMinScore(Number(event.target.value))}
          />
        </section>

        <section className="method-block">
          <div className="method-title">
            <SlidersHorizontal size={17} />
            六维评分
          </div>
          <p>增长、质量、现金流、估值、风险、可持续性各 0-5 分；总分用于研究优先级，不是买卖指令。</p>
          <button className="model-guide-button" type="button" onClick={() => setShowModelGuide(true)}>
            <BookOpen size={16} />
            查看模型说明
          </button>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{snapshot.cadence === "live" ? "实时快照" : "本地快照"} · {fmtDate(snapshot.generatedAt)}</p>
            <h2>{comparisonMode ? copy.compareTitle : copy.title}</h2>
          </div>
          <div className="source-pill">
            <ChartLine size={16} />
            {sourceText(snapshot, usingFallback)}
          </div>
        </header>

        <motion.section
          className="featured-strip"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {featured.slice(0, 5).map((item) => {
            const itemTier = tier(item.totalScore);
            return (
              <button
                className={`featured-item ${selected?.ticker === item.ticker ? "active" : ""}`}
                key={item.ticker}
                onClick={() => setSelectedTicker(item.ticker)}
              >
                <span className="ticker">{item.ticker}</span>
                <span className="company">{item.name}</span>
                <span className="score-line">
                  <strong>{item.totalScore}/30</strong>
                  <small className={itemTier.className}>{itemTier.label}</small>
                </span>
              </button>
            );
          })}
        </motion.section>

        <section className="analytics-grid">
          <motion.div
            className="chart-panel primary-chart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
          >
            <div className="panel-head">
              <div>
                <p className="eyebrow">{comparisonMode ? "Compare" : "Top Screen"}</p>
                <h3>{comparisonMode ? "对比结果排行" : "筛选结果排行"}</h3>
              </div>
              <span>{filtered.length} 支</span>
            </div>
            <div className="bar-chart">
              {barData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#d8dde8" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ticker" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 30]} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(64, 93, 230, 0.08)" }} />
                    <Bar
                      dataKey="score"
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => {
                        const payload = data as unknown as { ticker?: string };
                        if (payload.ticker) setSelectedTicker(payload.ticker);
                      }}
                    >
                      {barData.map((entry) => (
                        <Cell key={entry.ticker} fill={entry.score >= 25 ? "#237a62" : entry.score >= 20 ? "#405de6" : "#a05a2c"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  {lookupStatus === "loading" && lookupTicker
                    ? `${lookupTicker} 实时查询中`
                    : comparisonMode
                      ? "对比股票低于当前最低总分"
                      : "没有匹配结果"}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="chart-panel radar-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.45 }}
          >
            <div className="panel-head">
              <div>
                <p className="eyebrow">Selected</p>
                <h3>{selected?.ticker} 六维画像</h3>
              </div>
              <span>{fmtPrice(selected?.currentPrice ?? null, market)}</span>
            </div>
            <div className="radar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#d8dde8" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#435066", fontSize: 12 }} />
                  <Radar name="Score" dataKey="score" stroke="#405de6" fill="#405de6" fillOpacity={0.24} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </section>

        <section className="table-section">
          <div className="panel-head table-head">
            <div>
              <p className="eyebrow">{comparisonMode ? "Compare Set" : "Universe"}</p>
              <h3>{comparisonMode ? "对比股票池" : "可搜索股票池"}</h3>
            </div>
            <div className="metrics-row">
              <span>{summary.high} 支高质量候选</span>
              <span>平均 {summary.avg.toFixed(1)}/30</span>
              <span>{summary.templates} 类模板</span>
            </div>
          </div>
          <div className="score-table">
            <div className="score-row score-row-head">
              <span>股票</span>
              <span>行业模板</span>
              <span>总分</span>
              <span>六维分布</span>
              <span>公开数据</span>
            </div>
            {filtered.map((item) => {
              const itemTier = tier(item.totalScore);
              return (
                <button className="score-row" key={item.ticker} onClick={() => setSelectedTicker(item.ticker)}>
                  <span className="stock-cell">
                    <strong>{item.ticker}</strong>
                    <small>{item.name}</small>
                  </span>
                  <span>{item.template}</span>
                  <span className={`score-badge ${itemTier.className}`}>{item.totalScore}/30</span>
                  <span className="mini-bars" aria-label={`${item.ticker} score dimensions`}>
                    {dimensions.map((dimension) => (
                      <i
                        key={dimension.key}
                        style={{ height: `${Math.max(18, item[dimension.key] * 16)}%` }}
                        title={`${dimension.label}: ${item[dimension.key]}/5`}
                      />
                    ))}
                  </span>
                  <span className="external-cell">
                    <a href={primaryDataUrl(market, item.ticker)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                      {copy.primaryDataLabel} <ArrowUpRight size={14} />
                    </a>
                  </span>
                </button>
              );
            })}
            {!filtered.length ? (
              <div className="score-empty">
                {lookupStatus === "loading" && lookupTicker
                  ? `正在从服务端计算 ${lookupTicker} 的六维评分`
                  : comparisonMode
                    ? "当前最低总分隐藏了对比股票；降低分数阈值即可显示。"
                    : "当前筛选条件下没有结果。输入 ticker 或公司名后加入对比。"}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <aside className="detail-panel">
        {selected ? (
          <>
            <div className="detail-header">
              <div>
                <p className="eyebrow">Stock Detail</p>
                <h2>{selected.ticker}</h2>
                <p>{selected.name}</p>
              </div>
              <span className={`score-badge ${tier(selected.totalScore).className}`}>{selected.totalScore}/30</span>
            </div>

            <div className="detail-actions">
              <a href={primaryDataUrl(market, selected.ticker)} target="_blank" rel="noreferrer">
                {copy.primaryDataLabel} <ExternalLink size={15} />
              </a>
              <a href={filingSearchUrl(market, selected.ticker, selected.name)} target="_blank" rel="noreferrer">
                {copy.filingLabel} <ExternalLink size={15} />
              </a>
            </div>

            <div className="detail-meta">
              <span>{selected.sector || "Sector n/a"}</span>
              <span>{selected.industry || "Industry n/a"}</span>
              <span>{selected.template}</span>
            </div>

            {selectedBrief ? (
              <section className="company-brief">
                <h3>公司简介</h3>
                <p>
                  <strong>业务：</strong>
                  {selectedBrief.business}
                </p>
                <p>
                  <strong>前景：</strong>
                  {cleanOutlookText(selectedBrief.outlook)}
                </p>
              </section>
            ) : null}

            <section className="dimension-list">
              {dimensions.map((dimension) => (
                <div className="dimension-item" key={dimension.key}>
                  <div>
                    <strong>{dimension.label}</strong>
                    <small>{dimension.short}</small>
                  </div>
                  <div className="dimension-score">
                    <span style={{ width: `${selected[dimension.key] * 20}%` }} />
                  </div>
                  <b>{selected[dimension.key]}/5</b>
                </div>
              ))}
            </section>

            <section className="reason-block">
              <h3>评分依据</h3>
              {dimensions.map((dimension) => (
                <p key={dimension.key}>
                  <strong>{dimension.label}：</strong>
                  {compactReason(selected, dimension.key)}
                </p>
              ))}
            </section>

            <section className="risk-block">
              <div>
                <ShieldAlert size={18} />
                <h3>反证条件</h3>
              </div>
              <p>
                若收入增长低于行业、FCF 无法跟随利润、估值只依赖远期叙事、杠杆或监管风险恶化，本筛选结论应下调。
              </p>
            </section>

            <p className="disclaimer">
              本站只做公开数据研究排序，不构成个性化投资、税务或交易建议。买入前应核对最新公告、10-K/10-Q、电话会和估值模型。
            </p>
          </>
        ) : null}
      </aside>

      {showModelGuide ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowModelGuide(false)}>
          <motion.section
            className="model-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-guide-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="model-modal-head">
              <div>
                <p className="eyebrow">Model Documentation</p>
                <h2 id="model-guide-title">质量价值筛选模型说明</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowModelGuide(false)} aria-label="关闭模型说明">
                <X size={18} />
              </button>
            </header>

            <div className="model-doc-body">
              <section>
                <h3>核心逻辑</h3>
                <ol className="model-steps">
                  <li>
                    <strong>先分行业。</strong>
                    <span>银行、REITs、SaaS、半导体、能源等行业不能用同一套倍数机械比较。</span>
                  </li>
                  <li>
                    <strong>再选指标。</strong>
                    <span>每个行业优先使用更适配的增长、质量、现金流、估值和风险指标。</span>
                  </li>
                  <li>
                    <strong>六维打分。</strong>
                    <span>每维 0-5 分，总分 30 分，只代表研究优先级，不代表买卖指令。</span>
                  </li>
                  <li>
                    <strong>保留反证。</strong>
                    <span>若增长、现金流、估值或杠杆数据与假设相反，评分应下调。</span>
                  </li>
                </ol>
              </section>

              <section>
                <h3>定性档位</h3>
                <div className="model-table compact">
                  {scoreScaleRows.map((row) => (
                    <div className="model-table-row" key={row.score}>
                      <strong>{row.score}</strong>
                      <span>{row.tone}</span>
                      <p>{row.meaning}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>六维评分口径</h3>
                <div className="model-table">
                  {modelDimensionRows.map((row) => (
                    <div className="model-table-row" key={row.dimension}>
                      <strong>{row.dimension}</strong>
                      <span>{row.focus}</span>
                      <p>{row.use}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>总分解释</h3>
                <div className="model-table compact">
                  {modelTierRows.map((row) => (
                    <div className="model-table-row" key={row.total}>
                      <strong>{row.total}</strong>
                      <span>{row.label}</span>
                      <p>{row.action}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>数据与边界</h3>
                <p>
                  美股服务端优先使用 SEC fundamentals 与公开市场价格；A 股服务端优先使用东方财富/新浪公开行情，并叠加本地周度财务快照。若服务端不可用，页面使用本地兜底快照。所有结果都是公开数据研究排序，
                  不构成个性化投资、税务或交易建议。
                </p>
                <p>
                  这个模型的主要用途是缩小研究范围。买入前仍应核对最新 10-K / 10-Q、电话会、行业周期、估值模型和个股特定风险。
                </p>
              </section>
            </div>
          </motion.section>
        </div>
      ) : null}
    </main>
  );
}
