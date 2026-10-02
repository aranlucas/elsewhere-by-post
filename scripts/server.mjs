import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)), process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4177), host = process.env.HOST || '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (request, response) => {
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-cache', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" };
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, headers); response.end('Method not allowed'); return; }
    const url = new URL(request.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    if (!process.argv.includes('--dist') && ['/sw.js', '/icon.svg', '/manifest.webmanifest'].includes(pathname)) pathname = '/public' + pathname;
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !['.html', '.js', '.css', '.svg', '.webmanifest'].includes(path.extname(file)) || !(await stat(file)).isFile()) throw new Error('Not found');
    const content = await readFile(file);
    response.writeHead(200, { ...headers, 'Content-Type': mime[path.extname(file)], 'Content-Length': content.length });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404, headers); response.end('Not found'); }
});
server.listen(port, host, () => process.stdout.write(`Elsewhere, by Post → http://${host}:${port}\n`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
