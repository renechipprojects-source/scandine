import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Receipt, Boxes, ChevronDown, LogOut,
} from "lucide-react";
import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from "@/reception/components/ui/sidebar";
import { signOut } from "@/lib/auth";

type NavItem =
  | { title: string; url: string; icon: React.ComponentType<{ className?: string }> }
  | { title: string; icon: React.ComponentType<{ className?: string }>; children: { title: string; url: string }[] };

const nav: { label: string; items: NavItem[] }[] = [
  {
    label: "Reception",
    items: [
      { title: "Dashboard", url: "/reception/dashboard", icon: LayoutDashboard },
      { title: "Customers", url: "/reception/customers", icon: Users },
      {
        title: "Billing", icon: Receipt, children: [
          { title: "Invoices", url: "/reception/billing/invoices" },
          { title: "Payments", url: "/reception/billing/payments" },
        ]
      },
      { title: "Purchase Orders", url: "/reception/inventory/purchase-orders", icon: Boxes },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/reception" className="flex items-center gap-2.5">
          <img src="/scandine-logo.png" alt="ScanDine" className="h-8 w-8 object-contain shrink-0" />
          {!collapsed && (
            <span className="truncate font-display text-lg font-bold tracking-tight">
              <span className="text-foreground">Scan</span>
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 bg-clip-text text-transparent">Dine</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if ("children" in item) {
                    return <SidebarSubMenu key={item.title} item={item} pathname={pathname} collapsed={collapsed} />;
                  }
                  const active = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-2.5"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="font-medium truncate">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarSubMenu({
  item, pathname, collapsed,
}: {
  item: { title: string; icon: React.ComponentType<{ className?: string }>; children: { title: string; url: string }[] };
  pathname: string;
  collapsed: boolean;
}) {
  const isChildActive = item.children.some((c) => pathname === c.url);
  const [open, setOpen] = useState(isChildActive);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setOpen(!open)}
        isActive={isChildActive}
        tooltip={item.title}
        className="flex items-center gap-2.5"
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.title}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </SidebarMenuButton>
      {open && !collapsed && (
        <SidebarMenuSub>
          {item.children.map((c) => (
            <SidebarMenuSubItem key={c.url}>
              <SidebarMenuSubButton asChild isActive={pathname === c.url}>
                <Link to={c.url}>{c.title}</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
