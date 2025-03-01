import { AppSidebar } from "@/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Outlet } from "react-router-dom";
import { Button } from "./ui/button";
import { Logo } from "./Logo";

export default function MainLayout() {
    return (
        <div className="flex min-h-screen">
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="w-full">
                    <header className="flex justify-between h-14 shrink-0 items-center gap-2 border-b px-4">
                        <div className="flex items-center">
                            <Logo />
                            <SidebarTrigger />
                        </div>
                        <div>
                            <SignedOut>
                                <Button size={'sm'}>
                                    <SignInButton />
                                </Button>
                            </SignedOut>
                            <SignedIn>
                                <UserButton />
                            </SignedIn>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto">
                        <Outlet />
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}