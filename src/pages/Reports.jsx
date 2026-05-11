import React, { useState, useEffect } from "react";
import { AttendanceLog, Employee, LeaveRequest, Schedule, Shift } from "@/api/entities";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart2, Users, Clock, TrendingUp } from "lucide-react";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    Promise.all([
      Employee.list(),
      AttendanceLog.list(),
      LeaveRequest.list(),
      Schedule.list(),
      Shift.list(),
    ]).then(([e, a, l, s, sh]) => {
      setEmployees(e);
      setAttendance(a);
      setLeaves(l);
      setSchedules(s);
      setShifts(sh);
      setLoading(false);
    });
  }, []);

  // Attendance by status
  const attStatusData = [
    { name: 'มาตรงเวลา', value: attendance.filter(a => a.status === 'Present').length, color: '#10B981' },
    { name: 'สาย', value: attendance.filter(a => a.status === 'Late').length, color: '#F59E0B' },
    { name: 'ขาดงาน', value: attendance.filter(a => a.status === 'Absent').length, color: '#EF4444' },
    { name: 'ออกก่อน', value: attendance.filter(a => a.status === 'Early Leave').length, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  // Leave by status
  const leaveStatusData = [
    { name: 'Approved', value: leaves.filter(l => l.status === 'Approved').length },
    { name: 'Pending', value: leaves.filter(l => l.status === 'Pending').length },
    { name: 'Rejected', value: leaves.filter(l => l.status === 'Rejected').length },
  ].filter(d => d.value > 0);

  // Department headcount
  const deptCounts = employees.reduce((acc, e) => {
    if (e.department && e.status === 'Active') acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});
  const deptData = Object.entries(deptCounts).map(([name, count]) => ({ name, count }));

  // Team headcount
  const teamCounts = employees.reduce((acc, e) => {
    if (e.team && e.status === 'Active') acc[e.team] = (acc[e.team] || 0) + 1;
    return acc;
  }, {});
  const teamData = Object.entries(teamCounts).map(([name, count]) => ({ name, count }));

  // OT hours per employee (top 5)
  const empOT = employees.map(emp => {
    const logs = attendance.filter(a => a.employee_id === emp.id);
    const ot = logs.reduce((s, a) => s + (a.ot_hours || 0), 0);
    return { name: emp.full_name?.split(' ')[0] || '—', ot: +ot.toFixed(1) };
  }).sort((a, b) => b.ot - a.ot).slice(0, 6);

  // Shift distribution
  const shiftCounts = schedules.reduce((acc, s) => {
    const sh = shifts.find(sf => sf.id === s.shift_id);
    if (sh) acc[sh.name] = (acc[sh.name] || 0) + 1;
    return acc;
  }, {});
  const shiftData = Object.entries(shiftCounts).map(([name, count]) => ({ name, count }));

  const totalWorkHours = attendance.reduce((s, a) => s + (a.total_hours || 0), 0);
  const totalOTHours = attendance.reduce((s, a) => s + (a.ot_hours || 0), 0);
  const totalLeaveDays = leaves.filter(l => l.status === 'Approved').reduce((s, l) => s + (l.total_days || 0), 0);
  const activeEmp = employees.filter(e => e.status === 'Active').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">รายงาน & Analytics</h2>
        <p className="text-sm text-slate-500">ภาพรวมข้อมูล Workforce Management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'พนักงาน Active', value: activeEmp, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'ชั่วโมงรวม', value: totalWorkHours.toFixed(0) + 'h', icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'ชั่วโมง OT', value: totalOTHours.toFixed(0) + 'h', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'วันลารวม', value: totalLeaveDays + ' วัน', icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">สถานะ Attendance</h3>
          {attStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={attStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, value }) => `${name}: ${value}`}>
                  {attStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูล</div>}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">พนักงานแต่ละแผนก</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูล</div>}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">OT Hours (Top พนักงาน)</h3>
          {empOT.some(e => e.ot > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={empOT}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="ot" fill="#F59E0B" radius={[4, 4, 0, 0]} name="OT Hours" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูล OT</div>}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">การกระจายกะ</h3>
          {shiftData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={shiftData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name}`}>
                  {shiftData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูลกะ</div>}
        </div>
      </div>

      {/* Leave summary table */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">สรุปการลาแต่ละทีม</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">ทีม</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">พนักงาน</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">ใบลาทั้งหมด</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">อนุมัติ</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">รออนุมัติ</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">วันลารวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(teamCounts).map(([team, count]) => {
                const teamEmps = employees.filter(e => e.team === team);
                const teamEmpIds = teamEmps.map(e => e.id);
                const teamLeaves = leaves.filter(l => teamEmpIds.includes(l.employee_id));
                const approved = teamLeaves.filter(l => l.status === 'Approved');
                const pending = teamLeaves.filter(l => l.status === 'Pending');
                const totalDays = approved.reduce((s, l) => s + (l.total_days || 0), 0);
                return (
                  <tr key={team} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{team}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{count}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{teamLeaves.length}</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-medium">{approved.length}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-yellow-600 font-medium">{pending.length}</span></td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{totalDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
