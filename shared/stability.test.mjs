import assert from 'node:assert/strict';
import test from 'node:test';
import {createStabilityGate} from './stability.mjs';

function gate() {
  let next = 0;
  return createStabilityGate({
    framesRequired: 3,
    minConfidence: 0.72,
    cooldownMs: 1000,
    createId: () => `event-${next++}`,
  });
}

test('emits only after stable confident frames', () => {
  const filter = gate();
  assert.equal(filter.push({letter: 'A', confidence: 0.9}, 0), null);
  assert.equal(filter.push({letter: 'A', confidence: 0.91}, 30), null);
  const emitted = filter.push({letter: 'A', confidence: 0.95}, 60);
  assert.equal(emitted.letter, 'A');
  assert.equal(emitted.eventId, 'event-0');
});

test('resets when the letter flickers', () => {
  const filter = gate();
  filter.push({letter: 'A', confidence: 0.9}, 0);
  filter.push({letter: 'B', confidence: 0.9}, 30);
  filter.push({letter: 'B', confidence: 0.9}, 60);
  assert.equal(filter.push({letter: 'B', confidence: 0.9}, 90).letter, 'B');
});

test('drops low-confidence frames and enforces cooldown', () => {
  const filter = gate();
  assert.equal(filter.push({letter: 'L', confidence: 0.4}, 0), null);
  filter.push({letter: 'V', confidence: 0.9}, 0);
  filter.push({letter: 'V', confidence: 0.9}, 10);
  const first = filter.push({letter: 'V', confidence: 0.9}, 20);
  assert.equal(first.letter, 'V');
  filter.push({letter: 'V', confidence: 0.9}, 100);
  filter.push({letter: 'V', confidence: 0.9}, 110);
  assert.equal(filter.push({letter: 'V', confidence: 0.9}, 120), null);
  const again = filter.push({letter: 'V', confidence: 0.9}, 1200);
  assert.equal(again.letter, 'V');
  assert.notEqual(again.eventId, first.eventId);
});
