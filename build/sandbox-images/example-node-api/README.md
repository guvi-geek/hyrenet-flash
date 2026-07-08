# Seed template — `example-node-api`

A complete, buildable example of the Flash template contract. **Copy this whole
directory** to `build/sandbox-images/<your-id>/` and adapt it. Full walk-through:
[`docs/TEMPLATES.md`](../../../docs/TEMPLATES.md).

It is a zero-dependency Node stdlib HTTP API, so it always builds without a
package registry. Swap in Express/Flask/Vite/etc. by baking your deps in the
Dockerfile (see the commented example there).

## Layout (the contract)

```
example-node-api/
├── Dockerfile              # bakes deps + toolbox + harness; runs as non-root
├── template/
│   ├── package.json        # deps (baked at build time — none here)
│   ├── server.js           # FIXED scaffold — wires the server to src/handler.js
│   └── src/
│       └── handler.js      # CANDIDATE-EDITABLE — the only path reset on claim
└── harness/
    ├── run-tests.sh        # boots the app, runs test.js, prints ONE JSON line
    └── test.js             # weighted test cases → {"score",…,"max_score",…}
```

## The task this template poses

| Route | Expected | Weight |
|---|---|---|
| `GET /ping` | `{"pong": true}` | 20 (done for the candidate) |
| `POST /echo {msg}` | `{"echo": <msg>}` | 40 (TODO) |
| `GET /add?a=2&b=3` | `{"sum": 5}` | 40 (TODO) |

Verified: the shipped starter scores **20/100**, the full solution **100/100**.

## Build & try it

```bash
./scripts/build-image.sh example-node-api          # -> flash-sandbox:example-node-api-v1

# register it against a running orchestrator (no restart), then claim one:
curl -X POST localhost:8090/v1/templates -H 'Content-Type: application/json' -d '{
  "id":"ex1","title":"Example Node API","language":"Node.js","kind":"api",
  "image":"flash-sandbox:example-node-api-v1","dev_cmd":"node server.js",
  "min_warm":1,"vcpu":0.5,"memory_mb":512,"pids_limit":150 }'
```
