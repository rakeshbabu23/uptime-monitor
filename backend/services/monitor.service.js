const db = require("../db/db");

const findMonitorByUrl = db.prepare("SELECT * FROM monitors WHERE url = ?");
const insertMonitor = db.prepare("INSERT INTO monitors (url) VALUES (?)");
const findMonitorById = db.prepare("SELECT * FROM monitors WHERE id = ?");
const getAllMonitorsForHealthCheck = db.prepare(
  "SELECT id, url FROM monitors ORDER BY id ASC"
);
const getAllMonitorsWithLatestHealthCheck = db.prepare(`
  SELECT
    m.id,
    m.url,
    hc.response_time_ms,
    hc.is_up,
    hc.checked_at
  FROM monitors m
  LEFT JOIN health_checks hc ON hc.id = (
    SELECT id
    FROM health_checks
    WHERE monitor_id = m.id
    ORDER BY checked_at DESC, id DESC
    LIMIT 1
  )
  ORDER BY m.created_at ASC
`);

function createMonitor(url) {
  const existing = findMonitorByUrl.get(url);
  if (existing) {
    const error = new Error("Monitor with this URL already exists");
    error.statusCode = 409;
    throw error;
  }

  const result = insertMonitor.run(url);
  return findMonitorById.get(result.lastInsertRowid);
}

function createMonitors(urls) {
  const created = [];
  const duplicates = [];

  for (const url of urls) {
    const existing = findMonitorByUrl.get(url);
    if (existing) {
      duplicates.push(url);
    } else {
      const result = insertMonitor.run(url);
      created.push(findMonitorById.get(result.lastInsertRowid));
    }
  }

  return { created, duplicates };
}

function getAllMonitors() {
  return getAllMonitorsWithLatestHealthCheck.all().map((monitor) => ({
    id: monitor.id,
    url: monitor.url,
    status:
      monitor.is_up === null ? null : monitor.is_up === 1 ? "up" : "down",
    response_time_ms: monitor.response_time_ms,
    last_checked: monitor.checked_at ?? null,
  }));
}

function getMonitorsForHealthCheck() {
  return getAllMonitorsForHealthCheck.all();
}

function getMonitorById(id) {
  return findMonitorById.get(id);
}

module.exports = {
  createMonitor,
  createMonitors,
  getAllMonitors,
  getMonitorsForHealthCheck,
  getMonitorById,
};
