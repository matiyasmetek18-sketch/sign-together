import 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import * as React from 'react';
import {App} from '../src/App';
import {Transport, TransportHandlers} from '../src/transport/liveClient';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the welcome screen and a demo round', () => {
    const screen = render(<App autoplayDemo={false} />);
    expect(screen.getByText('Sign Together')).toBeTruthy();
    expect(screen.getByText('Start practice')).toBeTruthy();
    fireEvent.press(screen.getByTestId('button-demo'));
    expect(screen.getByTestId('screen-practice')).toBeTruthy();
    expect(screen.getByTestId('target-letter').props.children).toBe('A');
  });

  it('pairs, scores a correct letter, and ignores a duplicate', async () => {
    let handlers: TransportHandlers | null = null;
    const transport: Transport = {
      connect: (next) => {
        handlers = next;
      },
      close: () => undefined,
    };
    const screen = render(<App autoplayDemo={false} transportFactory={() => transport} />);
    fireEvent.press(screen.getByTestId('button-start'));
    expect(screen.getByTestId('screen-pairing')).toBeTruthy();
    await act(async () => {
      handlers?.onSessionCreated('AB23CD', 'secretsecretsecret12');
    });
    expect(screen.getByTestId('pairing-code').props.children).toBe('AB23CD');
    await act(async () => {
      handlers?.onPhoneJoined();
    });
    expect(screen.getByTestId('target-letter').props.children).toBe('A');
    await act(async () => {
      handlers?.onPrediction({
        eventId: 'evt_1234567890abcd',
        letter: 'A',
        confidence: 0.95,
      });
    });
    expect(screen.getByTestId('score').props.children).toEqual(['Score ', 1]);
    await act(async () => {
      handlers?.onPrediction({
        eventId: 'evt_1234567890abcd',
        letter: 'A',
        confidence: 0.95,
      });
    });
    expect(screen.getByTestId('score').props.children).toEqual(['Score ', 1]);
  });
});
