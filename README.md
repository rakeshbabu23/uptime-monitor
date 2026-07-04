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
16. [AI Collaboration Log](#16-ai-collaboration-log)

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

This project was built with AI-assisted development in **Cursor**. Below is a chronological log of the prompts used to build the backend and frontend.

**Mode legend**
| Mode | Meaning |
|------|---------|
| **Plan** | Agent explored and planned before implementing |
| **Agent** | Agent implemented directly |

---

### Backend

#### Prompt 1 — Plan

**Files:** `backend/server.js`, `backend/routes/monitor.route.js`, `backend/validators/monitor.validator.js`, `backend/controllers/monitors.controller.js`, `backend/services/monitor.service.js`, `backend/db/db.js`

> You want to create one API, the POST API, which saves the URL which comes from the request, validates it, and saves it in the database. Make sure when you are saving in the database, it should not insert a duplicate. Whenever we get a duplicate, return this 409 status code.

---

#### Prompt 2 — Agent

**Files:** `backend/monitor.db`

> I need one get API which gives all the URLs. Since  it can be only a few dozen URLs that can be saved in the database, we don't need any pagination or any over optimisation. The responsibility of this getAPI is to check the health checks and give the URL, what is the status of that particular URL, and the latest response time. All these fields you can directly check in the healthChecks table.
> Make sure you send the operation statuses, either up or down, based on the latest row of that URL in the table.

---

#### Prompt 3 — Plan

**Files:** `backend/package.json`, `backend/monitor.db`

> I have installed the Node-cron  and the Axios library.
> So I need one function which runs periodically for every one minute, which can be configurable, so make sure we can use one global constant for this. For every 1 min, it needs to check what are all the URLs present in the monitors table and call those APIs and check their status, whether they are giving 200 or whether it is healthy or not. Then we need to save those in the health checks table. If we see the HealthChecks table, we need to save the status code, the response time in milliseconds, whether it is up or down, and when we checked it. These are the fields we must save in the table. Coming to the implementation part, since we can have only a few dozen url in monitors table, we can leverage the use of `Promise.allSettled` in JavaScript. We can use the promises.

---

#### Prompt 4 — Plan

> We can make one small optimisation here. Instead of picking all URLs at once, because if we pick all URLs, let's say 20 or 30 in the database, and if we make an API call to all of them at once in the libuv in the Node.js, the 30 or 40 connections will be open. Make it run every time we pick a max of 10, and then we run it. For each of these APIs, make it timeout at 10 seconds. In that way, if the API crosses the 10 seconds, we can assume that the particular URL or server is down.
>
> When I meant at max 10, for every interval, when every interval runs for one minute, for example let's say, it starts at 10:30. For the 10:30, don't make all 30 connections at once. First make 10, then make another 10 connections in the same interal after ten seconds, because we put the maximum timeout as a ten seconds for API , not in different intervals, it has to be sequential.
>
> Make it as a part of a plan.

---

#### Prompt 5 — Agent

> Can you update the post API to allow multiple URLs? There will be a scenario where one customer can have their main domain and subdomain. They want to check individually their subdomains as well, so please allow the multiple URLs as well.

---

### Frontend

#### Prompt 1 — Agent

**Files:** `frontend/src/pages/Monitor.tsx`

> API(GET): /monitors
>
> The response of this API is a bunch of URLs with their statuses, the response time, when it was last checked. We need to create one table in this file where it makes an API  call when this component is mounted and shows in the table. We already have the Tailwind CSS installed.
>
> I have also provided which API you need to call. Right now it's running locally, so the localhost port is 8000 and the API is /monitors.
>
> Create one env file with the base URL as localhost:8000 so I can configure later when it deploys

---

#### Prompt 2 — Agent

**Files:** `frontend/src/pages/Monitor.tsx`

> API(POST): /monitors
>
> So in this file at the top right, add one CTA to take a URL. When we click on it, it should open one modal where it should take a URL. It should show an empty box and it should be allowed only to take URLs which support HTTPS. Once API gives the success status, you can close the modal.
>
> Please check the request format below.
> Single URL (still supported):
>
> `{ "url": "https://example.com" }`
>
> Multiple URLs:
>
> ```json
> {
>   "urls": [
>     "https://example.com",
>     "https://api.example.com",
>     "https://www.example.com"
>   ]
> }
> ```
>
> Response behavior
>
> | Scenario | Status | Response |
> |----------|--------|----------|
> | All URLs created | 201 | `{ "created": [...] }` |
> | Some created, some duplicates | 201 | `{ "created": [...], "duplicates": [...] }` |
> | All URLs already exist | 409 | `{ "error": "All URLs already exist", "duplicates": [...] }` |
> | Invalid URL(s) | 400 | `{ "error": "Invalid URL format", "invalid_urls": [...] }` |

---

#### Prompt 3 — Agent

> Can you update the modal that opens the UI? It looks pretty bad now and it is not good for providing user experience. The modal should support:
> - an input box (not a text area input box)
> - it should take a URL
> - at the right side of it, add one CTA +
> - when they click on +, one more input box opens below it
> - they can add another URL
> - at the complete bottom right side of the modal, we should have an Add CTA

---

#### Prompt 4 — Agent

> Cards are not good in terms of user experience. The background  and cards is white, so add some different styles and colors for the cards.

---

#### Prompt 5 — Agent

> I require one more feature. Right now in the table we have the list of URLs. Make sure for each of the rows, add one chevron right icon, and whenever we hover on that row, make use of a cursor pointer. When we click on it, we should go to the next page, as the page name can be /monitor/monitorID, whatever the user has clicked on it. We need to make an API call, which I have given below. It has to be supported pagination. I have given the response strcutute. In the next page, also use the table just like on the first page, and also add some filters like:
> - Down
> - Uptime
> - When the status is down  Whenever the user clicks on it up, it only shows uptime. When the user shows down, it only shows downtime.
>
> API SPECS
>
> `GET /monitors/:id/history?status=up`
> `GET /monitors/:id/history?status=down`
> `GET /monitors/:id/history` — no filter, returns all
> `GET /monitors/1/history?page=1&limit=20&status=down`
>
> ```json
> {
>   "page": 1,
>   "limit": 20,
>   "total": 21,
>   "total_pages": 2,
>   "data": [
>     {
>       "id": 74,
>       "status_code": 200,
>       "response_time_ms": 104,
>       "status": "up",
>       "checked_at": "2026-07-04T06:45:00.111Z"
>     }
>   ]
> }
> ```

---
