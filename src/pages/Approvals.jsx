import React, { useState, useEffect } from "react";
import { LeaveRequest, ShiftSwapRequest, Employee, LeaveType } from "@/api/entities";
import { CheckCircle, XCircle, Clock, Shield, Filter } from "lucide-react";

export default function Approvals() {
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    Promise.all([
      LeaveRequest.filter({ status: 'Pending' }),
      ShiftSwapRequest.filter({ status: 'Pending' }),
      Employee.list(),
      LeaveType.list(),
    ]).then(([l, s, e, lt]) => {
      setLeaves(l);
      setSwaps(s);
      setEmployees(e);
      setLeaveTypes(lt);
      setLoading(false);
    });
  }, []);

  const reload = async () => {
    const [l, s] = await Promise.all([LeaveRequest.filter({ status: 'Pending' }), ShiftSwapRequest.filter({ status: 'Pending' })]);
    setLeaves(l);
    setSwaps(s);
  };

  const getEmpName = (id) => employees.find(e => e.id === id)?.full_name || '—';
  const getLeaveName = (id) => leaveTypes.find(lt => lt.id === id)?.name || '—';

  const handleLeaveAction = async (id, approve) => {
    setSaving(id);
    await LeaveRequest.update(id, {
      status: approve ? 'Approved' : 'Rejected',
      approved_at: new Date().toISOString(),
    });
    await reload();
    setSaving(null);
  };

  const handleSwapAction = async (id, approve) => {
    setSaving(id);
    await ShiftSwapRequest.update(id, {
      status: approve ? 'Approved' : 'Rejected',
      approved_at: new Date().toISOString(),
    });
    await reload();
    setSaving(null);
  };

  const allPending = [...leaves.map(l => ({...l, _type: 'leave'})), ...swaps.map(s => ({...s, _type: 'swap'}))];
  const total = allPending.length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Approval Center</h2>
        <p className="text-sm text-slate-500">{total} รายการรออนุมัติ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `ทั้งหมด (${total})` },
          { key: 'leave', label: `ใบลา (${leaves.length})` },
          { key: 'swap', label: `แลกกะ (${swaps.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 text-lg">ไม่มีรายการรออนุมัติ</h3>
          <p className="text-slate-400 text-sm mt-1">ทุกรายการได้รับการจัดการแล้ว</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Leave Requests */}
          {(activeTab === 'all' || activeTab === 'leave') && leaves.map(req => (
            <div key={req.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{getEmpName(req.employee_id)}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">ใบลา</span>
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {getLeaveName(req.leave_type_id)} · {req.start_date} → {req.end_date} ({req.total_days} วัน)
                    </div>
                    {req.reason && <div className="text-xs text-slate-400 mt-1">"{req.reason}"</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button onClick={() => handleLeaveAction(req.id, false)} disabled={saving === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> ปฏิเสธ
                  </button>
                  <button onClick={() => handleLeaveAction(req.id, true)} disabled={saving === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium disabled:opacity-50">
                    {saving === req.id ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    อนุมัติ
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Swap Requests */}
          {(activeTab === 'all' || activeTab === 'swap') && swaps.map(req => (
            <div key={req.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {getEmpName(req.requester_employee_id)} → {getEmpName(req.target_employee_id)}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">แลกกะ</span>
                    </div>
                    {req.reason && <div className="text-xs text-slate-400 mt-1">"{req.reason}"</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button onClick={() => handleSwapAction(req.id, false)} disabled={saving === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> ปฏิเสธ
                  </button>
                  <button onClick={() => handleSwapAction(req.id, true)} disabled={saving === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium disabled:opacity-50">
                    {saving === req.id ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    อนุมัติ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
