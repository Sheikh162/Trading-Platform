// import {
//   ColorType,
//   createChart as createLightWeightChart,
//   CrosshairMode,
//   ISeriesApi,
//   UTCTimestamp,
// } from "lightweight-charts";

// export class ChartManager {
//   private candleSeries: ISeriesApi<"Candlestick">;
//   private lastUpdateTime: number = 0;
//   private chart: any;
//   private currentBar: {
//     open: number | null;
//     high: number | null;
//     low: number | null;
//     close: number | null;
//   } = {
//     open: null,
//     high: null,
//     low: null,
//     close: null,
//   };

//   constructor(
//     ref: any,
//     initialData: any[],
//     layout: { background: string; color: string }
//   ) {
//     const chart = createLightWeightChart(ref, {
//       autoSize: true,
//       overlayPriceScales: {
//         ticksVisible: true,
//         borderVisible: true,
//       },
//       crosshair: {
//         mode: CrosshairMode.Normal,
//       },
//       rightPriceScale: {
//         visible: true,
//         ticksVisible: true,
//         entireTextOnly: true,
//       },
//       grid: {
//         horzLines: {
//           visible: false,
//         },
//         vertLines: {
//           visible: false,
//         },
//       },
//       layout: {
//         background: {
//           type: ColorType.Solid,
//           color: layout.background,
//         },
//         textColor: "white",
//       },
//     });
//     this.chart = chart;
//     this.candleSeries = chart.addCandlestickSeries();

//     this.candleSeries.setData(
//       initialData.map((data) => ({
//         ...data,
//         time: (data.timestamp / 1000) as UTCTimestamp,
//       }))
//     );
//     // Use the new updateAll method to set initial data
//     this.updateAll(initialData);
//   }
//   /**
//    * NEW METHOD: Replaces all data in the chart.
//    * Perfect for polling new historical data.
//    * @param allNewData The full array of candlestick data.
//    */
//   public updateAll(allNewData: any[]) {
//     this.candleSeries.setData(
//       allNewData.map((data) => ({
//         ...data,
//         time: (data.timestamp.getTime() / 1000) as UTCTimestamp,
//       }))
//     );
//   }  
//   public update(updatedPrice: any) {
//     if (!this.lastUpdateTime) {
//       this.lastUpdateTime = new Date().getTime();
//     }

//     this.candleSeries.update({
//       time: (this.lastUpdateTime / 1000) as UTCTimestamp,
//       close: updatedPrice.close,
//       low: updatedPrice.low,
//       high: updatedPrice.high,
//       open: updatedPrice.open,
//     });

//     if (updatedPrice.newCandleInitiated) {
//       this.lastUpdateTime = updatedPrice.time;
//     }
//   }
//   public destroy() {
//     this.chart.remove();
//   }
// }


import {
  ColorType,
  createChart as createLightWeightChart,
  CrosshairMode,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";

export class ChartManager {
  private candleSeries: ISeriesApi<"Candlestick">;
  private lastUpdateTime: number = 0;
  private chart: any;

  constructor(
    ref: any,
    initialData: any[],
    layout: { background: string; color: string }
  ) {
    const chart = createLightWeightChart(ref, {
      autoSize: true,
      overlayPriceScales: {
        ticksVisible: true,
        borderVisible: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          labelBackgroundColor: "#9ca3af",
          color: "#374151",
          style: 0,
          width: 1,
        },
        horzLine: {
          labelBackgroundColor: "#9ca3af",
          color: "#374151",
          style: 0,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: "#374151",
        visible: true,
        ticksVisible: true,
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        horzLines: {
          visible: true,
          color: "#1f2937",
          style: 1,
        },
        vertLines: {
          visible: true,
          color: "#1f2937",
          style: 1,
        },
      },
      layout: {
        background: {
          type: ColorType.Solid,
          color: "transparent",
        },
        textColor: "#9ca3af",
      },
    });
    this.chart = chart;
    this.candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    this.updateAll(initialData);
  }

  public updateAll(allNewData: any[]) {
    // Safety check: if data is empty, just return (chart stays empty but visible)
    if (!allNewData || allNewData.length === 0) return;

    this.candleSeries.setData(
      allNewData.map((data) => ({
        ...data,
        time: (data.timestamp.getTime() / 1000) as UTCTimestamp,
      }))
    );
  }

  public update(updatedPrice: any) {
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = new Date().getTime();
    }

    this.candleSeries.update({
      time: (this.lastUpdateTime / 1000) as UTCTimestamp,
      close: updatedPrice.close,
      low: updatedPrice.low,
      high: updatedPrice.high,
      open: updatedPrice.open,
    });

    if (updatedPrice.newCandleInitiated) {
      this.lastUpdateTime = updatedPrice.time;
    }
  }

  public destroy() {
    this.chart.remove();
  }
}