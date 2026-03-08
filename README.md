# ImagePod Frontend

React frontend for the ImagePod.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Runs at `http://localhost:5173`.

**API URL:** Set `VITE_API_URL` to your backend (no trailing slash). Copy `.env.example` to `.env` and edit:

```bash
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8000  (or your API host)
```

If `VITE_API_URL` is unset in dev, requests to `/api` are proxied to `http://localhost:8000`.

## Build

```bash
npm run build
```

Output is in `dist/`. Set `VITE_API_URL` when building for production so the app knows where the API lives.

## Features

- **Auth**: Register, login, token refresh (stored in localStorage)
- **Templates**: List and create Docker-based templates (name + image)
- **Executors**: Add GPU workers; copy API key to run the executor process
- **Endpoints**: Create endpoints (template + executor), view details, delete
- **Jobs**: Run a job with JSON input on an endpoint; poll status and see output
- **API Keys**: Create and revoke API keys for programmatic access

## Docker

Build and run with Docker Compose:

```bash
# Optional: set your API URL (no trailing slash). Defaults to http://localhost:8000
export VITE_API_URL=http://your-api-host:8000

docker compose up -d --build
```

App is served at `http://localhost:3000`. The image uses a multi-stage build (Node for build, nginx for serving).

To rebuild after changing `VITE_API_URL`, run `docker compose up -d --build` again.

## Stack

- Vite + React 18 + TypeScript
- React Router 6
- Tailwind CSS
- No UI library (plain forms and buttons)
