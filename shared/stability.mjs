const DEFAULTS = {
  framesRequired: 4,
  minConfidence: 0.72,
  cooldownMs: 1200,
};

export function createStabilityGate(options = {}) {
  const framesRequired = options.framesRequired ?? DEFAULTS.framesRequired;
  const minConfidence = options.minConfidence ?? DEFAULTS.minConfidence;
  const cooldownMs = options.cooldownMs ?? DEFAULTS.cooldownMs;
  const createId = options.createId ?? (() => crypto.randomUUID());

  let window = [];
  let lastEmitAt = 0;
  let lastLetter = null;

  return {
    push(result, now) {
      const accepted =
        result &&
        typeof result.letter === 'string' &&
        Number.isFinite(result.confidence) &&
        result.confidence >= minConfidence;
      if (!accepted) {
        window = [];
        return null;
      }

      if (window.length > 0 && window[window.length - 1] !== result.letter) {
        window = [];
      }
      window.push(result.letter);
      if (window.length > framesRequired) {
        window = window.slice(-framesRequired);
      }
      if (window.length < framesRequired || window.some((letter) => letter !== result.letter)) {
        return null;
      }
      if (lastLetter === result.letter && now - lastEmitAt < cooldownMs) {
        return null;
      }

      lastEmitAt = now;
      lastLetter = result.letter;
      window = [];
      return {
        letter: result.letter,
        confidence: result.confidence,
        eventId: createId(),
        timestamp: now,
      };
    },
    reset() {
      window = [];
      lastEmitAt = 0;
      lastLetter = null;
    },
  };
}

export const STABILITY_DEFAULTS = DEFAULTS;
