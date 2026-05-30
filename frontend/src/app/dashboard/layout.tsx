"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Sun,
  Moon,
  LayoutDashboard,
  Kanban,
  Users,
  FileCheck,
  History,
  UserCircle,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Sparkles,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
      roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    },
    {
      name: "Tasks & Kanban",
      icon: Kanban,
      path: "/dashboard/tasks",
      roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    },
    {
      name: "User Management",
      icon: Users,
      path: "/dashboard/users",
      roles: ["ADMIN"],
    },
    {
      name: "Work Logs",
      icon: FileCheck,
      path: "/dashboard/worklogs",
      roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    },
    {
      name: "Audit Trail",
      icon: History,
      path: "/dashboard/audit",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Profile Settings",
      icon: UserCircle,
      path: "/dashboard/profile",
      roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user.role));

  const handleNav = (path: string) => {
    router.push(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-r border-slate-200/50 dark:border-slate-800/40 p-5 shrink-0 z-30 justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              WorkFlow
            </span>
            <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded">
              v1.0
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/10"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Info */}
        <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/40">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-500/10">
              {user.name.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-red-500 dark:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-xl text-xs font-semibold transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 z-50 justify-between h-full animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-lg tracking-tight text-white">WorkFlow</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {filteredMenu.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-purple-400 font-bold border border-purple-500/10">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{user.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3.5 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-semibold transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/50 dark:border-slate-800/40 px-6 flex items-center justify-between shrink-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
              {pathname.split("/").pop() === "dashboard" ? "System Overview" : pathname.split("/").pop()?.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all relative"
              title="Notifications"
            >
              <Bell className={`w-4.5 h-4.5 ${unreadCount > 0 ? "animate-bell-shake" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-purple-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Dropdown */}
            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                <div className="absolute right-0 top-11 w-80 max-h-[30rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 overflow-y-auto z-50 flex flex-col animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-3 shrink-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.read) markRead(notif.id);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            notif.read
                              ? "bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/40 text-slate-500"
                              : "bg-purple-50/10 dark:bg-purple-900/10 border-purple-500/20 text-slate-800 dark:text-slate-200 hover:bg-purple-50/20 dark:hover:bg-purple-900/20"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="font-bold">{notif.title}</span>
                            {!notif.read && <div className="w-1.5 h-1.5 bg-purple-600 rounded-full shrink-0 mt-1" />}
                          </div>
                          <p className="text-[11px] leading-relaxed mb-1.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block font-medium">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-400">
                        <CheckCircle className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-medium">All caught up! No alerts.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
