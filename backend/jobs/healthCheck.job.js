const cron = require("node-cron");
const { HEALTH_CHECK_CRON_SCHEDULE } = require("../config/constants");
const { runHealthChecks } = require("../services/healthChecks.service");

function startHealthCheckJob() {
  cron.schedule(HEALTH_CHECK_CRON_SCHEDULE, () => runHealthChecks(), {
    noOverlap: true,
  });
}

module.exports = { startHealthCheckJob };
