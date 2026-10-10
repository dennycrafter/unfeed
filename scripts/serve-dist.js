// Serves the built web export (dist/) for the Playwright screen tests.
// Dependency free so CI does not need another package.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const port = Number(process.argv[2] || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    // Expo Router is a single page app: unknown paths fall back to index.html.
    if (urlPath === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => console.log(`serving dist on http://127.0.0.1:${port}`));
