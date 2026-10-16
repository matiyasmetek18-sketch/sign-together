import {relayUrl} from '../config';

export interface PredictionMessage {
  eventId: string;
  letter: string;
  confidence: number;
}

export interface TransportHandlers {
  onSessionCreated: (code: string, sessionId: string) => void;
  onPhoneJoined: () => void;
  onPrediction: (prediction: PredictionMessage) => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
}

export interface Transport {
  connect: (handlers: TransportHandlers) => void;
  close: () => void;
}

export function createLiveTransport(url: string = relayUrl()): Transport {
  let socket: WebSocket | null = null;
  let sessionId: string | null = null;
  let generation = 0;

  const connect = (handlers: TransportHandlers) => {
    generation += 1;
    const current = generation;
    socket?.close();
    let opened = false;
    socket = new WebSocket(url);
    socket.onopen = () => {
      opened = true;
      const payload = sessionId
        ? {v: 1, type: 'session.resume', role: 'tv', secret: sessionId}
        : {v: 1, type: 'session.create', role: 'tv'};
      socket?.send(JSON.stringify(payload));
    };
    socket.onmessage = (event: {data: string}) => {
      let message: {
        v?: number;
        type?: string;
        code?: string;
        sessionId?: string;
        eventId?: string;
        letter?: string;
        confidence?: number;
        message?: string;
      };
      try {
        message = JSON.parse(event.data);
      } catch {
        handlers.onError('The relay sent an unreadable message.');
        return;
      }
      if (!message || message.v !== 1 || typeof message.type !== 'string') {
        handlers.onError('The relay sent an unsupported message.');
        return;
      }
      if (message.type === 'session.created' && message.code && message.sessionId) {
        sessionId = message.sessionId;
        handlers.onSessionCreated(message.code, message.sessionId);
        return;
      }
      if (message.type === 'session.ready') {
        handlers.onPhoneJoined();
        return;
      }
      if (
        message.type === 'prediction' &&
        message.eventId &&
        message.letter &&
        typeof message.confidence === 'number'
      ) {
        handlers.onPrediction({
          eventId: message.eventId,
          letter: message.letter,
          confidence: message.confidence,
        });
        return;
      }
      if (message.type === 'peer.disconnected') {
        handlers.onDisconnected();
        return;
      }
      if (message.type === 'error') {
        handlers.onError(message.message ?? 'The relay rejected the session.');
      }
    };
    socket.onclose = () => {
      if (current !== generation) {
        return;
      }
      if (!opened) {
        handlers.onError('Could not reach the relay. Start it with npm run relay.');
        return;
      }
      handlers.onDisconnected();
    };
  };

  return {
    connect,
    close: () => {
      generation += 1;
      sessionId = null;
      socket?.close();
      socket = null;
    },
  };
}
