import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';
  
function PlantSelect() {
  const [plants, setPlants] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const response = await axios.get(`${API}/api/plants`);
      setPlants(response.data);
    } catch {
      // plants unavailable — will retry on next mount
    }
  };

  const getTypeIcon = (type) => {
    if (type.includes('Chemical')) return '⚗️';
    if (type.includes('Pharma')) return '💊';
    if (type.includes('Refinery')) return '🛢️';
    return '🏭';
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      
      {/* Logo */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white tracking-tight">ThermalAI</h1>
        <p className="text-gray-400 mt-3 text-lg">
          Thermal Runaway Prevention Platform
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Select your facility to continue
        </p>
      </div>

      {/* Plant Cards */}
      <div className="grid grid-cols-1 gap-6 w-full max-w-3xl">
        {plants.length === 0 ? (
          <div className="text-gray-400 text-center">Loading plants...</div>
        ) : (
          plants.map((plant) => (
            <div
              key={plant.plant_id}
              onClick={() => navigate('/login', { state: { plant } })}
              className="bg-gray-800 border border-gray-700 hover:border-green-500 rounded-xl p-6 cursor-pointer transition-all hover:bg-gray-750 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{getTypeIcon(plant.type)}</div>
                  <div>
                    <h2 className="text-xl font-bold text-white group-hover:text-green-400 transition-all">
                      {plant.name}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      📍 {plant.city}, {plant.state}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {plant.type}
                      {plant.reactors && ` · ${plant.reactors.length} Reactors`}
                      {plant.established && ` · Est. ${plant.established}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 group-hover:text-green-400 transition-all text-sm font-medium">
                    Login →
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 text-xs">
          ThermalAI v1.0 — Industrial Safety Intelligence
        </p>
        <p className="text-gray-700 text-xs mt-1">
          Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}

export default PlantSelect;