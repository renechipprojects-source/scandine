import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/admin/components/ui/sidebar";
import { AppSidebar } from "@/admin/components/layout/AppSidebar";
import { TopBar } from "@/admin/components/layout/TopBar";
import { hasRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/_app")({
  ssr: false,
  beforeLoad: () => {
    if (!hasRole("admin")) throw redirect({ to: "/" });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <div className="theme-admin flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1">
          <TopBar />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
