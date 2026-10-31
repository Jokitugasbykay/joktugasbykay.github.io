const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const ROOT = path.resolve(__dirname, '../../');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // Security guard against directory traversal
  if (pathname.includes('..')) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // Prevent serving protected folders directly
  if (/^\/(?:\.|legacy\/|supabase\/|tests\/)/i.test(pathname)) {
    res.writeHead(404);
    return res.end('Not found');
  }

  // Mock API endpoints for local frontend preview testing
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ status: 'ok', env: 'preview', timestamp: new Date().toISOString() }));
  }

  if (pathname === '/api/digital-store/products') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, products: [] }));
  }

  if (pathname === '/api/digital-store/auth-verify') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ authenticated: true, user: { id: 'admin', role: 'admin' } }));
  }

  let filePath = path.join(ROOT, pathname);

  // Directory handling: look for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath)) {
    // Try adding index.html if route has trailing slash or no extension
    const asDirIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(asDirIndex)) {
      filePath = asDirIndex;
    } else if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (pathname.endsWith('.__PAGE__.txt')) {
      // Resolve Next.js RSC payload directories e.g. /produk-digital/__next.produk-digital.__PAGE__.txt -> /produk-digital/__next.produk-digital/__PAGE__.txt
      const dirName = path.dirname(pathname);
      const fileName = path.basename(pathname);
      const subDir = fileName.replace(/\.__PAGE__\.txt$/, '');
      const rscCandidate = path.join(ROOT, dirName, subDir, '__PAGE__.txt');
      if (fs.existsSync(rscCandidate)) {
        filePath = rscCandidate;
      }
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback to 404 or SPA fallback
  const notFoundPath = path.join(ROOT, '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(notFoundPath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local Next.js preview server running at http://127.0.0.1:${PORT}`);
});
