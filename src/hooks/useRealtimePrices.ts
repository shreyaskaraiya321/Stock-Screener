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

  // Performance batching buffer
  const pendingUpdates = useRef<Map<string, Partial<Stock>>>(new Map());
  const rafId = useRef<number | null>(null);

  // Timers and backoff tracking
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const backoffDelay = useRef<number>(1000); // Exponential backoff starts at 1s
  const isUnmounted = useRef<boolean>(false);

  // requestAnimationFrame batch flush
  const scheduleBatchFlush = useCallback(() => {
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingUpdates.current.size > 0 && !isUnmounted.current) {
          batchUpdatePrices(pendingUpdates.current);
          pendingUpdates.current.clear();
        }
        rafId.current = null;
      });
    }
  }, [batchUpdatePrices]);

  // Main streaming loop simulation
  useEffect(() => {
    isUnmounted.current = false;

    if (!isStreamingActive) {
      setConnectionStatus('Paused');
      if (intervalId.current) clearInterval(intervalId.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      return;
    }

    setConnectionStatus('Connected');
    backoffDelay.current = 1000;

    // Simulate WebSocket tick stream every 1,500ms
    intervalId.current = setInterval(() => {
      if (isUnmounted.current || !isStreamingActive || stocks.length === 0) return;

      // Rare simulated disconnect to exercise exponential backoff reconnection
      if (Math.random() < 0.003) {
        setConnectionStatus('Reconnecting');
        const delay = backoffDelay.current;
        backoffDelay.current = Math.min(16000, backoffDelay.current * 2);

        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = setTimeout(() => {
          if (!isUnmounted.current && isStreamingActive) {
            setConnectionStatus('Connected');
            backoffDelay.current = 1000;
          }
        }, delay);
        return;
      }

      // Generate ticks for 10-25 random stocks
      const count = Math.floor(10 + Math.random() * 16);
      const tickMap = simulateMarketTick(stocks, count);

      // Accumulate into pendingUpdates buffer
      for (const [symbol, data] of tickMap.entries()) {
        pendingUpdates.current.set(symbol, data);
      }

      scheduleBatchFlush();
    }, 1500);

    // Teardown timers and cancel rAF to prevent memory leaks
    return () => {
      isUnmounted.current = true;
      if (intervalId.current) clearInterval(intervalId.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [isStreamingActive, stocks, scheduleBatchFlush, setConnectionStatus]);

  return {
    connectionStatus,
    isStreaming: isStreamingActive,
    toggleStreaming,
  };
}
