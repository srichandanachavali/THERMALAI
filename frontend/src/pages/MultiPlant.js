import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import config from '../config';
import EnterpriseSummary from '../components/EnterpriseSummary';
import PlantCard from '../components/PlantCard';
import {
  getPlantReactors,
  getPlantStatus,
  getPlantRiskScore,
} from '../utils/plantStatus';

function MultiPlant() {
  const [plants, setPlants] = useState([]);
  const { reactors } = useSocket();

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const token = localStorage.getItem('thermalai_token');
      // /plants/mine returns ONLY the plants this user is authorized to see.
      const response = await axios.get(`${config.API_URL}/plants/mine`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setPlants(response.data);
    } catch (err) {
      console.log('Plants fetch error:', err);
    }
  };

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
          Multi-facility monitoring — your authorized plants, one dashboard
        </p>
      </div>

      {/* Enterprise Summary */}
      <EnterpriseSummary
        plants={plants}
        safeCount={safeCount}
        warningCount={warningCount}
        criticalCount={criticalCount}
      />

      {/* Plant Cards */}
      <div className="grid grid-cols-1 gap-6">
        {plants.map((plant) => {
          const plantReactors = getPlantReactors(reactors, plant.reactors);
          const plantStatus = getPlantStatus(plantReactors);
          const plantRiskScore = getPlantRiskScore(plantReactors);

          return (
            <PlantCard
              key={plant.plant_id}
              plant={plant}
              plantReactors={plantReactors}
              plantStatus={plantStatus}
              plantRiskScore={plantRiskScore}
            />
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
