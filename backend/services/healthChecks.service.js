const axios = require("axios");
const db = require("../db/db");
const monitorService = require("./monitor.service");
const {
  HEALTH_CHECK_BATCH_SIZE,
  HEALTH_CHECK_REQUEST_TIMEOUT_MS,
} = require("../config/constants");

const insertHealthCheck = db.prepare(`
  INSERT INTO health_checks (monitor_id, status_code, response_time_ms, is_up, checked_at)
  VALUES (?, ?, ?, ?, ?)
`);

const historyQueries = {
  all: {
    count: db.prepare(
      "SELECT COUNT(*) AS total FROM health_checks WHERE monitor_id = ?"
    ),
    page: db.prepare(`
      SELECT id, status_code, response_time_ms, is_up, checked_at
      FROM health_checks
      WHERE monitor_id = ?
      ORDER BY checked_at DESC, id DESC
      LIMIT ? OFFSET ?
    `),
  },
  up: {
    count: db.prepare(
      "SELECT COUNT(*) AS total FROM health_checks WHERE monitor_id = ? AND is_up = 1"
    ),
    page: db.prepare(`
      SELECT id, status_code, response_time_ms, is_up, checked_at
      FROM health_checks
      WHERE monitor_id = ? AND is_up = 1
      ORDER BY checked_at DESC, id DESC
      LIMIT ? OFFSET ?
    `),
  },
  down: {
    count: db.prepare(
      "SELECT COUNT(*) AS total FROM health_checks WHERE monitor_id = ? AND is_up = 0"
    ),
    page: db.prepare(`
      SELECT id, status_code, response_time_ms, is_up, checked_at
      FROM health_checks
      WHERE monitor_id = ? AND is_up = 0
      ORDER BY checked_at DESC, id DESC
      LIMIT ? OFFSET ?
    `),
  },
};

function getHistoryQueries(statusFilter) {
  if (statusFilter === "up") return historyQueries.up;
  if (statusFilter === "down") return historyQueries.down;
  return historyQueries.all;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function checkMonitor(monitor) {
  const start = Date.now();
  let statusCode = null;
  let isUp = 0;

  try {
    const response = await axios.get(monitor.url, {
      timeout: HEALTH_CHECK_REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    statusCode = response.status;
    isUp = statusCode === 200 ? 1 : 0;
  } catch {
    statusCode = null;
    isUp = 0;
  }

  const responseTimeMs = Date.now() - start;
  const checkedAt = new Date().toISOString();

  insertHealthCheck.run(
    monitor.id,
    statusCode,
    responseTimeMs,
    isUp,
    checkedAt
  );
}

async function runHealthChecks() {
  const monitors = monitorService.getMonitorsForHealthCheck();
  if (monitors.length === 0) return;

  const batches = chunkArray(monitors, HEALTH_CHECK_BATCH_SIZE);

  for (const batch of batches) {
    await Promise.allSettled(batch.map((monitor) => checkMonitor(monitor)));
  }
}

function getHealthCheckHistory(monitorId, page, limit, statusFilter = null) {
  const { count, page: pageQuery } = getHistoryQueries(statusFilter);
  const { total } = count.get(monitorId);
  const offset = (page - 1) * limit;
  const rows = pageQuery.all(monitorId, limit, offset);

  const data = rows.map((row) => ({
    id: row.id,
    status_code: row.status_code,
    response_time_ms: row.response_time_ms,
    status: row.is_up === 1 ? "up" : "down",
    checked_at: row.checked_at,
  }));

  return { total, data };
}

module.exports = { checkMonitor, runHealthChecks, getHealthCheckHistory };
