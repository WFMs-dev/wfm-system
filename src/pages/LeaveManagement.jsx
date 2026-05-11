import React, { useState, useEffect } from "react";
import { LeaveRequest, LeaveType, Employee } from "@/api/entities";
import { Plus, X, Save, CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";

const STATUS_CONFIG = {
  Pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  Approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  Rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
  Cancelled: { color: 'bg-slate-100 text-slate-600', icon: X },
};

export default function LeaveManagement() {
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveComment, setApproveComment] = useState('');
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([LeaveRequest.list(), LeaveType.list(), Employee.filter({ status: 'Active' })]).then(([r, lt, e]) => {
      setRequests(r);
      setLeaveTypes(lt);
      setEmployees(e);
      setLoading(false);
    });
  }, []);

  const reload = async () => {
    const r = await LeaveRequest.list();
    setRequests(r);
  };

  const getEmpName = (id) => employees.find(e => e.id === id)?.full_name || 'Unknown';
  const getLeaveTypeName = (id) => leaveTypes.find(lt => lt.id === id)?.name || 'Unknown';
  const getLeaveTypeColor = (id) => leaveTypes.find(lt => lt.id === id)?.color || '#6B7280';

  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start), e = new Date(end);
    return Math.ceil((e - s) / 86400000) + 1;
  };

  const handleCreate = async () => {
    setSaving(true);
    const days = calcDays(form.start_date, form.end_date);
    await LeaveRequest.create({ ...form, status: 'Pending', total_days: days });
    await reload();
    setShowModal(false);
    setSaving(false);
  };

  const handleApprove = async (approve) => {
    setSaving(true);
    await LeaveRequest.update(selectedRequest.id, {
      status: approve ? 'Approved' : 'Rejected',
      approver_comment: approveComment,
      approved_at: new Date().toISOString(),
    });
    await reload();
    setShowApproveModal(false);
    setSaving(false);
  };

  const openApprove = (req) => {
    setSelectedRequest(req);
    setApproveComment('');
    setShowApproveModal(true);
  };

  const filtered = requests.filter(r => {
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    const empName = getEmpName(r.employee_id);
    const matchSearch = !search || empName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }).sort((a, b) => b.created_date > a.created_date ? 1 : -1);

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">จัดการการลา</h2>
          <p className="text-sm text-slate-500">
            {pendingCount > 0 && <span className="text-orange-600 font-medium">{pendingCount} รายการรออนุมัติ · </span>}
            รวม {requests.length} รายการ
          </p>
        </div>
        <button onClick={() => { setForm({ employee_id: employees[0]?.id || '', leave_type_id: leaveTypes[0]?.id || '', start_date: '', end_date: '', reason: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> ยื่นลา
        </button>
      </div>

      {/* Summary by leave type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {leaveTypes.map(lt => {
          const approved = requests.filter(r => r.leave_type_id === lt.id && r.status === 'Approved').length;
          return (
            <div key={lt.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="w-3 h-3 rounded-full mb-2" style={{ background: lt.color }} />
              <div className="text-lg font-bold text-slate-800">{approved}</div>
              <div className="text-xs text-slate-500">{lt.name} (อนุมัติ)</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อพนักงาน..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">ทุก Status</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(req => {
              const StatusIcon = STATUS_CONFIG[req.status]?.icon || Clock;
              const lt = leaveTypes.find(l => l.id === req.leave_type_id);
              return (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: lt?.color + '20' }}>
                      <div className="w-4 h-4 rounded-full" style={{ background: lt?.color || '#6B7280' }} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{getEmpName(req.employee_id)}</div>
                      <div className="text-sm text-slate-500">
                        {getLeaveTypeName(req.leave_type_id)} · {req.start_date} → {req.end_date}
                        <span className="ml-1 font-medium">({req.total_days} วัน)</span>
                      </div>
                      {req.reason && <div className="text-xs text-slate-400 mt-0.5">"{req.reason}"</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_CONFIG[req.status]?.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {req.status}
                    </span>
                    {req.status === 'Pending' && (
                      <button onClick={() => openApprove(req)}
                        className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors">
                        อนุมัติ / ปฏิเสธ
                      </button>
                    )}
                    {req.approver_comment && (
                      <span className="text-xs text-slate-400 italic hidden lg:block">"{req.approver_comment}"</span>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="py-12 text-center text-slate-400">ไม่มีรายการลา</div>}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">ยื่นใบลา</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">พนักงาน</label>
                <select value={form.employee_id} onChange={e => setForm(f => ({...f, employee_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทการลา</label>
                <select value={form.leave_type_id} onChange={e => setForm(f => ({...f, leave_type_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} (สูงสุด {lt.max_days_per_year} วัน/ปี)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              {form.start_date && form.end_date && (
                <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                  รวม {calcDays(form.start_date, form.end_date)} วัน
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เหตุผล</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ระบุเหตุผลการลา..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
              <button onClick={handleCreate} disabled={saving || !form.employee_id || !form.start_date || !form.end_date}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                ยื่นลา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">อนุมัติ / ปฏิเสธ ใบลา</h3>
              <button onClick={() => setShowApproveModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                <div><span className="text-slate-500">พนักงาน:</span> <strong>{getEmpName(selectedRequest.employee_id)}</strong></div>
                <div><span className="text-slate-500">ประเภทลา:</span> <strong>{getLeaveTypeName(selectedRequest.leave_type_id)}</strong></div>
                <div><span className="text-slate-500">วันที่:</span> <strong>{selectedRequest.start_date} → {selectedRequest.end_date} ({selectedRequest.total_days} วัน)</strong></div>
                {selectedRequest.reason && <div><span className="text-slate-500">เหตุผล:</span> {selectedRequest.reason}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ความคิดเห็น (ไม่บังคับ)</label>
                <textarea value={approveComment} onChange={e => setApproveComment(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ระบุเหตุผล..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
              <button onClick={() => handleApprove(false)} disabled={saving}
                className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1">
                <XCircle className="w-4 h-4" /> ปฏิเสธ
              </button>
              <button onClick={() => handleApprove(true)} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
