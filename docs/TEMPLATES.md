# Adding a template

A **template** is a pre-baked Docker image the warm pool hands out as a sandbox.
Everything a candidate (or SDK user) touches is baked in at build time; the only
runtime-variable bit is the per-template **`DEV_CMD`** the toolbox runs. That is
what makes the pool language-agnostic — Node, Python, and a React/Vite frontend
all run through the identical machinery.

The fastest way to make a new one is to **copy the seed**:
[`build/sandbox-images/example-node-api/`](../build/sandbox-images/example-node-api/)
— a complete, buildable Node example (starter scores 20/100, solution 100/100).

```bash
cp -r build/sandbox-images/example-node-api build/sandbox-images/my-template
```

Then work through the four things below.

---

## 1. The directory contract

Every template is a directory under `build/sandbox-images/<id>/`:

```
<id>/
├── Dockerfile          # bakes deps + toolbox + harness; non-root
├── template/           # the app the candidate gets
│   ├── <deps manifest> # package.json / requirements.txt / …  (baked at build)
│   ├── <scaffold…>     # FIXED files the candidate can't edit (server, config)
│   └── src/            # CANDIDATE-EDITABLE code — the ONLY writable path
└── harness/
    ├── run-tests.sh    # scorer entrypoint — prints ONE JSON line
    └── <test files>    # your actual tests
```

Rules that matter:

- **Bake all dependencies at build time.** Sandboxes must not need the network to
  start — do your `npm install` / `pip install` in the Dockerfile, never at runtime.
- **`/app/src` is the only candidate-editable path.** Copy a pristine snapshot to
  **`/template-src`** in the Dockerfile so the toolbox can reset `/app/src` to
  clean starter code on every claim.
- **Fixed scaffolding** (the server entry, build config) lives in `/app`, *outside*
  `/app/src`, so candidates can't change it and it isn't reset.

## 2. The Dockerfile contract

Start from the seed's [`Dockerfile`](../build/sandbox-images/example-node-api/Dockerfile).
The non-negotiable lines:

```dockerfile
# deps baked in (example — use your real manifest)
COPY template/package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY template/server.js ./server.js     # fixed scaffold
COPY template/src ./src                  # candidate-editable
RUN cp -r /app/src /template-src         # clean snapshot for reset-on-claim

COPY toolbox /usr/local/bin/toolbox      # dropped in by build-image.sh
RUN chmod +x /usr/local/bin/toolbox

COPY harness /harness                    # scorer
RUN chmod +x /harness/run-tests.sh

RUN chown -R node:node /app /template-src  # run as NON-root
USER node

EXPOSE 3000 49983                        # 3000 = dev server, 49983 = toolbox
CMD ["/usr/local/bin/toolbox"]           # the toolbox is always the entrypoint
```

Why each is required:

| Piece | Reason |
|---|---|
| `COPY toolbox …` + `CMD [toolbox]` | The toolbox is the in-container control plane: it seeds `/app/src`, runs `DEV_CMD`, and serves `/claim`, `/health`, `/ws/terminal`. `build-image.sh` compiles it into your dir before `docker build`. |
| Port **3000** | Where your dev server (`DEV_CMD`) listens. The orchestrator publishes it as the sandbox app/preview port. |
| Port **49983** | The toolbox's own control port. Always expose it. |
| `USER node` (non-root) | Defence in depth — candidate code runs unprivileged. |
| `/template-src` copy | The toolbox restores `/app/src` from here on each claim, so every candidate starts clean. |

> **Frontend templates** (a live browser preview, `kind: "frontend"`): the dev
> server must bind all interfaces so the preview proxy can reach it — e.g.
> `dev_cmd: "npx vite --host 0.0.0.0 --port 3000"`. See `q3-react-vite` for the
> full shape (it also copies `index.html`, `vite.config.cjs`, `tsconfig.json` as
> fixed scaffolding). Everything else is identical to an API template.

## 3. The scoring harness contract

The orchestrator scores a submission by running your harness in a **fresh,
one-shot, `--network none` container** with the candidate's `/app/src` overlaid
on the baked image:

```
sh /harness/run-tests.sh      # mem 512 MB, pids 256, 120s timeout
```

`run-tests.sh` **must print exactly one JSON line to stdout**, and nothing else
that looks like output:

```json
{"score": 100, "max_score": 100, "test_results": [
  {"name": "GET /ping -> {pong:true}", "passed": true,  "duration_ms": 9},
  {"name": "POST /echo echoes msg",    "passed": false, "error": "status 404", "duration_ms": 1}
]}
```

Anything else — no JSON, or a crash with no JSON — is recorded as
`invalid_output` (score 0). The typical harness (see the seed) does:

1. Boot the candidate's app (`PORT=3000 node server.js &`).
2. Poll until it accepts connections (with a timeout).
3. Run weighted test cases over loopback; sum the weights of the ones that pass.
4. Print the JSON line; kill the app; exit.

Keep the weights summing to a round `max_score` (100) so the dashboard shows a
clean `N/100`.

> **Isolation caveat that bites everyone once:** the scorer runs the app itself,
> so your harness must be able to bind port 3000. Don't test against a
> long-running dev server — boot a fresh one inside `run-tests.sh`.

## 4. Build, register, verify

### Build the image

```bash
./scripts/build-image.sh my-template                 # -> flash-sandbox:my-template-v1
./scripts/build-image.sh my-template my-registry:tag # or an explicit tag
```

This compiles the toolbox (static `linux/<arch>` binary) into your dir, then
`docker build`s and tags it.

### Register it — two ways

**A. At runtime (no restart)** — the usual path. `POST /v1/templates`, or the
dashboard's **Templates → Create template**. The orchestrator validates the
image exists in the Docker daemon, then starts warming the pool immediately.

```bash
curl -X POST localhost:8090/v1/templates -H 'Content-Type: application/json' -d '{
  "id":        "ex1",
  "title":     "Example Node API",
  "language":  "Node.js",
  "kind":      "api",                              // "api" | "frontend"
  "image":     "flash-sandbox:example-node-api-v1",
  "dev_cmd":   "node server.js",                   // required
  "min_warm":  1,                                  // 0–10
  "vcpu":      0.5,
  "memory_mb": 512,
  "pids_limit":150
}'
```

Field notes: `id` and `image` are required; `dev_cmd` is required; `min_warm`
must be 0–10; `kind` defaults to `"api"` unless you pass `"frontend"`; an image
that isn't present in the Docker daemon is rejected with `422`.

**B. Baked into the binary (exists on every boot)** — add it to the default
registry in
[`internal/templates/templates.go`](../internal/templates/templates.go)
(alongside `q1`/`q2`/`q3`), optionally with an env override for the image tag
(`Q1_IMAGE`-style). Use this for the templates you always want warmed at startup.

### Verify end-to-end

```bash
# claim → the warm depth for your template should tick up first:
curl -s localhost:8090/v1/stats

# assessment loop (claim a session, submit → score in the isolated container):
S=$(curl -s -X POST localhost:8090/v1/sessions \
      -H 'Content-Type: application/json' \
      -d '{"candidate_id":"demo","question_id":"ex1"}')
SID=$(echo "$S" | python3 -c 'import sys,json;print(json.load(sys.stdin)["session_id"])')
TOK=$(echo "$S" | python3 -c 'import sys,json;print(json.load(sys.stdin)["session_token"])')
curl -s -X POST localhost:8090/v1/sessions/$SID/submit -H "Authorization: Bearer $TOK"
# then read the score off the list:
curl -s localhost:8090/v1/sessions | python3 -m json.tool | grep -A2 "$SID"
```

The starter should score partial; a correct `src/*` should score `max_score`.
`scripts/e2e.sh` drives this loop for the built-in templates and is the reference.

---

## Checklist

- [ ] Dir at `build/sandbox-images/<id>/` with `Dockerfile`, `template/`, `harness/`
- [ ] All deps baked at build time (no runtime network needed)
- [ ] Candidate code only under `/app/src`; snapshot copied to `/template-src`
- [ ] `toolbox` copied to `/usr/local/bin/toolbox` and set as `CMD`
- [ ] `EXPOSE 3000 49983`; runs as a non-root `USER`
- [ ] `harness/run-tests.sh` prints exactly one `{"score","max_score","test_results"}` line
- [ ] Frontend only: `dev_cmd` binds `0.0.0.0:3000`
- [ ] Built with `scripts/build-image.sh`, registered, and verified with a real submit
