import { SidebarTrigger } from "@/kitchen/components/ui/sidebar";
import { Input } from "@/kitchen/components/ui/input";
import { Button } from "@/kitchen/components/ui/button";
import { Badge } from "@/kitchen/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/kitchen/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/kitchen/components/ui/avatar";
import { Bell, Search, Sun, Moon, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import { useState } from "react";
import { notifications as mockNotif } from "@/kitchen/lib/mock-data";

export function TopBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/", replace: true });
  };

  const crumbs = pathname.split("/").filter(Boolean);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />

      <div className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex">
        {crumbs.length === 0 ? (
          <span className="text-foreground">Home</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={c + i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span className={i === crumbs.length - 1 ? "font-medium capitalize text-foreground" : "capitalize"}>
                {c.replace(/-/g, " ")}
              </span>
            </span>
          ))
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-[10px]">3 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mockNotif.slice(0, 5).map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <span className="line-clamp-1 text-xs text-muted-foreground">{n.body}</span>
                <span className="text-[10px] text-muted-foreground">{n.time}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
