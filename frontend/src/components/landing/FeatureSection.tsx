"use client";

import React from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { Zap, ShieldCheck, BarChart3, ArrowUpRight } from "lucide-react";

const features = [
    {
        icon: <Zap className="h-6 w-6 text-primary" />,
        title: "Lightning Execution",
        description: "100,000 TPS matching engine. Never miss a price. Our engine handles extreme volatility with zero downtime. Built for high-frequency traders.",
    },
    {
        icon: <BarChart3 className="h-6 w-6 text-primary" />,
        title: "Lowest Fees",
        description: "Trade More, Pay Less. Flat 0.1% trading fees. Zero fees on limit orders for market makers.",
    },
    {
        icon: <ShieldCheck className="h-6 w-6 text-primary" />,
        title: "Ironclad Security",
        description: "Your funds are held 1:1. Secured with multi-sig cold storage and real-time fraud monitoring. Audited by top security firms.",
    },
];

export default function FeaturesSection() {
    return (
        <section className="relative w-full bg-background py-24 md:py-32 overflow-hidden">
            {/* Subtle background glow for feature section */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-white/2 to-transparent pointer-events-none" />

            <div className="mx-auto max-w-7xl px-4 flex flex-col relative z-10">

                {/* 4. Features detached by mb-12 */}
                <div className="mb-12 flex flex-col items-start gap-4 w-full">
                    <h2 className="text-3xl font-medium tracking-tighter sm:text-4xl md:text-5xl text-balance text-foreground">
                        Infrastructure built for Alpha.
                    </h2>
                    <p className="max-w-2xl text-lg text-muted-foreground text-balance">
                        Execute trades with zero hesitation. The fastest engine, the lowest fees, and ironclad security.
                    </p>
                </div>

                {/* Asymmetric Bento Grid auto-rows-[300px] */}
                <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-2 auto-rows-auto md:auto-rows-[340px]">
                    {features.map((feature, index) => {
                        const bentoClass = index === 0 ? "md:col-span-2" : index === 1 ? "md:col-span-1" : "md:col-span-3 h-[280px]";
                        return (
                            <SpotlightCard key={feature.title} bentoClass={bentoClass} delay={index * 0.1}>
                                <div className="mb-6 h-12 w-12 rounded-sm bg-white/5 flex items-center justify-center glass-border glass-shadow-sm">
                                    {feature.icon}
                                </div>

                                <h3 className="mb-2 text-2xl font-medium tracking-tighter text-foreground flex items-center gap-2">
                                    {feature.title}
                                </h3>

                                <p className="text-base text-muted-foreground leading-relaxed flex-grow max-w-lg">
                                    {feature.description}
                                </p>

                                <div className="mt-6 flex items-center w-fit text-sm font-medium text-primary transition-colors hover:text-white cursor-pointer group/link">
                                    Learn more <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover/link:translate-x-1 group-hover/link:-translate-y-1" />
                                </div>
                            </SpotlightCard>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function SpotlightCard({ children, bentoClass, delay }: { children: React.ReactNode, bentoClass: string, delay: number }) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            className={`group relative overflow-hidden rounded-none glass-border glass-bg glass-shadow-md p-8 md:p-10 hover:bg-white/10 transition-colors flex flex-col ${bentoClass}`}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 mix-blend-screen"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            600px circle at ${mouseX}px ${mouseY}px,
                            white/5,
                            transparent 80%
                        )
                    `,
                }}
            />
            <div className="relative z-10 flex flex-col h-full">
                {children}
            </div>
        </motion.div>
    );
}