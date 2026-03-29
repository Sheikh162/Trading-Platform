"use client";

import Link from "next/link";
import { Twitter, Github, Disc } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const Footer = () => {
  const footerLinks = {
    Platform: [
      { name: "Markets", href: "/markets" },
      { name: "Dashboard", href: "/dashboard" },
      { name: "Portfolio", href: "/portfolio" },
      { name: "Exchange", href: "/trade/BTC_USDT" },
    ],
    Support: [
      { name: "Help Center", href: "#" },
      { name: "API Documentation", href: "#" },
      { name: "Fees & Limits", href: "#" },
      { name: "Security", href: "#" },
    ],
    Company: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Terms of Service", href: "#" },
    ],
    Legals: [
      { name: "Privacy Policy", href: "#" },
      { name: "Cookie Policy", href: "#" },
      { name: "Risk Disclosure", href: "#" },
      { name: "Regulatory Info", href: "#" },
    ],
  };

  return (
    <footer className="w-full bg-background border-t border-border">
      {/* 7. Footer The Index */}
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-24 flex flex-col gap-16">

        {/* Multi-column Grid: grid-cols-2 md:grid-cols-4 lg:grid-cols-5 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* Brand Column (Spans 2 on smaller grids, 1 on LG) */}
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-6">
            <Link href="/" className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 w-fit">
              <span className="font-medium text-2xl tracking-tighter">Vertex</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The world’s most performant matching engine. Zero latency, deep liquidity, and institutional-grade security.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary">
                <Github className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary">
                <Disc className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Links Columns organized by category */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-4">
              <h3 className="font-medium tracking-tighter text-foreground">{category}</h3>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md w-fit"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom Bar: Copyright Separated by 1px border-t */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vertex Exchange. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};