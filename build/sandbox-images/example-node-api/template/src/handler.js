// src/handler.js — CANDIDATE EDITS THIS FILE.
//
// This is the ONLY path reset to its starter state when a new session claims the
// box. Implement the routes below.
//
// Task:
//   GET  /ping          -> 200, JSON {"pong": true}                 (done for you)
//   POST /echo  {msg}    -> 200, JSON {"echo": <msg>}               (TODO)
//   GET  /add?a=1&b=2    -> 200, JSON {"sum": 3}  (numbers, add a+b) (TODO)
//
// `body` is the parsed JSON request body (or null). Write your response with
// res.writeHead(status, {...}) then res.end(JSON.stringify(...)).
module.exports = function handle(req, res, body) {
  const json = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  // Implemented for you.
  if (req.method === 'GET' && req.url === '/ping') {
    return json(200, { pong: true });
  }

  // TODO: implement POST /echo   -> {"echo": body.msg}
  // TODO: implement GET  /add    -> {"sum": a + b}  (parse a,b from the query)

  return json(404, { error: 'not found' });
};
