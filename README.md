# Uptime Monitor

A lightweight web app for tracking HTTPS endpoint availability — periodic health checks, up/down status, and check history.

## Table of Contents

**System Verification**

1. [1-Line Setup](#1-1-line-setup)
2. [Testing Steps](#2-testing-steps)
3. [Deployment Sketch](#3-deployment-sketch-terraform)

**Project Details**

4. [Project Overview](#4-project-overview)
5. [Features](#5-features)
6. [Tech Stack](#6-tech-stack)
7. [Architecture](#7-architecture)
8. [Project Structure](#8-project-structure)
9. [Configuration](#9-configuration)
10. [Running Locally (without Docker)](#10-running-locally-without-docker)
11. [API Endpoints](#11-api-endpoints)
12. [Database Schema](#12-database-schema)
13. [Screenshots](#13-screenshots)
14. [Assumptions](#14-assumptions)
15. [Future Improvements](#15-future-improvements)
16. [AI Collaboration Log](AI_LOG.md)

---

## 1. 1-Line Setup

Launch the entire stack locally with one command:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:9000 |

---

## 2. Testing Steps

Follow these steps to verify up/down state tracking during evaluation.

### Step 1 — Start the app

```bash
docker compose up --build
```

Open http://localhost:5173.

### Step 2 — Add a working URL (should show **Up**)

1. Click **Add URL**.
2. Submit a known-good HTTPS endpoint:

   ```
   https://example.com
   ```

3. Wait up to **1 minute** for the health check job to run.
4. Confirm the dashboard shows:
   - Status: **Up** (green)
   - A response time in milliseconds
   - **Last checked** updated

### Step 3 — Add an intentionally broken URL (should show **Down**)

1. Click **Add URL** again.
2. Submit a URL that will not return HTTP 200, for example:

   ```
   https://invalid.com
   ```

   (Any unreachable host or non-200 response is fine for testing.)

3. Wait up to **1 minute** for the next health check cycle.
4. Confirm the dashboard shows:
   - Status: **Down** (red)
   - A high response time or timeout
   - Summary cards update (Up count vs Down count)

### Step 4 — Verify history and filters

1. Click the **example.com** row to open its history page.
2. Confirm **Up** checks appear in the table.
3. Click the **invalid.com** row and use the **Down** filter to confirm failed checks are recorded.

### API smoke test (optional)

```bash
curl http://localhost:9000/monitors

curl -X POST http://localhost:9000/monitors \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

curl -X POST http://localhost:9000/monitors \
  -H "Content-Type: application/json" \
  -d '{"url":"https://invalid.com"}'
```

---

## 3. Deployment Sketch (Terraform)

For this MVP, I would keep deployment simple by using a single AWS EC2 instance running Docker Compose.

This keeps the cloud setup very close to local development:

- **EC2** — host both frontend and backend containers
- **Docker Compose** — run the multi-container application
- **EBS volume** — attached to the EC2 instance to persist the SQLite database file (`monitor.db`)

### High-level architecture

```text
Internet
   ↓
EC2 Instance
   ↓
Docker Compose
   ├── Frontend Container
   ├── Backend Container
   └── SQLite DB (persisted on EBS)
```

### Example Terraform (simplified)

```hcl
resource "aws_instance" "uptime_monitor" {
  ami           = "ami-xxxxxxxx"
  instance_type = "t3.micro"

  tags = {
    Name = "uptime-monitor"
  }
}

resource "aws_ebs_volume" "sqlite_storage" {
  availability_zone = aws_instance.uptime_monitor.availability_zone
  size              = 10
}
```

This keeps the infrastructure minimal, fast to deploy, and aligned with the MVP scope. If the system grows, the next step would be moving SQLite to RDS and container orchestration to ECS.

---

## 4. Project Overview

Users add HTTPS URLs to monitor. The backend runs periodic health checks and the UI shows current status, response time, and historical check results.

---

## 5. Features

- Add one or more HTTPS URLs to monitor
- Automatic health checks every minute
- Dashboard with status (up / down / pending), response time, and last checked
- Per-monitor history page with pagination
- Filter history by up or down
- Docker Compose setup for local one-command startup

---

## 6. Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, better-sqlite3 |
| Database | SQLite |
| Scheduling | node-cron |
| HTTP client | axios |
| Containers | Docker, Docker Compose |

---

## 7. Architecture

```text
Browser
   ↓
Frontend (React / Vite)
   ↓  REST API
Backend (Express)
   ↓
SQLite (monitor.db)
   ↑
Health check cron job → external URLs
```

- The frontend calls the backend REST API.
- A background job pings monitored URLs and stores results in SQLite.
- In Docker, the database file is stored on a named volume.

---

## 8. Project Structure

```text
uptime-monitor/
├── docker-compose.yml
├── backend/
│   ├── config/          # App constants
│   ├── controllers/     # Request handlers
│   ├── db/              # SQLite setup
│   ├── jobs/            # Health check cron
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── validators/      # Request validation
│   ├── Dockerfile
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/       # Monitor list & history
    │   └── lib/
    ├── Dockerfile
    └── vite.config.ts
```

---

## 9. Configuration

### Backend (`backend/.env`)

```env
PORT=9000
```

Optional: `DB_PATH` (defaults to `monitor.db` locally, `/data/monitor.db` in Docker).

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:9000
```

Copy from `.env.example` in each folder before running locally.

---

## 10. Running Locally (without Docker)

**Backend**

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173 · Backend: http://localhost:9000

---

## 11. API Endpoints

### `GET /monitors`

Returns all monitors with latest health check.

```json
[
  {
    "id": 1,
    "url": "https://example.com",
    "status": "up",
    "response_time_ms": 142,
    "last_checked": "2026-07-04T06:15:00.000Z"
  }
]
```

### `POST /monitors`

Single URL:

```json
{ "url": "https://example.com" }
```

Multiple URLs:

```json
{
  "urls": [
    "https://example.com",
    "https://api.example.com"
  ]
}
```

| Scenario | Status | Response |
|----------|--------|----------|
| All created | 201 | `{ "created": [...] }` |
| Some duplicates | 201 | `{ "created": [...], "duplicates": [...] }` |
| All exist | 409 | `{ "error": "...", "duplicates": [...] }` |
| Invalid URLs | 400 | `{ "error": "...", "invalid_urls": [...] }` |

### `GET /monitors/:id/history`

Query params: `page`, `limit`, `status` (`up` | `down`)

```json
{
  "page": 1,
  "limit": 20,
  "total": 21,
  "total_pages": 2,
  "data": [
    {
      "id": 74,
      "status_code": 200,
      "response_time_ms": 104,
      "status": "up",
      "checked_at": "2026-07-04T06:45:00.111Z"
    }
  ]
}
```

---

## 12. Database Schema

### `monitors`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| url | TEXT | Unique |
| created_at | DATETIME | Default now |

### `health_checks`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| monitor_id | INTEGER | FK → monitors.id |
| status_code | INTEGER | HTTP status |
| response_time_ms | INTEGER | Round-trip time |
| is_up | INTEGER | 1 = up, 0 = down |
| checked_at | DATETIME | Default now |

A URL is considered **up** when the HTTP status code is `200`.

---

## 13. Screenshots

Screenshots are hosted on Google Drive:

**[uptime-monitor — Google Drive](https://drive.google.com/drive/folders/12g3EGFH3qeTRk8hTV02391UHOxmrnUKX?usp=sharing)**

The folder consists of two subfolders:

- **Prompts** — Cursor chat screenshots from the AI collaboration
- **UI** — Application screenshots (dashboard, history)

---

## 14. Assumptions

- Only HTTPS URLs are accepted in the UI (backend validates URL format).
- A monitor is **up** only when the response status is exactly `200`.
- Health checks run every **1 minute**.
- SQLite is sufficient for MVP-scale usage.

---

## 15. Future Improvements

- Replace SQLite with PostgreSQL / RDS for production scale
- Email or Slack alerts on downtime
- Auth and multi-user support
- Configurable check interval per monitor
- Uptime percentage and SLA reporting
- WebSocket or polling for live dashboard updates

---

## 16. AI Collaboration Log

See **[AI_LOG.md](AI_LOG.md)** for the full chronological log of Cursor prompts used to build this project, including links to prompt screenshots on Google Drive.

---
