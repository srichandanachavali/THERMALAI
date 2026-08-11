import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const plant = location.state?.plant;

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/api/auth/login`, {
        username,
        password
      });
      if (response.data.success) {
        localStorage.setItem('thermalai_token', response.data.token);
        localStorage.setItem('thermalai_user', JSON.stringify(response.data.user));
        localStorage.setItem('thermalai_plant', JSON.stringify(plant));
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const getTypeIcon = (type) => {
    if (!type) return '🏭';
    if (type.includes('Chemical')) return '⚗️';
    if (type.includes('Pharma')) return '💊';
    if (type.includes('Refinery')) return '🛢️';
    return '🏭';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-md"
        style={{
          width: 400,
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2.5rem',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{ color: 'var(--accent)' }}
          >
            ThermalAI
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-sub)' }}>
            Industrial Safety Intelligence
          </p>
        </div>

        {/* Plant info */}
        {plant && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTypeIcon(plant.type)}</span>
              <div>
                <p className="font-bold" style={{ color: 'var(--text)' }}>{plant.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
                  📍 {plant.city}, {plant.state}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{plant.type}</p>
              </div>
            </div>
          </div>
        )}

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            onClick={() => setUsername('admin')}
            className="rounded-lg p-3 cursor-pointer transition-colors text-center"
            style={{
              backgroundColor: 'var(--accent-glow)',
              border: '1px solid var(--accent)',
            }}
          >
            <p className="font-bold" style={{ color: 'var(--accent-light)' }}>👑 Admin</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Full access</p>
          </div>
          <div
            onClick={() => setUsername('operator')}
            className="rounded-lg p-3 cursor-pointer transition-colors text-center"
            style={{
              backgroundColor: 'var(--accent-glow)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="font-bold" style={{ color: 'var(--highlight)' }}>👷 Operator</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Monitor access</p>
          </div>
        </div>

        {/* Login form */}
        <div>
          <label
            className="text-xs uppercase tracking-wide mb-2 block"
            style={{ color: 'var(--text-sub)' }}
          >
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full rounded-lg px-4 py-3 mb-4"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              caretColor: 'var(--accent)',
            }}
          />
          <label
            className="text-xs uppercase tracking-wide mb-2 block"
            style={{ color: 'var(--text-sub)' }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-lg px-4 py-3 mb-4"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              caretColor: 'var(--accent)',
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />

          {error && (
            <div
              className="rounded-lg p-3 mb-4"
              style={{
                backgroundColor: 'var(--accent-glow)',
                border: '1px solid var(--danger)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full font-bold py-3 rounded-lg transition-colors text-lg"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent)';
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-2 transition-colors text-sm"
            style={{ color: 'var(--text-sub)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-sub)')}
          >
            ← Back to plant selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
