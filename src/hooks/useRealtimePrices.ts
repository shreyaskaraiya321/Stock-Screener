import { useEffect, useRef, useCallback } from 'react';
import { useStockStore, ConnectionStatus } from '@/stores/useStockStore';
import { simulateMarketTick } from '@/lib/priceSimulator';
import { Stock } from '@/types/stock';

export type { ConnectionStatus };

export function useRealtimePrices() {
  const stocks = useStockStore((s) => s.stocks);
  const isStreamingActive = useStockStore((s) => s.isStreamingActive);
  const connectionStatus = useStockStore((s) => s.connectionStatus);
  const toggleStreaming = useStockStore((s) => s.toggleStreaming);
  const setConnectionStatus = useStockStore((s) => s.setConnectionStatus);
  const batchUpdatePrices = useStockStore((s) => s.batchUpdatePrices);

  const pending = useRef<Map<string, Partial<Stock>>>(new Map());
  const rafId = useRef<number | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const backoff = useRef(1000);
  const unmounted = useRef(false);

  const flushBatch = useCallback(() => {
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (!unmounted.current && pending.current.size > 0) {
          batchUpdatePrices(pending.current);
          pending.current.clear();
        }
        rafId.current = null;
      });
    }
  }, [batchUpdatePrices]);

  useEffect(() => {
    unmounted.current = false;

    if (!isStreamingActive) {
      setConnectionStatus('Paused');
      if (intervalId.current) clearInterval(intervalId.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      return;
    }

    setConnectionStatus('Connected');
    backoff.current = 1000;

    intervalId.current = setInterval(() => {
      if (unmounted.current || !isStreamingActive || stocks.length === 0) return;

      // Simulated network flap with exponential backoff
      if (Math.random() < 0.003) {
        setConnectionStatus('Reconnecting');
        const delay = backoff.current;
        backoff.current = Math.min(16000, backoff.current * 2);

        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = setTimeout(() => {
          if (!unmounted.current && isStreamingActive) {
            setConnectionStatus('Connected');
            backoff.current = 1000;
          }
        }, delay);
        return;
      }

      // 10-25 random ticks per interval
      const count = Math.floor(10 + Math.random() * 16);
      const updates = simulateMarketTick(stocks, count);

      for (const [sym, patch] of updates) {
        const existing = pending.current.get(sym);
        pending.current.set(sym, existing ? { ...existing, ...patch } : patch);
      }

      flushBatch();
    }, 1500);

    return () => {
      unmounted.current = true;
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [isStreamingActive, stocks, flushBatch, setConnectionStatus]);

  return {
    connectionStatus,
    isStreaming: isStreamingActive,
    toggleStreaming,
  };
}
