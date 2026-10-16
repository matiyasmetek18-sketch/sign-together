import assert from 'node:assert/strict';
import test from 'node:test';
import {createMemoryStore, createSessionService} from './session.mjs';

function serviceWithClock(start = 1_000_000) {
  let current = start;
  let ids = 0;
  let codes = 0;
  const service = createSessionService({
    store: createMemoryStore(),
    now: () => current,
    createId: () => `secret${String(ids++).padStart(12, '0')}`,
    createCode: () => `AB23C${codes++}`,
  });
  return {
    service,
    advance: (ms) => {
      current += ms;
    },
  };
}

const prediction = {
  eventId: 'evt_1234567890abcd',
  letter: 'A',
  confidence: 0.9,
};

test('pairs a phone to the television that created the code', async () => {
  const {service} = serviceWithClock();
  const created = await service.createTv('tv-1');
  assert.equal(created.ok, true);
  assert.equal(created.session.code, 'AB23C0');
  const joined = await service.joinPhone('phone-1', 'AB23C0');
  assert.equal(joined.ok, true);
  assert.equal(joined.send.filter((item) => item.message.type === 'session.ready').length, 2);
  const again = await service.joinPhone('phone-2', 'AB23C0');
  assert.equal(again.error, 'session-not-found');
});

test('expires pairing codes and isolates sessions', async () => {
  const {service, advance} = serviceWithClock();
  await service.createTv('tv-1');
  await service.createTv('tv-2');
  advance(11 * 60 * 1000);
  const expired = await service.joinPhone('phone-1', 'AB23C0');
  assert.equal(expired.error, 'code-expired');

  const {service: live} = serviceWithClock();
  await live.createTv('tv-a');
  await live.createTv('tv-b');
  await live.joinPhone('phone-a', 'AB23C0');
  await live.joinPhone('phone-b', 'AB23C1');
  const fromA = await live.prediction('phone-a', prediction);
  assert.equal(fromA.ok, true);
  assert.equal(fromA.session.tvConnectionId, 'tv-a');
  const spoof = await live.prediction('tv-a', {
    ...prediction,
    eventId: 'evt_other_abcdef1234',
  });
  assert.equal(spoof.error, 'not-authorized');
});

test('rejects duplicate predictions and allows resume after disconnect', async () => {
  const {service} = serviceWithClock();
  const created = await service.createTv('tv-1');
  const joined = await service.joinPhone('phone-1', created.session.code);
  const first = await service.prediction('phone-1', prediction);
  assert.equal(first.ok, true);
  const duplicate = await service.prediction('phone-1', prediction);
  assert.equal(duplicate.error, 'duplicate-event');

  await service.disconnect('phone-1');
  const resumed = await service.resume('phone-2', 'phone', joined.session.joinToken);
  assert.equal(resumed.ok, true);
  const after = await service.prediction('phone-2', {
    ...prediction,
    eventId: 'evt_1234567890abce',
  });
  assert.equal(after.ok, true);
  assert.equal(after.send[0].role, 'tv');

  const tvBack = await service.resume('tv-9', 'tv', created.session.sessionId);
  assert.equal(tvBack.ok, true);
  const denied = await service.resume('phone-3', 'phone', created.session.code ?? 'AB23C0');
  assert.equal(denied.ok, false);
});
