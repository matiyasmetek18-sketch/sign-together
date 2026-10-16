import assert from 'node:assert/strict';
import test from 'node:test';
import {startRelay} from './server.mjs';

async function openSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', () => reject(new Error('socket failed')), {once: true});
  });
  return socket;
}

function nextMessage(socket) {
  return new Promise((resolve) => {
    socket.addEventListener('message', (event) => resolve(JSON.parse(event.data)), {once: true});
  });
}

test('routes a prediction to the paired television only once', async () => {
  const relay = await startRelay({port: 0});
  const tv = await openSocket(relay.url);
  const phone = await openSocket(relay.url);
  const otherTv = await openSocket(relay.url);
  try {
    tv.send(JSON.stringify({v: 1, type: 'session.create', role: 'tv'}));
    const created = await nextMessage(tv);
    assert.equal(created.type, 'session.created');

    otherTv.send(JSON.stringify({v: 1, type: 'session.create', role: 'tv'}));
    const otherCreated = await nextMessage(otherTv);
    assert.notEqual(otherCreated.code, created.code);

    const joined = nextMessage(tv);
    const phoneReady = nextMessage(phone);
    phone.send(JSON.stringify({v: 1, type: 'session.join', role: 'phone', code: created.code}));
    assert.equal((await joined).type, 'session.ready');
    const ready = await phoneReady;
    assert.equal(ready.type, 'session.ready');

    const eventId = 'evt_1234567890abcd';
    const prediction = nextMessage(tv);
    phone.send(JSON.stringify({v: 1, type: 'prediction', eventId, letter: 'L', confidence: 0.93}));
    const forwarded = await prediction;
    assert.deepEqual(forwarded, {v: 1, type: 'prediction', eventId, letter: 'L', confidence: 0.93});

    phone.send(JSON.stringify({v: 1, type: 'prediction', eventId, letter: 'L', confidence: 0.93}));
    const duplicate = await nextMessage(phone);
    assert.equal(duplicate.code, 'duplicate-event');

    phone.close();
    const disconnected = await nextMessage(tv);
    assert.equal(disconnected.type, 'peer.disconnected');

    const resumed = await openSocket(relay.url);
    const resumeNotice = nextMessage(resumed);
    resumed.send(JSON.stringify({v: 1, type: 'session.resume', role: 'phone', secret: ready.joinToken}));
    assert.equal((await resumeNotice).type, 'session.ready');
    resumed.close();
  } finally {
    tv.close();
    phone.close();
    otherTv.close();
    await relay.close();
  }
});

test('serves the phone page and rejects a bad message', async () => {
  const relay = await startRelay({port: 0});
  try {
    const health = await fetch(`${relay.page}health`);
    assert.equal(health.status, 200);
    const page = await fetch(relay.page);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Sign Together/);
    const socket = await openSocket(relay.url);
    socket.send(JSON.stringify({v: 1, type: 'session.join', role: 'phone', code: 'BAD'}));
    const error = await nextMessage(socket);
    assert.equal(error.code, 'invalid-code');
    socket.close();
  } finally {
    await relay.close();
  }
});
