const express = require('express');
const router = express.Router();

// Plant configuration — hardcoded for demo
const PLANTS = [
  {
    plant_id: 'PLANT_ALPHA',
    name: 'Alpha Chemical Works',
    location: 'Patancheru Industrial Area',
    city: 'Hyderabad',
    state: 'Telangana',
    type: 'Chemical Processing',
    reactors: ['A', 'B'],
    established: '2018'
  },
  {
    plant_id: 'PLANT_BETA',
    name: 'Beta Pharma Industries',
    location: 'Ambernath MIDC',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'Pharmaceutical',
    reactors: ['C', 'D'],
    established: '2015'
  },
  {
    plant_id: 'PLANT_GAMMA',
    name: 'Gamma Refinery Ltd',
    location: 'Manali Industrial Estate',
    city: 'Chennai',
    state: 'Tamil Nadu',
    type: 'Petroleum Refinery',
    reactors: ['E'],
    established: '2020'
  }
];

// GET all plants
router.get('/', (req, res) => {
  res.json(PLANTS);
});

// GET specific plant
router.get('/:id', (req, res) => {
  const plant = PLANTS.find(p => p.plant_id === req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  res.json(plant);
});

module.exports = router;