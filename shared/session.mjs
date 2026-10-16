import {randomInt} from 'node:crypto';
import {CODE_ALPHABET, CODE_LENGTH} from './protocol.mjs';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const MAX_SEEN_EVENTS = 100;

export function createMemoryStore() {
  const sessions = new Map();
  const codes = new Map();
  const tokens = new Map();
  const connections = new Map();

  return {
    async put(session) {
      sessions.set(session.sessionId, session);
      if (session.code) {
        codes.set(session.code, session.sessionId);
      }
      if (session.joinToken) {
        tokens.set(session.joinToken, session.sessionId);
      }
    },
    async get(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
    async getByCode(code) {
      const sessionId = codes.get(code);
      return sessionId ? sessions.get(sessionId) ?? null : null;
    },
    async findByJoinToken(token) {
      const sessionId = tokens.get(token);
      return sessionId ? sessions.get(sessionId) ?? null : null;
    },
    async getByConnection(connectionId) {
      const link = connections.get(connectionId);
      if (!link) {
        return null;
      }
      const session = sessions.get(link.sessionId);
      return session ? {session, role: link.role} : null;
    },
    async bind(connectionId, sessionId, role) {
      connections.set(connectionId, {sessionId, role});
    },
    async unbind(connectionId) {
      connections.delete(connectionId);
    },
    async dropCode(code) {
      codes.delete(code);
    },
    async remove(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        return;
      }
      if (session.code) {
        codes.delete(session.code);
      }
      if (session.tvConnectionId) {
        connections.delete(session.tvConnectionId);
      }
      if (session.phoneConnectionId) {
        connections.delete(session.phoneConnectionId);
      }
      if (session.joinToken) {
        tokens.delete(session.joinToken);
      }
      sessions.delete(sessionId);
    },
  };
}

export function createSessionService(options) {
  const store = options.store;
  const now = options.now ?? (() => Date.now());
  const createId = options.createId ?? (() => crypto.randomUUID().replaceAll('-', ''));
  const createCode = options.createCode ?? randomCode;

  return {
    async createTv(connectionId) {
      const createdAt = now();
      let code = createCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const existing = await store.getByCode(code);
        if (!existing) {
          break;
        }
        code = createCode();
      }
      const session = {
        sessionId: createId(),
        code,
        codeExpiresAt: createdAt + CODE_TTL_MS,
        expiresAt: createdAt + SESSION_TTL_MS,
        tvConnectionId: connectionId,
        phoneConnectionId: null,
        joinToken: null,
        seenEventIds: [],
        status: 'waiting',
      };
      await store.put(session);
      await store.bind(connectionId, session.sessionId, 'tv');
      return {
        ok: true,
        session,
        send: [
          {
            role: 'self',
            message: {
              v: 1,
              type: 'session.created',
              sessionId: session.sessionId,
              code: session.code,
              expiresAt: session.codeExpiresAt,
            },
          },
        ],
      };
    },

    async joinPhone(connectionId, code) {
      const session = await store.getByCode(code);
      const current = now();
      if (!session || session.status === 'closed' || session.expiresAt <= current) {
        return error('session-not-found');
      }
      if (session.codeExpiresAt <= current) {
        return error('code-expired');
      }
      if (session.phoneConnectionId) {
        return error('session-full');
      }
      session.phoneConnectionId = connectionId;
      session.joinToken = createId();
      session.status = 'live';
      const usedCode = session.code;
      session.code = null;
      session.codeExpiresAt = 0;
      await store.dropCode(usedCode);
      await store.put(session);
      await store.bind(connectionId, session.sessionId, 'phone');
      const ready = {v: 1, type: 'session.ready', sessionId: session.sessionId};
      return {
        ok: true,
        session,
        send: [
          {role: 'tv', message: ready},
          {role: 'phone', message: {...ready, joinToken: session.joinToken}},
        ],
      };
    },

    async resume(connectionId, role, secret) {
      const current = now();
      const session =
        role === 'tv' ? await store.get(secret) : await findByJoinToken(store, secret);
      if (!session || session.expiresAt <= current || session.status === 'closed') {
        return error('session-not-found');
      }
      if (role === 'phone' && session.joinToken !== secret) {
        return error('session-not-found');
      }
      const previous = role === 'tv' ? session.tvConnectionId : session.phoneConnectionId;
      if (previous && previous !== connectionId) {
        await store.unbind(previous);
      }
      if (role === 'tv') {
        session.tvConnectionId = connectionId;
      } else {
        session.phoneConnectionId = connectionId;
      }
      await store.put(session);
      await store.bind(connectionId, session.sessionId, role);
      const resumed = {
        v: 1,
        type: 'session.ready',
        sessionId: session.sessionId,
        resumed: true,
        phoneConnected: Boolean(session.phoneConnectionId),
        ...(role === 'phone' ? {joinToken: session.joinToken} : {code: session.code}),
      };
      return {ok: true, session, send: [{role: 'self', message: resumed}]};
    },

    async prediction(connectionId, prediction) {
      const link = await store.getByConnection(connectionId);
      if (!link || link.role !== 'phone') {
        return error('not-authorized');
      }
      const session = link.session;
      if (session.expiresAt <= now() || session.status !== 'live') {
        return error('session-not-found');
      }
      if (session.seenEventIds.includes(prediction.eventId)) {
        return error('duplicate-event');
      }
      session.seenEventIds = [...session.seenEventIds, prediction.eventId].slice(-MAX_SEEN_EVENTS);
      await store.put(session);
      if (!session.tvConnectionId) {
        return error('tv-disconnected');
      }
      return {
        ok: true,
        session,
        send: [
          {
            role: 'tv',
            message: {
              v: 1,
              type: 'prediction',
              eventId: prediction.eventId,
              letter: prediction.letter,
              confidence: prediction.confidence,
            },
          },
        ],
      };
    },

    async disconnect(connectionId) {
      const link = await store.getByConnection(connectionId);
      if (!link) {
        return {ok: true, send: []};
      }
      const session = link.session;
      if (link.role === 'tv' && session.tvConnectionId === connectionId) {
        session.tvConnectionId = null;
      }
      if (link.role === 'phone' && session.phoneConnectionId === connectionId) {
        session.phoneConnectionId = null;
      }
      await store.unbind(connectionId);
      await store.put(session);
      const notice = {v: 1, type: 'peer.disconnected', role: link.role};
      const peer = link.role === 'tv' ? 'phone' : 'tv';
      return {ok: true, session, send: [{role: peer, message: notice}]};
    },
  };
}

function randomCode() {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

async function findByJoinToken(store, secret) {
  if (typeof store.findByJoinToken === 'function') {
    return store.findByJoinToken(secret);
  }
  return null;
}

export async function dispatchClientMessage(service, connectionId, message) {
  switch (message.type) {
    case 'session.create':
      return service.createTv(connectionId);
    case 'session.join':
      return service.joinPhone(connectionId, message.code);
    case 'session.resume':
      return service.resume(connectionId, message.role, message.secret);
    case 'prediction':
      return service.prediction(connectionId, message);
    case 'ping':
      return {ok: true, send: [{role: 'self', message: {v: 1, type: 'pong'}}]};
    default:
      return error('unknown-type');
  }
}

function error(code) {
  return {
    ok: false,
    error: code,
    send: [{role: 'self', message: {v: 1, type: 'error', code, message: code}}],
  };
}
