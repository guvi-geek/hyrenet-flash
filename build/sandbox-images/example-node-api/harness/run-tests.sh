#!/bin/sh
# Scoring harness. The orchestrator runs `sh /harness/run-tests.sh` inside a
# one-shot, --network none container with the candidate's /app/src overlaid on
# the baked image. It MUST print exactly ONE JSON line to stdout:
#   {"score":N,"max_score":M,"test_results":[...]}
# Anything else (or a non-zero exit with no JSON) is recorded as invalid_output.
set -e
cd /app

# Boot the candidate's server in the background.
PORT=3000 node server.js >/tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait (max ~5s) for it to accept connections before testing.
i=0
while [ $i -lt 50 ]; do
  if node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 0.1
done

node /harness/test.js
RESULT=$?

kill $SERVER_PID 2>/dev/null || true
exit $RESULT
