// IEC 61511 Safety Integrity Level (SIL) risk banding. Pure utility — no
// DB or side-effect deps so it can be unit-tested in isolation.

const SIL_BANDS = {
  NORMAL:   { min: 0,   max: 30, sil: null,   color: 'green',  action: 'Continue operation. Log reading.' },
  LOW:      { min: 30,  max: 50, sil: 'SIL-0', color: 'yellow', action: 'Increase monitoring frequency. Notify supervisor.' },
  WARNING:  { min: 50,  max: 70, sil: 'SIL-1', color: 'amber',  action: 'Activate secondary cooling. Prepare shutdown procedure.' },
  HIGH:     { min: 70,  max: 85, sil: 'SIL-2', color: 'orange', action: 'Reduce reaction feed. Alert plant manager immediately.' },
  CRITICAL: { min: 85,  max: 100, sil: 'SIL-3', color: 'red',   action: 'INITIATE EMERGENCY SHUTDOWN. Evacuate if required.' },
};

const ORDER = ['NORMAL', 'LOW', 'WARNING', 'HIGH', 'CRITICAL'];

const PLANT_CONTACTS = {
  PLANT_ALPHA: { phone: process.env.PLANT1_PHONE || process.env.ALERT_PHONE, email: process.env.PLANT1_EMAIL || process.env.EMAIL_USER },
  PLANT_BETA:  { phone: process.env.PLANT2_PHONE || process.env.ALERT_PHONE, email: process.env.PLANT2_EMAIL || process.env.EMAIL_USER },
  PLANT_GAMMA: { phone: process.env.PLANT3_PHONE || process.env.ALERT_PHONE, email: process.env.PLANT3_EMAIL || process.env.EMAIL_USER },
};

const getPlantContacts = (plantId) =>
  PLANT_CONTACTS[plantId] || { phone: process.env.ALERT_PHONE, email: process.env.EMAIL_USER };

// Return the matching SIL band (name + all fields) for a 0-100 risk score.
function classifyRisk(riskScore) {
  const name = ORDER.find((k) => riskScore >= SIL_BANDS[k].min && riskScore < SIL_BANDS[k].max)
    || 'CRITICAL'; // riskScore === 100 is clamped into CRITICAL
  return { band: name, ...SIL_BANDS[name] };
}

// Full escalation context for a risk score at a given reactor/plant.
function getEscalationAction(riskScore, reactorId, plantId) {
  const band = classifyRisk(riskScore);
  return {
    band: band.band,
    recommended_action: band.action,
    requires_immediate_response: riskScore >= 70,
    sil_level: band.sil,
    escalation_contacts: getPlantContacts(plantId),
  };
}

module.exports = { SIL_BANDS, classifyRisk, getEscalationAction, getPlantContacts };
