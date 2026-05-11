import React, { useState, useEffect } from "react";
import { ExportJob, Employee } from "@/api/entities";
import { Download, FileText, Clock, CheckCircle, XCircle, Filter, Plus } from "lucide-react";

const STATUS_CONFIG = {
  Completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  Processing: { color: 'bg-blue-100 text-blue-700', icon: Clock },
  Pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  Failed: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PayrollExport() {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({
    export_type: 'Payroll',
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    team: '',
    department: '',
  });

  useEffect(() => {
    Promise.all([ExportJob.list(), Employee.list()]).then(([j, e]) => {
      setJobs(j.sort((a, b) => b.created_date > a.created_date ? 1 : -1));
      setEmployees(e);
      setLoading(false);
    });
  }, []);

  const teams = [...new Set(employees.map(e => e.team).filter(Boolean))];
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleExport = async () => {
    setExporting(true);
    try {
      // Create export job record first
      const job = await ExportJob.create({
        export_type: form.export_type,
        start_date: form.start_date,
        end_date: form.end_date,
        filters: { team: form.team, department: form.department },
        status: 'Processing',
        file_name: `${form.export_type.toLowerCase()}_${form.start_date}_${form.end_date}.csv`,
      });

      // Call backend function
      const resp = await fetch('/api/functions/exportPayroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: form.start_date,
          end_date: form.end_date,
          team: form.team || undefined,
          department: form.department || undefined,
        }),
        credentials: 'include',
      });

      if (!resp.ok) throw new Error('Export failed');

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.export_type.toLowerCase()}_${form.start_date}_${form.end_date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update job status
      await ExportJob.update(job.id, { status: 'Completed' });
      const updated = await ExportJob.list();
      setJobs(updated.sort((a, b) => b.created_date > a.created_date ? 1 : -1));
      setShowForm(false);
    } catch (e) {
      alert('Export ไม่สำเร็จ: ' + e.message);
    }
    setExporting(false);
  };

  // Inline CSV export fallback (client-side)
  const handleClientExport = async () => {
    setExporting(true);
    try {
      const { AttendanceLog, LeaveRequest } = await import('@/api/entities');
      const [attLogs, leaveReqs] = await Promise.all([AttendanceLog.list(), LeaveRequest.list()]);

      let filteredEmps = employees.filter(e => e.status === 'Active');
      if (form.team) filteredEmps = filteredEmps.filter(e => e.team === form.team);
      if (form.department) filteredEmps = filteredEmps.filter(e => e.department === form.department);

      const startDt = new Date(form.start_date);
      const endDt = new Date(form.end_date + 'T23:59:59');

      const rows = filteredEmps.map(emp => {
        const empLogs = attLogs.filter(log => {
          if (log.employee_id !== emp.id) return false;
          const d = new Date(log.clock_in_time);
          return d >= startDt && d <= endDt;
        });
        const empLeaves = leaveReqs.filter(lr => lr.employee_id === emp.id && lr.status === 'Approved');

        const totalHours = empLogs.reduce((s, l) => s + (l.total_hours || 0), 0);
        const otHours = empLogs.reduce((s, l) => s + (l.ot_hours || 0), 0);
        const lateCount = empLogs.filter(l => l.status === 'Late').length;
        const absentCount = empLogs.filter(l => l.status === 'Absent').length;
        const totalLeaveDays = empLeaves.reduce((s, l) => s + (l.total_days || 0), 0);

        return [
          emp.employee_code || '',
          emp.full_name,
          emp.department || '',
          emp.team || '',
          emp.location || '',
          form.start_date,
          form.end_date,
          totalHours.toFixed(2),
          otHours.toFixed(2),
          totalLeaveDays,
          lateCount,
          absentCount,
          emp.status,
        ].map(v => `"${v}"`).join(',');
      });

      const headers = ['Employee Code', 'Full Name', 'Department', 'Team', 'Location', 'Period Start', 'Period End', 'Total Work Hours', 'OT Hours', 'Leave Days', 'Late Count', 'Absent Count', 'Status'];
      const csv = [headers.join(','), ...rows].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${form.start_date}_${form.end_date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save export job
      const saved = await ExportJob.create({
        export_type: form.export_type,
        start_date: form.start_date,
        end_date: form.end_date,
        filters: { team: form.team, department: form.department },
        status: 'Completed',
        file_name: `payroll_${form.start_date}_${form.end_date}.csv`,
        record_count: filteredEmps.length,
      });

      const updated = await ExportJob.list();
      setJobs(updated.sort((a, b) => b.created_date > a.created_date ? 1 : -1));
      setShowForm(false);
    } catch (e) {
      alert('Export ไม่สำเร็จ: ' + e.message);
    }
    setExporting(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Export Payroll</h2>
          <p className="text-sm text-slate-500">Export ข้อมูลสำหรับคำนวณเงินเดือน</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> Export ใหม่
        </button>
      </div>

      {/* Export Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" /> กำหนดค่า Export
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท Export</label>
              <select value={form.export_type} onChange={e => setForm(f => ({...f, export_type: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Payroll">Payroll (ครบถ้วน)</option>
                <option value="Attendance">Attendance เท่านั้น</option>
                <option value="Leave">Leave เท่านั้น</option>
                <option value="OT">OT เท่านั้น</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">วันที่เริ่ม</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">วันที่สิ้นสุด</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter ทีม (ไม่บังคับ)</label>
              <select value={form.team} onChange={e => setForm(f => ({...f, team: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">ทุกทีม</option>
                {teams.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter แผนก (ไม่บังคับ)</label>
              <select value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">ทุกแผนก</option>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleClientExport} disabled={exporting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {exporting ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'กำลัง Export...' : 'Export CSV'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Export History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">ประวัติ Export</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {jobs.map(job => {
              const StatusIcon = STATUS_CONFIG[job.status]?.icon || Clock;
              return (
                <div key={job.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{job.file_name || `${job.export_type}_export.csv`}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {job.start_date} → {job.end_date}
                      {job.record_count != null && ` · ${job.record_count} รายการ`}
                      {` · ${job.created_date?.split('T')[0]}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_CONFIG[job.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                      <StatusIcon className="w-3 h-3" />
                      {job.status}
                    </span>
                    <span className={`px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs`}>{job.export_type}</span>
                  </div>
                </div>
              );
            })}
            {jobs.length === 0 && <div className="py-12 text-center text-slate-400">ยังไม่มีประวัติ Export</div>}
          </div>
        )}
      </div>
    </div>
  );
}
