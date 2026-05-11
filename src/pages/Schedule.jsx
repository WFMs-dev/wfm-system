import React, { useState, useEffect } from "react";
import { Schedule, Employee, Shift, Holiday } from "@/api/entities";
import { ChevronLeft, ChevronRight, Plus, X, Save, Trash2, Calendar, Users, Clock } from "lucide-react";

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  // pad before
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function SchedulePage() {
  const [view, setView] = useState('month'); // month | week | list
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ employee_id: '', shift_id: '', date: '', status: 'Scheduled', notes: '', is_ot: false, is_training: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    const [scheds, emps, shfts, hols] = await Promise.all([
      Schedule.list(), Employee.filter({ status: 'Active' }), Shift.filter({ is_active: true }), Holiday.list()
    ]);
    setSchedules(scheds);
    setEmployees(emps);
    setShifts(shfts);
    setHolidays(hols);
    setLoading(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthDays(year, month);

  const getSchedulesForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.date === dateStr);
  };

  const getHolidayForDate = (date) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return holidays.find(h => h.date === dateStr);
  };

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.full_name || 'Unknown';
  const getShift = (id) => shifts.find(s => s.id === id);

  const openAddSchedule = (date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    setForm({ employee_id: employees[0]?.id || '', shift_id: shifts[0]?.id || '', date: dateStr, status: 'Scheduled', notes: '', is_ot: false, is_training: false });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Schedule.create(form);
      await loadData();
      setShowModal(false);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันลบกะนี้?')) return;
    await Schedule.delete(id);
    await loadData();
  };

  const isToday = (date) => {
    if (!date) return false;
    const t = new Date();
    return date.toDateString() === t.toDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ตารางกะ</h2>
          <p className="text-sm text-slate-500">จัดการตารางการทำงาน</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {['month', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {v === 'month' ? 'เดือน' : 'รายการ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Nav */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h3 className="font-bold text-slate-800 text-lg">{MONTHS_TH[month]} {year + 543}</h3>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {view === 'month' && (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS.map(d => (
                <div key={d} className={`py-2 text-center text-xs font-semibold ${d === 'อา' || d === 'ส' ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-slate-50">
              {days.map((date, idx) => {
                const daySchedules = getSchedulesForDate(date);
                const holiday = getHolidayForDate(date);
                const today = isToday(date);
                const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6);
                return (
                  <div key={idx}
                    className={`min-h-[90px] p-1.5 border-b border-slate-50 relative
                      ${!date ? 'bg-slate-50/50' : ''}
                      ${isWeekend && date ? 'bg-red-50/30' : ''}
                      ${holiday ? 'bg-yellow-50/50' : ''}
                      ${date ? 'cursor-pointer hover:bg-blue-50/30' : ''}
                    `}
                    onClick={() => date && openAddSchedule(date)}
                  >
                    {date && (
                      <>
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                          ${today ? 'bg-blue-600 text-white' : isWeekend ? 'text-red-500' : 'text-slate-700'}`}>
                          {date.getDate()}
                        </div>
                        {holiday && <div className="text-xs text-yellow-600 font-medium truncate mb-1">{holiday.name}</div>}
                        <div className="space-y-0.5">
                          {daySchedules.slice(0, 3).map(s => {
                            const shift = getShift(s.shift_id);
                            return (
                              <div key={s.id}
                                className="text-xs px-1.5 py-0.5 rounded text-white truncate flex items-center justify-between group"
                                style={{ backgroundColor: shift?.color || '#3B82F6' }}
                                onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                              >
                                <span className="truncate">{getEmployeeName(s.employee_id).split(' ')[0]}</span>
                                <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1" />
                              </div>
                            );
                          })}
                          {daySchedules.length > 3 && <div className="text-xs text-slate-400 pl-1">+{daySchedules.length - 3} อื่นๆ</div>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); openAddSchedule(date); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity text-xs">
                          <Plus className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-12 text-center text-slate-400">ยังไม่มีตารางกะ</div>
            ) : (
              schedules.slice().sort((a, b) => a.date > b.date ? 1 : -1).map(s => {
                const shift = getShift(s.shift_id);
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: shift?.color || '#3B82F6' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{getEmployeeName(s.employee_id)}</div>
                      <div className="text-xs text-slate-500">{s.date} · {shift?.name || 'Unknown Shift'} ({shift?.start_time} - {shift?.end_time})</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.is_ot && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">OT</span>}
                      {s.is_training && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Training</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                        s.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        s.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>{s.status}</span>
                      <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Shift Legend */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h4 className="font-semibold text-slate-700 text-sm mb-3">ตำนานกะ</h4>
        <div className="flex flex-wrap gap-3">
          {shifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: shift.color || '#3B82F6' }} />
              <span className="text-sm text-slate-600">{shift.name} ({shift.start_time}–{shift.end_time})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">เพิ่มกะการทำงาน</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">พนักงาน</label>
                <select value={form.employee_id} onChange={e => setForm(f => ({...f, employee_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">กะ</label>
                <select value={form.shift_id} onChange={e => setForm(f => ({...f, shift_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_ot} onChange={e => setForm(f => ({...f, is_ot: e.target.checked}))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-slate-700">OT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_training} onChange={e => setForm(f => ({...f, is_training: e.target.checked}))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-slate-700">Training</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.employee_id || !form.shift_id}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
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
