import { RISK_THRESHOLDS } from "../constants/reactors";

export const getPlantReactors = (reactors, plantReactorIds) =>
  reactors.filter((r) => plantReactorIds.includes(r.reactor_id));

export const getPlantStatus = (plantReactors) => {
  if (plantReactors.length === 0) return "OFFLINE";
  if (plantReactors.some((r) => r.status === "CRITICAL")) return "CRITICAL";
  if (plantReactors.some((r) => r.status === "WARNING")) return "WARNING";
  return "SAFE";
};

export const getPlantRiskScore = (plantReactors) => {
  if (plantReactors.length === 0) return 0;
  return Math.round(
    plantReactors.reduce((sum, r) => sum + (r.risk_score || 0), 0) /
      plantReactors.length
  );
};

export const getStatusColor = (status) => {
  if (status === "CRITICAL") return "border-red-500 bg-red-500/5";
  if (status === "WARNING") return "border-yellow-500 bg-yellow-500/5";
  if (status === "SAFE") return "border-green-500 bg-green-500/5";
  return "border-gray-600";
};

export const getStatusBadge = (status) => {
  if (status === "CRITICAL") return "bg-red-500";
  if (status === "WARNING") return "bg-yellow-500 text-black";
  if (status === "SAFE") return "bg-green-500";
  return "";
};

export const getStatusIcon = (status) => {
  if (status === "CRITICAL") return "🔴";
  if (status === "WARNING") return "⚠️";
  if (status === "SAFE") return "✅";
  return "⚫";
};

export const getRiskColor = (score) => {
  if (score >= RISK_THRESHOLDS.CRITICAL) return "text-red-400";
  if (score >= RISK_THRESHOLDS.WARNING) return "text-yellow-400";
  return "text-green-400";
};

export const getRiskBarColor = (score) => {
  if (score >= RISK_THRESHOLDS.CRITICAL) return "bg-red-500";
  if (score >= RISK_THRESHOLDS.WARNING) return "bg-yellow-500";
  return "bg-green-500";
};
