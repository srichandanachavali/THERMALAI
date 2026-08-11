import { RISK_THRESHOLDS } from "../constants/reactors";

// All enterprise plant sites mapped to their respective reactor IDs
export const PLANT_REACTOR_MAP = {
  PLANT_ALPHA: ["R-101", "R-102"],
  PLANT_BETA: ["R-201", "R-202"],
  PLANT_GAMMA: ["R-301"],
};

export const getPlantReactors = (reactors = [], plantReactorIdsOrPlantId = []) => {
  if (typeof plantReactorIdsOrPlantId === "string") {
    const targetPlantId = plantReactorIdsOrPlantId;
    const targetIds = PLANT_REACTOR_MAP[targetPlantId] || [];
    return reactors.filter(
      (r) =>
        targetIds.includes(r.reactor_id) ||
        r.plant_id === targetPlantId ||
        r.plant === targetPlantId
    );
  }

  const ids = Array.isArray(plantReactorIdsOrPlantId) ? plantReactorIdsOrPlantId : [];
  return reactors.filter(
    (r) =>
      ids.includes(r.reactor_id) ||
      (r.plant_id && ids.includes(r.plant_id)) ||
      (r.plant && ids.includes(r.plant))
  );
};

export const getPlantStatus = (plantReactors = []) => {
  if (plantReactors.length === 0) return "OFFLINE";
  if (plantReactors.some((r) => r.status === "CRITICAL")) return "CRITICAL";
  if (plantReactors.some((r) => r.status === "WARNING" || r.status === "DEGRADING")) return "WARNING";
  return "SAFE";
};

export const getPlantRiskScore = (plantReactors = []) => {
  if (plantReactors.length === 0) return 0;
  const validScores = plantReactors.map((r) => Number(r.risk_score) || 0);
  const sum = validScores.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / plantReactors.length);
};

export const getStatusColor = (status) => {
  if (status === "CRITICAL") return "border-red-500 bg-red-500/5";
  if (status === "WARNING" || status === "DEGRADING") return "border-yellow-500 bg-yellow-500/5";
  if (status === "SAFE" || status === "NOMINAL" || status === "RECOVERY") return "border-emerald-500 bg-emerald-500/5";
  return "border-gray-600 bg-gray-800/10";
};

export const getStatusBadge = (status) => {
  if (status === "CRITICAL") return "bg-red-500 text-white";
  if (status === "WARNING" || status === "DEGRADING") return "bg-yellow-500 text-black";
  if (status === "SAFE" || status === "NOMINAL" || status === "RECOVERY") return "bg-emerald-500 text-white";
  return "bg-gray-600 text-white";
};

export const getStatusIcon = (status) => {
  if (status === "CRITICAL") return "🔴";
  if (status === "WARNING" || status === "DEGRADING") return "⚠️";
  if (status === "SAFE" || status === "NOMINAL" || status === "RECOVERY") return "✅";
  return "⚫";
};

export const getRiskColor = (score = 0) => {
  if (score >= RISK_THRESHOLDS.CRITICAL) return "text-red-400";
  if (score >= RISK_THRESHOLDS.WARNING) return "text-yellow-400";
  return "text-emerald-400";
};

export const getRiskBarColor = (score = 0) => {
  if (score >= RISK_THRESHOLDS.CRITICAL) return "bg-red-500";
  if (score >= RISK_THRESHOLDS.WARNING) return "bg-yellow-500";
  return "bg-emerald-500";
};