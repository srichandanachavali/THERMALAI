import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import config from '../config';

function MultiPlant() {
  const [plants, setPlants] = useState([]);
  const { reactors } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/plants`);
      setPlants(response.data);
    } catch (err) {
      console.log('Plants fetch error:', err);
    }
  };

  const getPlantReactors = (plantReactorIds) => {
    return reactors.filter(r => plantReactorIds.includes(r.reactor_id));
  };

  const getPlantStatus = (plantReactors) => {
    if (plantReactors.length === 0) return 'OFFLINE';
    if (plantReactors.some(r => r.status === 'CRITICAL')) return 'CRITICAL';
    if (plantReactors.some(r => r.status === 'WARNING')) return 'WARNING';
    return 'SAFE';
  };

  const getPlantRiskScore = (plantReactors) => {
    if (plantReactors.length === 0) return 0;
    return Math.round(
      plantReactors.reduce((sum, r) => sum + (r.risk_score || 0), 0) / plantReactors.length
    );
  };

  const getStatusColor = (status) => {
    if (status === 'CRITICAL') return 'border-red-500 bg-red-500/5';
    if (status === 'WARNING') return 'border-yellow-500 bg-yellow-500/5';
    if (status === 'SAFE') return 'border-green-500 bg-green-500/5';
    return 'border-gray-600 bg-gray-700/5';
  };

  const getStatusBadge = (status) => {
    if (status === 'CRITICAL') return 'bg-red-500 text-white';
    if (status === 'WARNING') return 'bg-yellow-500 text-black';
    if (status === 'SAFE') return 'bg-green-500 text-white';
    return 'bg-gray-600 text-white';
  };

  const getStatusIcon = (status) => {
    if (status === 'CRITICAL') return '🔴';
    if (status === 'WARNING') return '⚠️';
    if (status === 'SAFE') return '✅';
    return '⚫';
  };

  const totalReactors = reactors.length;
  const criticalCount = reactors.filter(r => r.status === 'CRITICAL').length;
  const warningCount = reactors.filter(r => r.status === 'WARNING').length;
  const safeCount = reactors.filter(r => r.status === 'SAFE').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          🏭 Enterprise Plant Network
        </h1>
        <p className="text-gray-400 mt-1">
          Multi-facility monitoring — all plants, all reactors, one dashboard
        </p>
      </div>

      {/* Enterprise Summary */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 border-l-4 border-blue-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Total Plants</p>
          <p className="text-4xl font-bold text-blue-400 mt-2">{plants.length}</p>
          <p className="text-gray-500 text-sm mt-1">Across India</p>
        </div>
        <div className="bg-gray-800 border-l-4 border-green-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Safe Reactors</p>
          <p className="text-4xl font-bold text-green-400 mt-2">{safeCount}</p>
          <p className="text-gray-500 text-sm mt-1">Operating normally</p>
        </div>
        <div className="bg-gray-800 border-l-4 border-yellow-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Warnings</p>
          <p className="text-4xl font-bold text-yellow-400 mt-2">{warningCount}</p>
          <p className="text-gray-500 text-sm mt-1">Need attention</p>
        </div>
        <div className="bg-gray-800 border-l-4 border-red-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">Critical</p>
          <p className="text-4xl font-bold text-red-400 mt-2">{criticalCount}</p>
          <p className="text-gray-500 text-sm mt-1">Immediate action!</p>
        </div>
      </div>

      {/* Plant Cards */}
      <div className="grid grid-cols-1 gap-6">
        {plants.map((plant) => {
          const plantReactors = getPlantReactors(plant.reactors);
          const plantStatus = getPlantStatus(plantReactors);
          const plantRiskScore = getPlantRiskScore(plantReactors);

          return (
            <div
              key={plant.plant_id}
              className={`bg-gray-800 border-2 rounded-xl p-6 ${getStatusColor(plantStatus)}`}
            >
              {/* Plant Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🏭</div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{plant.name}</h2>
                    <p className="text-gray-400 text-sm">
                      📍 {plant.location}, {plant.city}, {plant.state}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {plant.type} · Est. {plant.established}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(plantStatus)}`}>
                      {getStatusIcon(plantStatus)} {plantStatus}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Avg Risk: <span className={`font-bold ${
                      plantRiskScore >= 70 ? 'text-red-400' :
                      plantRiskScore >= 30 ? 'text-yellow-400' : 'text-green-400'
                    }`}>{plantRiskScore}%</span>
                  </p>
                </div>
              </div>

              {/* Plant Risk Bar */}
              <div className="mb-6">
                <div className="bg-gray-700 rounded-full h-2 mb-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      plantRiskScore >= 70 ? 'bg-red-500' :
                      plantRiskScore >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${plantRiskScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Reactors Grid */}
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
                  Reactors — click to monitor
                </p>
                {plantReactors.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    Waiting for reactor data...
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {plantReactors.map((reactor) => (
                      <div
                        key={reactor.reactor_id}
                        onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
                        className={`cursor-pointer rounded-lg p-4 text-center transition-all hover:opacity-80 ${
                          reactor.status === 'CRITICAL' ? 'bg-red-500 animate-pulse' :
                          reactor.status === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                      >
                        <p className="text-white font-bold text-lg">
                          {reactor.reactor_id}
                        </p>
                        <p className="text-white text-xs mt-1">
                          {reactor.risk_score}%
                        </p>
                        <p className="text-white text-xs opacity-80">
                          {reactor.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plant Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => navigate(`/analytics`)}
                  className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-sm px-4 py-2 rounded-lg transition-all"
                >
                  📊 View Analytics
                </button>
                <button
                  onClick={() => navigate('/alerts')}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm px-4 py-2 rounded-lg transition-all"
                >
                  🚨 View Alerts
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Note */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-blue-400 font-bold text-lg mb-2">
          🏢 Enterprise Scalability
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          ThermalAI scales from a single plant to an entire enterprise network.
          Companies operating multiple facilities across India get unified real-time
          visibility — one dashboard, all plants, instant risk awareness.
          Each plant's AI predictions run independently while enterprise view
          aggregates risk across all facilities.
        </p>
      </div>
    </div>
  );
}

export default MultiPlant;