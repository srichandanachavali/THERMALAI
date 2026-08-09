const express = require('express');
const router = express.Router();
const { getAuditLogs, exportAuditCsv } = require('../controllers/auditController');
const { verifyToken, adminOnly } = require('../middleware/auth');

// Audit trail is read-only and admin-only (21 CFR Part 11).
router.get('/', verifyToken, adminOnly, getAuditLogs);
router.get('/export.csv', verifyToken, adminOnly, exportAuditCsv);

module.exports = router;
