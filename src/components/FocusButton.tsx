import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors} from '../theme';

interface FocusButtonProps {
  label: string;
  onPress: () => void;
  preferred?: boolean;
  testID: string;
  variant?: 'primary' | 'secondary';
}

export const FocusButton = ({
  label,
  onPress,
  preferred = false,
  testID,
  variant = 'primary',
}: FocusButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      hasTVPreferredFocus={preferred}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        focused && styles.focused,
      ]}
      testID={testID}>
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 280,
    height: 76,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginRight: 20,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.line,
  },
  focused: {
    transform: [{scale: 1.06}],
    borderWidth: 4,
    borderColor: colors.text,
  },
  label: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  secondaryLabel: {
    color: colors.text,
  },
});
