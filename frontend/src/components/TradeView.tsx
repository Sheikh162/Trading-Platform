// import { ChartManager } from "@/src/lib/ChartManager";
// import { getKlines } from "@/src/lib/httpClient";
// import { KLine } from "@/src/lib/types";
// import { useEffect, useRef, useState } from "react";


// // Helper function to format data
// const formatKlinesForChart = (klines: KLine[]) => {
//   return klines.map(k => ({
//     close: parseFloat(k.close),
//     high: parseFloat(k.high),
//     low: parseFloat(k.low),
//     open: parseFloat(k.open),
//     timestamp: new Date(k.end), // Convert string/number to Date object
//   })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
// };

// export function TradeView({ market }: { market: string; }) {
//   const chartRef = useRef<HTMLDivElement>(null);
//   const chartManagerRef = useRef<ChartManager | null>(null);
//   const [klineData, setKLineData] = useState<KLine[]>([]);

//   // Effect 1: Handles fetching data periodically.
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const startTime = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7) / 1000);
//         const endTime = Math.floor(Date.now() / 1000);
//         const res = await getKlines(market, "1m", startTime, endTime);
//         setKLineData(res);
//       } catch (e) {
//         console.error("Error fetching klines:", e);
//       }
//     };

//     fetchData();
//     const interval = setInterval(fetchData, 3_000);// dont keep this low, will make lot of api calls which is unoptimal, usewebsockets instead
//     return () => clearInterval(interval);
//   }, [market]);

//   // Effect 2: Manages the chart instance lifecycle (create, update, destroy).
//   useEffect(() => {
//     if (!chartRef.current || klineData.length === 0) {
//       return;
//     }
//     const formattedData = formatKlinesForChart(klineData);

//     // If the chart instance doesn't exist, create it.
//     // This happens only ONCE per market, after the FIRST data fetch.
//     if (!chartManagerRef.current) {
//       const chartManager = new ChartManager(
//         chartRef.current,
//         formattedData,
//         { background: "black", color: "white" }
//       );
//       chartManagerRef.current = chartManager;
//     } else {
//       // If it exists, use our new method to update it without flickering.
//       // This runs every 5 seconds after the initial creation.
//       chartManagerRef.current.updateAll(formattedData);
//     }
//   }, [klineData]); // This effect syncs the chart with the data state.

//   // Effect 3: Handles destroying the chart only when the market changes.
//   useEffect(() => {
//     return () => {
//       if (chartManagerRef.current) {
//         chartManagerRef.current.destroy();
//         chartManagerRef.current = null;
//       }
//     };
//   }, [market]); // Dependency is 'market' to ensure cleanup on market switch.

//   return (
//     <div ref={chartRef} style={{ height: "520px", width: "100%", marginTop: 4 }}></div>
//   );
// }

"use client";

import { ChartManager } from "@/src/lib/ChartManager";
import { getKlines } from "@/src/lib/httpClient";
import { KLine } from "@/src/lib/types";
import { useEffect, useRef, useState } from "react";

const formatKlinesForChart = (klines: KLine[]) => {
  return klines.map((k) => ({
    close: parseFloat(k.close),
    high: parseFloat(k.high),
    low: parseFloat(k.low),
    open: parseFloat(k.open),
    timestamp: new Date(k.end),
  })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export function TradeView({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);
  const [klineData, setKLineData] = useState<KLine[]>([]);

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const startTime = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7) / 1000);
        const endTime = Math.floor(Date.now() / 1000);
        const res = await getKlines(market, "1m", startTime, endTime);
        setKLineData(res);
      } catch (e) {
        console.error("Error fetching klines:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [market]);

  // 2. Initialize & Update Chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize Chart immediately
    if (!chartManagerRef.current) {
      const chartManager = new ChartManager(
        chartRef.current,
        [], 
        {
          background: "transparent",
          color: "#333",
        }
      );
      chartManagerRef.current = chartManager;
    }

    // Update data if available
    if (klineData.length > 0) {
        const formattedData = formatKlinesForChart(klineData);
        chartManagerRef.current.updateAll(formattedData);
    }
  }, [klineData]);

  // 3. Cleanup
  useEffect(() => {
    return () => {
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
  }, [market]);

  return (
    // PARENT: Relative + Full Height + Overflow Hidden
    <div className="relative h-full w-full bg-card/40 overflow-hidden group">
        
        {/* Header Overlay */}
        <div className="absolute top-4 left-4 z-20 flex gap-4 text-xs font-medium pointer-events-none">
            {/* The pointer-events-auto allows clicking the buttons while keeping the chart interactive underneath */}
            <div className="flex gap-1 pointer-events-auto bg-background/50 backdrop-blur rounded-md p-1 border border-border/50">
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary cursor-pointer">1H</span>
                <span className="px-2 py-0.5 rounded hover:bg-muted/50 text-muted-foreground cursor-pointer transition-colors">4H</span>
                <span className="px-2 py-0.5 rounded hover:bg-muted/50 text-muted-foreground cursor-pointer transition-colors">1D</span>
                <span className="px-2 py-0.5 rounded hover:bg-muted/50 text-muted-foreground cursor-pointer transition-colors">1W</span>
            </div>
        </div>
        
        {/* CHART: Absolute + Inset 0 to fill parent exactly */}
        <div 
            ref={chartRef} 
            className="absolute inset-0 z-10"
        />
    </div>
  );
}