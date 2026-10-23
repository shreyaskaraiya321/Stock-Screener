# Specification Errata and Technical Corrections

This document details the three deliberate specification errors identified and resolved during the architectural design and implementation of the **Bharat Real-Time Stock Screener**.

---

### 1. Section A9.2: Syntax Error in Type Declaration

- **Original Specification**:
  ```typescript
  Map<string, { data: Stock(); timestamp: number }>
  ```
- **Identified Issue**:
  The type declaration contained a syntax error invoking `Stock()`. In TypeScript, interfaces and type aliases cannot be invoked with parentheses in type positions. Doing so results in a compilation error: `TS2304: Cannot find name 'Stock' or type cannot be called as a function`.
- **Correction**:
  Corrected to an array type notation `Stock[]` (or `Array<Stock>`):
  ```typescript
  Map<string, { data: Stock[]; timestamp: number }>
  ```
  Applied across [stock.ts](file:///d:/Stock%20Screener/src/types/stock.ts), [useStockStore.ts](file:///d:/Stock%20Screener/src/stores/useStockStore.ts), and [ScreenerTable.tsx](file:///d:/Stock%20Screener/src/components/DataGrid/ScreenerTable.tsx).

---

### 2. Section A4.2: WebSocket Reconnection Memory Leak & Timer Overlaps

- **Original Specification**:
  The `useWebSocket` (implemented as `useRealtimePrices`) reconnection routine scheduled reconnect attempts using `setTimeout` within asynchronous callbacks without tracking an unmount cleanup ref or canceling pending timers on disconnect or unmount.
- **Identified Issue**:
  1. Component unmounting (or React StrictMode remounting in development) left active timeout callbacks running, invoking state setters and store dispatches on unmounted instances.
  2. Frequent network disconnects or toggle events spawned multiple overlapping reconnection timers, causing duplicate parallel connection loops and concurrent `requestAnimationFrame` cascades.
- **Correction**:
  - Maintained dedicated refs: `isUnmountedRef`, `reconnectTimeoutRef`, `intervalIdRef`, and `rafIdRef`.
  - Stored every timeout ID in `reconnectTimeoutRef` and cleared prior timers before scheduling new ones.
  - Added comprehensive teardown in the cleanup effect to cancel pending timeouts, intervals, and animation frame requests:
  ```typescript
  return () => {
    isUnmountedRef.current = true;
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };
  ```
  Implemented in [useRealtimePrices.ts](file:///d:/Stock%20Screener/src/hooks/useRealtimePrices.ts).

---

### 3. Section A3.2: Bollinger Band Lower Band Formula Omission

- **Original Specification**:
  The Lower Bollinger Band formula read:
  ```text
  Lower Band = SMA(20) 2* standard deviation
  ```
  omitting the minus sign operator entirely.
- **Identified Issue**:
  Without the minus sign operator (`-`), the formula is mathematically incomplete and ambiguous, resulting in syntax errors or incorrect values identical to or multiplying by the upper band.
- **Correction**:
  Corrected to subtract two times the population standard deviation from the 20-period Simple Moving Average:
  ```text
  Lower Band = SMA(20) - 2 * standard deviation
  ```
  Mathematically implemented using population standard deviation ($N$ observations in the rolling window):
  $$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^N (P_i - \mu)^2}$$
  $$\text{Upper Band} = \mu + 2\sigma$$
  $$\text{Lower Band} = \mu - 2\sigma$$
  Implemented in [indicators.ts](file:///d:/Stock%20Screener/src/lib/indicators.ts) and validated in [indicators.test.ts](file:///d:/Stock%20Screener/tests/indicators.test.ts).
