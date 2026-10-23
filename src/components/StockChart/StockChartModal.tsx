'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import { useStockStore } from '@/stores/useStockStore';
import { generateOHLCVData } from '@/lib/ohlcvGenerator';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateVolumeProfile,
} from '@/lib/indicators';
import { formatINR, formatVolume, formatPercent } from '@/lib/formatters';
import { X, TrendingUp, BarChart2, Layers, Calendar, Info } from 'lucide-react';

export const StockChartModal: React.FC = () => {
  const selectedSymbol = useStockStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useStockStore((s) => s.setSelectedSymbol);
  const stocks = useStockStore((s) => s.stocks);

  const stock = useMemo(() => {
    return stocks.find((s) => s.symbol === selectedSymbol) || null;
  }, [stocks, selectedSymbol]);

  // Chart DOM refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Indicator toggle state
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: false,
    sma200: false,
    ema12: false,
    ema26: false,
    bollinger: false,
    rsi: true,
    volumeProfile: true,
  });

  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1Y');
  const [crosshairData, setCrosshairData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null>(null);

  // Power-user shortcut: Escape closes modal
  useEffect(() => {
    if (!selectedSymbol) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSymbol(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSymbol, setSelectedSymbol]);

  // Generate 252 trading days of data for the stock
  const ohlcv = useMemo(() => {
    if (!stock) return [];
    return generateOHLCVData(stock, 252);
  }, [stock]);

  // Slice OHLCV based on timeframe
  const displayOHLCV = useMemo(() => {
    if (ohlcv.length === 0) return [];
    if (timeframe === '1D') return ohlcv.slice(-1);
    if (timeframe === '1W') return ohlcv.slice(-5);
    if (timeframe === '1M') return ohlcv.slice(-21);
    if (timeframe === '3M') return ohlcv.slice(-63);
    if (timeframe === '1Y') return ohlcv;
    return ohlcv; // 5Y / default
  }, [ohlcv, timeframe]);

  // Indicator Calculations
  const closes = useMemo(() => displayOHLCV.map((d) => d.close), [displayOHLCV]);
  const sma20 = useMemo(() => calculateSMA(closes, 20), [closes]);
  const sma50 = useMemo(() => calculateSMA(closes, 50), [closes]);
  const sma200 = useMemo(() => calculateSMA(closes, 200), [closes]);
  const ema12 = useMemo(() => calculateEMA(closes, 12), [closes]);
  const ema26 = useMemo(() => calculateEMA(closes, 26), [closes]);
  const bb = useMemo(() => calculateBollingerBands(closes, 20, 2), [closes]);
  const rsiData = useMemo(() => calculateRSI(closes, 14), [closes]);
  const volumeProfile = useMemo(() => calculateVolumeProfile(displayOHLCV, 24), [displayOHLCV]);

  // Initialize and update Lightweight Charts
  useEffect(() => {
    if (!selectedSymbol || !chartContainerRef.current || displayOHLCV.length === 0) {
      return;
    }

    const container = chartContainerRef.current;
    container.innerHTML = '';

    // Create Main Chart
    const mainChart: IChartApi = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: indicators.rsi ? 340 : 440,
    });

    // Main Candlestick Series
    const candleSeries = mainChart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const candleData: CandlestickData<Time>[] = displayOHLCV.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeries.setData(candleData);

    // Volume Series in Main Chart (bottom overlay)
    const volumeSeries = mainChart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume_scale',
    });

    mainChart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volData: HistogramData<Time>[] = displayOHLCV.map((d) => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)',
    }));
    volumeSeries.setData(volData);

    // Overlay: SMA 20
    if (indicators.sma20) {
      const s20Series = mainChart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        title: 'SMA 20',
      });
      const s20Data: LineData<Time>[] = [];
      displayOHLCV.forEach((d, i) => {
        if (sma20[i] !== null) {
          s20Data.push({ time: d.time as Time, value: sma20[i]! });
        }
      });
      s20Series.setData(s20Data);
    }

    // Overlay: SMA 50
    if (indicators.sma50) {
      const s50Series = mainChart.addLineSeries({
        color: '#06b6d4',
        lineWidth: 2,
        title: 'SMA 50',
      });
      const s50Data: LineData<Time>[] = [];
      displayOHLCV.forEach((d, i) => {
        if (sma50[i] !== null) {
          s50Data.push({ time: d.time as Time, value: sma50[i]! });
        }
      });
      s50Series.setData(s50Data);
    }

    // Overlay: SMA 200
    if (indicators.sma200) {
      const s200Series = mainChart.addLineSeries({
        color: '#ec4899',
        lineWidth: 2,
        title: 'SMA 200',
      });
      const s200Data: LineData<Time>[] = [];
      displayOHLCV.forEach((d, i) => {
        if (sma200[i] !== null) {
          s200Data.push({ time: d.time as Time, value: sma200[i]! });
        }
      });
      s200Series.setData(s200Data);
    }

    // Overlay: EMA 12
    if (indicators.ema12) {
      const e12Series = mainChart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1,
        title: 'EMA 12',
      });
      const e12Data: LineData<Time>[] = [];
      displayOHLCV.forEach((d, i) => {
        if (ema12[i] !== null) {
          e12Data.push({ time: d.time as Time, value: ema12[i]! });
        }
      });
      e12Series.setData(e12Data);
    }

    // Overlay: EMA 26
    if (indicators.ema26) {
      const e26Series = mainChart.addLineSeries({
        color: '#a855f7',
        lineWidth: 1,
        title: 'EMA 26',
      });
      const e26Data: LineData<Time>[] = [];
      displayOHLCV.forEach((d, i) => {
        if (ema26[i] !== null) {
          e26Data.push({ time: d.time as Time, value: ema26[i]! });
        }
      });
      e26Series.setData(e26Data);
    }

    // Overlay: Bollinger Bands (Upper, Middle, Lower)
    if (indicators.bollinger) {
      const bbUpper = mainChart.addLineSeries({
        color: 'rgba(59, 130, 246, 0.7)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Upper',
      });
      const bbLower = mainChart.addLineSeries({
        color: 'rgba(59, 130, 246, 0.7)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Lower',
      });
      const bbMid = mainChart.addLineSeries({
        color: 'rgba(59, 130, 246, 0.4)',
        lineWidth: 1,
        lineStyle: 0,
        title: 'BB Mid',
      });

      const uData: LineData<Time>[] = [];
      const lData: LineData<Time>[] = [];
      const mData: LineData<Time>[] = [];

      displayOHLCV.forEach((d, i) => {
        if (bb[i]?.upper !== null) {
          uData.push({ time: d.time as Time, value: bb[i].upper! });
          lData.push({ time: d.time as Time, value: bb[i].lower! });
          mData.push({ time: d.time as Time, value: bb[i].middle! });
        }
      });

      bbUpper.setData(uData);
      bbLower.setData(lData);
      bbMid.setData(mData);
    }

    // Crosshair hover listener
    mainChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }
      const candle = param.seriesData.get(candleSeries) as CandlestickData<Time> | undefined;
      const vol = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;
      if (candle) {
        setCrosshairData({
          time: String(param.time),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: vol?.value || 0,
        });
      }
    });

    // Optional RSI Sub-Chart in separate synced container
    let rsiChart: IChartApi | null = null;
    if (indicators.rsi && rsiContainerRef.current) {
      const rsiContainer = rsiContainerRef.current;
      rsiContainer.innerHTML = '';

      rsiChart = createChart(rsiContainer, {
        layout: {
          background: { type: ColorType.Solid, color: '#090d16' },
          textColor: '#94a3b8',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: 'rgba(30, 41, 59, 0.2)' },
          horzLines: { color: 'rgba(30, 41, 59, 0.2)' },
        },
        rightPriceScale: {
          borderColor: '#1e293b',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: '#1e293b',
          visible: false,
        },
        width: rsiContainer.clientWidth,
        height: 110,
      });

      const rsiSeries = rsiChart.addLineSeries({
        color: '#c084fc',
        lineWidth: 2,
        title: 'RSI 14',
      });

      const rsiPoints: LineData<Time>[] = [];
      displayOHLCV.forEach((d, i) => {
        if (rsiData[i] !== null) {
          rsiPoints.push({ time: d.time as Time, value: rsiData[i]! });
        }
      });
      rsiSeries.setData(rsiPoints);

      // Add Overbought (70) and Oversold (30) reference lines
      const line70 = rsiChart.addLineSeries({
        color: 'rgba(239, 68, 68, 0.5)',
        lineWidth: 1,
        lineStyle: 1,
      });
      const line30 = rsiChart.addLineSeries({
        color: 'rgba(34, 197, 94, 0.5)',
        lineWidth: 1,
        lineStyle: 1,
      });

      line70.setData(displayOHLCV.map((d) => ({ time: d.time as Time, value: 70 })));
      line30.setData(displayOHLCV.map((d) => ({ time: d.time as Time, value: 30 })));

      // Synchronize time scales
      mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && rsiChart) {
          rsiChart.timeScale().setVisibleLogicalRange(range);
        }
      });
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) {
          mainChart.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    // Handle responsive resize with ResizeObserver
    const handleResize = () => {
      if (container && mainChart) {
        mainChart.applyOptions({ width: container.clientWidth });
      }
      if (rsiContainerRef.current && rsiChart) {
        rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    candleSeriesRef.current = candleSeries;

    // Clean up and destroy chart instances on unmount to avoid memory leaks
    return () => {
      window.removeEventListener('resize', handleResize);
      candleSeriesRef.current = null;
      mainChart.remove();
      if (rsiChart) {
        rsiChart.remove();
      }
    };
  }, [selectedSymbol, displayOHLCV, indicators, sma20, sma50, sma200, ema12, ema26, bb, rsiData]);

  // Synchronize incoming real-time streaming price ticks to active candlestick series
  useEffect(() => {
    if (!candleSeriesRef.current || !stock || displayOHLCV.length === 0) return;
    const latest = displayOHLCV[displayOHLCV.length - 1];
    if (latest) {
      try {
        candleSeriesRef.current.update({
          time: latest.time as Time,
          open: latest.open,
          high: Math.max(latest.high, stock.lastPrice),
          low: Math.min(latest.low, stock.lastPrice),
          close: stock.lastPrice,
        });
      } catch (err) {
        // Safe catch for timeframe re-renders
      }
    }
  }, [stock?.lastPrice, displayOHLCV, stock]);

  if (!selectedSymbol || !stock) return null;

  const latestCandle = displayOHLCV[displayOHLCV.length - 1];
  const activeCandle = crosshairData || latestCandle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col w-full max-w-6xl max-h-[95vh] bg-[#0c1222] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0f172a]/90">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold font-mono text-indigo-300">
                  {stock.symbol}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {stock.sector}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {stock.marketCapCategory}
                </span>
              </div>
              <h3 className="text-xs text-slate-400 font-sans">{stock.companyName}</h3>
            </div>

            <div className="hidden sm:block pl-4 border-l border-slate-800">
              <div className="text-lg font-bold font-mono text-slate-100">
                {formatINR(stock.lastPrice)}
              </div>
              <div
                className={`text-xs font-mono ${
                  stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stock.changePercent >= 0 ? '+' : ''}
                {stock.changePercent}% ({formatINR(stock.changeAbsolute)})
              </div>
            </div>
          </div>

          {/* Timeframe Selector & Close */}
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timeframe === tf
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedSymbol(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              aria-label="Close chart modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Indicator Toggles Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2 border-b border-slate-800/80 bg-[#090e1c] text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span className="text-slate-400 font-medium mr-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              Overlays:
            </span>

            {[
              { id: 'sma20', label: 'SMA 20', color: 'text-amber-400' },
              { id: 'sma50', label: 'SMA 50', color: 'text-cyan-400' },
              { id: 'sma200', label: 'SMA 200', color: 'text-pink-400' },
              { id: 'ema12', label: 'EMA 12', color: 'text-purple-400' },
              { id: 'ema26', label: 'EMA 26', color: 'text-purple-300' },
              { id: 'bollinger', label: 'Bollinger Bands', color: 'text-blue-400' },
              { id: 'rsi', label: 'RSI (14)', color: 'text-indigo-400' },
              { id: 'volumeProfile', label: 'Vol Profile', color: 'text-emerald-400' },
            ].map((ind) => (
              <label
                key={ind.id}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={indicators[ind.id as keyof typeof indicators]}
                  onChange={(e) =>
                    setIndicators((prev) => ({ ...prev, [ind.id]: e.target.checked }))
                  }
                  className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                />
                <span className={`text-[11px] font-mono ${ind.color}`}>{ind.label}</span>
              </label>
            ))}
          </div>

          {/* Crosshair OHLCV Tooltip Bar */}
          {activeCandle && (
            <div className="hidden lg:flex items-center space-x-3 text-[11px] font-mono text-slate-400">
              <span>
                Date: <strong className="text-slate-200">{activeCandle.time}</strong>
              </span>
              <span>
                O: <strong className="text-slate-200">{formatINR(activeCandle.open)}</strong>
              </span>
              <span>
                H: <strong className="text-emerald-400">{formatINR(activeCandle.high)}</strong>
              </span>
              <span>
                L: <strong className="text-rose-400">{formatINR(activeCandle.low)}</strong>
              </span>
              <span>
                C: <strong className="text-slate-200">{formatINR(activeCandle.close)}</strong>
              </span>
              <span>
                Vol:{' '}
                <strong className="text-indigo-300">{formatVolume(activeCandle.volume)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Main Chart Area */}
        <div className="relative flex flex-1 w-full min-h-[460px] max-h-[580px] bg-[#090d16] overflow-hidden">
          <div className="flex-1 flex flex-col h-full">
            {/* Candlestick container */}
            <div ref={chartContainerRef} className="w-full flex-1" />

            {/* RSI container */}
            {indicators.rsi && (
              <div className="w-full border-t border-slate-800/80 relative">
                <div className="absolute top-1 left-3 z-10 text-[10px] font-mono text-indigo-400/80 flex items-center space-x-2">
                  <span>RSI (14)</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-rose-400/70">70 (OB)</span>
                  <span className="text-emerald-400/70">30 (OS)</span>
                </div>
                <div ref={rsiContainerRef} className="w-full h-[110px]" />
              </div>
            )}
          </div>

          {/* Volume Profile Lateral Histogram Pane */}
          {indicators.volumeProfile && (
            <div className="w-40 bg-[#0b101e] border-l border-slate-800/80 p-2 text-xs flex flex-col justify-between shrink-0">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2 flex items-center space-x-1">
                <BarChart2 className="w-3 h-3 text-emerald-400" />
                <span>Volume Profile (30 Bins)</span>
              </div>
              <div className="flex-1 flex flex-col-reverse justify-between py-1 space-y-0.5 space-y-reverse overflow-hidden">
                {volumeProfile.map((vp, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 h-3">
                    <span className="text-[9px] font-mono text-slate-500 w-9 text-right truncate">
                      ₹{vp.priceStart}
                    </span>
                    <div className="flex-1 bg-slate-800/60 rounded-sm h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500/60 h-full rounded-sm"
                        style={{ width: `${Math.min(100, vp.percentage * 4)}%` }}
                        title={`₹${vp.priceStart} - ₹${vp.priceEnd}: ${formatVolume(
                          vp.volume
                        )} (${vp.percentage}%)`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Key Fundamentals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 px-5 py-3 border-t border-slate-800 bg-[#0f172a] text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">52W Range</span>
            <span className="font-mono text-slate-200 text-[11px]">
              ₹{stock.week52Low} - ₹{stock.week52High}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">P/E Ratio</span>
            <span className="font-mono text-slate-200 text-[11px]">{stock.pe.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">ROE / ROCE</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {stock.roe}% / {stock.roce}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Debt / Equity</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {stock.debtToEquity.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Promoter Holding</span>
            <span className="font-mono text-slate-200 text-[11px]">{stock.promoterHolding}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">20D Avg Vol</span>
            <span className="font-mono text-slate-200 text-[11px]">
              {formatVolume(stock.avgVolume20D)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
