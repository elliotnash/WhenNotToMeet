import { type IncomingMessage, createServer } from 'node:http';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
// @ts-expect-error: untyped build output
import untypedHandler from './dist/server/server.js';

const handler = untypedHandler as { fetch: (request: Request) => Promise<Response> };

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const clientDir = join(rootDir, 'dist', 'client');
const port = Number(process.env.PORT ?? 3000);

// Serve built client assets; hashed files under /assets are immutable.
const serveStatic = sirv(clientDir, {
  etag: true,
  setHeaders: (res, pathname) => {
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
});

function toWebRequest(req: IncomingMessage): Request {
  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(url, {
    method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    // Required by Node/undici when streaming a request body.
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);
}

const server = createServer((req, res) => {
  serveStatic(req, res, async () => {
    try {
      const webResponse = await handler.fetch(toWebRequest(req));
      res.statusCode = webResponse.status;

      // Preserve multiple Set-Cookie headers, which Headers.forEach would collapse.
      const setCookies = webResponse.headers.getSetCookie?.() ?? [];
      webResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        res.setHeader(key, value);
      });
      if (setCookies.length) res.setHeader('set-cookie', setCookies);

      if (webResponse.body) {
        Readable.fromWeb(webResponse.body as never).pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
