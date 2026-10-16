import assert from 'node:assert/strict';
import test from 'node:test';
import {MAX_MESSAGE_BYTES, parseClientMessage} from './protocol.mjs';

const eventId = 'evt_1234567890abcd';

test('accepts the session and prediction messages', () => {
  assert.equal(parseClientMessage(JSON.stringify({v: 1, type: 'session.create', role: 'tv'})).ok, true);
  assert.equal(
    parseClientMessage(JSON.stringify({v: 1, type: 'session.join', role: 'phone', code: 'AB23CD'})).ok,
    true,
  );
  const prediction = parseClientMessage(
    JSON.stringify({v: 1, type: 'prediction', eventId, letter: 'Y', confidence: 0.91}),
  );
  assert.equal(prediction.ok, true);
  assert.equal(prediction.message.letter, 'Y');
});

test('rejects malformed, oversized, and unauthorized shapes', () => {
  assert.equal(parseClientMessage('not-json').error, 'invalid-json');
  assert.equal(parseClientMessage(JSON.stringify({v: 2, type: 'ping'})).error, 'unsupported-version');
  assert.equal(
    parseClientMessage(JSON.stringify({v: 1, type: 'session.create', role: 'phone'})).error,
    'invalid-role',
  );
  assert.equal(
    parseClientMessage(JSON.stringify({v: 1, type: 'session.join', role: 'phone', code: 'O0I1AA'})).error,
    'invalid-code',
  );
  assert.equal(
    parseClientMessage(JSON.stringify({v: 1, type: 'prediction', eventId, letter: 'J', confidence: 1})).error,
    'unsupported-letter',
  );
  assert.equal(
    parseClientMessage(
      JSON.stringify({v: 1, type: 'prediction', eventId, letter: 'A', confidence: 1.2}),
    ).error,
    'invalid-confidence',
  );
  assert.equal(parseClientMessage(JSON.stringify({v: 1, type: 'prediction', eventId: 'short', letter: 'A', confidence: 1})).error, 'invalid-event');
  const bulky = JSON.stringify({v: 1, type: 'ping', extra: 'x'.repeat(MAX_MESSAGE_BYTES)});
  assert.equal(parseClientMessage(bulky).error, 'payload-too-large');
});
