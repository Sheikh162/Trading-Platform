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
        { name: 'Trade', href: '/trade/TATA_INR' },
        { name: 'Markets', href: '/markets' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
                <div className="mr-4 flex items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="font-bold sm:inline-block">
                            TradeMaxx
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
