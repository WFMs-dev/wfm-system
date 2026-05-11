import React, { useState, useEffect } from "react";
import { Shift } from "@/api/entities";
import { Plus, X, Save, Trash2, Edit2, Clock, ToggleLeft, ToggleRight } from "lucide-react";

const SHIFT_TYPE_COLOR = {
  Morning: 'bg-yellow-100 text-yellow-700',
  Afternoon: 'bg-orange-100 text-orange-700',
  Night: 'bg-indigo-100 text-indigo-700',
  OT: 'bg-red-100 text-red-700',
  Training: 'bg-teal-100 text-teal-700',
  Custom: 'bg-slate-100 text-slate-700',
};

const defaultForm = {
  name: '', shift_code: '', start_time: '08:00', end_time: '17:00',
  break_duration_minutes: 60, shift_type: 'Morning', color: '#3B82F6',
  location: '', min_staff: 1, is_active: true, required_skills: []
};

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await Shift.list();
    setShifts(data.sort((a, b) => a.start_time > b.start_time ? 1 : -1));
    setLoading(false);
  };

  const openCreate = () => { setForm(defaultForm); setEditingId(null); setShowModal(true); };
  const openEdit = (s) => { setForm({ ...s, required_skills: s.required_skills || [] }); setEditingId(s.id); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) await Shift.update(editingId, form);
      else await Shift.create(form);
      await load();
      setShowModal(false);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันลบกะนี้?')) return;
    await Shift.delete(id);
    await load();
  };

  const toggleActive = async (shift) => {
    await Shift.update(shift.id, { is_active: !shift.is_active });
    setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, is_active: !s.is_active } : s));
  };

  const calcDuration = (start, end, breakMin) => {
    if (!start || !end) return '—';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // crosses midnight
    mins -= (breakMin || 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">จัดการกะ (Shifts)</h2>
          <p className="text-sm text-slate-500">{shifts.length} กะทั้งหมด · {shifts.filter(s => s.is_active).length} ใช้งานอยู่</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> เพิ่มกะใหม่
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['Morning', 'Afternoon', 'Night', 'OT'].map(type => (
          <div key={type} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <div className="text-2xl font-bold text-slate-800">{shifts.filter(s => s.shift_type === type).length}</div>
            <div className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SHIFT_TYPE_COLOR[type]}`}>{type}</div>
          </div>
        ))}
      </div>

      {/* Shift table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">ชื่อกะ</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">รหัส</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">เวลา</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">ระยะเวลา</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ประเภท</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Staff ขั้นต่ำ</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shifts.map(shift => (
                  <tr key={shift.id} className={`hover:bg-slate-50 transition-colors ${!shift.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color || '#94a3b8' }} />
                        <span className="font-medium text-slate-800">{shift.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{shift.shift_code}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {shift.start_time} – {shift.end_time}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {calcDuration(shift.start_time, shift.end_time, shift.break_duration_minutes)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SHIFT_TYPE_COLOR[shift.shift_type] || SHIFT_TYPE_COLOR.Custom}`}>
                        {shift.shift_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{shift.min_staff || 1}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(shift)} className="inline-flex items-center">
                        {shift.is_active
                          ? <ToggleRight className="w-6 h-6 text-green-500" />
                          : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(shift)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(shift.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-400">ยังไม่มีกะ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editingId ? 'แก้ไขกะ' : 'เพิ่มกะใหม่'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อกะ *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น กะเช้า" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">รหัสกะ *</label>
                  <input value={form.shift_code} onChange={e => setForm(f => ({ ...f, shift_code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น AM" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลาเริ่ม</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลาสิ้นสุด</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลาพัก (นาที)</label>
                  <input type="number" min={0} max={120} value={form.break_duration_minutes}
                    onChange={e => setForm(f => ({ ...f, break_duration_minutes: +e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Staff ขั้นต่ำ</label>
                  <input type="number" min={1} value={form.min_staff}
                    onChange={e => setForm(f => ({ ...f, min_staff: +e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทกะ</label>
                  <select value={form.shift_type} onChange={e => setForm(f => ({ ...f, shift_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['Morning', 'Afternoon', 'Night', 'OT', 'Training', 'Custom'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">สี</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border border-slate-200" />
                    <span className="text-sm text-slate-500 font-mono">{form.color}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น Bangkok Office" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-slate-700">เปิดใช้งาน (Active)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.shift_code}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
