import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Target,
  ListTodo,
  HeartPulse,
  RefreshCw,
  TrendingUp,
  Zap,
  Brain,
  Award,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  MessageCircle,
  Mic,
} from "lucide-react";
import { CoachMic } from "@/components/CoachMic";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/goals", label: "Weekly Goals", icon: Target },
  { to: "/coach", label: "AI Coach", icon: Mic },
  { to: "/tasks", label: "Today's Tasks", icon: ListTodo },
  { to: "/checkin", label: "Daily Check-In", icon: HeartPulse },
  { to: "/recovery", label: "Recovery Mode", icon: RefreshCw },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/intentions", label: "If-Then Builder", icon: Zap },
  { to: "/breakdown", label: "AI Breakdown", icon: Brain },
  { to: "/achievements", label: "Achievements", icon: Award },
  { to: "/feedback", label: "Beta Feedback", icon: MessageCircle },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:flex md:translate-x-0",
          open ? "flex translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{BRAND.short}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Beta</span>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">{BRAND.short}</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl p-6 md:p-10">{children}</div>;
}
