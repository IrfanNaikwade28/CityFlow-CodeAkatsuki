import { useState } from 'react';
import { Building2, ArrowLeft } from 'lucide-react';
import { apiRegister } from '../services/api';

export default function Register({ onBack }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', ward: '', password: '', confirm: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wards = ['Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10', 'Ward 12', 'Ward 14'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await apiRegister({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        ward: form.ward,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="mobile-container flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-4xl">✓</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Registered!</h2>
      <p className="text-gray-500 text-sm mt-2">Your account has been created. You can now login.</p>
      <button onClick={onBack} className="mt-6 bg-[#2563eb] text-white font-semibold py-3 px-8 rounded-xl">
        Go to Login
      </button>
    </div>
  );

  return (
    <div className="mobile-container">
      <div className="bg-[#2563eb] pt-safe pt-12 pb-8 px-6 text-white">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-200 hover:text-white mb-4 text-sm">
          <ArrowLeft size={16} /> Back to Login
        </button>
        <h1 className="text-xl font-bold">Create Account</h1>
        <p className="text-blue-200 text-sm">Join CityFlow as a Citizen</p>
      </div>

      <div className="px-6 py-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
            { key: 'email', label: 'Email Address', type: 'email', placeholder: 'example@email.com' },
            { key: 'phone', label: 'Mobile Number', type: 'tel', placeholder: '9876543210' },
            { key: 'password', label: 'Password', type: 'password', placeholder: 'Create a password' },
            { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: 'Repeat password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Ward</label>
            <select
              value={form.ward}
              onChange={e => setForm(prev => ({ ...prev, ward: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              required
            >
              <option value="">— Select your ward —</option>
              {wards.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3 py-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
