"use client";

import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Settings, Menu } from "lucide-react";
import { useEffect, useState } from "react";

export const Navbar = () => {
    const route = usePathname();

    // Common links visible to everyone
    const publicLinks = [
        { name: 'Markets', href: '/markets' },
        { name: 'Trade', href: '/trade/BTC_USDT' },
    ];

    // Links visible only to authenticated users
    const authLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Portfolio', href: '/portfolio' },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-2xl supports-backdrop-filter:bg-background/60">
            <div className="mx-auto max-w-7xl px-4 flex h-16 items-center justify-between">

                {/* 1. Left: Logo */}
                <div className="flex justify-start">
                    <Link href="/" className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 transition-opacity hover:opacity-80">
                        <span className="font-medium text-2xl tracking-tighter">Vertex</span>
                    </Link>
                </div>

                {/* 2. Right: Navigation Links & Actions */}
                <div className="flex flex-1 justify-end items-center">
                    
                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center">
                        {publicLinks.map((link) => (
                            <Link 
                                key={link.name} 
                                href={link.href} 
                                className={`text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-4 py-2 hover:bg-muted/50 hover:text-foreground ${route.startsWith(link.href) ? 'text-foreground bg-muted/20' : 'text-muted-foreground'}`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <SignedIn>
                            {authLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-4 py-2 hover:bg-muted/50 hover:text-foreground ${route.startsWith(link.href) ? 'text-foreground bg-muted/20' : 'text-muted-foreground'}`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </SignedIn>
                    </div>

                    {/* CTA Actions */}
                    <div className="flex items-center gap-2">
                        {/* <ThemeToggle /> */}

                        <SignedIn>
                            <Link href="/wallet" className="hidden sm:block">
                                <button className="text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-4 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                                    Deposit
                                </button>
                            </Link>
                            <Link href="/wallet" className="hidden sm:block">
                                <Button size="sm" className="px-4 py-2 rounded-md focus-visible:ring-2 focus-visible:ring-primary bg-foreground/90 text-background hover:bg-foreground transition-all">
                                    Withdraw
                                </Button>
                            </Link>

                            <Link href="/settings" className="px-1 py-1">
                                <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-muted-foreground hover:text-foreground transition-colors">
                                    <Settings className="h-4 w-4" />
                                </button>
                            </Link>

                            <div className="px-2 py-2 flex items-center justify-center">
                                <UserButton
                                    appearance={{
                                        elements: { avatarBox: "h-8 w-8 rounded-md" }
                                    }}
                                />
                            </div>
                        </SignedIn>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-4 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                                    Log In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <Button size="sm" className="px-4 py-2 rounded-md focus-visible:ring-2 focus-visible:ring-primary bg-foreground/90 text-background hover:bg-foreground transition-all">
                                    Sign Up
                                </Button>
                            </SignUpButton>
                        </SignedOut>

                        {/* Mobile Hamburger Trigger */}
                        <div className="md:hidden px-2 py-2">
                            <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-muted-foreground hover:text-foreground transition-colors">
                                <Menu className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </nav>
    );
}