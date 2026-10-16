import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyLandmarks, synthesizeLetter} from './classifier.mjs';
import {SUPPORTED_LETTERS} from './letters.mjs';

test('classifies each supported static letter', () => {
  for (const letter of SUPPORTED_LETTERS) {
    const result = classifyLandmarks(synthesizeLetter(letter));
    assert.equal(result.reason, 'ok', `${letter} was ${result.reason}`);
    assert.equal(result.letter, letter);
    assert.ok(result.confidence >= 0.72, `${letter} confidence ${result.confidence}`);
  }
});

test('stays correct when the hand is scaled and moved', () => {
  for (const letter of SUPPORTED_LETTERS) {
    const moved = synthesizeLetter(letter, {
      scale: 0.22,
      translate: {x: 0.4, y: 0.55},
    });
    const result = classifyLandmarks(moved);
    assert.equal(result.letter, letter);
  }
});

test('tolerates small landmark noise', () => {
  for (const letter of SUPPORTED_LETTERS) {
    const noisy = synthesizeLetter(letter, {noise: 0.02});
    const result = classifyLandmarks(noisy);
    assert.equal(result.letter, letter, `${letter} drifted to ${result.letter}`);
  }
});

test('rejects a missing or partial hand', () => {
  assert.equal(classifyLandmarks(null).reason, 'no-hand');
  assert.equal(classifyLandmarks(synthesizeLetter('A').slice(0, 10)).reason, 'no-hand');
  const tiny = synthesizeLetter('B', {scale: 0.001});
  assert.equal(classifyLandmarks(tiny).reason, 'too-small');
});

test('rejects an ambiguous half-open hand and a pointing index', () => {
  const half = synthesizeLetter('B');
  for (const [mcp, tip] of [
    [5, 8],
    [9, 12],
    [13, 16],
    [17, 20],
    [2, 4],
  ]) {
    const origin = half[0];
    const base = half[mcp];
    const dx = base.x - origin.x;
    const dy = base.y - origin.y;
    half[tip] = {x: origin.x + dx * 1.55, y: origin.y + dy * 1.55, z: 0};
  }
  const ambiguous = classifyLandmarks(half);
  assert.equal(ambiguous.letter, null);
  assert.equal(ambiguous.reason, 'ambiguous');

  const pointing = synthesizeLetter('L');
  const thumbTip = pointing[4];
  const thumbMcp = pointing[2];
  pointing[4] = {
    x: thumbMcp.x + (thumbMcp.x - thumbTip.x) * 0.2,
    y: thumbMcp.y + (thumbMcp.y - thumbTip.y) * 0.2,
    z: 0,
  };
  const notL = classifyLandmarks(pointing);
  assert.equal(notL.letter, null);
});

test('does not treat motion letters as supported shapes', () => {
  assert.equal(SUPPORTED_LETTERS.includes('J'), false);
  assert.equal(SUPPORTED_LETTERS.includes('Z'), false);
});
