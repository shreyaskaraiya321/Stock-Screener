# Specification Errata and Technical Corrections

This document details the three deliberate specification errors identified and resolved during the architectural design and implementation of the **Bharat Real-Time Stock Screener**.

---

### 1. Section A9.2: Type Declaration Syntax Bug

- **Original Specification**:
  ```typescript
  // Erroneous declaration in spec
  data: Stock()
  ```
- **Identified Issue**:
  `Stock()` represents an invalid invocation syntax in TypeScript interface/type definitions rather than an array type definition.
- **Resolution**:
  Corrected to strict TypeScript array notation `Stock[]` or `Array<Stock>`:
  ```typescript
  export interface StockDataPayload {
    data: Stock[];
  }
  ```
  Applied across [stock.ts](file:///d:/Stock%20Screener/src/types/stock.ts) and [ScreenerTable.tsx](file:///d:/Stock%20Screener/src/components/DataGrid/ScreenerTable.tsx).

---

### 2. Section A4.2: WebSocket Hook Reconnection Leaks & Timer Overlaps

- **Original Specification**:
  The reconnection loop logic triggered asynchronous timeout callbacks without maintaining an unmount cancellation ref (`isUnmountedRef`) or clearing existing reconnection timeout handles when the connection state toggles or the component unmounts.
- **Identified Issue**:
  1. Memory leaks when components remount (e.g. Next.js App Router hot reloading or route transitions).
  2. Overlapping, concurrent timeout timers firing multiple duplicate reconnection state transitions and duplicate buffer flushes.
  3. Attempting to invoke `requestAnimationFrame` and state setters on unmounted components.
- **Resolution**:
  In [useRealtimePrices.ts](file:///d:/Stock%20Screener/src/hooks/useRealtimePrices.ts):
  - Introduced `isUnmountedRef` checked before any asynchronous state mutation or store dispatch.
  - Retained `intervalIdRef`, `reconnectTimeoutRef`, and `rafIdRef`.
  - Added comprehensive teardown in the `useEffect` cleanup return function:
    ```typescript
    return () => {
      isUnmountedRef.current = true;
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    ```

---

### 3. Section A3.2: Bollinger Band Lower Band Formula Typo

- **Original Specification**:
  Lower Band specified as:
  ```text
  Lower Band = SMA(20) + 2 * SD  // Typo: Missing minus sign
  ```
- **Identified Issue**:
  Using an addition operator causes the Lower Band to be identical to the Upper Band instead of tracking 2 standard deviations below the 20-period moving average.
- **Resolution**:
  In [indicators.ts](file:///d:/Stock%20Screener/src/lib/indicators.ts), corrected Lower Band calculation to subtract two standard deviations using population variance ($N$ observations):
  ```typescript
  const variance = window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const sd = Math.sqrt(variance);

  result[i] = {
    middle: Number(mean.toFixed(2)),
    upper: Number((mean + multiplier * sd).toFixed(2)),
    lower: Number((mean - multiplier * sd).toFixed(2)), // Fixed minus sign
  };
  ```
  Validated and verified with automated test cases in [indicators.test.ts](file:///d:/Stock%20Screener/tests/indicators.test.ts).
