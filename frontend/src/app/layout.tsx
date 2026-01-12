import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "../components/theme-provider";
import { cn } from "@/src/lib/utils";
import { inter } from "./font";
import { Navbar } from "../components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Trading Platform",
  description: "A modern trading platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          inter.variable, 
        )}
        >
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
          <Navbar/>
          {children}
          <Toaster/>
       </ThemeProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
