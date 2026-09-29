import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * The Warrantyly logo: a "W" drawn as two linked check marks inside the coverage ring,
 * whose mint dot marks the time left. Same geometry as assets/brand/logo.svg (1024 grid).
 */
const C = 512;
const R = 318;
const RING = 40;
const CIRC = 2 * Math.PI * R;
const ACTIVE = 0.8;
const START_DEG = -52;
const END = ((START_DEG + ACTIVE * 360) * Math.PI) / 180;
const DOT = { x: C + R * Math.cos(END), y: C + R * Math.sin(END) };
const W = 'M300 512 L402 626 L500 508 L598 626 L740 414';

export function BrandMark({ size = 120, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0B1020" />
          <Stop offset="0.55" stopColor="#132057" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </LinearGradient>
        <RadialGradient id="bm-hi" cx="0.22" cy="0.12" r="0.75">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="bm-arc" x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="0.6" stopColor="#38BDF8" />
          <Stop offset="1" stopColor="#34D399" />
        </LinearGradient>
      </Defs>
      {tile ? (
        <>
          <Rect width={1024} height={1024} rx={232} fill="url(#bm-bg)" />
          <Rect width={1024} height={1024} rx={232} fill="url(#bm-hi)" />
        </>
      ) : null}
      <Circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={RING} />
      <Circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke="url(#bm-arc)"
        strokeWidth={RING}
        strokeLinecap="round"
        strokeDasharray={`${CIRC * ACTIVE} ${CIRC}`}
        transform={`rotate(${START_DEG} ${C} ${C})`}
      />
      <Circle cx={DOT.x} cy={DOT.y} r={RING * 0.95} fill="#34D399" />
      <Circle cx={DOT.x} cy={DOT.y} r={RING * 0.42} fill="#0B1020" />
      <Path d={W} fill="none" stroke="#FFFFFF" strokeWidth={66} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
