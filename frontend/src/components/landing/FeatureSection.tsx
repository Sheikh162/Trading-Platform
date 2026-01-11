"use client";

import React from "react";
import { motion } from "motion/react";
import { Zap, ShieldCheck, BarChart3, ArrowUpRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

const features = [
  {
    icon: <Zap className="h-8 w-8 text-yellow-500" />,
    title: "Lightning Execution",
    description: "100,000 TPS matching engine. Never miss a price. Our engine handles extreme volatility with zero downtime. Built for high-frequency traders.",
    gradient: "from-yellow-500/20 to-transparent",
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-blue-500" />,
    title: "Lowest Fees",
    description: "Trade More, Pay Less. Flat 0.1% trading fees. Zero fees on limit orders for market makers. The more you trade, the more you save.",
    gradient: "from-blue-500/20 to-transparent",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-green-500" />,
    title: "Ironclad Security",
    description: "Your funds are held 1:1. Secured with multi-sig cold storage and real-time fraud monitoring. Audited by top security firms.",
    gradient: "from-green-500/20 to-transparent",
  },
];

export default function FeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-24 max-w-7xl">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Why trade on Vertex?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          We built the infrastructure so you can focus on the alpha.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all hover:border-primary/50"
          >
            {/* Gradient Background Effect on Hover */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100", 
              feature.gradient
            )} />

            <div className="relative z-10 flex flex-col items-start h-full">
              <div className="mb-6 rounded-lg bg-background/50 p-3 shadow-sm ring-1 ring-border">
                {feature.icon}
              </div>
              
              <h3 className="mb-3 text-xl font-bold flex items-center gap-2">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed flex-grow">
                {feature.description}
              </p>

              <div className="mt-6 flex items-center text-sm font-medium text-primary cursor-pointer">
                Learn more <ArrowUpRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}