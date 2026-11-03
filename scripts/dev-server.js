#!/usr/bin/env node
/**
 * 本地静态服务器（零依赖）
 * 用法：node scripts/dev-server.js [端口]
 * 默认 http://127.0.0.1:5173
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PORT = Number(process.argv[2] || process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const target = path.normalize(path.join(ROOT, decoded));
  if (!target.startsWith(ROOT)) return null;
  return target;
}

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  }, headers || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed');
  }

  let filePath = safePath(req.url === '/' ? '/index.html' : req.url);
  if (!filePath) return send(res, 400, 'Bad Request');

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        // 单页应用回退
        fs.readFile(path.join(ROOT, 'index.html'), (idxErr, html) => {
          if (idxErr) return send(res, 404, '404 Not Found');
          send(res, 200, html, { 'Content-Type': MIME['.html'] });
        });
        return;
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      send(res, 200, req.method === 'HEAD' ? '' : data, { 'Content-Type': type });
    });
  });
});

function listen(port, attempt) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 10) {
      listen(port + 1, attempt + 1);
    } else {
      console.error('启动失败：', err.message);
      process.exit(1);
    }
  });
  server.listen(port, HOST, () => {
    console.log('');
    console.log('  FitDaily 本地预览已启动');
    console.log('  ➜  http://' + HOST + ':' + port + '/');
    console.log('  按 Ctrl+C 停止');
    console.log('');
  });
}

listen(DEFAULT_PORT, 0);