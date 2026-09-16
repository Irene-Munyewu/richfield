import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { RichfieldLogo } from './RichfieldLogo';

const TAGLINE = ['Know your strength.', 'Close your gaps.', 'Get ahead.'];

/**
 * One-time animated brand intro shown on cold start, before the auth check
 * resolves. Purely visual — auth/session loading happens in parallel behind
 * it, so it never adds real wait time, it just gives the app a considered
 * "arrival" moment instead of popping straight to a spinner or the sign-in
 * form. Calls onFinish once the sequence completes so the caller can unmount
 * it and reveal the real app underneath.
 */
export function SplashIntro({ onFinish }: { onFinish: () => void }) {
  const bgFade = useRef(new Animated.Value(1)).current;
  const markScale = useRef(new Animated.Value(0.82)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const lineAnims = useRef(TAGLINE.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // Mark scales/fades in with a soft overshoot.
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(markScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      // A ring pulses out from behind the mark.
      Animated.timing(ring, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Tagline lines stagger in underneath.
      Animated.stagger(
        160,
        lineAnims.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
      Animated.delay(500),
      // Whole overlay fades out to reveal the app underneath.
      Animated.timing(bgFade, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => sequence.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: bgFade }]}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.35, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.1] }) }],
          },
        ]}
      />

      <Animated.View
        style={{
          opacity: markOpacity,
          transform: [{ scale: markScale }],
          alignItems: 'center',
        }}
      >
        <View style={styles.markBadge}>
          <RichfieldLogo size={40} />
        </View>
        <Text style={styles.wordmark}>Richfield Connect</Text>
      </Animated.View>

      <View style={styles.taglineBlock}>
        {TAGLINE.map((line, i) => (
          <Animated.Text
            key={line}
            style={[
              styles.taglineLine,
              i === TAGLINE.length - 1 && styles.taglineLineFinal,
              {
                opacity: lineAnims[i],
                transform: [
                  {
                    translateY: lineAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {line}
          </Animated.Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  taglineBlock: {
    position: 'absolute',
    bottom: '18%',
    alignItems: 'center',
  },
  taglineLine: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 2,
  },
  taglineLineFinal: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
