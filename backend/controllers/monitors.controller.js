const monitorService = require("../services/monitor.service");
const healthChecksService = require("../services/healthChecks.service");
const {
  HISTORY_DEFAULT_PAGE,
  HISTORY_DEFAULT_LIMIT,
  HISTORY_MAX_LIMIT,
} = require("../config/constants");

function createMonitor(req, res) {
  const urls = req.validatedUrls;
  const { created, duplicates } = monitorService.createMonitors(urls);

  if (created.length === 0 && duplicates.length > 0) {
    return res.status(409).json({
      error: "All URLs already exist",
      duplicates,
    });
  }

  const response = { created };
  if (duplicates.length > 0) {
    response.duplicates = duplicates;
  }

  return res.status(201).json(response);
}

function getMonitors(req, res) {
  const monitors = monitorService.getAllMonitors();
  return res.status(200).json(monitors);
}

function getMonitorHistory(req, res) {
  const monitorId = Number(req.params.id);
  if (!Number.isInteger(monitorId) || monitorId < 1) {
    return res.status(400).json({ error: "Invalid monitor ID" });
  }

  const page = req.query.page ? Number(req.query.page) : HISTORY_DEFAULT_PAGE;
  const limit = req.query.limit ? Number(req.query.limit) : HISTORY_DEFAULT_LIMIT;

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({ error: "page must be a positive integer" });
  }

  if (!Number.isInteger(limit) || limit < 1) {
    return res.status(400).json({ error: "limit must be a positive integer" });
  }

  const clampedLimit = Math.min(limit, HISTORY_MAX_LIMIT);

  let statusFilter = req.query.status ?? null;
  if (statusFilter === "") {
    statusFilter = null;
  } else if (
    statusFilter !== null &&
    statusFilter !== "up" &&
    statusFilter !== "down"
  ) {
    return res.status(400).json({ error: 'status must be "up" or "down"' });
  }

  const monitor = monitorService.getMonitorById(monitorId);
  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  const { total, data } = healthChecksService.getHealthCheckHistory(
    monitorId,
    page,
    clampedLimit,
    statusFilter
  );

  const response = {
    page,
    limit: clampedLimit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / clampedLimit),
    data,
  };

  if (statusFilter) {
    response.status = statusFilter;
  }

  return res.status(200).json(response);
}

module.exports = { createMonitor, getMonitors, getMonitorHistory };
