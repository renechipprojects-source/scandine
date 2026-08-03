import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag, ChevronDown, Sparkles, ChefHat, UtensilsCrossed, LogOut,
} from "lucide-react";
import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarFooter, useSidebar,
} from "@/kitchen/components/ui/sidebar";
import { restaurantInfo } from "@/kitchen/lib/mock-data";
import { signOut } from "@/lib/auth";

type Child = { title: string; url: string };
type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: Child[];
};

const nav: { label: string; items: NavItem[] }[] = [
  {
    label: "Orders",
    items: [
      {
        title: "Orders", icon: ShoppingBag, children: [
          { title: "Live Orders", url: "/kitchen/orders/live" },
          { title: "Order History", url: "/kitchen/orders/history" },
        ],
      },
      {
        title: "Kitchen Display", icon: ChefHat, children: [
          { title: "KDS", url: "/kitchen/kds" },
        ],
      },
      {
        title: "Menu", icon: UtensilsCrossed, children: [
          { title: "Food Items", url: "/kitchen/menu/items" },
          { title: "Add Item", url: "/kitchen/menu/add" },
        ],
      },
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
        <Link to="/kitchen/orders/live" className="flex items-center gap-2.5">
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
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarSubMenu key={item.title} item={item} pathname={pathname} collapsed={collapsed} />
                ))}
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
              className="text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-2.5"
              tooltip="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
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
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isChildActive = item.children.some((c) => pathname === c.url);
  const [open, setOpen] = useState(true);

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
