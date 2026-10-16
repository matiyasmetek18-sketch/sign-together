import assert from 'node:assert/strict';
import test from 'node:test';
import {createMemoryStore, createSessionService} from '../../shared/session.mjs';
import {routeMessage} from './router.mjs';

function harness() {
  const sent = [];
  const service = createSessionService({
    store: createMemoryStore(),
    createId: (() => {
      let n = 0;
      return () => `secret${String(n++).padStart(12, '0')}`;
    })(),
    createCode: () => 'AB23CD',
  });
  const post = async (connectionId, message) => {
    sent.push({connectionId, message});
  };
  return {
    sent,
    route: (connectionId, body, route = '$default') =>
      routeMessage({requestContext: {connectionId, routeKey: route}, body}, {service, post}),
  };
}

test('lambda router creates, joins, and forwards one prediction', async () => {
  const {route, sent} = harness();
  assert.equal((await route('tv-1', '', '$connect')).statusCode, 200);
  await route('tv-1', JSON.stringify({v: 1, type: 'session.create', role: 'tv'}));
  const created = sent.find((item) => item.message.type === 'session.created');
  assert.equal(created.connectionId, 'tv-1');
  await route('phone-1', JSON.stringify({v: 1, type: 'session.join', role: 'phone', code: created.message.code}));
  await route(
    'phone-1',
    JSON.stringify({v: 1, type: 'prediction', eventId: 'evt_1234567890abcd', letter: 'Y', confidence: 0.9}),
  );
  const predictions = sent.filter((item) => item.message.type === 'prediction');
  assert.equal(predictions.length, 1);
  assert.equal(predictions[0].connectionId, 'tv-1');
  await route(
    'phone-1',
    JSON.stringify({v: 1, type: 'prediction', eventId: 'evt_1234567890abcd', letter: 'Y', confidence: 0.9}),
  );
  assert.equal(sent.filter((item) => item.message.type === 'prediction').length, 1);
});
