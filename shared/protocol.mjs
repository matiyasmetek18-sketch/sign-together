import {SUPPORTED_LETTERS} from './letters.mjs';

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 1024;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

const EVENT_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function parseClientMessage(raw) {
  if (typeof raw !== 'string') {
    return fail('invalid-payload');
  }
  if (byteLength(raw) > MAX_MESSAGE_BYTES) {
    return fail('payload-too-large');
  }
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return fail('invalid-json');
  }
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return fail('invalid-payload');
  }
  if (message.v !== PROTOCOL_VERSION) {
    return fail('unsupported-version');
  }

  switch (message.type) {
    case 'session.create':
      if (message.role !== 'tv') {
        return fail('invalid-role');
      }
      return ok({v: 1, type: 'session.create', role: 'tv'});
    case 'session.join':
      if (message.role !== 'phone') {
        return fail('invalid-role');
      }
      if (!isPairingCode(message.code)) {
        return fail('invalid-code');
      }
      return ok({v: 1, type: 'session.join', role: 'phone', code: message.code});
    case 'session.resume':
      if (message.role !== 'tv' && message.role !== 'phone') {
        return fail('invalid-role');
      }
      if (!isSecret(message.secret)) {
        return fail('invalid-secret');
      }
      return ok({
        v: 1,
        type: 'session.resume',
        role: message.role,
        secret: message.secret,
      });
    case 'prediction':
      if (!EVENT_ID.test(message.eventId ?? '')) {
        return fail('invalid-event');
      }
      if (!SUPPORTED_LETTERS.includes(message.letter)) {
        return fail('unsupported-letter');
      }
      if (!isConfidence(message.confidence)) {
        return fail('invalid-confidence');
      }
      return ok({
        v: 1,
        type: 'prediction',
        eventId: message.eventId,
        letter: message.letter,
        confidence: message.confidence,
      });
    case 'ping':
      return ok({v: 1, type: 'ping'});
    default:
      return fail('unknown-type');
  }
}

export function parseServerMessage(raw) {
  if (typeof raw !== 'string') {
    return fail('invalid-payload');
  }
  if (byteLength(raw) > MAX_MESSAGE_BYTES) {
    return fail('payload-too-large');
  }
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return fail('invalid-json');
  }
  if (!message || typeof message !== 'object' || message.v !== 1) {
    return fail('invalid-payload');
  }
  switch (message.type) {
    case 'session.created':
      if (!isSecret(message.sessionId) || !isPairingCode(message.code)) {
        return fail('invalid-payload');
      }
      return ok(message);
    case 'session.ready':
    case 'peer.disconnected':
    case 'session.ended':
    case 'pong':
      return ok(message);
    case 'prediction':
      if (!SUPPORTED_LETTERS.includes(message.letter) || !isConfidence(message.confidence)) {
        return fail('invalid-payload');
      }
      if (!EVENT_ID.test(message.eventId ?? '')) {
        return fail('invalid-payload');
      }
      return ok(message);
    case 'error':
      if (typeof message.code !== 'string') {
        return fail('invalid-payload');
      }
      return ok(message);
    default:
      return fail('unknown-type');
  }
}

export function isPairingCode(value) {
  if (typeof value !== 'string' || value.length !== CODE_LENGTH) {
    return false;
  }
  return [...value].every((character) => CODE_ALPHABET.includes(character));
}

export function isConfidence(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isSecret(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(value);
}

function ok(message) {
  return {ok: true, message};
}

function fail(error) {
  return {ok: false, error};
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}
