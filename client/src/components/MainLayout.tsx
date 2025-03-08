import { AppSidebar } from "@/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { useProjectStore } from "@/store/projectStore";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Outlet } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

export default function MainLayout() {
    const { currentProjectId, projects } = useProjectStore(
        useShallow((state) => ({
            currentProjectId: state.currentProjectId,
            projects: state.projects,
        }))
    );
    const currentProject = projects.find((project) => project.id === currentProjectId);
    return (
        <div className="flex min-h-screen">
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="w-full">
                    <header className="flex justify-between h-14 shrink-0 items-center gap-2 border-b px-4">
                        <Logo />
                        {currentProject && (
                            <div className="flex items-center border px-4 py-1 rounded-md cursor-default">
                                <div className="font-semibold truncate text-sm">
                                    {currentProject.name || ''}
                                </div>
                            </div>
                        )}
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