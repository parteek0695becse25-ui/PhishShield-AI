# PhishShield AI - API reference

All Java endpoints are under `http://127.0.0.1:<backend port>/api` (default port 8080). The website reaches them
through its own proxy at `/api`. Errors always look like:

```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "Readable explanation", "fieldErrors": { "text": "..." } }
```

## Authentication (Java)

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/auth/register` | `{ "name", "email", "password" (8+ chars) }` | 201 `{ token, user, expiresAt }` |
| POST | `/auth/login` | `{ "email", "password" }` | 200 `{ token, user, expiresAt }` |
| GET | `/auth/me` | | 200 `{ id, name, email }` |
| POST | `/auth/logout` | | 204 |

Send the token as `Authorization: Bearer <token>` on every endpoint below except `/health`.
Failures: 401 wrong credentials or missing/expired token, 409 e-mail already registered, 429 too many failed logins.

## Scans (Java, login required)

| Method | Path | Notes |
|---|---|---|
| POST | `/scans/message` | Body `{ "text": "..." }` (max 5000 chars). 201 with the saved scan. |
| POST | `/scans/url` | Body `{ "url": "..." }` (max 2048 chars). 400 if not a valid URL. 201 with the saved scan. |
| GET | `/scans` | Optional `type=MESSAGE|URL`, `level=LOW|MEDIUM|HIGH|CRITICAL`, `q=text`, `limit` (max 500). Newest first. |
| GET | `/scans/{id}` | 200 full scan, 404 if it is not yours or does not exist. |
| DELETE | `/scans/{id}` | 204, or 404. |
| GET | `/dashboard/stats` | Totals, risk distribution, per-type stats and the 5 most recent scans, all computed from the database. |
| GET | `/health` | Public. `{ backend, database, detectionEngine, status }`. |

Scan response: `{ id, scanType, inputText, riskScore, riskLevel, indicators[{name,severity,explanation,evidence,recommendation,weight}], explanation, recommendations[], createdAt, engine, disclaimer, notice }`.

503 means the Python engine is not reachable, 502 means it answered with an error.

## Detection engine (Python)

Interactive docs: `http://127.0.0.1:<engine port>/docs` (default port 8000).

| Method | Path | Body |
|---|---|---|
| GET | `/health` | |
| POST | `/analyze/message` | `{ "text": "..." }` |
| POST | `/analyze/url` | `{ "url": "..." }` (400 for malformed URLs; the URL is never opened) |

## Optional PostgreSQL

Set these environment variables before starting the backend (do not store passwords in files that you commit):

```
DB_URL=jdbc:postgresql://localhost:5432/phishshield
DB_USER=your_user
DB_PASSWORD=your_password
```
