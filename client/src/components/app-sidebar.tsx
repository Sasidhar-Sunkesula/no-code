import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import useFetch from "@/hooks/useFetch";
import { API_URL } from "@/lib/constants";
import { useProjectStore } from "@/store/projectStore";
import { Loader2, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Logo } from "./Logo";
import { SearchForm } from "./search-form";
import SubscriptionDialog from "./subscription-dialog";
import { ModeToggle } from "./ui/mode-toggle";
import { NavProjects } from "./ui/nav-projects";
import { NavSettings } from "./nav-settings";

export function AppSidebar() {
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { setOpen } = useSidebar();
  const { refreshProjects, setProjects } = useProjectStore(
    useShallow((state) => ({
      projects: state.projects,
      currentProjectId: state.currentProjectId,
      refreshProjects: state.refreshProjects,
      setProjects: state.setProjects,
      setCurrentProjectId: state.setCurrentProjectId,
    }))
  );
  const { authenticatedFetch } = useFetch();

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await authenticatedFetch(`${API_URL}/api/projects`);
        setProjects(data.projects);
      } catch (error) {
        console.error(error instanceof Error
          ? error.message
          : "Something went wrong while fetching projects"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, [refreshProjects]);

  useEffect(() => {
    const enterThreshold = 40;
    const exitThreshold = 250;

    function onMouseMove(event: MouseEvent) {
      if (event.pageX < enterThreshold) {
        setOpen(true);
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
        setOpen(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <Sidebar ref={menuRef} variant="floating">
      <SidebarHeader>
        <SidebarMenuButton size="lg">
          <Logo />
        </SidebarMenuButton>
      </SidebarHeader>
      <SearchForm searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <SidebarMenu className="mt-2 px-2">
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="font-medium bg-sky-100 hover:bg-sky-100 hover:text-blue-500 text-blue-500">
            <a href="/">
              <div className="flex items-center gap-x-2">
                <MessageCircle className="size-4" />
                <span className="font-semibold">Start a new chat</span>
              </div>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarContent>
        {
          isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin size-5 text-sidebar-primary" />
            </div>
          ) : (
            <SidebarGroup style={{ scrollbarWidth: 'thin' }} className="overflow-y-scroll">
              <SidebarGroupLabel>Chats</SidebarGroupLabel>
              <NavProjects searchQuery={searchQuery} />
            </SidebarGroup>
          )}
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <NavSettings />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <ModeToggle />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <SubscriptionDialog />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
