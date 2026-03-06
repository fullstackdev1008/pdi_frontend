import { useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import Header from '../components/Layout/Header';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import toast from 'react-hot-toast';

const roleLabels = {
  admin: 'Administrator',
  sales_admin: 'Sales Manager',
  workshop_supervisor: 'Workshop Supervisor',
  workshop_member: 'Workshop Member',
};

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await client.put('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success('Password changed successfully');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const PwdField = ({ label, field, showKey }) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          className="input pr-10"
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={() => setShow(p => ({ ...p, [showKey]: !p[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <Header title="Settings" subtitle="Manage your account" />
      <div className="p-4 md:p-6 space-y-4 max-w-xl">

        {/* Account Info */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Account Information</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {user?.avatar_initials || user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="mt-1 inline-block text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <KeyRound size={16} className="text-brand-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <PwdField label="Current Password *"     field="current_password" showKey="current" />
            <PwdField label="New Password *"         field="new_password"     showKey="newPwd" />
            <PwdField label="Confirm New Password *" field="confirm_password" showKey="confirm" />

            {form.new_password && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck
                  size={13}
                  className={form.new_password.length >= 8 ? 'text-emerald-500' : 'text-gray-300'}
                />
                {form.new_password.length < 6
                  ? 'Too short – minimum 6 characters'
                  : form.new_password.length < 8
                    ? 'Acceptable – 8+ characters recommended'
                    : 'Strong password'}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
