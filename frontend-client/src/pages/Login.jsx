import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { Eye, EyeOff, Building2 } from 'lucide-react';

export default function Login({ onRegister }) {
  const { login } = useClient();
  const [role, setRole] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoCredentials = {
    citizen: [
      { name: 'Rajesh Patil', email: 'rajesh@example.com' },
      { name: 'Sunita Mane', email: 'sunita@example.com' },
      { name: 'Amol Kumbhar', email: 'amol@example.com' },
    ],
    worker: [
      { name: 'Dnyaneshwar Jadhav', email: 'dnyanesh@ichalkaranji.gov.in' },
      { name: 'Vishwas Kamble', email: 'vishwas@ichalkaranji.gov.in' },
      { name: 'Santosh Chougule', email: 'santosh@ichalkaranji.gov.in' },
    ],
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="bg-[#2563eb] pt-safe pt-14 pb-10 px-6 text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">CityFlow</h1>
        <p className="text-blue-200 text-sm mt-1">Smart Municipal Management</p>
      </div>

      <div className="px-6 -mt-5 pb-10">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Role Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {['citizen', 'worker'].map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setEmail(''); setPassword(''); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all
                  ${role === r ? 'bg-white text-[#2563eb] shadow-sm' : 'text-gray-500'}`}
              >
                {r === 'citizen' ? '👤 Citizen' : '👷 Worker'}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === 'citizen' ? 'rajesh@example.com' : 'dnyanesh@ichalkaranji.gov.in'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors pr-12"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs px-3 py-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Demo Credentials (password: 1234)</p>
            <div className="space-y-1.5">
              {demoCredentials[role].map(c => (
                <button
                  key={c.email}
                  onClick={() => setEmail(c.email)}
                  className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                >
                  {c.name} — {c.email}
                </button>
              ))}
            </div>
          </div>

          {role === 'citizen' && (
            <p className="text-center text-sm text-gray-500 mt-4">
              No account?{' '}
              <button onClick={onRegister} className="text-blue-600 font-semibold">Register</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
