import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Notification } from "@/api/entities";
import {
  LayoutDashboard, Users, Calendar, Clock,
  Bell, ChevronLeft, ChevronRight,
  ClipboardList, BarChart2, Repeat, Shield, Download,
  Sun, Menu, Layers
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "พนักงาน", icon: Users, page: "Employees" },
  { label: "กะ (Shifts)", icon: Layers, page: "Shifts" },
  { label: "ตารางกะ", icon: Calendar, page: "Schedule" },
  { label: "บันทึกเวลา", icon: Clock, page: "Attendance" },
  { label: "การลา", icon: ClipboardList, page: "LeaveManagement" },
  { label: "แลกกะ", icon: Repeat, page: "ShiftSwap" },
  { label: "อนุมัติ", icon: Shield, page: "Approvals" },
  { label: "วันหยุด", icon: Sun, page: "Holidays" },
  { label: "รายงาน", icon: BarChart2, page: "Reports" },
  { label: "Export Payroll", icon: Download, page: "PayrollExport" },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    User.me().then(setCurrentUser).catch(() => {});
    const loadUnread = () => {
      Notification.list().then(list => setUnreadCount(list.filter(n => !n.is_read).length)).catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/60 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">WFM System</div>
            <div className="text-slate-400 text-xs">Workforce Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
                ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-slate-700/60">
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow">
            <span className="text-white text-xs font-bold">
              {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{currentUser?.full_name || 'User'}</div>
              <div className="text-slate-400 text-xs truncate">{currentUser?.email || ''}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const pageLabel = navItems.find(n => n.page === currentPageName)?.label || currentPageName;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col bg-slate-900 transition-all duration-300 flex-shrink-0 relative ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white border border-slate-600 transition-colors z-10 shadow"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-slate-600 hover:text-slate-900 p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">{pageLabel}</h1>
          </div>
          <Link to={createPageUrl("Notifications")}
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
