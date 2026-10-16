export const LETTERS = ['A', 'B', 'L', 'V', 'Y'] as const;
export type Letter = (typeof LETTERS)[number];
export type ScreenName = 'welcome' | 'pairing' | 'practice' | 'complete';
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'live'
  | 'disconnected'
  | 'error';

export const MIN_ACCEPT_CONFIDENCE = 0.72;
const MAX_SEEN_EVENTS = 100;

export interface GameState {
  screen: ScreenName;
  mode: 'live' | 'demo';
  connection: ConnectionState;
  code: string | null;
  sessionId: string | null;
  letterIndex: number;
  score: number;
  feedback: 'idle' | 'correct' | 'incorrect';
  phase: 'awaiting' | 'celebrating';
  lastLetter: string | null;
  status: string;
  seenEventIds: string[];
}

export type GameAction =
  | {type: 'START_LIVE'}
  | {type: 'START_DEMO'}
  | {type: 'SESSION_CREATED'; code: string; sessionId: string}
  | {type: 'PHONE_JOINED'}
  | {type: 'CONNECTION_ERROR'; message: string}
  | {type: 'DISCONNECTED'}
  | {type: 'PREDICTION'; eventId: string; letter: string; confidence: number}
  | {type: 'ADVANCE'}
  | {type: 'CANCEL'}
  | {type: 'RETRY'};

export function initialState(): GameState {
  return {
    screen: 'welcome',
    mode: 'live',
    connection: 'idle',
    code: null,
    sessionId: null,
    letterIndex: 0,
    score: 0,
    feedback: 'idle',
    phase: 'awaiting',
    lastLetter: null,
    status: 'Ready',
    seenEventIds: [],
  };
}

export function currentLetter(state: GameState): Letter {
  return LETTERS[Math.min(state.letterIndex, LETTERS.length - 1)];
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_LIVE':
      return {
        ...initialState(),
        screen: 'pairing',
        mode: 'live',
        connection: 'connecting',
        status: 'Connecting to the local relay…',
      };
    case 'START_DEMO':
      return {
        ...initialState(),
        screen: 'practice',
        mode: 'demo',
        connection: 'live',
        status: 'Demo round. Predictions are scripted on the TV.',
      };
    case 'SESSION_CREATED':
      if (state.screen !== 'pairing') {
        return state;
      }
      return {
        ...state,
        code: action.code,
        sessionId: action.sessionId,
        connection: 'waiting',
        status: 'Waiting for a phone to join.',
      };
    case 'PHONE_JOINED':
      if (state.screen === 'practice' || state.screen === 'complete') {
        return {...state, connection: 'live', status: 'Phone connected.'};
      }
      return {
        ...state,
        screen: 'practice',
        connection: 'live',
        letterIndex: 0,
        score: 0,
        feedback: 'idle',
        phase: 'awaiting',
        lastLetter: null,
        seenEventIds: [],
        status: 'Phone connected. Make the handshape for the letter.',
      };
    case 'CONNECTION_ERROR':
      return {
        ...state,
        connection: 'error',
        status: action.message,
      };
    case 'DISCONNECTED':
      if (state.screen === 'welcome') {
        return state;
      }
      return {
        ...state,
        connection: 'disconnected',
        status: 'The phone or relay disconnected.',
      };
    case 'PREDICTION':
      return applyPrediction(state, action);
    case 'ADVANCE':
      if (state.phase !== 'celebrating') {
        return state;
      }
      if (state.letterIndex >= LETTERS.length - 1) {
        return {
          ...state,
          screen: 'complete',
          phase: 'awaiting',
          feedback: 'idle',
          status: 'Practice complete.',
        };
      }
      return {
        ...state,
        letterIndex: state.letterIndex + 1,
        phase: 'awaiting',
        feedback: 'idle',
        lastLetter: null,
        status: 'Next letter.',
      };
    case 'RETRY':
      return {
        ...initialState(),
        screen: 'pairing',
        mode: 'live',
        connection: 'connecting',
        status: 'Starting a new pairing code…',
      };
    case 'CANCEL':
      return initialState();
    default:
      return state;
  }
}

function applyPrediction(
  state: GameState,
  action: {eventId: string; letter: string; confidence: number},
): GameState {
  if (state.screen !== 'practice' || state.connection !== 'live') {
    return state;
  }
  if (state.seenEventIds.includes(action.eventId)) {
    return state;
  }
  const seenEventIds = [...state.seenEventIds, action.eventId].slice(-MAX_SEEN_EVENTS);
  if (
    state.phase === 'celebrating' ||
    !Number.isFinite(action.confidence) ||
    action.confidence < MIN_ACCEPT_CONFIDENCE ||
    !isLetter(action.letter)
  ) {
    return {...state, seenEventIds};
  }
  if (action.letter === currentLetter(state)) {
    return {
      ...state,
      seenEventIds,
      score: state.score + 1,
      feedback: 'correct',
      phase: 'celebrating',
      lastLetter: action.letter,
      status: 'Correct.',
    };
  }
  return {
    ...state,
    seenEventIds,
    feedback: 'incorrect',
    lastLetter: action.letter,
    status: 'Not quite. Try that handshape again.',
  };
}

function isLetter(value: string): value is Letter {
  return (LETTERS as readonly string[]).includes(value);
}
