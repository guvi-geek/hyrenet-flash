# ─────────────────────────────────────────────────────────────────────────────
# SEED TEMPLATE — copy this whole directory to build/sandbox-images/<your-id>/
# and adapt it. It is a complete, buildable example of the Flash template
# contract. See docs/TEMPLATES.md for the full walk-through.
#
# The contract every sandbox image must honour:
#   1. Bake ALL dependencies at build time — nothing is installed at runtime
#      (sandboxes may run with --network none-style isolation).
#   2. Candidate-editable code lives ONLY in /app/src. Copy a pristine snapshot
#      to /template-src so the toolbox can reset it on each claim.
#   3. Copy the `toolbox` binary to /usr/local/bin/toolbox — it is the CMD.
#      (scripts/build-image.sh compiles it into this dir before `docker build`.)
#   4. Put the scorer at /harness/run-tests.sh (the orchestrator runs
#      `sh /harness/run-tests.sh` inside a one-shot --network none container).
#   5. Run as a non-root user. Expose the dev-server port (3000) and the
#      toolbox control port (49983).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# 1. Deps baked in. This seed uses only the Node standard library, so there is
#    nothing to install — but a real template does its `npm ci` / `pip install`
#    HERE, at build time. Example (uncomment for a real dependency set):
#      COPY template/package.json ./
#      RUN npm install --omit=dev && npm cache clean --force
COPY template/package.json ./

# 2. Fixed scaffolding (NOT candidate-editable, NOT reset on claim).
COPY template/server.js ./server.js

# 3. Candidate-editable starter code — the only path a candidate can change.
COPY template/src ./src

# 4. Preserve a clean copy so the toolbox can reset /app/src on every claim.
RUN cp -r /app/src /template-src

# 5. Toolbox control-plane binary (static linux binary, dropped in by the build
#    script). It is the container's entrypoint: it seeds /app/src, runs DEV_CMD,
#    and serves /claim, /health, /ws/terminal.
COPY toolbox /usr/local/bin/toolbox
RUN chmod +x /usr/local/bin/toolbox

# 6. Scoring harness. `run-tests.sh` MUST print exactly one JSON line to stdout:
#      {"score":N,"max_score":M,"test_results":[...]}
COPY harness /harness
RUN chmod +x /harness/run-tests.sh

# 7. Non-root for defence in depth (the node image ships a `node` user).
RUN chown -R node:node /app /template-src
USER node

# 3000 = dev server (DEV_CMD), 49983 = toolbox control plane. Keep both.
EXPOSE 3000 49983

CMD ["/usr/local/bin/toolbox"]
