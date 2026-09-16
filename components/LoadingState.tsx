import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

export function LoadingState() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
