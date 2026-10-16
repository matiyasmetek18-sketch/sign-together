import {SUPPORTED_LETTERS} from './letters.mjs';

/**
 * Deterministic fingerspelling classifier for five static letters.
 *
 * Features are scale- and rotation-invariant ratios of MediaPipe landmarks.
 * Motion letters J and Z are unsupported. Ambiguous shapes are rejected
 * instead of forced into the nearest letter.
 *
 * Landmark indexes follow the MediaPipe hand model (21 points).
 */

const TEMPLATES = {
  A: [0.02, 0.02, 0.02, 0.02, 0.05, 0.16],
  B: [0.98, 0.98, 0.98, 0.98, 0.05, 0.5],
  L: [0.98, 0.04, 0.04, 0.04, 0.82, 0.95],
  V: [0.98, 0.93, 0.04, 0.04, 0.05, 0.95],
  Y: [0.04, 0.04, 0.04, 0.98, 0.82, 0.16],
};

const WEIGHTS = [1, 1, 1, 1, 1.2, 0.65];

const MAX_BEST_DISTANCE = 0.92;
const MIN_MARGIN = 0.28;

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function openness(extensionRatio) {
  return clamp((extensionRatio - 1.18) / 0.72, 0, 1);
}

/**
 * @param {Array<{x:number,y:number,z?:number}>|null|undefined} landmarks
 */
export function inspectHand(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length !== 21) {
    return {present: false, reason: 'no-hand'};
  }
  for (const point of landmarks) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return {present: false, reason: 'invalid'};
    }
  }
  const palm = distance(landmarks[0], landmarks[9]);
  if (palm < 0.02) {
    return {present: false, reason: 'too-small'};
  }
  return {present: true, reason: 'ok', palm};
}

export function extractFeatures(landmarks) {
  const palm = Math.max(distance(landmarks[0], landmarks[9]), 1e-6);
  const extension = (mcpIndex, tipIndex) => {
    const mcp = distance(landmarks[0], landmarks[mcpIndex]);
    const tip = distance(landmarks[0], landmarks[tipIndex]);
    return tip / Math.max(mcp, 1e-6);
  };
  const spread = distance(landmarks[8], landmarks[12]) / palm;
  return [
    openness(extension(5, 8)),
    openness(extension(9, 12)),
    openness(extension(13, 16)),
    openness(extension(17, 20)),
    openness(extension(2, 4)),
    clamp(spread / 1.15, 0, 1),
  ];
}

function weightedDistance(features, template) {
  let sum = 0;
  for (let i = 0; i < WEIGHTS.length; i += 1) {
    const delta = (features[i] - template[i]) * WEIGHTS[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export function classifyLandmarks(landmarks) {
  const inspection = inspectHand(landmarks);
  if (!inspection.present) {
    return {
      letter: null,
      confidence: 0,
      features: null,
      distances: {},
      reason: inspection.reason,
    };
  }

  const features = extractFeatures(landmarks);
  const distances = {};
  let bestLetter = null;
  let best = Infinity;
  let second = Infinity;
  for (const letter of SUPPORTED_LETTERS) {
    const score = weightedDistance(features, TEMPLATES[letter]);
    distances[letter] = score;
    if (score < best) {
      second = best;
      best = score;
      bestLetter = letter;
    } else if (score < second) {
      second = score;
    }
  }

  const margin = second - best;
  if (best > MAX_BEST_DISTANCE || margin < MIN_MARGIN) {
    return {
      letter: null,
      confidence: 0,
      features,
      distances,
      reason: 'ambiguous',
    };
  }

  const confidence = clamp((margin - MIN_MARGIN) / 0.85, 0, 1) * clamp(1 - best / 1.15, 0, 1);
  return {
    letter: bestLetter,
    confidence: Number(confidence.toFixed(3)),
    features,
    distances,
    reason: 'ok',
  };
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1]) || 1;
  return [vector[0] / length, vector[1] / length];
}

function add(point, vector) {
  return {x: point.x + vector[0], y: point.y + vector[1], z: 0};
}

function mul(vector, scalar) {
  return [vector[0] * scalar, vector[1] * scalar];
}

/**
 * Builds an idealized 21-point hand for tests and threshold tuning.
 * Coordinates are in palm units with the wrist at the origin.
 */
export function synthesizeLetter(letter, options = {}) {
  const shapes = {
    A: {index: 'closed', middle: 'closed', ring: 'closed', pinky: 'closed', thumb: 'alongside'},
    B: {index: 'open', middle: 'open', ring: 'open', pinky: 'open', thumb: 'tucked', spread: 'together'},
    L: {index: 'open', middle: 'closed', ring: 'closed', pinky: 'closed', thumb: 'out'},
    V: {index: 'open', middle: 'open', ring: 'closed', pinky: 'closed', thumb: 'tucked', spread: 'wide'},
    Y: {index: 'closed', middle: 'closed', ring: 'closed', pinky: 'open', thumb: 'out'},
  };
  const shape = shapes[letter];
  if (!shape) {
    throw new Error(`Cannot synthesize unsupported letter ${letter}`);
  }

  const mcps = {
    thumb: [-0.46, 0.3],
    index: [-0.28, 0.94],
    middle: [0.02, 1],
    ring: [0.3, 0.93],
    pinky: [0.52, 0.75],
  };
  const dirs = {
    index: normalize(mcps.index),
    middle: normalize(mcps.middle),
    ring: normalize(mcps.ring),
    pinky: normalize(mcps.pinky),
  };
  if (shape.spread === 'wide') {
    dirs.index = normalize([-0.62, 1]);
    dirs.middle = normalize([0.62, 1]);
  }

  const landmarks = Array.from({length: 21}, () => ({x: 0, y: 0, z: 0}));
  placeFinger(landmarks, [1, 2, 3, 4], mcps.thumb, thumbDirection(shape.thumb), shape.thumb);
  placeFinger(landmarks, [5, 6, 7, 8], mcps.index, dirs.index, shape.index);
  placeFinger(landmarks, [9, 10, 11, 12], mcps.middle, dirs.middle, shape.middle);
  placeFinger(landmarks, [13, 14, 15, 16], mcps.ring, dirs.ring, shape.ring);
  placeFinger(landmarks, [17, 18, 19, 20], mcps.pinky, dirs.pinky, shape.pinky);

  const scale = options.scale ?? 1;
  const translate = options.translate ?? {x: 0, y: 0};
  const noise = options.noise ?? 0;
  return landmarks.map((point, index) => ({
    x: point.x * scale + translate.x + noiseAmount(noise, index, 1),
    y: point.y * scale + translate.y + noiseAmount(noise, index, 2),
    z: 0,
  }));
}

function noiseAmount(noise, index, salt) {
  if (!noise) {
    return 0;
  }
  const wave = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  const unit = wave - Math.floor(wave);
  return (unit * 2 - 1) * noise;
}

function thumbDirection(mode) {
  if (mode === 'out') {
    return normalize([-1, 0.2]);
  }
  if (mode === 'alongside') {
    return normalize([-0.15, 0.9]);
  }
  return normalize([-0.2, 0.4]);
}

function placeFinger(landmarks, indexes, mcp, direction, mode) {
  const origin = {x: mcp[0], y: mcp[1], z: 0};
  landmarks[indexes[0]] = origin;
  if (mode === 'open' || mode === 'out') {
    landmarks[indexes[1]] = add(origin, mul(direction, 0.28));
    landmarks[indexes[2]] = add(origin, mul(direction, 0.56));
    landmarks[indexes[3]] = add(origin, mul(direction, 0.92));
    return;
  }
  if (mode === 'alongside') {
    landmarks[indexes[1]] = add(origin, [0.02, 0.12]);
    landmarks[indexes[2]] = add(origin, [0.08, 0.18]);
    landmarks[indexes[3]] = add(origin, [0.12, 0.16]);
    return;
  }
  const back = normalize([-origin.x, -origin.y]);
  landmarks[indexes[1]] = add(origin, mul(back, 0.12));
  landmarks[indexes[2]] = add(origin, mul(back, 0.26));
  landmarks[indexes[3]] = add(origin, mul(back, 0.42));
}

export const CLASSIFIER_LIMITS = {
  letters: SUPPORTED_LETTERS,
  excludedMotionLetters: ['J', 'Z'],
  maxBestDistance: MAX_BEST_DISTANCE,
  minMargin: MIN_MARGIN,
  palmMustFaceCamera: true,
};
