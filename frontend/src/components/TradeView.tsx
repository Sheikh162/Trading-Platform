import { ChartManager } from "@/src/lib/ChartManager";
import { getKlines } from "@/src/lib/httpClient";
import { KLine } from "@/src/lib/types";
import { useEffect, useRef, useState } from "react";


// Helper function to format data
const formatKlinesForChart = (klines: KLine[]) => {
  return klines.map(k => ({
    close: parseFloat(k.close),
    high: parseFloat(k.high),
    low: parseFloat(k.low),
    open: parseFloat(k.open),
    timestamp: new Date(k.end), // Convert string/number to Date object
  })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export function TradeView({ market }: { market: string; }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);
  const [klineData, setKLineData] = useState<KLine[]>([]);

  // Effect 1: Handles fetching data periodically.
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
    const interval = setInterval(fetchData, 3_000);// dont keep this low, will make lot of api calls which is unoptimal, usewebsockets instead
    return () => clearInterval(interval);
  }, [market]);

  // Effect 2: Manages the chart instance lifecycle (create, update, destroy).
  useEffect(() => {
    if (!chartRef.current || klineData.length === 0) {
      return;
    }
    const formattedData = formatKlinesForChart(klineData);

    // If the chart instance doesn't exist, create it.
    // This happens only ONCE per market, after the FIRST data fetch.
    if (!chartManagerRef.current) {
      const chartManager = new ChartManager(
        chartRef.current,
        formattedData,
        { background: "black", color: "white" }
      );
      chartManagerRef.current = chartManager;
    } else {
      // If it exists, use our new method to update it without flickering.
      // This runs every 5 seconds after the initial creation.
      chartManagerRef.current.updateAll(formattedData);
    }
  }, [klineData]); // This effect syncs the chart with the data state.

  // Effect 3: Handles destroying the chart only when the market changes.
  useEffect(() => {
    return () => {
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
  }, [market]); // Dependency is 'market' to ensure cleanup on market switch.

  return (
    <div ref={chartRef} style={{ height: "520px", width: "100%", marginTop: 4 }}></div>
  );
}