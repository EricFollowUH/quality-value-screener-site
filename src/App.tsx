import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ExternalLink,
  Filter,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  ChartLine
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
import { fallbackSnapshot } from "./fallbackData";
import type { ScoreDimension, Snapshot, StockScore } from "./types";

const dimensions: Array<{ key: ScoreDimension; label: string; short: string }> = [
  { key: "growth", label: "高增长", short: "Growth" },
  { key: "quality", label: "高质量", short: "Quality" },
  { key: "cashFlow", label: "高现金流", short: "FCF" },
  { key: "valuation", label: "低估值", short: "Value" },
  { key: "risk", label: "低风险", short: "Risk" },
  { key: "sustainability", label: "可持续", short: "Moat" }
];

const tickerExamples = ["MSFT", "NVDA", "V", "GOOGL", "UNH"];

function tier(score: number) {
  if (score >= 25) return { label: "高质量候选", className: "tier-high" };
  if (score >= 20) return { label: "有吸引力", className: "tier-mid" };
  if (score >= 15) return { label: "普通观察", className: "tier-watch" };
  return { label: "低优先级", className: "tier-low" };
}

function fmtPrice(value: number | null) {
  if (value == null) return "n/a";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
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

function yahooUrl(ticker: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

function secUrl(ticker: string) {
  return `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(ticker)}`;
}

function sourceText(snapshot: Snapshot, usingFallback: boolean) {
  return usingFallback
    ? "本地兜底快照；等待服务端实时数据"
    : snapshot.source;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(fallbackSnapshot);
  const [usingFallback, setUsingFallback] = useState(true);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All");
  const [selectedTicker, setSelectedTicker] = useState(fallbackSnapshot.featuredTickers[0]);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/snapshot")
      .then((response) => {
        if (!response.ok) throw new Error("snapshot unavailable");
        return response.json();
      })
      .then((data: Snapshot) => {
        if (!alive || !Array.isArray(data.scores) || data.scores.length === 0) return;
        setSnapshot(data);
        setUsingFallback(false);
        setSelectedTicker((current) => data.scores.find((item) => item.ticker === current)?.ticker || data.featuredTickers[0] || data.scores[0].ticker);
      })
      .catch(() => {
        setUsingFallback(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sortedScores = useMemo(
    () => [...snapshot.scores].sort((a, b) => b.totalScore - a.totalScore),
    [snapshot.scores]
  );

  const industries = useMemo(() => {
    const templates = Array.from(new Set(sortedScores.map((item) => item.template))).sort();
    return ["All", ...templates];
  }, [sortedScores]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortedScores.filter((item) => {
      const matchesText =
        !needle ||
        item.ticker.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle) ||
        item.sector.toLowerCase().includes(needle) ||
        item.industry.toLowerCase().includes(needle) ||
        item.template.toLowerCase().includes(needle);
      const matchesIndustry = industry === "All" || item.template === industry;
      return matchesText && matchesIndustry && item.totalScore >= minScore;
    });
  }, [industry, minScore, query, sortedScores]);

  const featured = useMemo(() => {
    const set = new Set(snapshot.featuredTickers);
    const items = snapshot.scores.filter((item) => set.has(item.ticker));
    return items.length ? items : sortedScores.slice(0, 5);
  }, [snapshot.featuredTickers, snapshot.scores, sortedScores]);

  const selected = useMemo(
    () => sortedScores.find((item) => item.ticker === selectedTicker) || filtered[0] || sortedScores[0],
    [filtered, selectedTicker, sortedScores]
  );

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
    const high = sortedScores.filter((item) => item.totalScore >= 25).length;
    const avg = sortedScores.reduce((sum, item) => sum + item.totalScore, 0) / Math.max(sortedScores.length, 1);
    const templates = new Set(sortedScores.map((item) => item.template)).size;
    return { high, avg, templates };
  }, [sortedScores]);

  const customYahoo = query.trim() ? yahooUrl(query.trim().toUpperCase()) : yahooUrl(selected?.ticker || "MSFT");

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

        <section className="control-group">
          <label htmlFor="search">股票 / 行业搜索</label>
          <div className="input-row">
            <Search size={18} />
            <input
              id="search"
              value={query}
              placeholder="例如 MSFT, SaaS, Semiconductor"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <a className="text-link" href={customYahoo} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            打开 Yahoo 查询输入标的
          </a>
        </section>

        <section className="control-group">
          <label htmlFor="industry">行业模板</label>
          <div className="select-row">
            <Filter size={17} />
            <select id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)}>
              {industries.map((item) => (
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
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{snapshot.cadence === "live" ? "实时快照" : "本地快照"} · {fmtDate(snapshot.generatedAt)}</p>
            <h2>行业化质量价值筛选</h2>
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
                <p className="eyebrow">Top Screen</p>
                <h3>筛选结果排行</h3>
              </div>
              <span>{filtered.length} 支</span>
            </div>
            <div className="bar-chart">
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
              <span>{fmtPrice(selected?.currentPrice ?? null)}</span>
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
              <p className="eyebrow">Universe</p>
              <h3>可搜索股票池</h3>
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
                    <a href={yahooUrl(item.ticker)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                      Yahoo <ArrowUpRight size={14} />
                    </a>
                  </span>
                </button>
              );
            })}
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
              <a href={yahooUrl(selected.ticker)} target="_blank" rel="noreferrer">
                Yahoo Finance <ExternalLink size={15} />
              </a>
              <a href={secUrl(selected.ticker)} target="_blank" rel="noreferrer">
                SEC Search <ExternalLink size={15} />
              </a>
            </div>

            <div className="detail-meta">
              <span>{selected.sector || "Sector n/a"}</span>
              <span>{selected.industry || "Industry n/a"}</span>
              <span>{selected.template}</span>
            </div>

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
                  {selected.reasons[dimension.key]}
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
    </main>
  );
}
