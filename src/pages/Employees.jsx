import React, { useState, useEffect } from "react";
import { Employee } from "@/api/entities";
import { Plus, Search, Edit2, Trash2, X, Save, UserCircle, Filter } from "lucide-react";

const SKILLS_OPTIONS = ["Thai", "English", "Japanese", "Chinese", "CRM", "Training", "HR", "Payroll", "Technical Support", "Sales"];
const ROLES = ["Admin", "Supervisor", "Scheduler", "Agent", "HR"];
const DEPARTMENTS = ["Customer Service", "HR", "IT", "Finance", "Operations"];
const TEAMS = ["Team A", "Team B", "Team C", "HR", "Management"];
const LOCATIONS = ["Bangkok", "Chiang Mai", "Phuket", "Remote"];
const STATUSES = ["Active", "Suspended", "Resigned"];
const EMP_TYPES = ["Full-time", "Part-time", "Contract"];

const defaultForm = {
  employee_code: "", full_name: "", email: "", phone: "",
  department: "Customer Service", team: "Team A", location: "Bangkok",
  wfm_role: "Agent", status: "Active", hire_date: "",
  employment_type: "Full-time", max_hours_per_day: 9, max_hours_per_week: 40,
  skills: []
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const data = await Employee.list();
    setEmployees(data);
    setLoading(false);
  };

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || e.status === filterStatus;
    const matchRole = filterRole === "All" || e.wfm_role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  const openCreate = () => { setForm(defaultForm); setEditingId(null); setShowModal(true); };
  const openEdit = (emp) => { setForm({ ...emp }); setEditingId(emp.id); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await Employee.update(editingId, form);
      } else {
        await Employee.create(form);
      }
      await loadEmployees();
      setShowModal(false);
    } catch (e) { alert("บันทึกไม่สำเร็จ: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("ยืนยันลบพนักงานนี้?")) return;
    await Employee.delete(id);
    await loadEmployees();
  };

  const toggleSkill = (skill) => {
    setForm(f => ({
      ...f,
      skills: f.skills?.includes(skill) ? f.skills.filter(s => s !== skill) : [...(f.skills || []), skill]
    }));
  };

  const statusBadge = (status) => {
    const cls = status === 'Active' ? 'bg-green-100 text-green-700' : status === 'Suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
  };

  const roleBadge = (role) => {
    const colors = { Admin: 'bg-purple-100 text-purple-700', Supervisor: 'bg-blue-100 text-blue-700', Scheduler: 'bg-indigo-100 text-indigo-700', Agent: 'bg-slate-100 text-slate-700', HR: 'bg-pink-100 text-pink-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-slate-100 text-slate-700'}`}>{role}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">จัดการพนักงาน</h2>
          <p className="text-sm text-slate-500">พนักงานทั้งหมด {employees.filter(e=>e.status==='Active').length} คน (Active)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> เพิ่มพนักงาน
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, รหัส, อีเมล..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">ทุก Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">ทุก Role</option>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">พนักงาน</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Team</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Skills</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{emp.full_name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{emp.full_name}</div>
                          <div className="text-xs text-slate-400">{emp.employee_code} · {emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{emp.department}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{emp.team}</td>
                    <td className="px-4 py-3">{roleBadge(emp.wfm_role)}</td>
                    <td className="px-4 py-3">{statusBadge(emp.status)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(emp.skills || []).slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{s}</span>
                        ))}
                        {(emp.skills || []).length > 3 && <span className="text-xs text-slate-400">+{emp.skills.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">ไม่พบข้อมูลพนักงาน</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editingId ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">รหัสพนักงาน</label>
                  <input value={form.employee_code} onChange={e => setForm(f => ({...f, employee_code: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="EMP001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="สมชาย ใจดี" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
                  <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="081-234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">แผนก</label>
                  <select value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ทีม</label>
                  <select value={form.team} onChange={e => setForm(f => ({...f, team: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
                  <select value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WFM Role</label>
                  <select value={form.wfm_role} onChange={e => setForm(f => ({...f, wfm_role: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทการจ้าง</label>
                  <select value={form.employment_type} onChange={e => setForm(f => ({...f, employment_type: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชั่วโมงสูงสุด/วัน</label>
                  <input type="number" value={form.max_hours_per_day} onChange={e => setForm(f => ({...f, max_hours_per_day: +e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">วันที่เริ่มงาน</label>
                  <input type="date" value={form.hire_date} onChange={e => setForm(f => ({...f, hire_date: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ทักษะ</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS_OPTIONS.map(skill => (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${form.skills?.includes(skill) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.full_name} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
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
