// Servidor estático mínimo (os módulos ES e o canvas exigem http em vez de file://).
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
function serve(root) {
  return new Promise(res => {
    const server = http.createServer((req, rsp) => {
      const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    server.listen(0, () => res({ url: `http://localhost:${server.address().port}`, close: () => server.close() }));
  });
}
module.exports = { serve };
