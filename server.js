/**
 * SERVIDOR DEL PORTAL — Compatible con Render.com
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const PORT    = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'portal_data.json');

// Crear archivo de datos si no existe
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    name: '', title: '', bio: '', avatar: '',
    email: '', phone: '', location: '', website: '',
    links: [], tools: []
  }, null, 2));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/api/data') {
    try {
      const raw  = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      return sendJSON(res, 200, data);
    } catch (e) {
      return sendJSON(res, 500, { error: 'Error leyendo datos' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        let current = {};
        try { current = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){}
        const merged = { ...current, ...incoming };
        fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2));
        return sendJSON(res, 200, { ok: true });
      } catch (e) {
        return sendJSON(res, 400, { error: 'JSON inválido' });
      }
    });
    return;
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') { res.writeHead(404); return res.end('No encontrado'); }
      res.writeHead(500); return res.end('Error del servidor');
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  Portal corriendo en http://localhost:${PORT}\n`);
});
