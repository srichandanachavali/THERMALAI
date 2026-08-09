const mongoose = require('mongoose');
const crypto = require('crypto');

const EVENT_TYPES = [
  'REACTOR_READING',
  'ALERT_CREATED',
  'ALERT_RESOLVED',
  'ML_SERVICE_DOWN',
  'ML_SERVICE_RECOVERED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'CONFIG_CHANGED',
  'SYSTEM_START',
];

const AuditLogSchema = new mongoose.Schema(
  {
    event_type: { type: String, enum: EVENT_TYPES, required: true },
    actor: { type: String, required: true }, // user_id or 'SYSTEM'
    reactor_id: { type: String },
    plant_id: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
    risk_score: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
    hash: { type: String },
  },
  { timestamps: false }
);

// 21 CFR Part 11 / IEC 61511 tamper-evidence: a SHA-256 over the canonical
// event content, recomputed on every write. Audit docs are append-only —
// a divergent hash on read signals the record was altered after creation.
AuditLogSchema.pre('save', function computeHash() {
  const canonical = JSON.stringify({
    event_type: this.event_type,
    actor: this.actor,
    reactor_id: this.reactor_id,
    payload: this.payload,
    timestamp: this.timestamp ? this.timestamp.toISOString() : new Date().toISOString(),
  });
  this.hash = crypto.createHash('sha256').update(canonical).digest('hex');
});

// Append-only: always creates a fresh doc, never updates existing records.
AuditLogSchema.statics.appendOnly = function appendOnly(data) {
  const entry = new this(data);
  return entry.save();
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
