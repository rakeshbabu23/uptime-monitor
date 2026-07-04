require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./db/db");
const monitorRoutes = require("./routes/monitor.route");
const { startHealthCheckJob } = require("./jobs/healthCheck.job");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/monitors", monitorRoutes);

startHealthCheckJob();

const PORT = Number(process.env.PORT);

if (!PORT) {
  throw new Error("PORT is not set. Add PORT to your .env file.");
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;