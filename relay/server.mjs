import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {parseClientMessage, MAX_MESSAGE_BYTES} from '../shared/protocol.mjs';
import {createMemoryStore, createSessionService, dispatchClientMessage} from '../shared/session.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RATE_LIMIT = 8;

export async function startRelay(options = {}) {
  const port = options.port ?? 8787;
  const service = options.service ?? createSessionService({store: createMemoryStore(), now: options.now});
  const sockets = new Map();
  const server = http.createServer(serveStatic);
  const wss = new WebSocketServer({server, maxPayload: MAX_MESSAGE_BYTES});

  wss.on('connection', (socket) => {
    const connectionId = crypto.randomUUID();
    const hits = [];
    let violations = 0;
    sockets.set(connectionId, socket);

    socket.on('message', async (data, isBinary) => {
      if (isBinary || !allowMessage(hits)) {
        violations += 1;
        send(socket, {v: 1, type: 'error', code: 'rate-limited', message: 'Too many messages'});
        if (violations >= 3) {
          socket.close(1008, 'rate-limited');
        }
        return;
      }
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      const parsed = parseClientMessage(raw);
      if (!parsed.ok) {
        send(socket, {v: 1, type: 'error', code: parsed.error, message: parsed.error});
        return;
      }
      try {
        const result = await dispatchClientMessage(service, connectionId, parsed.message);
        deliver(result, connectionId, sockets);
        log('message', parsed.message.type);
      } catch (error) {
        log('failure', error instanceof Error ? error.name : 'error');
        send(socket, {v: 1, type: 'error', code: 'server-error', message: 'server-error'});
      }
    });

    socket.on('close', async () => {
      sockets.delete(connectionId);
      try {
        const result = await service.disconnect(connectionId);
        deliver(result, connectionId, sockets);
      } catch (error) {
        log('failure', error instanceof Error ? error.name : 'error');
      }
    });
  });

  await new Promise((resolve) => {
    server.listen(port, '0.0.0.0', resolve);
  });

  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  const pages = hostPages(boundPort);
  return {
    port: boundPort,
    url: `ws://127.0.0.1:${boundPort}`,
    page: `http://127.0.0.1:${boundPort}/`,
    pages,
    close: () =>
      new Promise((resolve, reject) => {
        wss.close();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function deliver(result, selfId, sockets) {
  for (const item of result.send ?? []) {
    const targetId =
      item.role === 'self'
        ? selfId
        : item.role === 'tv'
          ? result.session?.tvConnectionId
          : result.session?.phoneConnectionId;
    const socket = targetId ? sockets.get(targetId) : null;
    if (socket) {
      send(socket, item.message);
    }
  }
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function allowMessage(hits) {
  const current = Date.now();
  while (hits.length > 0 && current - hits[0] > 1000) {
    hits.shift();
  }
  if (hits.length >= RATE_LIMIT) {
    return false;
  }
  hits.push(current);
  return true;
}

function log(event, type) {
  console.log(JSON.stringify({service: 'local-relay', event, type}));
}

function serveStatic(request, response) {
  if (request.url === '/health') {
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(JSON.stringify({ok: true, mode: 'local-relay'}));
    return;
  }

  const requested = request.url === '/' ? '/phone/index.html' : request.url.split('?')[0];
  const allowed =
    requested === '/phone/index.html' ||
    requested === '/phone/app.js' ||
    /^\/shared\/[a-z]+\.mjs$/.test(requested);
  if (!allowed) {
    response.writeHead(404, {'content-type': 'text/plain'});
    response.end('Not found');
    return;
  }

  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const type = filePath.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : 'text/javascript; charset=utf-8';
    response.writeHead(200, {'content-type': type, 'cache-control': 'no-store'});
    response.end(body);
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
export function hostPages(port) {
  const hosts = new Set(['127.0.0.1']);
  let interfaces = {};
  try {
    interfaces = os.networkInterfaces();
  } catch {
    interfaces = {};
  }
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        hosts.add(entry.address);
      }
    }
  }
  return [...hosts].map((host) => ({
    page: `http://${host}:${port}/`,
    socket: `ws://${host}:${port}`,
  }));
}

if (isDirectRun) {
  startRelay().then((relay) => {
    console.log(JSON.stringify({service: 'local-relay', event: 'listening', pages: relay.pages}));
  });
}
