import React, {useEffect, useRef, useState} from 'react';
import * as ReactNative from 'react-native';
import {GameAction, GameState, initialState, reduce} from './game/reducer';
import {CompletionScreen} from './screens/CompletionScreen';
import {PairingScreen} from './screens/PairingScreen';
import {PracticeScreen} from './screens/PracticeScreen';
import {WelcomeScreen} from './screens/WelcomeScreen';
import {createLiveTransport, Transport} from './transport/liveClient';

interface AppProps {
  transportFactory?: () => Transport;
  autoplayDemo?: boolean;
}

export const App = ({transportFactory, autoplayDemo = true}: AppProps) => {
  const [state, setState] = useState<GameState>(initialState);
  const transportRef = useRef<Transport | null>(null);
  const demoEvent = useRef(0);

  const dispatch = (action: GameAction) => {
    setState((current) => reduce(current, action));
  };

  const handlers = {
    onSessionCreated: (code: string, sessionId: string) =>
      dispatch({type: 'SESSION_CREATED', code, sessionId}),
    onPhoneJoined: () => dispatch({type: 'PHONE_JOINED'}),
    onPrediction: (prediction: {eventId: string; letter: string; confidence: number}) =>
      dispatch({type: 'PREDICTION', ...prediction}),
    onDisconnected: () => dispatch({type: 'DISCONNECTED'}),
    onError: (message: string) => dispatch({type: 'CONNECTION_ERROR', message}),
  };

  const openTransport = () => {
    transportRef.current?.close();
    const transport = (transportFactory ?? createLiveTransport)();
    transportRef.current = transport;
    transport.connect(handlers);
  };

  useEffect(() => {
    const backHandler = ReactNative.BackHandler;
    if (!backHandler?.addEventListener) {
      return undefined;
    }
    const subscription = backHandler.addEventListener('hardwareBackPress', () => {
      if (state.screen === 'welcome') {
        return false;
      }
      transportRef.current?.close();
      dispatch({type: 'CANCEL'});
      return true;
    });
    return () => subscription.remove();
  }, [state.screen]);

  useEffect(() => {
    if (state.phase !== 'celebrating') {
      return undefined;
    }
    const timer = setTimeout(() => dispatch({type: 'ADVANCE'}), 900);
    return () => clearTimeout(timer);
  }, [state.phase, state.letterIndex]);

  useEffect(() => {
    if (!autoplayDemo || state.mode !== 'demo' || state.screen !== 'practice' || state.phase !== 'awaiting') {
      return undefined;
    }
    const timer = setTimeout(() => {
      demoEvent.current += 1;
      dispatch({
        type: 'PREDICTION',
        eventId: `demo-event-${demoEvent.current}`,
        letter: ['A', 'B', 'L', 'V', 'Y'][state.letterIndex],
        confidence: 0.99,
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [autoplayDemo, state.mode, state.screen, state.phase, state.letterIndex]);

  useEffect(() => {
    return () => transportRef.current?.close();
  }, []);

  if (state.screen === 'pairing') {
    return (
      <PairingScreen
        code={state.code}
        onCancel={() => {
          transportRef.current?.close();
          dispatch({type: 'CANCEL'});
        }}
        onRetry={() => {
          dispatch({type: 'RETRY'});
          openTransport();
        }}
        status={state.status}
      />
    );
  }

  if (state.screen === 'practice') {
    return (
      <PracticeScreen
        onEnd={() => {
          transportRef.current?.close();
          dispatch({type: 'CANCEL'});
        }}
        onNewCode={() => {
          dispatch({type: 'RETRY'});
          openTransport();
        }}
        onReconnect={() => {
          if (transportRef.current) {
            transportRef.current.connect(handlers);
            return;
          }
          openTransport();
        }}
        state={state}
      />
    );
  }

  if (state.screen === 'complete') {
    return (
      <CompletionScreen
        onHome={() => dispatch({type: 'CANCEL'})}
        onReplay={() => {
          if (state.mode === 'demo') {
            dispatch({type: 'START_DEMO'});
            return;
          }
          dispatch({type: 'RETRY'});
          openTransport();
        }}
        score={state.score}
      />
    );
  }

  return (
    <WelcomeScreen
      onDemo={() => dispatch({type: 'START_DEMO'})}
      onStart={() => {
        dispatch({type: 'START_LIVE'});
        openTransport();
      }}
    />
  );
};
