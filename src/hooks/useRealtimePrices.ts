import { useEffect, useRef, useState, useCallback } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { simulateBatchPriceTicks } from '@/lib/priceSimulator';
import { PriceUpdate } from '@/types/stock';

export type ConnectionStatus = 'Connected' | 'Reconnecting' | 'Paused';

export function useRealtimePrices() {
  const stocks = useStockStore((s) => s.stocks);
  const isStreaming = useStockStore((s) => s.isStreaming);
  const setStreaming = useStockStore((s) => s.setStreaming);
  const batchUpdatePrices = useStockStore((s) => s.batchUpdatePrices);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Connected');

  // Buffer for rAF batching
  const bufferRef = useRef<Map<string, PriceUpdate>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Flush buffer to Zustand store on animation frame
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.size > 0 && !isUnmountedRef.current) {
      const updates = Array.from(bufferRef.current.values());
      bufferRef.current.clear();
      batchUpdatePrices(updates);
    }
    rafIdRef.current = null;
  }, [batchUpdatePrices]);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushBuffer);
    }
  }, [flushBuffer]);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (!isStreaming) {
      setConnectionStatus('Paused');
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      return;
    }

    setConnectionStatus('Connected');

    // Simulate mock WebSocket ticker every 1500ms
    intervalIdRef.current = setInterval(() => {
      if (isUnmountedRef.current || !isStreaming || stocks.length === 0) return;

      // Occasional simulated reconnect (0.5% chance)
      if (Math.random() < 0.005) {
        setConnectionStatus('Reconnecting');
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current && isStreaming) {
            setConnectionStatus('Connected');
          }
        }, 1200);
        return;
      }

      // Generate ticks for 10-25 random stocks
      const count = Math.floor(10 + Math.random() * 16);
      const ticks = simulateBatchPriceTicks(stocks, count);

      // Accumulate into rAF buffer
      for (const tick of ticks) {
        bufferRef.current.set(tick.symbol, tick);
      }

      scheduleFlush();
    }, 1500);

    // Clean up all timers and rAF on unmount (Fixed Section A4.2 bug)
    return () => {
      isUnmountedRef.current = true;
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isStreaming, stocks, scheduleFlush]);

  const toggleStreaming = useCallback(() => {
    setStreaming(!isStreaming);
  }, [isStreaming, setStreaming]);

  return {
    connectionStatus,
    isStreaming,
    toggleStreaming,
  };
}
