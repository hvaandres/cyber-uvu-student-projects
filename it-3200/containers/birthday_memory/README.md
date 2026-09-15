# 🎂 Birthday Memory

**Never miss a birthday again.** A modern, colorful web app to save, search, and celebrate the birthdays of everyone you care about. Add first name, last name, birthdate, phone and email once, and the app keeps them organized, searchable, and visible on a beautiful month-by-month calendar.

Every birthday is stored permanently in a Postgres database. The calendar highlights upcoming celebrations with countdown timers, and the search bar finds anyone by name, email or phone in milliseconds.

## What it does

- **Add birthdays** — a five-field form saves first name, last name, birthdate, telephone number, and email address to the `thebirthdates` Postgres database.
- **Search instantly** — find anyone by typing their name, email, or phone number. Filter by birth month with colored pill buttons. Sort by soonest birthday, alphabetical order, or age.
- **View a calendar** — each month displays as a 6-week grid. Days with birthdays show colorful avatar chips with the person's initials. Click a day to see full details. A sidebar counts down the next five celebrations.
- **Deterministic color gradients** — each person gets a unique, stable color derived from their name, so they look identical across the card view, search results, and the calendar.
- **Edit and delete** — update any field or remove entries from the search results with inline actions.
- **Responsive design** — works on desktop, tablet, and mobile. The calendar compacts on narrow screens without losing functionality.

## Stack

| Layer    | Technology                         |
| -------- | ---------------------------------- |
| Frontend | React 18 + Vite, hand-written CSS  |
| Backend  | Node.js + Express 4 + `pg`         |
| Database | PostgreSQL 16 (Docker or local)   |
| Admin UI | pgAdmin 4 (bundled, web-based)      |
| Containers | Docker Compose (nginx, Node, Postgres, pgAdmin) |
| Package manager | npm                        |

## Prerequisites

What you need depends on how you plan to run the app (see [Running the app](#running-the-app)):

- **Fully in Docker (Option A, recommended)** — only **Docker** (with Compose v2, bundled with Docker Desktop).
- **Local dev mode (Option B)** — **Node.js 18 or newer** (ships with `npm`), plus **PostgreSQL 14 or newer** either installed natively or run via the bundled Docker container.

> **Every operating system installs these differently.** macOS, Windows and Linux each have their own package managers and conventions, so pick the section below that matches your machine. The commands differ, but once the tools are installed, the rest of the setup is identical everywhere.

Check whether you already have them:

```bash
docker --version  # required for Option A; also used for the bundled Postgres in Option B
node --version    # required for Option B — want v18.0.0 or higher
npm --version     # ships with Node
```

If a command prints `command not found`, that tool is missing — install it below.

### Installing on macOS

The usual route is [Homebrew](https://brew.sh). If you don't have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then:

```bash
brew install node                      # Node.js + npm
brew install --cask docker             # Docker Desktop (for the bundled database)
```

Launch Docker Desktop once from Applications so the background daemon starts — the `docker` CLI fails with a socket error until you do.

On a fresh Mac, Homebrew may refuse to install anything until you accept the Xcode license:

```bash
sudo xcodebuild -license accept
```

Prefer a native database over Docker? `brew install postgresql@16 && brew services start postgresql@16`.

### Installing on Windows

Use [winget](https://learn.microsoft.com/windows/package-manager/winget/) (built into Windows 11 and recent Windows 10):

```powershell
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
```

Or download the installers directly from [nodejs.org](https://nodejs.org) and [docker.com](https://www.docker.com/products/docker-desktop/).

Things specific to Windows:

- **Restart your terminal** after installing Node, or `node` won't be on your `PATH`.
- Docker Desktop requires **WSL 2**. The installer normally sets this up; if it complains, run `wsl --install` in an admin PowerShell and reboot.
- Use **PowerShell** or **Windows Terminal**, not the legacy `cmd.exe`. All the `npm` commands below work unchanged.
- Running inside **WSL 2 (Ubuntu)** instead? Follow the Linux instructions below — that environment is Linux, not Windows.
- Prefer a native database? Download the [PostgreSQL Windows installer](https://www.postgresql.org/download/windows/) and note the port and password you choose during setup.

### Installing on Linux

**Debian / Ubuntu:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y docker.io docker-compose-plugin
```

**Fedora / RHEL:**

```bash
sudo dnf install -y nodejs npm
sudo dnf install -y docker docker-compose-plugin
```

**Arch:**

```bash
sudo pacman -S nodejs npm docker docker-compose
```

Things specific to Linux:

- The version of Node in default `apt` repositories is often **too old**. Use NodeSource (shown above) or [nvm](https://github.com/nvm-sh/nvm) to get 18+.
- Docker needs its daemon started and your user added to the `docker` group, otherwise every command needs `sudo`:
  ```bash
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER   # then log out and back in
  ```
- Prefer a native database? `sudo apt-get install postgresql` (or your distro's equivalent), then create the database manually as shown in step 3 below.

## Project dependencies

These install automatically via `npm run install:all` — listed here so you know what the app pulls in.

**Backend** (`server/package.json`):

| Package   | Purpose                                              |
| --------- | ---------------------------------------------------- |
| `express` | HTTP server and routing                              |
| `pg`      | PostgreSQL driver and connection pool                |
| `cors`    | Allows the browser client to call the API            |
| `dotenv`  | Loads database credentials from `server/.env`        |

**Frontend** (`client/package.json`):

| Package               | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `react`, `react-dom`  | UI library                               |
| `vite`                | Dev server and production bundler        |
| `@vitejs/plugin-react`| React fast-refresh support for Vite      |

**Root** (`package.json`):

| Package        | Purpose                                         |
| -------------- | ----------------------------------------------- |
| `concurrently` | Runs the API and client together via `npm run dev` |

There is no CSS framework — all styling is hand-written in `client/src/styles/index.css`.

## Running the app

There are two ways to run this app: **fully in Docker** (one command, no local Node/Postgres needed beyond Docker itself) or in **local dev mode** (faster iteration, hot reload).

### Option A — fully in Docker (frontend + backend + database)

First, create your local environment file — the stack refuses to start without a real password:

```bash
cp .env.example .env
# then edit .env and set a strong POSTGRES_PASSWORD
```

Builds and runs all four containers — Postgres, the Express API, the React app served by nginx, and pgAdmin:

```bash
npm run docker:up
# or directly: docker compose up -d --build
```

- Frontend: http://localhost:3000
- API: http://localhost:4000/api/health
- Postgres: localhost:5544
- pgAdmin (DB web UI): http://localhost:5050

The frontend container proxies `/api/*` requests to the backend container internally, so the UI works immediately with no extra configuration. Check status with `docker compose ps` and logs with `docker compose logs -f`. Stop everything with:

```bash
npm run docker:down
# or directly: docker compose down
```

Rebuild after changing source code with `npm run docker:up` again (the `--build` flag rebuilds changed layers).

#### Security hardening

The Compose setup is locked down beyond the defaults:

- **No baked-in credentials.** `POSTGRES_PASSWORD` has no default — `docker compose up` fails fast with a clear error until you set it in `.env` (gitignored). `.env.example` documents the required variables.
- **Loopback-only port bindings.** All published ports bind to `127.0.0.1`, not `0.0.0.0`, so nothing is reachable from other devices on your network. To allow LAN access (e.g. testing from a phone), change a port entry like `"127.0.0.1:3000:8080"` to `"3000:8080"`.
- **Network segmentation.** Postgres and the API share a dedicated `backend-net`; the client only has `frontend-net`. The client container has no network route to Postgres at all — it can only ever reach the API.
- **Non-root containers.** The API runs as the unprivileged `node` user and the frontend runs as the unprivileged `nginx` user (via `nginxinc/nginx-unprivileged`, listening on port 8080 instead of 80).
- **Read-only root filesystems.** Postgres, the API and the frontend run with `read_only: true`; only the narrow paths that need to write (e.g. Postgres data, `/tmp`, nginx cache/run dirs) are mounted as `tmpfs` or named volumes. pgAdmin is the one exception — its entrypoint writes a config file and re-execs itself, which is incompatible with a read-only root filesystem, so it keeps a writable container filesystem while staying on the isolated `backend-net` and loopback-only port.
- **Dropped Linux capabilities.** Postgres, the API and the frontend use `cap_drop: [ALL]`. Postgres gets back only the five capabilities its entrypoint needs (`CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETGID`, `SETUID`) to initialize as root before dropping to the `postgres` user; the API and frontend need none. pgAdmin's entrypoint (writing config, re-executing itself as a different user) needs a broader set of capabilities, so it keeps its default set rather than dropping them.
- **`no-new-privileges`** is set on every container to block privilege escalation via setuid binaries.
- **Resource limits** (`cpus`/`memory`) cap each container to reduce blast radius from a runaway or compromised process.
- **pgAdmin credentials** (`PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`) also come from `.env` with no defaults, same as the Postgres password.

### Option B — local dev mode (hot reload)

These steps are the **same on macOS, Windows and Linux** once Node and Postgres are installed.

#### 1. Get the code and install dependencies

```bash
git clone <repository-url>
cd birthday_memory
npm run install:all
```

`install:all` installs the root, server, and client packages in one pass.

#### 2. Configure the database connection

macOS / Linux:

```bash
cp server/.env.example server/.env
```

Windows PowerShell:

```powershell
Copy-Item server\.env.example server\.env
```

If you're pointing this at the bundled Docker Postgres (`npm run db:up`), edit `server/.env` so `PGUSER`, `PGPASSWORD` and `PGDATABASE` match `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` in the root `.env` (copy `.env.example` to `.env` first if you haven't already — there are no default passwords). Using your own PostgreSQL install instead? See [Configuration](#configuration) to point `server/.env` at it.

#### 3. Start PostgreSQL

**Option A — bundled Docker database (recommended).** No Postgres install needed, and the `thebirthdates` database is created for you:

```bash
npm run db:up
```

Make sure Docker Desktop is actually running first, or you'll get a socket connection error.

**Option B — your own PostgreSQL.** Create the database, then update `server/.env` with your host, port, user and password:

```bash
createdb thebirthdates
# or:  psql -U postgres -c "CREATE DATABASE thebirthdates;"
```

The `birthdays` table and its indexes are created automatically when the API starts — you only need the empty database to exist.

#### 4. Add sample data (optional)

```bash
npm --prefix server run seed
```

Inserts eight well-known people, several with birthdays in the next few days so the countdown and calendar have something to show.

#### 5. Start the app

```bash
npm run dev
```

This runs the API on **http://localhost:4000** and the web client on **http://localhost:5173** at the same time.

Open **http://localhost:5173** in your browser. Press `Ctrl+C` to stop both.

## Troubleshooting

**`command not found: node` / `'node' is not recognized`**
Node isn't installed or isn't on your `PATH`. Reinstall it for your OS above and open a new terminal — `PATH` changes don't apply to already-open terminals.

**`Cannot reach the server. Is the API running?`**
The client loaded but the API didn't. Check the terminal running `npm run dev` for errors, and confirm http://localhost:4000/api/health responds.

**`[db] could not initialize schema` / `ECONNREFUSED`**
Postgres isn't reachable. If using Docker, run `docker compose ps` — the container should say `healthy`. If using your own instance, confirm the host, port, user and password in `server/.env` and that the `thebirthdates` database exists.

**`failed to connect to the docker API`**
The Docker daemon isn't running. Start Docker Desktop (macOS/Windows) or `sudo systemctl start docker` (Linux).

**`Port 5173 is already in use` / `EADDRINUSE`**
Something else has the port. Stop it, or change the client port in `client/vite.config.js` and the API port via `PORT` in `server/.env`.

**`permission denied while trying to connect to the Docker daemon` (Linux)**
Your user isn't in the `docker` group. Run `sudo usermod -aG docker $USER`, then log out and back in.

**`Set POSTGRES_PASSWORD in a .env file (see .env.example)`** (or similarly for `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`)
`docker compose up` refused to start because a required variable isn't set. Run `cp .env.example .env` in the project root, fill in real values, and try again.

**`does not appear to be a valid email address` (pgAdmin)**
pgAdmin validates `PGADMIN_DEFAULT_EMAIL` strictly and rejects some domains (e.g. `.local`). Use a conventional-looking address such as `admin@example.com` in `.env`.

**Can't reach the app from my phone or another computer on the network**
Published ports are bound to `127.0.0.1` on purpose (see [Security hardening](#security-hardening)). To allow LAN access, change the relevant port mapping in `docker-compose.yml`, e.g. `"127.0.0.1:3000:8080"` to `"3000:8080"`, then re-run `docker compose up -d`.

## Configuration

There are **two separate `.env` files** with different scopes — keep them in sync manually if you use both:

- **Root `.env`** (copied from `.env.example`) — read by `docker compose` for Option A. Sets `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`. Required; there are no built-in default passwords.
- **`server/.env`** (copied from `server/.env.example`) — read by the Node API only when you run it directly (Option B, `npm run dev:server` / `npm start`). Docker never reads this file.

`server/.env` accepts either a single connection string or individual settings:

```bash
# Option A — connection string wins if present
DATABASE_URL=postgresql://user:password@host:5432/thebirthdates

# Option B — individual settings (must match the root .env if pointing at the bundled Docker Postgres)
PGHOST=localhost
PGPORT=5544
PGUSER=birthday
PGPASSWORD=birthday
PGDATABASE=thebirthdates

PGSSL=false   # set to "true" for managed Postgres that requires SSL
PORT=4000
```

The database itself must exist; the `birthdays` table and its indexes are created automatically on server start.

## Database schema

Table `birthdays` in database `thebirthdates`:

| Column       | Type          | Notes                        |
| ------------ | ------------- | ---------------------------- |
| `id`         | `uuid`        | primary key, auto-generated  |
| `first_name` | `text`        | required                     |
| `last_name`  | `text`        | required                     |
| `birthdate`  | `date`        | required                     |
| `phone`      | `text`        | optional                     |
| `email`      | `text`        | optional                     |
| `created_at` | `timestamptz` | defaults to `now()`          |
| `updated_at` | `timestamptz` | refreshed on update          |

## API

| Method   | Path                            | Description                                |
| -------- | ------------------------------- | ------------------------------------------ |
| `GET`    | `/api/health`                   | Connectivity check                         |
| `GET`    | `/api/birthdays?q=&month=`      | List, optionally filtered by text or month |
| `GET`    | `/api/birthdays/upcoming?days=` | Soonest celebrations (default 30 days)     |
| `POST`   | `/api/birthdays`                | Create                                     |
| `PUT`    | `/api/birthdays/:id`            | Update                                     |
| `DELETE` | `/api/birthdays/:id`            | Delete                                     |

Responses use camelCase and include computed `age`, `turningAge`, `daysUntil` and `nextBirthday` fields. Validation failures return `422` with a per-field `errors` object.

The API accepts requests from any HTTP client, so you can explore it with `curl`, Postman, Insomnia, or your browser:

```bash
curl http://localhost:4000/api/birthdays

curl -X POST http://localhost:4000/api/birthdays \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","birthdate":"1995-03-22","phone":"+1 555 123 4567","email":"jane@example.com"}'
```

## Inspecting the database

### Via pgAdmin (bundled, no install needed)

When running Option A (fully in Docker), a pgAdmin web UI is included:

1. Open http://localhost:5050 and log in with `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` from your `.env`.
2. Right-click **Servers** → **Register** → **Server...**
3. On the **General** tab, give it any name (e.g. `thebirthdates`).
4. On the **Connection** tab, use:
   - Host: `postgres` (the service name — pgAdmin reaches it over the internal `backend-net`, not `localhost`)
   - Port: `5432`
   - Database: value of `POSTGRES_DB` from `.env` (default `thebirthdates`)
   - Username: value of `POSTGRES_USER` from `.env` (default `birthday`)
   - Password: value of `POSTGRES_PASSWORD` from `.env`
5. Save. The connection persists in the `pgadmin-data` volume, so you won't need to re-enter it next time.

### Via a desktop GUI (DBeaver, TablePlus, Postico, ...)

Use these settings to connect from the host machine:

| Setting  | Value                                  |
| -------- | -------------------------------------- |
| Host     | `localhost`                            |
| Port     | `5544`                                 |
| Database | `POSTGRES_DB` from `.env` (default `thebirthdates`) |
| Username | `POSTGRES_USER` from `.env` (default `birthday`)    |
| Password | `POSTGRES_PASSWORD` from `.env`        |

Note the port is **5544**, not the default 5432 — chosen so it never collides with a PostgreSQL instance you already run. Most GUI tools pre-fill 5432, so remember to change it.

### Via the command line

The container already includes `psql`:

```bash
docker exec -it thebirthdates-db psql -U birthday -d thebirthdates
```

Once connected: `\dt` lists tables, `\d birthdays` shows the schema, `\q` quits.

## Project structure

```
birthday_memory/
├── .env.example                # Docker Compose credentials template (copy to .env)
├── client/                     # React front end
│   ├── Dockerfile              # Multi-stage build served by nginx
│   ├── nginx.conf              # Static file serving + /api proxy to backend
│   ├── index.html
│   ├── vite.config.js          # Dev server + /api proxy to the backend
│   └── src/
│       ├── App.jsx             # Layout, nav, hero stats
│       ├── main.jsx            # React entry point
│       ├── components/
│       │   ├── AddSection.jsx      # Section 1 — add a birthday
│       │   ├── SearchSection.jsx   # Section 2 — search, filter, edit, delete
│       │   ├── CalendarSection.jsx # Section 3 — month grid + countdown
│       │   ├── BirthdayForm.jsx    # Shared add/edit form
│       │   ├── PersonCard.jsx      # Reusable person card
│       │   └── Toast.jsx           # Notifications
│       ├── hooks/useBirthdays.js   # Data fetching and cache
│       ├── lib/api.js              # API client
│       ├── lib/utils.js            # Dates, colors, calendar grid
│       └── styles/index.css        # All styling
├── server/                     # Express API
│   ├── Dockerfile
│   ├── .env.example            # Copy to .env and edit
│   └── src/
│       ├── index.js            # Server entry point
│       ├── db.js               # Connection pool + schema bootstrap
│       ├── routes.js           # REST endpoints
│       ├── validate.js         # Server-side validation
│       ├── dates.js            # Age / next-birthday math
│       └── seed.js             # Sample data
├── docker-compose.yml          # Postgres + backend API + frontend (nginx) + pgAdmin
└── package.json                # Root scripts
```

## Scripts

| Command                       | What it does                          |
| ----------------------------- | ------------------------------------- |
| `npm run dev`                 | Run API and client together           |
| `npm run dev:server`          | API only, with watch mode             |
| `npm run dev:client`          | Vite dev server only                  |
| `npm run build`               | Production build of the client        |
| `npm start`                   | Run the API without watch mode        |
| `npm run db:up` / `db:down`   | Start / stop only the bundled Postgres |
| `npm run docker:up` / `docker:down` | Build and run (or stop) frontend + backend + database in Docker |
| `npm --prefix server run seed`| Insert sample birthdays               |

## Deploying

Build the client with `npm run build` and serve `client/dist` from any static host, pointing it at the API with `VITE_API_URL`. Run the API with `npm start` and a `DATABASE_URL` for your managed Postgres.
