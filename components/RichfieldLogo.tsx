import Svg, { Rect } from 'react-native-svg';

type Props = {
  size?: number;
};

// Vector reproduction of richfield.svg (two rotated bars forming a shard/
// chevron mark) — kept as SVG rather than a rasterized asset so it stays
// crisp at any size across the app.
export function RichfieldLogo({ size = 48 }: Props) {
  const width = size * (89 / 80);
  return (
    <Svg width={width} height={size} viewBox="0 0 89 80" fill="none">
      <Rect x="28.2554" y="10" width="20" height="52" rx="4" transform="rotate(35 28.2554 10)" fill="#FFFFFF" />
      <Rect x="52.2554" y="22" width="20" height="52" rx="4" transform="rotate(35 52.2554 22)" fill="#108CB9" />
    </Svg>
  );
}
