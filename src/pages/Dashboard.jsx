import React, { useState, useEffect } from "react";
import { Employee, Schedule, LeaveRequest, AttendanceLog, ShiftSwapRequest, Notification, Shift } from "@/api/entities";
import { Users, Calendar, Clock, AlertTriangle, CheckCircle, TrendingUp, UserCheck, UserX, Repeat, Bell, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];

const StatCard = ({ title, value, subtitle, icon: Icon, color, bg, to }) => {
  const card = (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-blue-200 transition-colors ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
  return to ? <Link to={createPageUrl(to)}>{card}</Link> : card;
};

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      Employee.list(),
      Schedule.filter({ date: today }),
      Schedule.list(),
      LeaveRequest.filter({ status: 'Pending' }),
      AttendanceLog.list(),
      ShiftSwapRequest.filter({ status: 'Pending' }),
      Notification.list(),
      Shift.list(),
    ]).then(([emps, todaySch, allSch, lvs, att, sw, notifs, sh]) => {
      setEmployees(emps);
      setTodaySchedules(todaySch);
      setAllSchedules(allSch);
      setPendingLeaves(lvs);
      setAttendance(att);
      setPendingSwaps(sw);
      setNotifications(notifs);
      setShifts(sh);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeEmployees = employees.filter(e => e.status === 'Active');
  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const totalOT = attendance.reduce((s, a) => s + (a.ot_hours || 0), 0);

  // Today's shift distribution
  const shiftCounts = todaySchedules.reduce((acc, s) => {
    const sh = shifts.find(sf => sf.id === s.shift_id);
    if (sh) acc[sh.name] = (acc[sh.name] || 0) + 1;
    return acc;
  }, {});
  const shiftData = Object.entries(shiftCounts).map(([name, count]) => ({ name, count }));

  // Attendance status breakdown
  const attStatus = [
    { name: 'เข้าตรงเวลา', value: attendance.filter(a => a.status === 'Present').length },
    { name: 'สาย', value: attendance.filter(a => a.status === 'Late').length },
    { name: 'ขาดงาน', value: attendance.filter(a => a.status === 'Absent').length },
    { name: 'ออกก่อน', value: attendance.filter(a => a.status === 'Early Leave').length },
  ].filter(d => d.value > 0);

  // Team headcount
  const teamData = Object.entries(
    activeEmployees.reduce((acc, e) => { if (e.team) acc[e.team] = (acc[e.team] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count }));

  // Recent activity feed
  const recentLeaves = pendingLeaves.slice(0, 3);
  const recentSwaps = pendingSwaps.slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="พนักงาน Active" value={activeEmployees.length} subtitle={`${employees.length} ทั้งหมด`}
          icon={Users} color="text-blue-600" bg="bg-blue-50" to="Employees" />
        <StatCard title="กะวันนี้" value={todaySchedules.length} subtitle={`${shiftData.length} กะต่างกัน`}
          icon={Calendar} color="text-indigo-600" bg="bg-indigo-50" to="Schedule" />
        <StatCard title="รออนุมัติ" value={pendingLeaves.length + pendingSwaps.length}
          subtitle={`ลา ${pendingLeaves.length} · แลกกะ ${pendingSwaps.length}`}
          icon={AlertTriangle} color={pendingLeaves.length + pendingSwaps.length > 0 ? "text-orange-600" : "text-green-600"}
          bg={pendingLeaves.length + pendingSwaps.length > 0 ? "bg-orange-50" : "bg-green-50"} to="Approvals" />
        <StatCard title="OT ทั้งหมด" value={`${totalOT.toFixed(1)}h`} subtitle="ชั่วโมงล่วงเวลา"
          icon={TrendingUp} color="text-purple-600" bg="bg-purple-50" to="Reports" />
      </div>

      {/* Second row: alerts + unread */}
      {(unreadNotifs > 0 || pendingLeaves.length + pendingSwaps.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {unreadNotifs > 0 && (
            <Link to={createPageUrl("Notifications")}
              className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100 transition-colors">
              <Bell className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-800">มี {unreadNotifs} การแจ้งเตือนที่ยังไม่ได้อ่าน</span>
              <ChevronRight className="w-4 h-4 text-blue-500 ml-auto" />
            </Link>
          )}
          {pendingLeaves.length + pendingSwaps.length > 0 && (
            <Link to={createPageUrl("Approvals")}
              className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 hover:bg-orange-100 transition-colors">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="text-sm font-medium text-orange-800">มี {pendingLeaves.length + pendingSwaps.length} รายการรออนุมัติ</span>
              <ChevronRight className="w-4 h-4 text-orange-500 ml-auto" />
            </Link>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attendance pie */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">สถานะ Attendance</h3>
            <Link to={createPageUrl("Attendance")} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          {attStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={attStatus} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {attStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-300">
              <UserCheck className="w-10 h-10 mb-2" />
              <span className="text-sm">ยังไม่มีข้อมูล</span>
            </div>
          )}
        </div>

        {/* Team bar chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">พนักงานแต่ละทีม</h3>
            <Link to={createPageUrl("Employees")} className="text-xs text-blue-600 hover:underline">จัดการ</Link>
          </div>
          {teamData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="คน" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-300">
              <Users className="w-10 h-10 mb-2" />
              <span className="text-sm">ยังไม่มีข้อมูล</span>
            </div>
          )}
        </div>

        {/* Today's shifts */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">กะวันนี้</h3>
            <Link to={createPageUrl("Schedule")} className="text-xs text-blue-600 hover:underline">ตารางเต็ม</Link>
          </div>
          {shiftData.length > 0 ? (
            <div className="space-y-3">
              {shiftData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-700">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 rounded-full px-2 py-0.5">
                      <span className="text-xs font-semibold text-slate-700">{s.count} คน</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                <span className="text-slate-500">รวม</span>
                <span className="font-semibold text-slate-800">{todaySchedules.length} คน</span>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-300">
              <Calendar className="w-10 h-10 mb-2" />
              <span className="text-sm">ยังไม่มีตารางวันนี้</span>
              <Link to={createPageUrl("Schedule")} className="mt-2 text-xs text-blue-500 hover:underline">+ เพิ่มกะ</Link>
            </div>
          )}
        </div>
      </div>

      {/* Pending approvals quick view */}
      {(recentLeaves.length > 0 || recentSwaps.length > 0) && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">รายการรออนุมัติล่าสุด</h3>
            <Link to={createPageUrl("Approvals")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentLeaves.map(req => {
              const emp = employees.find(e => e.id === req.employee_id);
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800">{emp?.full_name || '—'}</span>
                    <span className="text-xs text-slate-500 ml-2">ขอลา {req.start_date} → {req.end_date}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex-shrink-0">รออนุมัติ</span>
                </div>
              );
            })}
            {recentSwaps.map(req => {
              const requester = employees.find(e => e.id === req.requester_employee_id);
              const target = employees.find(e => e.id === req.target_employee_id);
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Repeat className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800">{requester?.full_name || '—'}</span>
                    <span className="text-xs text-slate-500 ml-2">ขอแลกกะกับ {target?.full_name || '—'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex-shrink-0">รออนุมัติ</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '+ เพิ่มพนักงาน', to: 'Employees', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
          { label: '📅 จัดตาราง', to: 'Schedule', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
          { label: '📊 รายงาน', to: 'Reports', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
          { label: '💾 Export Payroll', to: 'PayrollExport', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
        ].map(btn => (
          <Link key={btn.to} to={createPageUrl(btn.to)}
            className={`${btn.color} rounded-xl px-4 py-3 text-sm font-semibold text-center transition-colors shadow-sm`}>
            {btn.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
