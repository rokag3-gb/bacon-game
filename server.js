// 로컬에서 띄워보기 위한 정적 파일 서버. 배포는 GitHub Pages라 빌드 단계가 없다.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';

const ROOT = import.meta.dirname;
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';

  // 루트 밖으로 나가는 경로는 막는다
  const full = join(ROOT, normalize(path));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const body = await readFile(full);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('없는 파일');
  }
}).listen(PORT, () => {
  console.log(`\n  베이컨 먹방\n`);
  console.log(`  이 컴퓨터    http://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces())) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) {
        console.log(`  같은 와이파이의 폰  http://${n.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
