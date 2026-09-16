import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../constants/theme';

type Props = {
  percent: number;
  size?: number;
  strokeWidth?: number;
};

export function CareerReadinessRing({ percent, size = 150, strokeWidth = 14 }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centerLabel]}>
        <Text style={styles.percentText}>{Math.round(clamped)}%</Text>
        <Text style={typography.caption}>Career Ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerLabel: { alignItems: 'center', justifyContent: 'center' },
  percentText: { fontSize: 32, fontWeight: '700', color: colors.text },
});
