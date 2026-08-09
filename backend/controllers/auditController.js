const AuditLog = require('../models/AuditLog');
const logger = require('../logger');

// Shared filter builder for the audit read endpoints. Reactor/plant/event
// filters are exact; from/to bound the timestamp window.
function buildFilter(query) {
  const { reactor_id, plant_id, event_type, from, to } = query;
  const filter = {};
  if (reactor_id) filter.reactor_id = reactor_id;
  if (plant_id) filter.plant_id = plant_id;
  if (event_type) filter.event_type = event_type;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }
  return filter;
}

// GET /api/audit — admin only, newest first, paginated, limit capped at 500.
const getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const filter = buildFilter(req.query);
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit),
    ]);
    res.json({ total, page, limit, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/audit/export.csv — streams CSV, same filters as the JSON endpoint.
const exportAuditCsv = async (req, res) => {
  const filter = buildFilter(req.query);
  const dateStr = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=thermalai-audit-${dateStr}.csv`);
  res.write('timestamp,event_type,actor,reactor_id,plant_id,risk_score,hash\n');
  try {
    const cursor = AuditLog.find(filter).sort({ timestamp: -1 }).cursor();
    for await (const doc of cursor) {
      const row = [
        doc.timestamp ? doc.timestamp.toISOString() : '',
        `"${doc.event_type || ''}"`,
        `"${doc.actor || ''}"`,
        `"${doc.reactor_id || ''}"`,
        `"${doc.plant_id || ''}"`,
        doc.risk_score ?? '',
        doc.hash || '',
      ].join(',');
      res.write(row + '\n');
    }
    res.end();
  } catch (error) {
    logger.error(`Audit CSV export failed: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.end();
  }
};

module.exports = { getAuditLogs, exportAuditCsv };
