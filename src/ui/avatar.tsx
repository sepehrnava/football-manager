import { useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Crest } from '../game/types';

const SHIRT = 'M30 22 L42 17 Q50 21 58 17 L70 22 L86 35 L77 46 L70 41 L70 86 L30 86 L30 41 L23 46 L14 35 Z';

function luminance(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

/**
 * The back of the club shirt with a number (or short label), in the club's
 * colours and crest pattern.
 */
export function ShirtAvatar({
  crest,
  label,
  size = 48,
  background = '#E7EAE4',
}: {
  crest: Crest;
  label: string;
  size?: number;
  background?: string;
}) {
  const id = useId().replace(/:/g, '');
  // The number sits on the main colour, except on halves where it straddles both.
  const light = crest.pattern !== 'half' && luminance(crest.primary) > 170;
  const ink = light ? '#1F1A17' : '#FFFFFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={`${id}c`}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
        <ClipPath id={`${id}s`}>
          <Path d={SHIRT} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id}c)`}>
        <Rect width={100} height={100} fill={background} />
        <Path d={SHIRT} fill={crest.primary} />
        <G clipPath={`url(#${id}s)`}>
          {crest.pattern === 'stripes'
            ? [0, 1, 2, 3, 4].map((i) => (
                <Rect key={i} x={18 + i * 14} y={0} width={7} height={100} fill={crest.secondary} />
              ))
            : null}
          {crest.pattern === 'half' ? <Rect x={50} y={0} width={50} height={100} fill={crest.secondary} /> : null}
          {crest.pattern === 'band' ? <Rect x={0} y={74} width={100} height={8} fill={crest.secondary} /> : null}
          <Rect x={10} y={35} width={13} height={14} fill={crest.secondary} transform="rotate(-38 16 42)" />
          <Rect x={77} y={35} width={13} height={14} fill={crest.secondary} transform="rotate(38 84 42)" />
        </G>
        <Path d="M42 17 Q50 21 58 17" fill="none" stroke={crest.secondary} strokeWidth={3} />
        <Path d={SHIRT} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={1.2} />
        <SvgText
          x={50}
          y={label.length > 2 ? 62 : 66}
          fontSize={label.length > 2 ? 20 : 30}
          fontWeight="900"
          fontFamily={Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : undefined}
          textAnchor="middle"
          fill={ink}
          stroke={light ? 'none' : 'rgba(0,0,0,0.6)'}
          strokeWidth={1}
        >
          {label}
        </SvgText>
      </G>
    </Svg>
  );
}
