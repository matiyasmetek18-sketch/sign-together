import {currentLetter, initialState, reduce} from '../src/game/reducer.ts';

/**
 * Terminal stand-in for the Fire TV app. It uses the same reducer as the Vega
 * UI. It is not the Fire TV application.
 */
export function createConsoleGame() {
  let state = reduce(initialState(), {type: 'START_LIVE'});

  return {
    get state() {
      return state;
    },
    apply(message) {
      if (message.type === 'session.created') {
        state = reduce(state, {
          type: 'SESSION_CREATED',
          code: message.code,
          sessionId: message.sessionId,
        });
      } else if (message.type === 'session.ready') {
        state = reduce(state, {type: 'PHONE_JOINED'});
      } else if (message.type === 'prediction') {
        state = reduce(state, {
          type: 'PREDICTION',
          eventId: message.eventId,
          letter: message.letter,
          confidence: message.confidence,
        });
        if (state.phase === 'celebrating') {
          state = reduce(state, {type: 'ADVANCE'});
        }
      } else if (message.type === 'peer.disconnected') {
        state = reduce(state, {type: 'DISCONNECTED'});
      } else if (message.type === 'error') {
        state = reduce(state, {
          type: 'CONNECTION_ERROR',
          message: message.message ?? message.code ?? 'error',
        });
      }
      return state;
    },
    line() {
      if (state.screen === 'pairing') {
        return `Code ${state.code ?? '------'}  ${state.status}`;
      }
      if (state.screen === 'practice') {
        return `Show ${currentLetter(state)}   score ${state.score}/5   ${state.status}`;
      }
      if (state.screen === 'complete') {
        return `Round complete. Score ${state.score}/5`;
      }
      return state.status;
    },
  };
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('tv-console.mjs');
if (isDirectRun) {
  const url = process.env.SIGN_TOGETHER_RELAY ?? 'ws://127.0.0.1:8787';
  const game = createConsoleGame();
  const socket = new WebSocket(url);
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({v: 1, type: 'session.create', role: 'tv'}));
  });
  socket.addEventListener('message', (event) => {
    game.apply(JSON.parse(event.data));
    console.log(game.line());
  });
  socket.addEventListener('error', () => {
    console.error(`Could not reach ${url}. Start it with npm run relay.`);
    process.exitCode = 1;
  });
}
