import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FocusButton} from '../components/FocusButton';
import {LETTERS} from '../game/reducer';
import {screenStyles} from '../theme';

interface CompletionScreenProps {
  score: number;
  onReplay: () => void;
  onHome: () => void;
}

export const CompletionScreen = ({score, onReplay, onHome}: CompletionScreenProps) => {
  const message =
    score === LETTERS.length
      ? 'You matched every letter in this round.'
      : score >= 3
        ? 'Nice practice. Replay the letters that slipped.'
        : 'Good start. The same five letters are ready again.';

  return (
    <View style={screenStyles.screen} testID="screen-complete">
      <Text style={screenStyles.eyebrow}>ROUND COMPLETE</Text>
      <Text style={styles.score} testID="final-score">
        {score} / {LETTERS.length}
      </Text>
      <Text style={screenStyles.body}>{message}</Text>
      <View style={screenStyles.buttonRow}>
        <FocusButton label="Play again" onPress={onReplay} preferred testID="button-replay" />
        <FocusButton label="Home" onPress={onHome} testID="button-home" variant="secondary" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  score: {
    color: '#F7FBFF',
    fontSize: 120,
    fontWeight: '800',
    marginTop: 12,
  },
});
