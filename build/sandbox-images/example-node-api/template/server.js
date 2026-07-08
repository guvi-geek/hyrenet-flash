// server.js — FIXED SCAFFOLDING. Not editable by the candidate, not reset on
// claim. It wires the HTTP server to the candidate's handler in ./src/handler.js.
//
// Uses only the Node standard library so this seed template always builds
// without a package registry. A real template would `require('express')` etc.,
// with the dependency baked into the image at build time (see the Dockerfile).
const http = require('http');
const handle = require('./src/handler');

const port = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    // A tiny built-in health route the toolbox/harness can rely on.
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    // Everything else is the candidate's responsibility.
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let parsed = null;
      try {
        parsed = body ? JSON.parse(body) : null;
      } catch (_) {
        /* leave parsed = null on bad JSON */
      }
      handle(req, res, parsed);
    });
  })
  .listen(port, '0.0.0.0', () => console.log(`example api listening on ${port}`));
