import React from "react";
import { FiCheckCircle, FiXCircle, FiAlertTriangle } from "react-icons/fi";
import RiskGauge from "./RiskGauge";
import StatusBadge from "./StatusBadge";

const confidenceStyle = (level) => {
  if (level === "HIGH") return { color: "var(--success)", Icon: FiCheckCircle };
  if (level === "LOW") return { color: "var(--danger)", Icon: FiXCircle };
  return { color: "var(--warning)", Icon: FiAlertTriangle };
};

// Left cockpit column: risk gauge + model confidence + physics context +
// active IEC 61511 parameter alerts.
function ReactorStatePanel({ reactor = {}, config = {} }) {
  if (!reactor) return null;

  const confidence =
    reactor.confidence ||
    (reactor.lstm_confidence != null
      ? reactor.lstm_confidence > 70
        ? "HIGH"
        : reactor.lstm_confidence > 50
          ? "MEDIUM"
          : "LOW"
      : "MEDIUM");

  const rfW = reactor.rf_weight_used ?? 40;
  const lstmW = reactor.lstm_weight_used ?? 60;
  const conf = confidenceStyle(confidence);
  const ConfIcon = conf.Icon;

  const runawayTemp = config.runaway_temp ?? 200;
  const runawayPress = config.runaway_pressure ?? 10.0;

  const tempMargin = runawayTemp - (reactor.temperature || 0);
  const tempMarginColor =
    tempMargin > 30
      ? "var(--success)"
      : tempMargin >= 10
        ? "var(--warning)"
        : "var(--danger)";

  const pressMargin = runawayPress - (reactor.pressure || 0);
  const pressMarginColor =
    pressMargin > 2.0
      ? "var(--success)"
      : pressMargin >= 0.5
        ? "var(--warning)"
        : "var(--danger)";

  const paramAlerts = reactor.parameter_alerts || [];

  return (
    <div className="col-span-5 lg:col-span-2 space-y-6">
      <div
        className="p-5"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <RiskGauge score={reactor.risk_score || 0} status={reactor.status || "SAFE"} />
        <div className="mt-4 text-center">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Model Confidence
          </p>
          <p
            className="flex items-center justify-center gap-1.5 text-lg font-bold mt-1"
            style={{ color: conf.color }}
          >
            <ConfIcon aria-hidden="true" />
            {confidence}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-sub)" }}>
            RF {rfW}% + LSTM {lstmW}% weighted
          </p>
        </div>
      </div>

      <div
        className="p-5"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-sub)" }}>
          Physics & Safety Margins
        </p>
        <div className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
          <p>
            Runaway Limits: <span className="font-bold">{runawayTemp}°C</span> /{" "}
            <span className="font-bold">{runawayPress} bar</span>
          </p>
          <p>
            Temp Margin:{" "}
            <span className="font-bold" style={{ color: tempMarginColor }}>
              {tempMargin.toFixed(1)}°C
            </span>
          </p>
          <p>
            Pressure Margin:{" "}
            <span className="font-bold" style={{ color: pressMarginColor }}>
              {pressMargin.toFixed(2)} bar
            </span>
          </p>
        </div>
      </div>

      {paramAlerts.length > 0 && (
        <div
          className="p-5"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--danger)",
            borderRadius: 12,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--danger)" }}>
            Active Parameter Alerts ({paramAlerts.length})
          </p>
          <div className="space-y-3">
            {paramAlerts.map((p, i) => (
              <div key={i} className="text-sm" style={{ color: "var(--text)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize">
                    {(p.param || "").replace(/_/g, " ")}
                  </span>
                  <StatusBadge status={p.severity} />
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-sub)" }}>
                  {p.reason} ({p.value})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReactorStatePanel;