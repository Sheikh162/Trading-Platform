"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden py-20 md:py-32 lg:py-40 bg-gradient-to-b from-background via-background/95 to-background/90">
      {/* Background Glow Effect */}
      {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" /> */}
      
      {/* Optimized Glow: Uses gradient instead of expensive blur filter */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary/30 px-3 py-1 text-sm text-primary mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Matching Engine v2.0
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
            Trade at the <br />
            Speed of Light.
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The world’s most performant matching engine. Zero latency, deep liquidity, and institutional-grade security for everyone.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/trade/TATA_INR" passHref>
              <Button size="lg" className="h-12 px-8 text-lg rounded-full">
                Start Trading
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/markets" passHref>
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg rounded-full">
                View Markets
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* 3D Tilted Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, rotateX: 20, y: 50 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 1, delay: 0.4, type: "spring" }}
        className="mt-20 w-full max-w-5xl perspective-1000 will-change-transform"
        >
          {/* <div 
            className="relative rounded-xl border border-border/50 bg-card/50 shadow-2xl backdrop-blur-sm overflow-hidden transform-gpu"
            style={{ transform: 'rotateX(2deg)' }}
          > */}

          <div 
            className="relative rounded-xl border border-border/50 bg-card/95 shadow-2xl overflow-hidden transform-gpu" // Removed backdrop-blur-sm, increased opacity to 95
            style={{ transform: 'rotateX(2deg)' }}
>
            {/* Mock Header */}
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 bg-muted/20">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/50" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                <div className="h-3 w-3 rounded-full bg-green-500/50" />
              </div>
              <div className="mx-auto h-2 w-32 rounded-full bg-muted-foreground/20" />
            </div>
            
            {/* Mock Chart Area */}
            <div className="grid grid-cols-4 gap-0 h-[400px]">
                <div className="col-span-3 border-r border-border/50 p-6 relative">
                    {/* Simulated Chart Line */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <div className="text-2xl font-mono font-bold text-green-500">₹980.50</div>
                            <div className="text-xs text-muted-foreground">TATA / INR</div>
                        </div>
                        <div className="flex gap-2">
                             {[ '1H', '4H', '1D', '1W' ].map(t => (
                                 <div key={t} className="px-2 py-1 text-xs rounded-md bg-secondary/50 text-muted-foreground">{t}</div>
                             ))}
                        </div>
                    </div>
                    {/* Abstract Polyline to represent chart */}
                    <svg className="w-full h-64 overflow-visible" preserveAspectRatio="none">
                        <path d="M0,200 Q150,100 300,150 T600,50" fill="none" stroke="#22c55e" strokeWidth="2" />
                        <path d="M0,200 Q150,100 300,150 T600,50 L600,300 L0,300 Z" fill="url(#gradient)" opacity="0.1" />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div className="col-span-1 bg-muted/10 p-4 space-y-3">
                    {/* Mock Orderbook Rows - FIXED HYDRATION ERROR */}
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex justify-between text-xs font-mono">
                            <span className="text-red-400">{(980 + i * 0.5).toFixed(2)}</span>
                            {/* Changed Math.random() to deterministic Math.sin() */}
                            <span className="text-muted-foreground">{(Math.abs(Math.sin(i + 1) * 10)).toFixed(4)}</span>
                        </div>
                    ))}
                    <div className="h-px bg-border my-2" />
                     {[...Array(12)].map((_, i) => (
                        <div key={i+20} className="flex justify-between text-xs font-mono">
                            <span className="text-green-400">{(979 - i * 0.5).toFixed(2)}</span>
                            {/* Changed Math.random() to deterministic Math.cos() */}
                            <span className="text-muted-foreground">{(Math.abs(Math.cos(i + 1) * 10)).toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}