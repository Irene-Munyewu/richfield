import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}

/**
 * Basic error/status toast — a top banner that auto-dismisses. Deliberately
 * simple (no queue, no gestures) since this is a hackathon polish pass, not
 * a notification system in its own right (that's lib/notifications.ts).
 */
export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <View style={styles.wrap} pointerEvents="none">
          <View style={styles.toast}>
            <Text style={styles.text}>{message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxWidth: '100%',
    ...shadow.card,
  },
  text: { ...typography.body, color: colors.background, textAlign: 'center' },
});
