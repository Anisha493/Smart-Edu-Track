import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Megaphone,
  MessageSquare,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
  Settings,
  CalendarDays,
  FileText,
  DollarSign,
  BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navByRole = {
  admin: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/students", label: "Students", icon: GraduationCap },
    { to: "/classes", label: "Classes", icon: BookOpen },
    { to: "/subjects", label: "Subjects", icon: BookMarked },
    { to: "/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/grades", label: "Grades", icon: BarChart3 },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/report-cards", label: "Report Cards", icon: FileText },
    { to: "/finance", label: "Finance", icon: DollarSign },
    { to: "/users", label: "Users", icon: Users },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  teacher: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/students", label: "Students", icon: GraduationCap },
    { to: "/subjects", label: "Subjects", icon: BookMarked },
    { to: "/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/grades", label: "Grades", icon: BarChart3 },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
  ],
  student: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/my-grades", label: "My Grades", icon: BarChart3 },
    { to: "/my-attendance", label: "My Attendance", icon: CalendarCheck },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
  ],
  parent: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/my-grades", label: "Child Grades", icon: BarChart3 },
    { to: "/my-attendance", label: "Child Attendance", icon: CalendarCheck },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/finance", label: "Finance", icon: DollarSign },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
  ],
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || "student";
  const nav = navByRole[role] || navByRole.student;

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () =>
      base44.entities.Notification.filter(
        { user_email: user.email, read: false },
        "-created_date",
        20,
      ),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unread-messages", user?.email],
    queryFn: () =>
      base44.entities.Message.filter(
        { to_email: user.email, read: false },
        "-created_date",
        50,
      ),
    enabled: !!user?.email,
    refetchInterval: 15000,
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[hsl(190_55%_10%)] text-white flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">
                EduTrack
              </div>
              <div className="text-[11px] text-white/50 uppercase tracking-wider">
                Smart Student System
              </div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-white/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.to === "/messages" && unreadMessages.length > 0 && (
                  <Badge className="ml-auto bg-accent text-white text-[10px] h-4 min-w-4 px-1">
                    {unreadMessages.length}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-sm font-semibold">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.full_name}
              </div>
              <div className="text-xs text-white/50 capitalize">{role}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card/80 backdrop-blur border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block">
            <h2 className="text-sm text-muted-foreground">Welcome back,</h2>
            <div className="font-display font-semibold">{user?.full_name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/notifications")}
              className="relative p-2 rounded-lg hover:bg-secondary transition"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-white text-[10px]">
                  {notifications.length}
                </Badge>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
