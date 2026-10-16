import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FocusButton} from '../components/FocusButton';
import {currentLetter, GameState, LETTERS} from '../game/reducer';
import {colors, screenStyles} from '../theme';

interface PracticeScreenProps {
  state: GameState;
  onEnd: () => void;
  onReconnect: () => void;
  onNewCode: () => void;
}

export const PracticeScreen = ({state, onEnd, onReconnect, onNewCode}: PracticeScreenProps) => {
  const letter = currentLetter(state);
  const feedbackColor =
    state.feedback === 'correct'
      ? colors.correct
      : state.feedback === 'incorrect'
        ? colors.incorrect
        : colors.text;

  return (
    <View style={screenStyles.screen} testID="screen-practice">
      <View style={styles.top}>
        <Text style={styles.progress} testID="progress">
          Letter {state.letterIndex + 1} of {LETTERS.length}
        </Text>
        <Text style={styles.score} testID="score">
          Score {state.score}
        </Text>
      </View>
      <Text style={styles.letter} testID="target-letter">
        {letter}
      </Text>
      <Text style={styles.instruction}>
        Make the ASL fingerspelling handshape for {letter}. Hold it steady.
      </Text>
      <Text style={[styles.feedback, {color: feedbackColor}]} testID="feedback">
        {state.feedback === 'correct'
          ? 'Correct'
          : state.feedback === 'incorrect'
            ? `Phone sent ${state.lastLetter ?? 'a different letter'}`
            : state.mode === 'demo'
              ? 'Demo mode — scripted answers, not a live camera'
              : 'Waiting for the phone'}
      </Text>
      <Text style={styles.status}>{state.status}</Text>
      <View style={screenStyles.buttonRow}>
        {state.connection === 'disconnected' || state.connection === 'error' ? (
          <FocusButton
            label="Reconnect"
            onPress={onReconnect}
            preferred
            testID="button-reconnect"
          />
        ) : null}
        {state.connection === 'disconnected' || state.connection === 'error' ? (
          <FocusButton label="New code" onPress={onNewCode} testID="button-new-code" />
        ) : null}
        <FocusButton
          label="End practice"
          onPress={onEnd}
          preferred={state.connection === 'live'}
          testID="button-end"
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progress: {
    color: colors.muted,
    fontSize: 28,
  },
  score: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  letter: {
    color: colors.text,
    fontSize: 220,
    fontWeight: '800',
    lineHeight: 230,
    marginTop: 8,
  },
  instruction: {
    color: colors.text,
    fontSize: 32,
  },
  feedback: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 12,
  },
  status: {
    color: colors.muted,
    fontSize: 24,
    marginTop: 8,
  },
});
