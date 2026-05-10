import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem('thermalai_token', response.data.token);
        localStorage.setItem('thermalai_user', JSON.stringify(response.data.user));
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md shadow-2xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-400">ThermalAI 🔥</h1>
          <p className="text-gray-400 mt-2">Thermal Runaway Prevention Platform</p>
          <p className="text-gray-500 text-sm mt-1">Industrial Safety Intelligence</p>
        </div>

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
            {loading ? 'Logging in...' : 'Login 🔐'}
          </button>
        </div>

        {/* Credentials hint */}
        <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
          <p className="text-gray-400 text-xs text-center font-bold mb-2">
            Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-center">
            <div>
              <p className="text-purple-400">Admin</p>
              <p className="text-gray-500">admin / admin123</p>
            </div>
            <div>
              <p className="text-blue-400">Operator</p>
              <p className="text-gray-500">operator / op123</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-600 text-xs">
            ThermalAI v1.0 — Hackathon Edition
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;