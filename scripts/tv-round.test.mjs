import assert from 'node:assert/strict';
import test from 'node:test';
import {startRelay} from '../relay/server.mjs';
import {createConsoleGame} from './tv-console.mjs';

function nextMessage(socket) {
  return new Promise((resolve) => {
    socket.addEventListener('message', (event) => resolve(JSON.parse(event.data)), {once: true});
  });
}

test('a phone letter scores only against the letter on the TV', async () => {
  const relay = await startRelay({port: 0});
  const tv = new WebSocket(relay.url);
  const phone = new WebSocket(relay.url);
  const game = createConsoleGame();
  await Promise.all([opened(tv), opened(phone)]);
  try {
    const createdNotice = nextMessage(tv);
    tv.send(JSON.stringify({v: 1, type: 'session.create', role: 'tv'}));
    const created = await createdNotice;
    game.apply(created);
    assert.equal(game.state.code, created.code);

    const readyNotice = nextMessage(tv);
    phone.send(JSON.stringify({v: 1, type: 'session.join', role: 'phone', code: created.code}));
    game.apply(await readyNotice);
    assert.equal(game.line().startsWith('Show A'), true);

    const first = nextMessage(tv);
    phone.send(JSON.stringify({
      v: 1,
      type: 'prediction',
      eventId: 'evt_round_a_000001',
      letter: 'A',
      confidence: 0.95,
    }));
    game.apply(await first);
    assert.equal(game.state.score, 1);
    assert.equal(game.line().startsWith('Show B'), true);

    phone.send(JSON.stringify({
      v: 1,
      type: 'prediction',
      eventId: 'evt_round_a_000001',
      letter: 'A',
      confidence: 0.95,
    }));
    const duplicate = await nextMessage(phone);
    assert.equal(duplicate.code, 'duplicate-event');
    assert.equal(game.state.score, 1);

    const mismatch = nextMessage(tv);
    phone.send(JSON.stringify({
      v: 1,
      type: 'prediction',
      eventId: 'evt_round_a_000002',
      letter: 'A',
      confidence: 0.95,
    }));
    game.apply(await mismatch);
    assert.equal(game.state.score, 1);
    assert.match(game.line(), /Show B/);
  } finally {
    tv.close();
    phone.close();
    await relay.close();
  }
});

function opened(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', () => reject(new Error('socket failed')), {once: true});
  });
}
