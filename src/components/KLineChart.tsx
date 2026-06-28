import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import { refreshKline, getKlineData, type KlineBar, type KlinePeriod } from "../services/klineService";
import { RefreshCw } from "lucide-react";

interface Props {
  stockId: string;
  market: string;
}

type MainOverlay = "ma" | "boll";
type SubPanel = "vol" | "macd";
type Time = CandlestickData["time"];

// ---- Indicator math ----

function calcMA(closes: number[], n: number): (number | null)[] {
  return closes.map((_, i) =>
    i < n - 1 ? null : closes.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n
  );
}

function calcBoll(closes: number[], n = 20, k = 2): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < n - 1) { mid.push(null); upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - n + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - avg) ** 2, 0) / n);
    mid.push(avg);
    upper.push(avg + k * std);
    lower.push(avg - k * std);
  }
  return { mid, upper, lower };
}

function calcEMA(closes: number[], n: number): number[] {
  const k = 2 / (n + 1);
  const ema: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  return ema;
}

function calcMACD(closes: number[]): { macd: number[]; signal: number[]; hist: number[] } {
  if (closes.length < 26) return { macd: [], signal: [], hist: [] };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calcEMA(macd, 9);
  const hist = macd.map((v, i) => v - signal[i]);
  return { macd, signal, hist };
}

// ---- Component ----

export default function KLineChart({ stockId, market }: Props) {
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // MA refs
  const ma5Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma10Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  // Bollinger refs
  const bollMidRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bollUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bollLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  // sub panel refs
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const barsRef = useRef<KlineBar[]>([]);
  const mainOverlayRef = useRef<MainOverlay>("ma");
  const subPanelRef = useRef<SubPanel>("vol");

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bars, setBars] = useState<KlineBar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [period, setPeriod] = useState<KlinePeriod>("d");
  const [mainOverlay, setMainOverlay] = useState<MainOverlay>("ma");
  const [subPanel, setSubPanel] = useState<SubPanel>("vol");

  // ---- Series creation helpers (require chart to exist) ----

  function addMASeries(chart: IChartApi, data: KlineBar[]) {
    const closes = data.map(b => b.close);
    const dates = data.map(b => b.date as Time);
    const configs = [
      { ref: ma5Ref, n: 5, color: "#f59e0b" },
      { ref: ma10Ref, n: 10, color: "#3b82f6" },
      { ref: ma20Ref, n: 20, color: "#8b5cf6" },
    ] as const;
    for (const { ref, n, color } of configs) {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const vals = calcMA(closes, n);
      const lineData: LineData[] = dates
        .map((t, i) => ({ time: t, value: vals[i] as number }))
        .filter(d => d.value != null);
      s.setData(lineData);
      (ref as React.MutableRefObject<ISeriesApi<"Line"> | null>).current = s;
    }
  }

  function removeMASeries(chart: IChartApi) {
    for (const ref of [ma5Ref, ma10Ref, ma20Ref]) {
      if (ref.current) { try { chart.removeSeries(ref.current); } catch { /* ignore */ } ref.current = null; }
    }
  }

  function addBollSeries(chart: IChartApi, data: KlineBar[]) {
    const closes = data.map(b => b.close);
    const dates = data.map(b => b.date as Time);
    const { mid, upper, lower } = calcBoll(closes);

    const midS = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const upperS = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const lowerS = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });

    const toLineData = (vals: (number | null)[]): LineData[] =>
      dates.map((t, i) => ({ time: t, value: vals[i] as number })).filter(d => d.value != null);

    midS.setData(toLineData(mid));
    upperS.setData(toLineData(upper));
    lowerS.setData(toLineData(lower));

    bollMidRef.current = midS;
    bollUpperRef.current = upperS;
    bollLowerRef.current = lowerS;
  }

  function removeBollSeries(chart: IChartApi) {
    for (const ref of [bollMidRef, bollUpperRef, bollLowerRef]) {
      if (ref.current) { try { chart.removeSeries(ref.current); } catch { /* ignore */ } ref.current = null; }
    }
  }

  function addVolSeries(chart: IChartApi, data: KlineBar[]) {
    const s = chart.addSeries(HistogramSeries, {
      color: "#94a3b8",
      priceFormat: { type: "volume" },
      priceScaleId: "sub",
    });
    chart.priceScale("sub").applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
    s.setData(data.map(b => ({
      time: b.date as Time,
      value: b.volume,
      color: b.close >= b.open ? "#fca5a5" : "#86efac",
    })));
    volRef.current = s;
  }

  function removeVolSeries(chart: IChartApi) {
    if (volRef.current) { try { chart.removeSeries(volRef.current); } catch { /* ignore */ } volRef.current = null; }
  }

  function addMACDSeries(chart: IChartApi, data: KlineBar[]) {
    const closes = data.map(b => b.close);
    const dates = data.map(b => b.date as Time);
    const { macd, signal, hist } = calcMACD(closes);
    if (!macd.length) return;

    const histS = chart.addSeries(HistogramSeries, {
      color: "#94a3b8",
      priceScaleId: "sub",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale("sub").applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
    histS.setData(dates.map((t, i) => ({
      time: t, value: hist[i],
      color: hist[i] >= 0 ? "#fca5a5" : "#86efac",
    })));
    macdHistRef.current = histS;

    const macdS = chart.addSeries(LineSeries, {
      color: "#3b82f6", lineWidth: 1, priceScaleId: "sub",
      priceLineVisible: false, lastValueVisible: false,
    });
    macdS.setData(dates.map((t, i) => ({ time: t, value: macd[i] })));
    macdLineRef.current = macdS;

    const signalS = chart.addSeries(LineSeries, {
      color: "#f97316", lineWidth: 1, priceScaleId: "sub",
      priceLineVisible: false, lastValueVisible: false,
    });
    signalS.setData(dates.map((t, i) => ({ time: t, value: signal[i] })));
    macdSignalRef.current = signalS;
  }

  function removeMACDSeries(chart: IChartApi) {
    for (const ref of [macdHistRef, macdLineRef, macdSignalRef]) {
      if (ref.current) { try { chart.removeSeries(ref.current); } catch { /* ignore */ } ref.current = null; }
    }
  }

  function applyDataToChart(data: KlineBar[], chart: IChartApi) {
    if (!candleRef.current) return;
    candleRef.current.setData(data.map(b => ({
      time: b.date as Time, open: b.open, high: b.high, low: b.low, close: b.close,
    })));

    // re-apply current overlays
    removeMASeries(chart); removeBollSeries(chart);
    removeVolSeries(chart); removeMACDSeries(chart);

    if (mainOverlayRef.current === "ma") addMASeries(chart, data);
    else addBollSeries(chart, data);

    if (subPanelRef.current === "vol") addVolSeries(chart, data);
    else addMACDSeries(chart, data);

    chart.timeScale().fitContent();
  }

  // ---- Callback ref: initializes chart when container enters DOM ----
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      chartRef.current?.remove();
      chartRef.current = null;
      candleRef.current = null;
      ma5Ref.current = null; ma10Ref.current = null; ma20Ref.current = null;
      bollMidRef.current = null; bollUpperRef.current = null; bollLowerRef.current = null;
      volRef.current = null;
      macdLineRef.current = null; macdSignalRef.current = null; macdHistRef.current = null;
      return;
    }

    const chart = createChart(node, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#333",
        fontSize: 11,
      },
      grid: { vertLines: { color: "#f0f0f0" }, horzLines: { color: "#f0f0f0" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#e0e0e0" },
      timeScale: { borderColor: "#e0e0e0", timeVisible: true },
      width: node.clientWidth || 800,
      height: 420,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444", downColor: "#22c55e",
      borderUpColor: "#ef4444", borderDownColor: "#22c55e",
      wickUpColor: "#ef4444", wickDownColor: "#22c55e",
    });
    chartRef.current = chart;
    candleRef.current = candle;

    if (barsRef.current.length > 0) {
      applyDataToChart(barsRef.current, chart);
    }

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: node.clientWidth });
    });
    ro.observe(node);
    (node as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Load data on mount / period change ----
  useEffect(() => {
    if (market !== "A股") return;
    setLoading(true);
    setError(null);
    getKlineData(stockId, period)
      .then((data) => {
        barsRef.current = data;
        setBars(data);
        if (chartRef.current) applyDataToChart(data, chartRef.current);
        if (data.length > 0) setLastDate(data[data.length - 1].date);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockId, market, period]);

  // ---- Sync overlay refs and re-render when toggles change ----
  useEffect(() => {
    mainOverlayRef.current = mainOverlay;
    if (chartRef.current && barsRef.current.length > 0) {
      removeMASeries(chartRef.current); removeBollSeries(chartRef.current);
      if (mainOverlay === "ma") addMASeries(chartRef.current, barsRef.current);
      else addBollSeries(chartRef.current, barsRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainOverlay]);

  useEffect(() => {
    subPanelRef.current = subPanel;
    if (chartRef.current && barsRef.current.length > 0) {
      removeVolSeries(chartRef.current); removeMACDSeries(chartRef.current);
      if (subPanel === "vol") addVolSeries(chartRef.current, barsRef.current);
      else addMACDSeries(chartRef.current, barsRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPanel]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await refreshKline(stockId, period);
      const data = await getKlineData(stockId, period);
      barsRef.current = data;
      setBars(data);
      if (chartRef.current) applyDataToChart(data, chartRef.current);
      if (data.length > 0) setLastDate(data[data.length - 1].date);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  if (market !== "A股") {
    return (
      <div style={{ color: "#888", fontSize: 13, padding: "8px 0" }}>
        K 线图暂只支持 A 股
      </div>
    );
  }

  const hasData = bars.length > 0;
  const periodLabel: Record<KlinePeriod, string> = { d: "日线", w: "周线", y: "月线" };

  return (
    <div style={{ width: "100%" }}>
      {/* Top toolbar */}
      <div className="kline-toolbar">
        <div className="kline-toggle-group">
          {(["d", "w", "y"] as KlinePeriod[]).map(p => (
            <button
              key={p}
              className={`kline-toggle-btn${period === p ? " active" : ""}`}
              onClick={() => setPeriod(p)}
              disabled={loading || refreshing}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {lastDate && (
            <span style={{ fontSize: 12, color: "#999" }}>最新: {lastDate}</span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12 }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            {refreshing ? "拉取中…" : !hasData ? "获取 K 线" : "刷新"}
          </button>
        </div>
      </div>

      {/* Indicator toggles */}
      {hasData && (
        <div className="kline-toolbar" style={{ marginTop: 4 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#999" }}>主图:</span>
            <div className="kline-toggle-group">
              {(["ma", "boll"] as MainOverlay[]).map(v => (
                <button key={v} className={`kline-toggle-btn${mainOverlay === v ? " active" : ""}`} onClick={() => setMainOverlay(v)}>
                  {v === "ma" ? "MA" : "BOLL"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#999" }}>副图:</span>
            <div className="kline-toggle-group">
              {(["vol", "macd"] as SubPanel[]).map(v => (
                <button key={v} className={`kline-toggle-btn${subPanel === v ? " active" : ""}`} onClick={() => setSubPanel(v)}>
                  {v === "vol" ? "成交量" : "MACD"}
                </button>
              ))}
            </div>
          </div>
          {mainOverlay === "ma" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
              <span style={{ color: "#f59e0b" }}>■ MA5</span>
              <span style={{ color: "#3b82f6" }}>■ MA10</span>
              <span style={{ color: "#8b5cf6" }}>■ MA20</span>
            </div>
          )}
          {mainOverlay === "boll" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
              <span style={{ color: "#ef4444" }}>- - 上轨</span>
              <span style={{ color: "#f59e0b" }}>— 中轨</span>
              <span style={{ color: "#22c55e" }}>- - 下轨</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: "#dc2626", fontSize: 12, margin: "4px 0" }}>{error}</div>
      )}

      {!hasData && (
        <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, border: "1px dashed #e0e0e0", borderRadius: 6 }}>
          {loading ? "加载中…" : "暂无 K 线数据，点击「获取 K 线」拉取"}
        </div>
      )}

      <div
        ref={containerRef}
        style={{ display: hasData ? "block" : "none", width: "100%", borderRadius: 6, overflow: "hidden", border: "1px solid #e8e8e8" }}
      />
    </div>
  );
}
