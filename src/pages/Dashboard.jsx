import React, { useState, useEffect } from "react";
import { Employee, Schedule, LeaveRequest, AttendanceLog, ShiftSwapRequest, Notification } from "@/api/entities";
import { Users, Calendar, Clock, AlertTriangle, CheckCircle, TrendingUp, UserCheck, UserX, Repeat } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color === 'text-blue-600' ? 'bg-blue-50' : color === 'text-green-600' ? 'bg-green-50' : color === 'text-orange-600' ? 'bg-orange-50' : color === 'text-red-600' ? 'bg-red-50' : 'bg-slate-50'}`}>
        <Icon className={`w-6 h-6 ${color || 'text-slate-600'}`} />
      </div>
    </div>
  </div>
);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      Employee.list(),
      Schedule.filter({ date: today }),
      LeaveRequest.filter({ status: 'Pending' }),
      AttendanceLog.list(),
      ShiftSwapRequest.filter({ status: 'Pending' }),
    ]).then(([emps, scheds, lvs, att, sw]) => {
      setEmployees(emps);
      setSchedules(scheds);
      setLeaves(lvs);
      setAttendance(att);
      setSwaps(sw);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const todayScheduled = schedules.length;
  const pendingLeaves = leaves.length;
  const pendingSwaps = swaps.length;

  // Attendance status breakdown
  const attStatusData = [
    { name: 'เข้างานตรงเวลา', value: attendance.filter(a => a.status === 'Present').length },
    { name: 'สาย', value: attendance.filter(a => a.status === 'Late').length },
    { name: 'ขาดงาน', value: attendance.filter(a => a.status === 'Absent').length },
    { name: 'ออกก่อน', value: attendance.filter(a => a.status === 'Early Leave').length },
  ].filter(d => d.value > 0);

  // Team breakdown
  const teamCounts = employees.reduce((acc, e) => {
    if (e.team) acc[e.team] = (acc[e.team] || 0) + 1;
    return acc;
  }, {});
  const teamData = Object.entries(teamCounts).map(([name, count]) => ({ name, count }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="พนักงานทั้งหมด" value={activeEmployees} subtitle="Active employees" icon={Users} color="text-blue-600" />
        <StatCard title="กะวันนี้" value={todayScheduled} subtitle="Scheduled today" icon={Calendar} color="text-green-600" />
        <StatCard title="รออนุมัติลา" value={pendingLeaves} subtitle="Pending requests" icon={AlertTriangle} color="text-orange-600" />
        <StatCard title="รอแลกกะ" value={pendingSwaps} subtitle="Swap requests" icon={Repeat} color="text-red-600" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">พนักงานแต่ละทีม</h3>
          {teamData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูล</div>
          )}
        </div>

        {/* Attendance Status */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">สถานะการเข้างาน</h3>
          {attStatusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={attStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {attStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {attStatusData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600">{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูล Attendance</div>
          )}
        </div>
      </div>

      {/* Quick Actions + Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "เพิ่มพนักงาน", icon: Users, page: "Employees", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
              { label: "จัดตารางกะ", icon: Calendar, page: "Schedule", color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
              { label: "บันทึกเวลา", icon: Clock, page: "Attendance", color: "bg-green-50 text-green-700 hover:bg-green-100" },
              { label: "Export Payroll", icon: TrendingUp, page: "PayrollExport", color: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
            ].map((action) => (
              <Link
                key={action.page}
                to={createPageUrl(action.page)}
                className={`flex items-center gap-2 p-3 rounded-lg transition-colors font-medium text-sm ${action.color}`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Role Summary */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">สรุปพนักงานตาม Role</h3>
          <div className="space-y-3">
            {['Admin', 'Supervisor', 'Scheduler', 'Agent', 'HR'].map(role => {
              const count = employees.filter(e => e.wfm_role === role && e.status === 'Active').length;
              const total = activeEmployees || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{role}</span>
                    <span className="font-semibold text-slate-800">{count} คน</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
