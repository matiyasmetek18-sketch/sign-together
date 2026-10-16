import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FocusButton} from '../components/FocusButton';
import {LETTERS} from '../game/reducer';
import {colors, screenStyles} from '../theme';

interface WelcomeScreenProps {
  onStart: () => void;
  onDemo: () => void;
}

export const WelcomeScreen = ({onStart, onDemo}: WelcomeScreenProps) => {
  return (
    <View style={screenStyles.screen} testID="screen-welcome">
      <Text style={screenStyles.eyebrow}>FIRE TV  ·  FAMILY PRACTICE</Text>
      <Text style={screenStyles.title}>Sign Together</Text>
      <Text style={screenStyles.body}>
        Learn five American Sign Language fingerspelling letters with someone
        beside you. The TV shows the letter. A phone camera reads the handshape.
      </Text>
      <View style={styles.letters}>
        {LETTERS.map((letter) => (
          <View key={letter} style={styles.chip}>
            <Text style={styles.chipText}>{letter}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Static letters only. This is not a full ASL translator, and it does not
        read sentences or the motion letters J and Z.
      </Text>
      <View style={screenStyles.buttonRow}>
        <FocusButton
          label="Start practice"
          onPress={onStart}
          preferred
          testID="button-start"
        />
        <FocusButton
          label="Try a demo round"
          onPress={onDemo}
          testID="button-demo"
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  letters: {
    flexDirection: 'row',
    marginTop: 36,
  },
  chip: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  chipText: {
    color: colors.accent,
    fontSize: 42,
    fontWeight: '800',
  },
  note: {
    color: colors.muted,
    fontSize: 22,
    marginTop: 28,
    maxWidth: 980,
  },
});
