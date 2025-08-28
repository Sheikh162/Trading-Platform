"use client";

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

export const Navbar = () => {
    const route = usePathname();
    const navLinks = [
        { name: 'Markets', href: '/markets' },
        { name: 'Trade', href: '/trade/TATA_INR' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
                <div className="mr-4 flex items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bitcoin"><path d="M11.767 19.089c4.917-2.331 4.917-11.847 0-14.178-4.917 2.331-4.917 11.847 0 14.178z"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 12h8"/><path d="M12 7v10"/></svg>
                        <span className="font-bold sm:inline-block">
                            Trading Platform
                        </span>
                    </Link>
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList>
                            {navLinks.map((link) => (
                                <NavigationMenuItem key={link.name}>
                                    <NavigationMenuLink href={link.href} active={route.startsWith(link.href)} className={navigationMenuTriggerStyle()}>
                                            {link.name}
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <div className="flex items-center justify-end space-x-2">
                    <Button variant="outline">Deposit</Button>
                    <Button>Withdraw</Button>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
