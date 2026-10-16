import {initialState, reduce} from '../src/game/reducer';

const event = (eventId: string, letter: string, confidence = 0.9) =>
  ({type: 'PREDICTION', eventId, letter, confidence}) as const;

describe('game scoring', () => {
  const playing = () =>
    reduce(reduce(initialState(), {type: 'START_DEMO'}), {
      type: 'PHONE_JOINED',
    });

  it('scores a correct letter once and waits to advance', () => {
    const start = playing();
    const scored = reduce(start, event('evt_1234567890abcd', 'A'));
    expect(scored.score).toBe(1);
    expect(scored.letterIndex).toBe(0);
    expect(scored.feedback).toBe('correct');
    const duplicate = reduce(scored, event('evt_1234567890abcd', 'A'));
    expect(duplicate.score).toBe(1);
    const next = reduce(scored, {type: 'ADVANCE'});
    expect(next.letterIndex).toBe(1);
    expect(currentTarget(next)).toBe('B');
  });

  it('does not score a wrong, uncertain, or late prediction', () => {
    const start = playing();
    const wrong = reduce(start, event('evt_wrong_123456789', 'B'));
    expect(wrong.score).toBe(0);
    expect(wrong.feedback).toBe('incorrect');
    const unsure = reduce(wrong, event('evt_unsure_12345678', 'A', 0.4));
    expect(unsure.score).toBe(0);
    const celebrating = reduce(start, event('evt_1234567890abcd', 'A'));
    const ignored = reduce(celebrating, event('evt_second_12345678', 'A'));
    expect(ignored.score).toBe(1);
  });

  it('finishes after the fifth correct letter', () => {
    let state = playing();
    for (const letter of ['A', 'B', 'L', 'V', 'Y']) {
      state = reduce(state, event(`evt_${letter}_1234567890`, letter));
      state = reduce(state, {type: 'ADVANCE'});
    }
    expect(state.screen).toBe('complete');
    expect(state.score).toBe(5);
  });

  it('keeps the score when the phone reconnects', () => {
    let state = playing();
    state = reduce(state, event('evt_1234567890abcd', 'A'));
    state = reduce(state, {type: 'ADVANCE'});
    state = reduce(state, {type: 'DISCONNECTED'});
    state = reduce(state, {type: 'PHONE_JOINED'});
    expect(state.screen).toBe('practice');
    expect(state.score).toBe(1);
    expect(currentTarget(state)).toBe('B');
  });
});

function currentTarget(state: {letterIndex: number}) {
  return ['A', 'B', 'L', 'V', 'Y'][state.letterIndex];
}
