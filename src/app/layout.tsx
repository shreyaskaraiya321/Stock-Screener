import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Real-Time Stock Screener | Indian Markets (NSE/BSE)',
  description:
    'Institutional-grade real-time stock screener for Indian equities (NSE & BSE) with 60 FPS virtualization, TradingView charts, and sub-200ms combinatorial filtering.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
