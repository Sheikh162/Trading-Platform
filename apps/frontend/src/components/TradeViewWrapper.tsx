"use client";

import dynamic from "next/dynamic";

export const TradeViewWrapper = dynamic(
  () => import("./TradeView").then((mod) => mod.TradeView),
  { ssr: false }
);
