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

type SearchCandidate = {
  ticker: string;
  name: string;
  exchange?: string;
  score?: number;
};

const dimensions: Array<{ key: ScoreDimension; label: string; short: string }> = [
  { key: "growth", label: "高增长", short: "Growth" },
  { key: "quality", label: "高质量", short: "Quality" },
  { key: "cashFlow", label: "高现金流", short: "FCF" },
  { key: "valuation", label: "低估值", short: "Value" },
  { key: "risk", label: "低风险", short: "Risk" },
  { key: "sustainability", label: "可持续", short: "Moat" }
];

const apiBase =
  typeof window !== "undefined" && window.location.protocol === "file:"
    ? "https://quality-value-screener-site.vercel.app"
    : "";

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

function shouldLiveLookup(value: string, scores: StockScore[], candidates: SearchCandidate[]) {
  const ticker = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) return "";
  const keyword = ticker.toLowerCase();
  if (industryKeywords.has(keyword)) return "";
  if (scores.some((item) => item.ticker === ticker)) return "";
  if (!candidates.some((candidate) => candidate.ticker === ticker)) return "";
  return ticker;
}

function shouldIndustryLookup(value: string) {
  const keyword = value.trim().toLowerCase();
  if (!keyword || !industryKeywords.has(keyword)) return "";
  return keyword;
}

export default function App() {
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

  useEffect(() => {
    let alive = true;
    fetch(`${apiBase}/api/snapshot`)
      .then((response) => {
        if (!response.ok) throw new Error("snapshot unavailable");
        return response.json();
      })
      .then((data: Snapshot) => {
        if (!alive || !Array.isArray(data.scores) || data.scores.length === 0) return;
        setSnapshot(data);
        setUsingFallback(false);
        setLoadedIndustryKey("");
        setSelectedTicker((current) => data.scores.find((item) => item.ticker === current)?.ticker || data.featuredTickers[0] || data.scores[0].ticker);
      })
      .catch(() => {
        setUsingFallback(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const normalizedIndustryQuery = useMemo(() => shouldIndustryLookup(query), [query]);
  const normalizedTemplateQuery = useMemo(() => {
    if (query.trim()) return "";
    return templateSearchKey[industry] || "";
  }, [industry, query]);
  const serverIndustryQuery = normalizedIndustryQuery || normalizedTemplateQuery;

  const sortedScores = useMemo(
    () => [...snapshot.scores].sort((a, b) => b.totalScore - a.totalScore),
    [snapshot.scores]
  );

  const normalizedTickerQuery = useMemo(() => {
    return shouldLiveLookup(query, snapshot.scores, searchCandidates);
  }, [query, searchCandidates, snapshot.scores]);

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
      fetch(`${apiBase}/api/search?q=${encodeURIComponent(value)}`, {
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
  }, [normalizedIndustryQuery, query]);

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
      setLookupMessage("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLookupTicker(normalizedTickerQuery);
      setLookupStatus("loading");
      setLookupMessage(`正在实时查询 ${normalizedTickerQuery}`);
      fetch(`${apiBase}/api/snapshot?tickers=${encodeURIComponent(normalizedTickerQuery)}`, {
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
          setUsingFallback(false);
          setLookupStatus("done");
          setLookupMessage(`${score.ticker} 已加入实时股票池`);
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
  }, [normalizedTickerQuery, snapshot.scores]);

  useEffect(() => {
    if (!serverIndustryQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLookupTicker("");
      setLookupStatus("loading");
      setLookupMessage(`正在实时计算 ${serverIndustryQuery} 行业股票池`);
      fetch(`${apiBase}/api/snapshot?q=${encodeURIComponent(serverIndustryQuery)}`, {
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
  }, [serverIndustryQuery]);

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
    if (candidateStatus === "loading") return "正在匹配公司名和代码。";
    const count = localStockMatches.length + remoteCandidates.length;
    if (count > 0) return `匹配到 ${count} 个候选。`;
    if (candidateStatus === "error") return "候选搜索暂不可用。";
    return "没有匹配的公司名或代码。";
  }, [candidateStatus, localStockMatches.length, normalizedIndustryQuery, query, remoteCandidates.length]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const isIndustrySearchResult = Boolean(normalizedIndustryQuery && loadedIndustryKey === normalizedIndustryQuery);
    const selectedIndustryKey = templateSearchKey[industry] || "";
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
  }, [industry, loadedIndustryKey, minScore, normalizedIndustryQuery, query, sortedScores]);

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

  const yahooLookupTicker = normalizedTickerQuery || localStockMatches[0]?.ticker || remoteCandidates[0]?.ticker || selected?.ticker || "MSFT";
  const customYahoo = yahooUrl(yahooLookupTicker);
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.trim()) setIndustry("All");
  };
  const handleCandidatePick = (ticker: string) => {
    setQuery(ticker);
    setIndustry("All");
    const loaded = snapshot.scores.find((item) => item.ticker === ticker);
    if (loaded) setSelectedTicker(loaded.ticker);
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

        <section className="control-group">
          <label htmlFor="search">股票 / 行业搜索</label>
          <div className="input-row">
            <Search size={18} />
            <input
              id="search"
              value={query}
              placeholder="代码或公司名"
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
          {searchHint ? <p className="search-hint">{searchHint}</p> : null}
          {localStockMatches.length || remoteCandidates.length ? (
            <div className="search-suggestions" aria-label="搜索候选">
              {localStockMatches.map((item) => (
                <button key={`local-${item.ticker}`} className="suggestion-button" onClick={() => handleCandidatePick(item.ticker)}>
                  <strong>{item.ticker}</strong>
                  <span>{item.name}</span>
                  <small>{item.totalScore}/30</small>
                </button>
              ))}
              {remoteCandidates.map((candidate) => (
                <button key={`remote-${candidate.ticker}`} className="suggestion-button" onClick={() => handleCandidatePick(candidate.ticker)}>
                  <strong>{candidate.ticker}</strong>
                  <span>{candidate.name}</span>
                  <small>{candidate.exchange || "SEC"}</small>
                </button>
              ))}
            </div>
          ) : null}
          <a className="text-link" href={customYahoo} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            打开 Yahoo 查询候选标的
          </a>
          {lookupMessage ? (
            <p className={`lookup-message ${lookupStatus}`}>{lookupMessage}</p>
          ) : null}
        </section>

        <section className="control-group">
          <label htmlFor="industry">行业模板</label>
          <div className="select-row">
            <Filter size={17} />
            <select id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)}>
              {industryOptions.map((item) => (
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
                  {lookupStatus === "loading" && lookupTicker ? `${lookupTicker} 实时查询中` : "没有匹配结果"}
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
            {!filtered.length ? (
              <div className="score-empty">
                {lookupStatus === "loading" && lookupTicker
                  ? `正在从服务端计算 ${lookupTicker} 的六维评分`
                  : "当前筛选条件下没有结果。输入具体 ticker 时会自动实时查询。"}
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
