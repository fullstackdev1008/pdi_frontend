import { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import Header from '../components/Layout/Header';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getUsers, createUser } from '../api/users';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const roleLabels = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
  sales_admin: { label: 'Sales Manager', color: 'bg-blue-100 text-blue-700' },
  workshop_supervisor: { label: 'Workshop Supervisor', color: 'bg-amber-100 text-amber-700' },
  workshop_member: { label: 'Technician', color: 'bg-green-100 text-green-700' },
};

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'workshop_member' });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const load = () => {
    getUsers()
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      toast.success('Team member added');
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'workshop_member' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Header title="Team" subtitle="Manage sales and workshop team members" />
      <div className="p-4 md:p-6 space-y-4">
        {isAdmin && (
          <div className="flex justify-end">
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} /> Add Member
            </button>
          </div>
        )}
        <div className="card overflow-hidden">
          {loading ? <LoadingSpinner fullscreen /> : users.length === 0 ? (
            <div className="text-center py-16">
              <Users size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500">No team members yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map(u => {
                const rc = roleLabels[u.role] || { label: u.role, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.avatar_initials || u.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-2 flex-shrink-0 ${rc.color}`}>
                      {rc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Team Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="sales_admin">Sales Manager</option>
              <option value="workshop_supervisor">Workshop Supervisor</option>
              <option value="workshop_member">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
