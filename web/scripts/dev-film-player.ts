import { open } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Plugin } from 'vite';

const assets = new Map<string, [file: string, type: string]>([
  ['/pokaz/', ['film/player.html', 'text/html; charset=utf-8']],
  ['/pokaz/index.html', ['film/player.html', 'text/html; charset=utf-8']],
  ['/materialy/Misja-AED-60s.mp4', ['deliverables/Misja-AED-60s.mp4', 'video/mp4']],
  ['/materialy/Misja-AED.pdf', ['deliverables/Misja-AED.pdf', 'application/pdf']],
  ['/materialy/plakat.jpg', ['presentation/assets/film-poster.jpg', 'image/jpeg']],
]);

function byteRange(header: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}

async function serveFile(req: IncomingMessage, res: ServerResponse, file: string, type: string) {
  // Keep the opened file and its metadata together if a new film is exported during a request.
  const handle = await open(file, 'r');
  try {
    const { size } = await handle.stat();
    const range = req.headers.range === undefined ? undefined : byteRange(req.headers.range, size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', type);
    if (range === null) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + size }).end();
      return;
    }
    if (range) {
      res.statusCode = 206;
      res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + size);
    }
    res.setHeader('Content-Length', range ? range.end - range.start + 1 : size);
    if (req.method === 'HEAD' || size === 0) {
      res.end();
      return;
    }
    await pipeline(handle.createReadStream(range ?? {}), res);
  } finally {
    await handle.close();
  }
}

export function devFilmPlayer(): Plugin {
  return {
    name: 'local-aed-film',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(server.config.base, (req, res, next) => {
        const path = req.url?.split('?', 1)[0] ?? '';
        if (path === '/pokaz') {
          res.writeHead(308, { Location: server.config.base + 'pokaz/' }).end();
          return;
        }
        const asset = assets.get(path);
        if (!asset) return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { Allow: 'GET, HEAD' }).end();
          return;
        }
        void serveFile(req, res, resolve(server.config.root, '..', asset[0]), asset[1]).catch(
          (error: NodeJS.ErrnoException) => {
            if (res.destroyed) return;
            if (error.code === 'ENOENT') res.writeHead(404).end();
            else next(error);
          },
        );
      });
    },
  };
}
