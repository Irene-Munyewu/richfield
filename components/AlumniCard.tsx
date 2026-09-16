import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ConnectionStatus } from '../lib/connections';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type Props = {
  name: string;
  headline: string | null;
  company: string | null;
  connectionStatus: ConnectionStatus;
  onPress: () => void;
  onConnectPress: () => void;
};

const CONNECT_LABEL: Record<ConnectionStatus, string> = {
  none: 'Connect',
  pending: 'Pending',
  connected: 'Connected',
};

export function AlumniCard({ name, headline, company, connectionStatus, onPress, onConnectPress }: Props) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={typography.h3}>{name}</Text>
        <Text style={typography.bodyMuted}>{headline ?? company ?? ''}</Text>
      </View>
      <Pressable
        style={[styles.connectButton, connectionStatus !== 'none' && styles.connectButtonMuted]}
        onPress={(e) => {
          e.stopPropagation();
          if (connectionStatus !== 'connected') onConnectPress();
        }}
        disabled={connectionStatus === 'connected'}
      >
        {connectionStatus === 'connected' && (
          <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} />
        )}
        <Text style={[styles.connectText, connectionStatus !== 'none' && styles.connectTextMuted]}>
          {CONNECT_LABEL[connectionStatus]}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700' },
  textCol: { flex: 1 },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  connectButtonMuted: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectText: { fontSize: 12, fontWeight: '700', color: colors.textOnPrimary },
  connectTextMuted: { color: colors.primary },
});
