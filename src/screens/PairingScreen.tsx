import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FocusButton} from '../components/FocusButton';
import {PHONE_PAGE_URL} from '../config';
import {colors, screenStyles} from '../theme';

interface PairingScreenProps {
  code: string | null;
  status: string;
  onRetry: () => void;
  onCancel: () => void;
}

export const PairingScreen = ({code, status, onRetry, onCancel}: PairingScreenProps) => {
  return (
    <View style={screenStyles.screen} testID="screen-pairing">
      <Text style={screenStyles.eyebrow}>PAIR A PHONE</Text>
      <Text style={styles.code} testID="pairing-code">
        {code ?? '------'}
      </Text>
      <Text style={styles.status} testID="pairing-status">
        {status}
      </Text>
      <Text style={screenStyles.body}>
        On a phone, open {PHONE_PAGE_URL} and enter this code. The code expires
        in 10 minutes and can be used once.
      </Text>
      <Text style={styles.steps}>
        1. Open the companion page.{'\n'}
        2. Enter the code.{'\n'}
        3. Allow the camera and make the handshape.
      </Text>
      <View style={screenStyles.buttonRow}>
        <FocusButton label="New code" onPress={onRetry} preferred testID="button-retry" />
        <FocusButton
          label="Cancel"
          onPress={onCancel}
          testID="button-cancel"
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  code: {
    color: colors.accent,
    fontSize: 108,
    fontWeight: '800',
    letterSpacing: 12,
    marginTop: 12,
  },
  status: {
    color: colors.text,
    fontSize: 30,
    marginTop: 8,
  },
  steps: {
    color: colors.muted,
    fontSize: 26,
    lineHeight: 38,
    marginTop: 20,
  },
});
