import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { ArrowLeft, Lock, CheckCircle2, Eye, EyeOff, Shield, Phone, Mail, Briefcase, MapPin, Hash } from 'lucide-react';

const INFO_ROWS = [
  { label: 'Employee ID', key: 'display_id', icon: Hash       },
  { label: 'Email',       key: 'email',      icon: Mail       },
  { label: 'Phone',       key: 'phone',      icon: Phone      },
  { label: 'Ward',        key: 'ward',       icon: MapPin     },
  { label: 'Category',   key: 'category',   icon: Briefcase  },
];

export default function WorkerProfile({ onBack }) {
  const { user } = useClient();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (form.current !== '1234')   { setErrorMsg('Current password is incorrect.'); setStatus('error'); return; }
    if (form.newPass.length < 4)   { setErrorMsg('New password must be at least 4 characters.'); setStatus('error'); return; }
    if (form.newPass !== form.confirm) { setErrorMsg('Passwords do not match.'); setStatus('error'); return; }
    await new Promise(r => setTimeout(r, 700));
    setStatus('success');
    setForm({ current: '', newPass: '', confirm: '' });
  };

  const canSubmit = form.current && form.newPass && form.confirm;

  return (
    <div className="mobile-container" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b 60%, #334155)' }}
        className="pt-12 pb-16 px-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-10 right-8 w-14 h-14 bg-blue-500/10 rounded-full" />

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-5 text-sm font-medium transition-colors relative z-10"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20"
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
            {(user?.full_name || user?.name)?.charAt(0)}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{user?.full_name || user?.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{user?.category}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">{user?.ward}</span>
              <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-medium">{user?.display_id || user?.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="mx-4 -mt-8 bg-white rounded-2xl shadow-xl p-4 relative z-10">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Employee Information</p>
        <div className="space-y-2.5">
          {INFO_ROWS.map(({ label, key, icon: Icon }) => (
            <div key={key} className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0 flex justify-between items-center">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm font-semibold text-gray-800 truncate ml-2">{user?.[key] || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Lock size={15} className="text-slate-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-800">Change Password</h2>
        </div>

        {status === 'success' && (
          <div className="mb-4 flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 font-semibold">Password changed successfully!</p>
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleChange} className="space-y-4">
          {/* Current */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={form.current}
                onChange={e => setForm(p => ({ ...p, current: e.target.value }))}
                placeholder="Enter current password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-gray-50"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPass}
                onChange={e => setForm(p => ({ ...p, newPass: e.target.value }))}
                placeholder="Minimum 4 characters"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-gray-50"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Re-enter new password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full font-bold py-3.5 rounded-xl text-sm text-white disabled:opacity-50 active:scale-95 transition-transform"
            style={{ background: canSubmit ? 'linear-gradient(90deg, #1e293b, #334155)' : '#94a3b8' }}
          >
            Update Password
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
          <Shield size={11} />
          Demo password: <span className="font-semibold text-gray-500">1234</span>
        </div>
      </div>
    </div>
  );
}
