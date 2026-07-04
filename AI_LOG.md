# AI Collaboration Log

This project was built with AI-assisted development in **Cursor**. Below is a chronological log of the prompts used to build the backend and frontend.

## Prompt Screenshots

Screenshots of the original Cursor chat interactions are hosted on Google Drive:

**[Prompts — Google Drive](https://drive.google.com/drive/u/0/folders/1TsPNxMJVhBE5yRcNqITwQg-nKPWGxmX4)**

The folder consists of two subfolders:

- **Backend** — Cursor prompt screenshots for backend development
- **Frontend** — Cursor prompt screenshots for frontend development

---

**Mode legend**

| Mode | Meaning |
|------|---------|
| **Plan** | Agent explored and planned before implementing |
| **Agent** | Agent implemented directly |

---

## Backend

### Prompt 1 — Plan

**Files:** `backend/server.js`, `backend/routes/monitor.route.js`, `backend/validators/monitor.validator.js`, `backend/controllers/monitors.controller.js`, `backend/services/monitor.service.js`, `backend/db/db.js`

> You want to create one API, the POST API, which saves the URL which comes from the request, validates it, and saves it in the database. Make sure when you are saving in the database, it should not insert a duplicate. Whenever we get a duplicate, return this 409 status code.

---

### Prompt 2 — Agent

**Files:** `backend/monitor.db`

> I need one get API which gives all the URLs. Since  it can be only a few dozen URLs that can be saved in the database, we don't need any pagination or any over optimisation. The responsibility of this getAPI is to check the health checks and give the URL, what is the status of that particular URL, and the latest response time. All these fields you can directly check in the healthChecks table.
> Make sure you send the operation statuses, either up or down, based on the latest row of that URL in the table.

---

### Prompt 3 — Plan

**Files:** `backend/package.json`, `backend/monitor.db`

> I have installed the Node-cron  and the Axios library.
> So I need one function which runs periodically for every one minute, which can be configurable, so make sure we can use one global constant for this. For every 1 min, it needs to check what are all the URLs present in the monitors table and call those APIs and check their status, whether they are giving 200 or whether it is healthy or not. Then we need to save those in the health checks table. If we see the HealthChecks table, we need to save the status code, the response time in milliseconds, whether it is up or down, and when we checked it. These are the fields we must save in the table. Coming to the implementation part, since we can have only a few dozen url in monitors table, we can leverage the use of `Promise.allSettled` in JavaScript. We can use the promises.

---

### Prompt 4 — Plan

> We can make one small optimisation here. Instead of picking all URLs at once, because if we pick all URLs, let's say 20 or 30 in the database, and if we make an API call to all of them at once in the libuv in the Node.js, the 30 or 40 connections will be open. Make it run every time we pick a max of 10, and then we run it. For each of these APIs, make it timeout at 10 seconds. In that way, if the API crosses the 10 seconds, we can assume that the particular URL or server is down.
>
> When I meant at max 10, for every interval, when every interval runs for one minute, for example let's say, it starts at 10:30. For the 10:30, don't make all 30 connections at once. First make 10, then make another 10 connections in the same interal after ten seconds, because we put the maximum timeout as a ten seconds for API , not in different intervals, it has to be sequential.
>
> Make it as a part of a plan.

---

### Prompt 5 — Agent

> Can you update the post API to allow multiple URLs? There will be a scenario where one customer can have their main domain and subdomain. They want to check individually their subdomains as well, so please allow the multiple URLs as well.

---

## Frontend

### Prompt 1 — Agent

**Files:** `frontend/src/pages/Monitor.tsx`

> API(GET): /monitors
>
> The response of this API is a bunch of URLs with their statuses, the response time, when it was last checked. We need to create one table in this file where it makes an API  call when this component is mounted and shows in the table. We already have the Tailwind CSS installed.
>
> I have also provided which API you need to call. Right now it's running locally, so the localhost port is 8000 and the API is /monitors.
>
> Create one env file with the base URL as localhost:8000 so I can configure later when it deploys

---

### Prompt 2 — Agent

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

### Prompt 3 — Agent

> Can you update the modal that opens the UI? It looks pretty bad now and it is not good for providing user experience. The modal should support:
> - an input box (not a text area input box)
> - it should take a URL
> - at the right side of it, add one CTA +
> - when they click on +, one more input box opens below it
> - they can add another URL
> - at the complete bottom right side of the modal, we should have an Add CTA

---

### Prompt 4 — Agent

> Cards are not good in terms of user experience. The background  and cards is white, so add some different styles and colors for the cards.

---

### Prompt 5 — Agent

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
