"use client";

import { Button, ModeToggle } from "@repo/ui/shad"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/ui/shad";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle
} from "@repo/ui/shad";
import { useState } from "react"
import { Menu } from "lucide-react";
import Image from "next/image";
import { Logo } from "./Logo";
import { signIn, signOut } from "next-auth/react";
import { Session } from "next-auth";
import Link from "next/link";

export default function AppBar({ session }: { session: Session | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    <Logo />
                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger>Contribute</NavigationMenuTrigger>
                                <NavigationMenuContent className="p-2">
                                    <Link href="/contribute?type=problem" legacyBehavior passHref>
                                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                            Problem
                                        </NavigationMenuLink>
                                    </Link>
                                    <Link href="/contribute?type=contest" legacyBehavior passHref>
                                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                            Contest
                                        </NavigationMenuLink>
                                    </Link>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/problems?" legacyBehavior passHref>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Problems
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/contests" legacyBehavior passHref>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Contests
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                    <div className="flex items-center space-x-4">
                        <ModeToggle />
                        {session
                            ? <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="h-10 w-10 flex justify-center border bg-secondary items-center rounded-full">
                                        <Image
                                            src="/placeholder.svg"
                                            alt="User"
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Profile</DropdownMenuItem>
                                    <DropdownMenuItem>Settings</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => signOut()}>Logout</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            : <Button onClick={() => signIn()}>Sign In</Button>
                        }
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <Menu className="h-6 w-6 text-primary" />
                        </Button>
                    </div>
                </div>
            </div>
            {isMenuOpen && (
                <div className="md:hidden">
                    <nav className="px-2 pt-2 pb-4 space-y-1 flex flex-col">
                        <Link href={"/problems"}>
                            <Button variant={"link"}>Problems</Button>
                        </Link>
                        <Link href={"/contests"}>
                            <Button variant={"link"}>Contests</Button>
                        </Link>
                        <Link href={"/contribute"}>
                            <Button variant={"link"}>Contribute</Button>
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    )
}