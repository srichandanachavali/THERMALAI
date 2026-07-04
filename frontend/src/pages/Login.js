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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md shadow-2xl">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white tracking-tight">ThermalAI</h1>
          <p className="text-gray-400 mt-2">Industrial Safety Intelligence</p>
        </div>

        {/* Plant info */}
        {plant && (
          <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTypeIcon(plant.type)}</span>
              <div>
                <p className="text-white font-bold">{plant.name}</p>
                <p className="text-gray-400 text-sm">
                  📍 {plant.city}, {plant.state}
                </p>
                <p className="text-gray-500 text-xs mt-1">{plant.type}</p>
              </div>
            </div>
          </div>
        )}

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            onClick={() => { setUsername('admin'); setPassword('admin123'); }}
            className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 cursor-pointer hover:bg-purple-500/20 transition-all text-center"
          >
            <p className="text-purple-400 font-bold">👑 Admin</p>
            <p className="text-gray-500 text-xs mt-1">Full access</p>
          </div>
          <div
            onClick={() => { setUsername('operator'); setPassword('op123'); }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 cursor-pointer hover:bg-blue-500/20 transition-all text-center"
          >
            <p className="text-blue-400 font-bold">👷 Operator</p>
            <p className="text-gray-500 text-xs mt-1">Monitor access</p>
          </div>
        </div>

        {/* Login form */}
        <div>
          <label className="text-gray-400 text-sm uppercase tracking-wide mb-2 block">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 mb-4"
          />
          <label className="text-gray-400 text-sm uppercase tracking-wide mb-2 block">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all text-lg"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 text-gray-400 hover:text-white py-2 transition-all text-sm"
          >
            ← Back to plant selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;