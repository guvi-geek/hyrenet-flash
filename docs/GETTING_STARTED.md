# Getting started (new contributors)

A five-minute path from a fresh clone to a running engine, your first sandbox,
and your first template. For the full reference setup (SDKs, dashboard dev loop,
cluster mode) see [`DEVELOPMENT.md`](DEVELOPMENT.md); for the architecture, see
the top-level [`README.md`](../README.md).

## What you're running

**One Go binary is the whole product.** `cmd/orchestrator` is the HTTP API, the
auth layer, the warm pool, the terminal/preview proxies, the scorer, *and* the
dashboard (the Next.js UI is statically exported and `go:embed`-baked into the
binary). So `http://localhost:8090` serves **both the API and the frontend** —
there is no separate frontend server to start in production.

The only external things it needs are **Docker** (to run sandboxes) and
**Postgres** (durable sessions/submissions).

## 0. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Go | 1.25+ | builds all three binaries |
| Docker / OrbStack / Colima | any recent | runs the sandbox containers |
| Node.js | 20+ | only if you change the dashboard UI |

## 1. One-time setup — network + Postgres

```bash
git clone https://github.com/guvi-geek/flash.git && cd flash
go mod download

# sandbox network (inter-container comms disabled) + local Postgres:
./scripts/setup.sh
# …or run Postgres yourself in Docker (pick any free host port, e.g. 5433):
docker run -d --name flash-pg -e POSTGRES_PASSWORD=flash -e POSTGRES_DB=flash \
  -p 5433:5432 postgres:16-alpine
```

> If `5433` is already taken on your machine, use another host port (e.g.
> `-p 5435:5432`) and match it in `DATABASE_URL` below.

## 2. Build the sandbox images

The pool can only warm images that exist. Build the toolbox + all templates:

```bash
./scripts/build-image.sh                 # q1, q2, q3
# ./scripts/build-image.sh q2-flask-api  # or just one
```

## 3. Run the engine

```bash
DATABASE_URL='postgres://postgres:flash@127.0.0.1:5433/flash?sslmode=disable' \
  LISTEN_ADDR=':8090' AUTH_ENABLED=false \
  go run ./cmd/orchestrator
```

It warms every template's pool, then listens. Watch for `warming pool` lines,
then `readyz` returning 200. **Open the dashboard:**

```bash
open http://localhost:8090
```

> `AUTH_ENABLED=false` is the frictionless local default. With auth on (the
> production default), the orchestrator mints a bootstrap API key on first boot
> and logs it once — paste it into the dashboard's **Settings** tab, or set
> `BOOTSTRAP_API_KEY=flash_…` yourself.

## 4. Prove the full loop

Claim a sandbox and run real code inside it:

```bash
BASE=http://localhost:8090
SB=$(curl -s -X POST $BASE/v1/sandboxes -H 'Content-Type: application/json' \
       -d '{"template_id":"q1","timeout_seconds":300}')
ID=$(echo "$SB" | python3 -c 'import sys,json;print(json.load(sys.stdin)["sandbox_id"])')

curl -s -X POST $BASE/v1/sandboxes/$ID/exec -H 'Content-Type: application/json' \
     -d '{"command":"node -e \"console.log(40+2)\" && ls /app/src"}'
# -> {"stdout":"42\ntodos.js\n","exit_code":0,...}

curl -s -X DELETE $BASE/v1/sandboxes/$ID      # kill it; the pool self-heals
curl -s $BASE/v1/stats                        # warm depth back to min_warm
```

Or drive the assessment loop (claim → submit → score) end-to-end:

```bash
BASE=http://localhost:8090 ./scripts/e2e.sh
```

In the **dashboard**, click **New sandbox** (top-right) to do the same from the
UI: pick a template, get a session with a live **Terminal** (xterm.js shell)
and, for the `q3` frontend template, a live **Preview** (the candidate's React
app in an iframe).

## 5. Add your own template

The engine is language-agnostic — a new template is just a new image plus a
one-line `dev_cmd`. Start from the seed and follow the guide:

```bash
cp -r build/sandbox-images/example-node-api build/sandbox-images/my-template
# …edit template/ + harness/, then:
./scripts/build-image.sh my-template
```

Full walk-through (the directory / Dockerfile / harness contracts, how to
register at runtime vs. bake into the binary, and how to verify a real score):
**[`docs/TEMPLATES.md`](TEMPLATES.md)**.

## Where things live

| Path | What |
|---|---|
| `cmd/orchestrator` | the control plane + embedded dashboard (the one binary) |
| `cmd/toolbox` | control binary baked into every sandbox image |
| `cmd/node-agent` | per-box runner for cluster mode |
| `internal/pool` | the warm pool (claim, replenish, health, ports) |
| `internal/docker` | thin Docker SDK wrapper (create, reap, run-scorer) |
| `internal/templates` | the built-in template registry (edit to bake a template in) |
| `build/sandbox-images/` | one directory per template (**seed:** `example-node-api/`) |
| `dashboard/` | the Next.js UI (static-exported into the binary) |
| `scripts/` | `setup.sh`, `build-image.sh`, `e2e.sh`, and the `*-check.sh` suites |

## Tear down

```bash
# stop the orchestrator with Ctrl-C, then:
docker rm -f flash-pg          # the Postgres you started
```
