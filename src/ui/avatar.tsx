import { useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { HAIR_COLORS, SKIN_TONES, type Looks } from '../game/looks';
import type { Crest } from '../game/types';

/** Mixes a hex colour towards black (amount > 0) or white (amount < 0). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 0 : 255;
  const a = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * a);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Club colours on a body shape, following the crest pattern. */
function Kit({ id, crest, shape }: { id: string; crest: Crest; shape: string }) {
  return (
    <G>
      <Defs>
        <ClipPath id={id}>
          <Path d={shape} />
        </ClipPath>
      </Defs>
      <Path d={shape} fill={crest.primary} />
      <G clipPath={`url(#${id})`}>
        {crest.pattern === 'stripes'
          ? [0, 1, 2, 3, 4].map((i) => <Rect key={i} x={14 + i * 16} y={0} width={8} height={100} fill={crest.secondary} />)
          : null}
        {crest.pattern === 'half' ? <Rect x={50} y={0} width={50} height={100} fill={crest.secondary} /> : null}
        {crest.pattern === 'band' ? <Rect x={0} y={84} width={100} height={7} fill={crest.secondary} /> : null}
      </G>
      <Path d={shape} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
    </G>
  );
}

const SHOULDERS = 'M8 104 C10 82 24 73 38 71 L62 71 C76 73 90 82 92 104 Z';

/** Hair drawn behind the head (long hair, afro, bun). */
function HairBack({ looks, color }: { looks: Looks; color: string }) {
  switch (looks.hair) {
    case 'afro':
      return <Circle cx={50} cy={35} r={27} fill={color} />;
    case 'long':
      return (
        <G fill={color}>
          <Path d="M29 34 C25 50 26 64 31 72 L40 72 L38 36 Z" />
          <Path d="M71 34 C75 50 74 64 69 72 L60 72 L62 36 Z" />
        </G>
      );
    case 'bun':
      return <Circle cx={50} cy={13} r={8} fill={color} />;
    case 'twists':
      return (
        <G stroke={color} strokeWidth={5} strokeLinecap="round">
          {[30, 36, 64, 70].map((x) => (
            <Path key={x} d={`M${x} 30 L${x + (x < 50 ? -3 : 3)} 48`} />
          ))}
        </G>
      );
    default:
      return null;
  }
}

/** Hair on top of the head. */
function HairFront({ looks, color }: { looks: Looks; color: string }) {
  switch (looks.hair) {
    case 'bald':
      return <Ellipse cx={44} cy={25} rx={6} ry={2.5} fill="rgba(255,255,255,0.25)" />;
    case 'buzz':
      return <Path d="M31 38 C31 22 40 19 50 19 C60 19 69 22 69 38 C64 30 58 27 50 27 C42 27 36 30 31 38 Z" fill={color} opacity={0.6} />;
    case 'short':
      return <Path d="M30 40 C29 20 40 15 50 15 C61 15 71 20 70 40 C67 30 60 27 50 27 C40 27 33 30 30 40 Z" fill={color} />;
    case 'sidePart':
      return (
        <G fill={color}>
          <Path d="M30 40 C29 20 40 14 50 14 C61 14 71 20 70 40 C67 31 62 28 56 27 L36 31 C33 33 31 36 30 40 Z" />
          <Path d="M36 31 C42 22 56 21 66 28 C58 26 48 27 40 33 Z" />
        </G>
      );
    case 'quiff':
      return (
        <G fill={color}>
          <Path d="M30 40 C29 22 40 17 50 17 C61 17 71 22 70 40 C67 31 60 28 50 28 C40 28 33 31 30 40 Z" />
          <Path d="M36 28 C36 12 54 5 66 15 C70 20 70 26 69 32 C63 25 52 23 36 28 Z" />
        </G>
      );
    case 'curly':
      return (
        <G fill={color}>
          {[
            [32, 34],
            [36, 25],
            [44, 19],
            [52, 18],
            [60, 21],
            [66, 28],
            [68, 36],
          ].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={7} />
          ))}
        </G>
      );
    case 'afro':
      return <Path d="M30 40 C28 22 40 14 50 14 C60 14 72 22 70 40 C66 31 60 28 50 28 C40 28 34 31 30 40 Z" fill={color} />;
    case 'twists':
      return (
        <G fill={color}>
          <Path d="M30 40 C29 20 40 15 50 15 C61 15 71 20 70 40 C67 30 60 27 50 27 C40 27 33 30 30 40 Z" />
          {[38, 46, 54, 62].map((x) => (
            <Rect key={x} x={x - 2.5} y={14} width={5} height={16} rx={2.5} />
          ))}
        </G>
      );
    case 'bun':
      return <Path d="M31 38 C31 21 40 18 50 18 C60 18 69 21 69 38 C64 29 58 26 50 26 C42 26 36 29 31 38 Z" fill={color} />;
    case 'long':
      return <Path d="M29 42 C28 20 40 14 50 14 C60 14 72 20 71 42 C68 30 62 26 54 26 C48 28 40 30 33 34 C31 36 30 39 29 42 Z" fill={color} />;
  }
}

function BeardShape({ looks, color }: { looks: Looks; color: string }) {
  const jaw = 'M30 44 C30 60 39 67 50 67 C61 67 70 60 70 44 L67 44 C66 53 61 57 56 57 L44 57 C39 57 34 53 33 44 Z';
  switch (looks.beard) {
    case 'stubble':
      return <Path d={jaw} fill={color} opacity={0.28} />;
    case 'short':
      return (
        <G fill={color}>
          <Path d={jaw} />
          <Path d="M42 57 C45 54 55 54 58 57 C55 56 45 56 42 57 Z" />
        </G>
      );
    case 'full':
      return (
        <G fill={color}>
          <Path d="M29 42 C29 64 39 73 50 73 C61 73 71 64 71 42 L67 42 C66 52 61 57 56 57 L44 57 C39 57 34 52 33 42 Z" />
          <Path d="M41 58 C44 53 56 53 59 58 C55 56 45 56 41 58 Z" />
        </G>
      );
    case 'goatee':
      return (
        <G fill={color}>
          <Path d="M44 60 C45 67 55 67 56 60 C53 62 47 62 44 60 Z" />
          <Path d="M43 57.5 C46 54 54 54 57 57.5 C54 56.5 46 56.5 43 57.5 Z" />
        </G>
      );
    case 'moustache':
      return <Path d="M42 57.5 C45 53.5 55 53.5 58 57.5 C55 56.5 45 56.5 42 57.5 Z" fill={color} />;
    default:
      return null;
  }
}

/** A drawn player face on the club's shirt. */
export function PlayerFace({ looks, crest, size = 48, background = '#E7EAE4' }: { looks: Looks; crest: Crest; size?: number; background?: string }) {
  const id = useId().replace(/:/g, '');
  const skin = SKIN_TONES[looks.skin] ?? SKIN_TONES[2];
  const skinDark = shade(skin, 0.18);
  const hair = HAIR_COLORS[looks.hairColor] ?? HAIR_COLORS[0];
  const brow = looks.hair === 'bald' && looks.hairColor > 4 ? HAIR_COLORS[1] : hair;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={`${id}c`}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id}c)`}>
        <Rect width={100} height={100} fill={background} />
        <HairBack looks={looks} color={hair} />
        <Kit id={`${id}k`} crest={crest} shape={SHOULDERS} />
        <Path d="M41 56 L41 71 Q50 78 59 71 L59 56 Z" fill={skinDark} />
        <Path d="M40 71 L50 80 L60 71" fill="none" stroke={crest.secondary} strokeWidth={3} />
        <Ellipse cx={30.5} cy={45} rx={4} ry={6} fill={skinDark} />
        <Ellipse cx={69.5} cy={45} rx={4} ry={6} fill={skinDark} />
        <Ellipse cx={50} cy={43} rx={19.5} ry={23} fill={skin} />
        <HairFront looks={looks} color={hair} />
        {looks.headband ? <Rect x={30} y={28} width={40} height={4.5} rx={2} fill={crest.secondary} stroke="rgba(0,0,0,0.2)" strokeWidth={0.6} /> : null}
        <Rect x={37} y={37} width={9} height={2.4} rx={1.2} fill={brow} />
        <Rect x={54} y={37} width={9} height={2.4} rx={1.2} fill={brow} />
        <Circle cx={41.5} cy={44} r={2.3} fill="#1F1A17" />
        <Circle cx={58.5} cy={44} r={2.3} fill="#1F1A17" />
        <Path d="M50 46 Q47.5 52 50.5 53" fill="none" stroke={skinDark} strokeWidth={1.6} strokeLinecap="round" />
        <BeardShape looks={looks} color={hair} />
        <Path d="M45 59.5 Q50 62.5 55 59.5" fill="none" stroke="#7A3E33" strokeWidth={1.6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

const SHIRT = 'M30 24 L41 19 Q50 27 59 19 L70 24 L85 36 L77 46 L70 41 L70 84 L30 84 L30 41 L23 46 L15 36 Z';

/** No face: the club shirt with a number or initials. */
export function ShirtAvatar({ crest, label, size = 48, background = '#E7EAE4' }: { crest: Crest; label: string; size?: number; background?: string }) {
  const id = useId().replace(/:/g, '');
  const light = parseInt(crest.primary.slice(1), 16);
  const lum = 0.299 * ((light >> 16) & 255) + 0.587 * ((light >> 8) & 255) + 0.114 * (light & 255);
  const ink = crest.pattern === 'solid' && lum > 170 ? '#1F1A17' : '#FFFFFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={`${id}c`}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id}c)`}>
        <Rect width={100} height={100} fill={background} />
        <Kit id={`${id}k`} crest={crest} shape={SHIRT} />
        <SvgText
          x={50}
          y={64}
          fontSize={label.length > 2 ? 18 : 24}
          fontWeight="800"
          fontFamily={Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : undefined}
          textAnchor="middle"
          fill={ink}
          stroke={ink === '#FFFFFF' ? 'rgba(0,0,0,0.55)' : 'none'}
          strokeWidth={0.8}
        >
          {label}
        </SvgText>
      </G>
    </Svg>
  );
}
