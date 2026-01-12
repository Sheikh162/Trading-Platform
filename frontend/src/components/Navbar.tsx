"use client";

import { SignInButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/src/components/ui/navigation-menu";
import { ThemeToggle } from "./ThemeToggle";
import { Settings } from "lucide-react";

export const Navbar = () => {
    const route = usePathname();

    // Common links visible to everyone
    const publicLinks = [
        { name: 'Markets', href: '/markets' },
        { name: 'Trade', href: '/trade/TATA_INR' },
    ];

    // Links visible only to authenticated users
    const authLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Portfolio', href: '/portfolio' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
                
                {/* --- Left Side: Logo & Navigation --- */}
                <div className="mr-4 flex items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="font-bold text-xl sm:inline-block tracking-tight">
                            Vertex
                        </span>
                    </Link>
                    
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList>
                            {/* 1. Render Public Links (Always Visible) */}
                            {publicLinks.map((link) => (
                                <NavigationMenuItem key={link.name}>
                                        <NavigationMenuLink href={link.href}
                                            active={route.startsWith(link.href)} 
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            {link.name}
                                        </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}

                            {/* 2. Render Auth Links (Only inside SignedIn) */}
                            <SignedIn>
                                {authLinks.map((link) => (
                                    <NavigationMenuItem key={link.name}>
                                            <NavigationMenuLink href={link.href}
                                                active={route.startsWith(link.href)} 
                                                className={navigationMenuTriggerStyle()}
                                            >
                                                {link.name}
                                            </NavigationMenuLink>
                                    </NavigationMenuItem>
                                ))}
                            </SignedIn>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* --- Right Side: Actions --- */}
                <div className="flex items-center justify-end space-x-3">
                    <ThemeToggle />

                    <SignedIn>
                        <Link href="/wallet">
                            <Button variant="outline" size="sm" className="hidden sm:flex">Deposit</Button>
                        </Link>
                        <Link href="/wallet">
                            <Button size="sm" className="hidden sm:flex">Withdraw</Button>
                        </Link>
                        
                        <Link href="/settings">
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </Link>

                        <UserButton 
                            appearance={{
                                elements: {
                                    avatarBox: "h-9 w-9"
                                }
                            }}
                        />
                    </SignedIn>

                    <SignedOut>
                        <SignInButton mode="modal">
                            <Button variant="default" size="sm">
                                Sign In
                            </Button>
                        </SignInButton>
                    </SignedOut>
                </div>
            </div>
        </header>
    );
}