# PhishShield AI

AI-powered scam message and URL detector. Built by Team GRAVITON for the GRAVITON hackathon at CGC University.

| Member | Role |
|---|---|
| Parteek | Team leader, frontend developer |
| Shiva | AI developer (detection engine) |
| Nishtha | Backend and database developer |

PhishShield AI lets you paste an SMS, WhatsApp message, e-mail text or a web address. It returns a risk score from 0 to 100,
a risk level, the exact warning signs it found, a plain-language explanation and safety advice. Every scan is saved in a
local database, so you get a history and a dashboard.

## Honest description of the "AI"

- The detection engine is **rule-based and explainable**. It is **not** a trained machine-learning model.
- The score measures warning signs. It is **not** the probability that something is fraud. False positives and false negatives happen.
- URLs are **never opened**. They are analysed as text. **No live threat-intelligence database** is queried.
- No paid APIs, no API keys, no cloud accounts are needed. Everything runs on your computer.

## What is inside

```
React website (Vite)  ->  Java Spring Boot backend  ->  Python FastAPI detection engine
                                  |
                                  +->  H2 embedded database (file in the data folder)
```

| Folder | What it is |
|---|---|
| `frontend/` | React, Vite, React Router, Lucide icons. Login, dashboard, scanners, history, details, how it works |
| `backend-java/` | Java 21, Spring Boot 3, Spring Data JPA, validation, login sessions |
| `ai-engine/` | Python FastAPI engine with the message rules, URL analyser and risk scoring, plus unit tests |
| `database/` | `schema.sql` (reference, tables are created automatically) |
| `samples/` | Example messages and URLs to try |
| `scripts/`, `*.bat` | Windows setup, start, stop and test scripts |
| `docs/API.md` | API reference |

## Quick start on Windows (beginner steps)

1. Extract `PhishShield-AI.zip` (right-click, Extract All). Keep the folder path simple, for example `C:\PhishShield-AI`.
2. Open VS Code, choose File, Open Folder, and select the `PhishShield-AI` folder.
3. Double-click **`setup.bat`** (or run it in the VS Code terminal). Do this once.
   - It checks Java 21, Python 3.10+ and Node.js. If something is missing it offers to install it with winget.
     Windows may ask for permission. Answer `Y`.
   - If the installers finish but the window still cannot see the new tools, close it and run `setup.bat` again.
   - It downloads a portable Maven into `.tools`, creates the Python environment, installs packages, builds the backend.
   - The first run needs internet and can take 5 to 10 minutes. Wait for **SETUP SUCCESSFUL**.
4. Double-click **`start.bat`**. It starts the three services, waits until they are ready and opens the website.
5. Open <http://127.0.0.1:5173/> if the browser did not open by itself (the address is printed by `start.bat`; if port 5173 was busy it is a nearby number).
6. Sign in with the demo account **demo@phishshield.local** / **Demo@1234**, or create your own account.
7. When you are done, double-click **`stop.bat`**.

Administrator rights are not required by these scripts. Windows itself may ask for permission when winget installs Java, Python or Node.js.

### Manual downloads (only if winget is not available)

- Java 21 JDK: <https://adoptium.net/temurin/releases/?version=21>
- Python 3.12: <https://www.python.org/downloads/> (tick "Add python.exe to PATH" in the installer)
- Node.js LTS: <https://nodejs.org/en/download>

Then run `setup.bat` again. Maven is downloaded automatically by the script.

## How to test it

Use the example buttons on the scanner pages, or copy text from `samples/`.

| Test | Where | Expected |
|---|---|---|
| Harmless message | Message scanner, "Harmless chat" | Low, score 0 |
| Fake prize message | "Fake prize" | Critical |
| Urgent account warning | "Urgent account warning" | Critical |
| Suspicious IP URL | URL scanner, "IP-based address" | High |
| Normal HTTPS URL | "Normal HTTPS site" | Low |
| Invalid URL | "Invalid URL" | Red error message, nothing saved |
| History, delete | Scan history, trash icon | Scan removed, dashboard numbers drop |
| Dashboard | Dashboard | Counts come from the database |

Automatic checks:

- **`test.bat`** (while the app is running) logs in, scans harmless, prize, urgent, IP and normal URLs, checks the invalid URL error,
  history, details, dashboard numbers and delete. It proves the Java to Python to database path works on your machine.
- Engine unit tests (also run by `setup.bat`): in `ai-engine`, `.venv\Scripts\python -m unittest discover -s tests`.

## Login and accounts

- Passwords are hashed with PBKDF2-HMAC-SHA256 and a random salt. Login tokens are random and only their hash is stored.
- Each user only sees their own scans. Five failed sign-ins for one e-mail pause that account for 10 minutes.
- The demo account is created on first start. To disable it, set the environment variable `DEMO_USER_ENABLED=false`.

## Ports, logs and data

- Defaults: website 5173, backend 8080, engine 8000. If one is busy, `start.bat` picks the next free port and prints it.
- Logs are in `logs/` (`engine.err.log`, `backend.log`, `frontend.log`). If a service fails, `start.bat` prints its last lines.
- The database is the file `data/phishshield.mv.db`. Delete the `data` folder to reset everything.
- `.run/state.json` remembers the process IDs so `stop.bat` can stop exactly what `start.bat` started.

## Optional PostgreSQL

H2 is used by default. To use PostgreSQL, set these variables in the same terminal (or Windows environment) before `start.bat`:

```
set DB_URL=jdbc:postgresql://localhost:5432/phishshield
set DB_USER=your_user
set DB_PASSWORD=your_password
```

No passwords are stored in the project.

## Troubleshooting

| Problem | What to do |
|---|---|
| "Setup has not been completed" | Run `setup.bat` and wait for SETUP SUCCESSFUL |
| Tools installed but still "missing" | Close the window and run `setup.bat` again (Windows needs a fresh window to see new tools) |
| Maven download fails | Check internet or a school firewall; try a different network |
| Backend does not start | Open `logs/backend.log`. Java 21 is required (`java -version`) |
| Website shows "Cannot reach the PhishShield server" | Run `start.bat` again and check `logs/` |
| Scan says engine not reachable (503) | Open `logs/engine.err.log`; run `start.bat` again |
| PowerShell blocks scripts | The `.bat` files already run PowerShell with `-ExecutionPolicy Bypass` for that one run only |

## Limitations

- Rules can miss new scam wording and can flag harmless messages. Always double-check important requests yourself.
- English and a small set of Hinglish phrases are covered. Other languages are not.
- URL checks are static: no redirect following, no page content, no domain age, no reputation feeds.
- Login is designed for a single-computer demo (HTTP on 127.0.0.1). Use HTTPS and a stronger setup before any public deployment.
- Not covered by automated UI tests. The scripts were written for Windows 10/11.

## Developer commands

```
cd ai-engine      && .venv\Scripts\python -m uvicorn main:app --port 8000
cd backend-java   && ..\.tools\apache-maven-3.9.9\bin\mvn spring-boot:run
cd frontend       && npm run dev
```
