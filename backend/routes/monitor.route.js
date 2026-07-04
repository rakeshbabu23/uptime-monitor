const express = require("express");
const { validateMonitorUrl } = require("../validators/monitor.validator");
const { createMonitor, getMonitors, getMonitorHistory } = require("../controllers/monitors.controller");

const router = express.Router();

router.get("/", getMonitors);
router.get("/:id/history", getMonitorHistory);
router.post("/", validateMonitorUrl, createMonitor);

module.exports = router;
