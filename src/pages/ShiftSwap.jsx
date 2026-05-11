import React, { useState, useEffect } from "react";
import { ShiftSwapRequest, Employee, Schedule, Shift } from "@/api/entities";
import { Repeat, Plus, X, CheckCircle, XCircle, Clock, Search } from "lucide-react";

export default function ShiftSwap() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [approveComment, setApproveComment] = useState('');
  const [form, setForm] = useState({ requester_employee_id: '', target_employee_id: '', requester_schedule_id: '', target_schedule_id: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    Promise.all([ShiftSwapRequest.list(), Employee.filter({ status: 'Active' }), Schedule.list(), Shift.list()]).then(([r, e, s, sh]) => {
      setRequests(r);
      setEmployees(e);
      setSchedules(s);
      setShifts(sh);
      setLoading(false);
    });
  }, []);

  const reload = async () => setRequests(await ShiftSwapRequest.list());

  const getEmpName = (id) => employees.find(e => e.id === id)?.full_name || '—';
  const getScheduleInfo = (id) => {
    const s = schedules.find(sc => sc.id === id);
    if (!s) return '—';
    const sh = shifts.find(sf => sf.id === s.shift_id);
    return `${s.date} · ${sh?.name || '—'}`;
  };

  const requesterSchedules = schedules.filter(s => s.employee_id === form.requester_employee_id);
  const targetSchedules = schedules.filter(s => s.employee_id === form.target_employee_id);

  const handleCreate = async () => {
    setSaving(true);
    await ShiftSwapRequest.create({ ...form, status: 'Pending' });
    await reload();
    setShowModal(false);
    setSaving(false);
  };

  const handleApprove = async (approve) => {
    setSaving(true);
    await ShiftSwapRequest.update(selectedReq.id, {
      status: approve ? 'Approved' : 'Rejected',
      approver_comment: approveComment,
      approved_at: new Date().toISOString(),
    });
    if (approve && selectedReq.requester_schedule_id && selectedReq.target_schedule_id) {
      // Swap the employee_ids
      const reqSched = schedules.find(s => s.id === selectedReq.requester_schedule_id);
      const tgtSched = schedules.find(s => s.id === selectedReq.target_schedule_id);
      if (reqSched && tgtSched) {
        await Promise.all([
          Schedule.update(selectedReq.requester_schedule_id, { employee_id: selectedReq.target_employee_id }),
          Schedule.update(selectedReq.target_schedule_id, { employee_id: selectedReq.requester_employee_id }),
        ]);
      }
    }
    await reload();
    setShowApproveModal(false);
    setSaving(false);
  };

  const filtered = requests.filter(r => filterStatus === 'All' || r.status === filterStatus).sort((a, b) => b.created_date > a.created_date ? 1 : -1);

  const STATUS_CONFIG = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Cancelled: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ขอแลกกะ</h2>
          <p className="text-sm text-slate-500">{requests.filter(r => r.status === 'Pending').length} รายการรออนุมัติ</p>
        </div>
        <button onClick={() => { setForm({ requester_employee_id: '', target_employee_id: '', requester_schedule_id: '', target_schedule_id: '', reason: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> ขอแลกกะ
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {s === 'All' ? 'ทั้งหมด' : s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(req => (
              <div key={req.id} className="px-5 py-4 hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[req.status]}`}>{req.status}</span>
                      <span className="text-xs text-slate-400">{req.created_date?.split('T')[0]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-blue-50 rounded-lg px-3 py-2">
                        <div className="font-medium text-slate-800">{getEmpName(req.requester_employee_id)}</div>
                        <div className="text-xs text-slate-500">{getScheduleInfo(req.requester_schedule_id)}</div>
                      </div>
                      <Repeat className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="bg-purple-50 rounded-lg px-3 py-2">
                        <div className="font-medium text-slate-800">{getEmpName(req.target_employee_id)}</div>
                        <div className="text-xs text-slate-500">{getScheduleInfo(req.target_schedule_id)}</div>
                      </div>
                    </div>
                    {req.reason && <div className="text-xs text-slate-400 mt-2">เหตุผล: "{req.reason}"</div>}
                    {req.approver_comment && <div className="text-xs text-slate-500 mt-1 italic">ความคิดเห็น: "{req.approver_comment}"</div>}
                  </div>
                  {req.status === 'Pending' && (
                    <button onClick={() => { setSelectedReq(req); setApproveComment(''); setShowApproveModal(true); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium flex-shrink-0">
                      อนุมัติ / ปฏิเสธ
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="py-12 text-center text-slate-400">ไม่มีรายการแลกกะ</div>}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">ขอแลกกะ</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">พนักงานที่ขอแลก</label>
                <select value={form.requester_employee_id} onChange={e => setForm(f => ({...f, requester_employee_id: e.target.value, requester_schedule_id: ''}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              {form.requester_employee_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">กะที่ต้องการแลก</label>
                  <select value={form.requester_schedule_id} onChange={e => setForm(f => ({...f, requester_schedule_id: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- เลือกกะ --</option>
                    {requesterSchedules.map(s => <option key={s.id} value={s.id}>{getScheduleInfo(s.id)}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">พนักงานที่จะแลกด้วย</label>
                <select value={form.target_employee_id} onChange={e => setForm(f => ({...f, target_employee_id: e.target.value, target_schedule_id: ''}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.filter(e => e.id !== form.requester_employee_id).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              {form.target_employee_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">กะที่จะรับมาแลก</label>
                  <select value={form.target_schedule_id} onChange={e => setForm(f => ({...f, target_schedule_id: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- เลือกกะ --</option>
                    {targetSchedules.map(s => <option key={s.id} value={s.id}>{getScheduleInfo(s.id)}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เหตุผล</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
              <button onClick={handleCreate} disabled={saving || !form.requester_employee_id || !form.requester_schedule_id}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                ส่งคำขอ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">อนุมัติการแลกกะ</h3>
              <button onClick={() => setShowApproveModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex items-center gap-3">
                  <div><span className="text-slate-500">จาก:</span> <strong>{getEmpName(selectedReq.requester_employee_id)}</strong> - {getScheduleInfo(selectedReq.requester_schedule_id)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div><span className="text-slate-500">ไป:</span> <strong>{getEmpName(selectedReq.target_employee_id)}</strong> - {getScheduleInfo(selectedReq.target_schedule_id)}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ความคิดเห็น</label>
                <textarea value={approveComment} onChange={e => setApproveComment(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
              <button onClick={() => handleApprove(false)} disabled={saving} className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1">
                <XCircle className="w-4 h-4" /> ปฏิเสธ
              </button>
              <button onClick={() => handleApprove(true)} disabled={saving} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
