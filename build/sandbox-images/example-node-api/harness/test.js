// test.js — exercises the candidate's API over loopback and emits the exact
// score JSON the orchestrator expects on stdout:
//   {"score":N,"max_score":M,"test_results":[...]}
//
// Each case has a `weight`; passing cases sum to `score`. `max_score` is the sum
// of all weights (100 here). Keep weights adding to a round max so the dashboard
// shows a clean N/100.
const http = require('http');

function req(method, path, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      { host: '127.0.0.1', port: 3000, method, path, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json = null;
          try { json = buf ? JSON.parse(buf) : null; } catch (_) {}
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    r.on('error', () => resolve({ status: 0, body: null }));
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const cases = [
    { name: 'GET /ping -> {pong:true}', weight: 20, fn: async () => {
        const r = await req('GET', '/ping');
        if (r.status !== 200) throw new Error(`status ${r.status}`);
        if (!r.body || r.body.pong !== true) throw new Error('wrong body');
      } },
    { name: 'POST /echo echoes msg', weight: 40, fn: async () => {
        const r = await req('POST', '/echo', { msg: 'hello' });
        if (r.status !== 200) throw new Error(`status ${r.status}`);
        if (!r.body || r.body.echo !== 'hello') throw new Error('msg not echoed');
      } },
    { name: 'GET /add?a=2&b=3 -> {sum:5}', weight: 40, fn: async () => {
        const r = await req('GET', '/add?a=2&b=3');
        if (r.status !== 200) throw new Error(`status ${r.status}`);
        if (!r.body || r.body.sum !== 5) throw new Error(`sum was ${r.body && r.body.sum}`);
      } },
  ];

  let score = 0;
  const results = [];
  for (const c of cases) {
    const start = Date.now();
    try {
      await c.fn();
      score += c.weight;
      results.push({ name: c.name, passed: true, duration_ms: Date.now() - start });
    } catch (e) {
      results.push({ name: c.name, passed: false, error: String(e.message || e), duration_ms: Date.now() - start });
    }
  }

  process.stdout.write(JSON.stringify({ score, max_score: 100, test_results: results }) + '\n');
}

run();
