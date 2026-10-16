import {StyleSheet} from 'react-native';

export const colors = {
  background: '#07131F',
  card: '#10283B',
  text: '#F7FBFF',
  muted: '#B7C7D6',
  accent: '#FFB703',
  ink: '#1A1203',
  correct: '#2EC4B6',
  incorrect: '#FF6B6B',
  line: '#1E4663',
};

export const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 80,
    paddingVertical: 48,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 72,
    fontWeight: '800',
    marginTop: 8,
  },
  body: {
    color: colors.muted,
    fontSize: 28,
    lineHeight: 38,
    maxWidth: 920,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 36,
  },
});
