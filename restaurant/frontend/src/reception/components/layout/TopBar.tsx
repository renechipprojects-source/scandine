import { SidebarTrigger } from "@/reception/components/ui/sidebar";
import { Button } from "@/reception/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/reception/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/reception/components/ui/avatar";
import { Input } from "@/reception/components/ui/input";
import { Label } from "@/reception/components/ui/label";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import { useReceptionistProfile } from "@/hooks/useReceptionistProfile";
import { useState } from "react";

export function TopBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { profile } = useReceptionistProfile();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/", replace: true });
  };

  const crumbs = pathname.split("/").filter(Boolean);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "RC";

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
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pl-1 pr-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-primary to-destructive text-xs font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <div className="text-xs font-semibold leading-tight">{profile.name}</div>
                <div className="text-[10px] leading-tight text-muted-foreground">Receptionist</div>
              </div>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Receptionist Account Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4 border-b pb-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-destructive text-base font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-display text-base font-bold">{profile.name}</div>
                  <div className="text-xs text-muted-foreground">Receptionist</div>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2.5 text-xs text-muted-foreground border border-border/50">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Managed by Administrator. Profile editing is restricted to Admin.</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name</Label>
                  <Input value={profile.name} readOnly className="h-8 text-xs bg-muted/30 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input value={profile.email} readOnly className="h-8 text-xs bg-muted/30 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number</Label>
                  <Input value={profile.phone} readOnly className="h-8 text-xs bg-muted/30 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Input value="Receptionist" readOnly className="h-8 text-xs bg-muted/30 cursor-not-allowed font-medium text-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsProfileOpen(false)}>
                  Close
                </Button>
                <Button variant="destructive" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
