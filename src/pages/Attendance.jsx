import React, { useState, useEffect } from "react";
import { AttendanceLog, Employee, Schedule } from "@/api/entities";
import { Clock, MapPin, CheckCircle, AlertCircle, Plus, X, Save, Search } from "lucide-react";

const STATUS_CONFIG = {
  'Present': { color: 'bg-green-100 text-green-700', label: 'มาทำงาน' },
  'Late': { color: 'bg-yellow-100 text-yellow-700', label: 'สาย' },
  'Early Leave': { color: 'bg-orange-100 text-orange-700', label: 'ออกก่อน' },
  'Absent': { color: 'bg-red-100 text-red-700', label: 'ขาดงาน' },
  'Missing Clock-out': { color: 'bg-purple-100 text-purple-700', label: 'ลืม Clock-out' },
};

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClockIn, setShowClockIn] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geo, setGeo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([AttendanceLog.list(), Employee.filter({ status: 'Active' })]).then(([l, e]) => {
      setLogs(l);
      setEmployees(e);
      setLoading(false);
    });
  }, []);

  const getGeo = () => {
    setGeoLoading(true);
    navigator.geolocation?.getCurrentPosition(pos => {
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoLoading(false);
    }, () => { setGeo(null); setGeoLoading(false); });
  };

  const handleClockIn = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const emp = employees.find(e => e.id === selectedEmp);
    // Determine if late (simplified: after 08:30)
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const isLate = h > 8 || (h === 8 && m > 30);
    const lateMin = isLate ? (h * 60 + m) - (8 * 60 + 30) : 0;
    await AttendanceLog.create({
      employee_id: selectedEmp,
      clock_in_time: now,
      clock_in_lat: geo?.lat || null,
      clock_in_lng: geo?.lng || null,
      status: isLate ? 'Late' : 'Present',
      late_minutes: lateMin,
    });
    const updated = await AttendanceLog.list();
    setLogs(updated);
    setShowClockIn(false);
    setSaving(false);
    setGeo(null);
  };

  const handleClockOut = async (logId) => {
    const now = new Date().toISOString();
    const log = logs.find(l => l.id === logId);
    if (!log) return;
    const inTime = new Date(log.clock_in_time);
    const outTime = new Date(now);
    const totalHours = (outTime - inTime) / 3600000;
    const regularHours = Math.min(totalHours, 9);
    const otHours = Math.max(0, totalHours - 9);
    await AttendanceLog.update(logId, {
      clock_out_time: now,
      total_hours: +totalHours.toFixed(2),
      ot_hours: +otHours.toFixed(2),
      status: log.status === 'Present' || log.status === 'Late' ? log.status : 'Present',
    });
    const updated = await AttendanceLog.list();
    setLogs(updated);
  };

  const getEmpName = (id) => employees.find(e => e.id === id)?.full_name || 'Unknown';

  const filtered = logs.filter(log => {
    const logDate = log.clock_in_time?.split('T')[0];
    const matchDate = !dateFilter || logDate === dateFilter;
    const matchStatus = filterStatus === 'All' || log.status === filterStatus;
    const empName = getEmpName(log.employee_id);
    const matchSearch = !search || empName.toLowerCase().includes(search.toLowerCase());
    return matchDate && matchStatus && matchSearch;
  }).sort((a, b) => b.clock_in_time > a.clock_in_time ? 1 : -1);

  const todayLogs = logs.filter(l => l.clock_in_time?.startsWith(new Date().toISOString().split('T')[0]));
  const presentCount = todayLogs.filter(l => l.status === 'Present').length;
  const lateCount = todayLogs.filter(l => l.status === 'Late').length;
  const absentCount = employees.length - todayLogs.length;

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">บันทึกเวลาทำงาน</h2>
          <p className="text-sm text-slate-500">Clock-in / Clock-out Management</p>
        </div>
        <button onClick={() => setShowClockIn(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
          <Clock className="w-4 h-4" /> Clock-in พนักงาน
        </button>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          <div className="text-xs text-slate-500 mt-1">มาตรงเวลา</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
          <div className="text-xs text-slate-500 mt-1">มาสาย</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-red-600">{Math.max(0, absentCount)}</div>
          <div className="text-xs text-slate-500 mt-1">ยังไม่ Clock-in</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อพนักงาน..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">ทุก Status</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">พนักงาน</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Clock-in</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Clock-out</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ชั่วโมง</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{getEmpName(log.employee_id)}</div>
                      <div className="text-xs text-slate-400">{log.clock_in_time?.split('T')[0]}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{formatTime(log.clock_in_time)}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {log.clock_out_time ? formatTime(log.clock_out_time) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.total_hours ? (
                        <div>
                          <span className="font-medium text-slate-800">{log.total_hours}h</span>
                          {log.ot_hours > 0 && <span className="ml-1 text-xs text-orange-600">(+{log.ot_hours}h OT)</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                      {log.clock_in_lat ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          {log.clock_in_lat?.toFixed(4)}, {log.clock_in_lng?.toFixed(4)}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[log.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_CONFIG[log.status]?.label || log.status}
                          {log.status === 'Late' && log.late_minutes > 0 && ` (${log.late_minutes} นาที)`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!log.clock_out_time && (
                        <button onClick={() => handleClockOut(log.id)} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors">
                          Clock-out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">ไม่มีข้อมูล Attendance</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clock-in Modal */}
      {showClockIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Clock-in พนักงาน</h3>
              <button onClick={() => setShowClockIn(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center text-3xl font-bold text-slate-800 font-mono">
                {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เลือกพนักงาน</label>
                <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <button onClick={getGeo} disabled={geoLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                <MapPin className="w-4 h-4" />
                {geoLoading ? 'กำลังดึงตำแหน่ง...' : geo ? `✓ ตำแหน่ง: ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : 'บันทึก GPS Location (ไม่บังคับ)'}
              </button>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowClockIn(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
              <button onClick={handleClockIn} disabled={saving || !selectedEmp}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Clock-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
