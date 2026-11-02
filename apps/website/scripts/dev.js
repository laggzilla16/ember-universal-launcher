/**
 * Ember Official Website — Local Development & Preview Server
 * Builds apps/website/dist, serves clean and .html routes, and watches src/ for changes.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildWebsite, DIST_DIR } = require('./build');

const PORT = parseInt(process.env.PORT || '3080', 10);
const isPreviewOnly = process.argv.includes('--dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

// Always ensure dist is built before starting
if (!isPreviewOnly || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  buildWebsite();
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(urlObj.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(DIST_DIR, pathname);

  // Security check against directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // If directory, serve index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    // Support clean URLs like /download -> /download.html
    const htmlCandidate = filePath + '.html';
    if (fs.existsSync(htmlCandidate)) {
      filePath = htmlCandidate;
    }
  }

  if (!fs.existsSync(filePath)) {
    const notFoundPath = path.join(DIST_DIR, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(notFoundPath) ? fs.readFileSync(notFoundPath) : 'Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ember-website] Server running at http://127.0.0.1:${PORT}`);
});

if (!isPreviewOnly) {
  const watchDir = path.resolve(__dirname, '..', 'src');
  let debounceTimer = null;
  try {
    fs.watch(watchDir, { recursive: true }, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          buildWebsite();
        } catch (err) {
          console.error('[ember-website] Rebuild error:', err.message);
        }
      }, 120);
    });
  } catch {}
}

