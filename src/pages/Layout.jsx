import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import {
  LayoutDashboard, Users, Calendar, Clock, FileText,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut,
  ClipboardList, BarChart2, Repeat, Shield, Download,
  Sun, Menu, X
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "พนักงาน", icon: Users, page: "Employees" },
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
  const location = useLocation();

  useEffect(() => {
    User.me().then(setCurrentUser).catch(() => {});
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
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
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon className={`flex-shrink-0 ${isActive ? 'w-5 h-5' : 'w-5 h-5'}`} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={`p-4 border-t border-slate-700`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {currentUser?.full_name?.charAt(0) || 'U'}
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

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col bg-slate-900 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white border border-slate-600 transition-colors z-10"
          style={{ position: 'fixed', left: collapsed ? '52px' : '228px' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">
              {navItems.find(n => n.page === currentPageName)?.label || currentPageName}
            </h1>
          </div>
          <Link to={createPageUrl("Notifications")} className="relative text-slate-500 hover:text-slate-900">
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
