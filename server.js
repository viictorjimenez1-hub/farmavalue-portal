/**
 * SERVIDOR DEL PORTAL — Con MongoDB para datos persistentes
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const PORT    = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

let portalData = {
  name: '', title: '', bio: '', avatar: '',
  email: '', phone: '', location: '', website: '',
  links: [], tools: []
};

// ── MongoDB ──────────────────────────────────────────
let collection = null;

async function connectDB() {
  if (!MONGODB_URI) {
    console.log('⚠️  Sin MONGODB_URI — usando datos en memoria');
    return;
  }
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('farmavalue');
    collection = db.collection('portal');
    // Cargar datos existentes
    const doc = await collection.findOne({ _id: 'main' });
    if (doc) {
      const { _id, ...data } = doc;
      portalData = { ...portalData, ...data };
    }
    console.log('✅  MongoDB conectado');
  } catch (e) {
    console.error('❌  MongoDB error:', e.message);
  }
}

async function dbLoad() {
  if (!collection) return portalData;
  try {
    const doc = await collection.findOne({ _id: 'main' });
    if (doc) {
      const { _id, ...data } = doc;
      portalData = { ...portalData, ...data };
    }
  } catch (e) { console.error('dbLoad error:', e.message); }
  return portalData;
}

async function dbSave(incoming) {
  portalData = { ...portalData, ...incoming };
  if (!collection) return true;
  try {
    await collection.replaceOne(
      { _id: 'main' },
      { _id: 'main', ...portalData },
      { upsert: true }
    );
    return true;
  } catch (e) {
    console.error('dbSave error:', e.message);
    return false;
  }
}

// ── HTTP ──────────────────────────────────────────────
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

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/api/data') {
    const data = await dbLoad();
    return sendJSON(res, 200, data);
  }

  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const incoming = JSON.parse(body);
        const ok = await dbSave(incoming);
        return sendJSON(res, ok ? 200 : 500, { ok });
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

// ── INICIO ────────────────────────────────────────────
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅  Portal corriendo en http://localhost:${PORT}\n`);
  });
});
