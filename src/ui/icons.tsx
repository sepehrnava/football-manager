import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Crest, CrestShape } from '../game/types';
import { isLight } from './components';
import { colors } from './theme';

/**
 * Small vector icons for the tab bar: smooth at any size, drawn in the app's
 * style (bright fill, ink outline).
 */

const INK = colors.ink;
const STROKE = 2;

/** Crest outlines in a 24 × 28 box, matching the shapes of the full-size crest. */
function crestOutline(shape: CrestShape | undefined) {
  if (shape === 'round') return <Circle cx={12} cy={14} r={10.5} />;
  if (shape === 'square') return <Rect x={1.5} y={3.5} width={21} height={21} rx={5} />;
  if (shape === 'oval') return <Rect x={1.5} y={1.5} width={21} height={25} rx={10.5} />;
  return <Path d="M5 1.5H19Q22.5 1.5 22.5 5V14C22.5 21 17.5 25.5 12 26.5C6.5 25.5 1.5 21 1.5 14V5Q1.5 1.5 5 1.5Z" />;
}

export function CrestIcon({ crest, short, size = 24 }: { crest: Crest; short?: string; size?: number }) {
  // SVG ids must be unique per icon and plain characters to work in url(#…) on web.
  const id = `crest${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const outline = crestOutline(crest.shape);
  return (
    <Svg width={size} height={(size * 28) / 24} viewBox="0 0 24 28">
      <Defs>
        <ClipPath id={id}>{outline}</ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Rect x={0} y={0} width={24} height={28} fill={crest.primary} />
        {crest.pattern === 'stripes'
          ? [1, 3].map((i) => <Rect key={i} x={i * 4.8} y={0} width={4.8} height={28} fill={crest.secondary} />)
          : null}
        {crest.pattern === 'half' ? <Rect x={12} y={0} width={12} height={28} fill={crest.secondary} /> : null}
        {crest.pattern === 'band' ? <Rect x={0} y={10.6} width={24} height={6.8} fill={crest.secondary} /> : null}
      </G>
      <G fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
        {outline}
      </G>
      {short ? <CrestCode crest={crest} short={short} /> : null}
    </Svg>
  );
}

/** The club's three-letter code, readable on any crest: dark on light plain crests, else white with an ink edge. */
function CrestCode({ crest, short }: { crest: Crest; short: string }) {
  const behind = crest.pattern === 'band' ? crest.secondary : crest.primary;
  const dark = (crest.pattern === 'solid' || crest.pattern === 'band') && isLight(behind);
  const text = { x: 12, y: 16.7, fontSize: 7.6, fontWeight: '900' as const, textAnchor: 'middle' as const };
  return (
    <>
      {dark ? null : (
        <SvgText {...text} fill={INK} stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
          {short}
        </SvgText>
      )}
      <SvgText {...text} fill={dark ? INK : '#FFFFFF'}>
        {short}
      </SvgText>
    </>
  );
}

/** A football shirt in the club's colours. */
export function ShirtIcon({ primary, secondary, size = 28 }: { primary: string; secondary: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path
        d="M10 3.5L4.5 6L1.8 11.5L5.8 13.6L7.5 11V24.5H20.5V11L22.2 13.6L26.2 11.5L23.5 6L18 3.5C17 5.6 15.6 6.6 14 6.6C12.4 6.6 11 5.6 10 3.5Z"
        fill={primary}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {/* Collar trim in the second colour. */}
      <Path d="M10.6 4.6C11.6 6.4 12.7 7.4 14 7.4C15.3 7.4 16.4 6.4 17.4 4.6" fill="none" stroke={secondary} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function CoinIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx={14} cy={14} r={11} fill={colors.gold} stroke={INK} strokeWidth={STROKE} />
      <Circle cx={14} cy={14} r={7.6} fill="none" stroke="#D49A2E" strokeWidth={1.4} />
      <SvgText x={14} y={18.2} fontSize={12} fontWeight="900" fill={INK} textAnchor="middle">
        $
      </SvgText>
    </Svg>
  );
}

export function TrophyIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <G fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round">
        <Path d="M8.5 6.5H5.5C5.5 10.5 6.8 12.6 9.5 13.2" />
        <Path d="M19.5 6.5H22.5C22.5 10.5 21.2 12.6 18.5 13.2" />
      </G>
      <Path
        d="M8 3.5H20V10C20 14.4 17.4 17 14 17C10.6 17 8 14.4 8 10Z"
        fill={colors.gold}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Rect x={12.5} y={17} width={3} height={4} fill={INK} />
      <Rect x={8.5} y={21} width={11} height={4} rx={1.5} fill={colors.gold} stroke={INK} strokeWidth={STROKE} />
    </Svg>
  );
}

export function PlayIcon({ locked, size = 30 }: { locked?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={13} fill={locked ? colors.borderDark : colors.green} stroke={INK} strokeWidth={STROKE} />
      <Path d="M12 9.5L21 15L12 20.5Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

/** A coach's clipboard, for Staff. */
export function ClipboardIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Rect x={5} y={4.5} width={18} height={21.5} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      <Rect x={9.5} y={2} width={9} height={5} rx={1.5} fill={colors.gold} stroke={INK} strokeWidth={STROKE} />
      <G stroke={INK} strokeWidth={1.8} strokeLinecap="round">
        <Path d="M9.5 12.5H18.5" />
        <Path d="M9.5 16.5H18.5" />
        <Path d="M9.5 20.5H15" />
      </G>
    </Svg>
  );
}

/** A young sprout, for the Academy. */
export function SproutIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path d="M14 21V12" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M14 13C14 8.5 10.5 6 5.5 6.5C5.5 11 8.5 13.5 14 13Z" fill={colors.green} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <Path d="M14 15.5C14 11 17.5 8.5 22.5 9C22.5 13.5 19.5 16 14 15.5Z" fill={colors.green} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <Path d="M7.5 20.5H20.5L19 26H9Z" fill={colors.orange} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
    </Svg>
  );
}

/** Two arrows, for transfer offers. */
export function SwapIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx={14} cy={14} r={12} fill={colors.blue} stroke={INK} strokeWidth={STROKE} />
      <G fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M8 11H20M16.5 7.5L20 11L16.5 14.5" />
        <Path d="M20 17H8M11.5 13.5L8 17L11.5 20.5" />
      </G>
    </Svg>
  );
}

/** An hourglass, for players in their last season. */
export function HourglassIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path d="M8 3.5H20M8 24.5H20" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M9 3.5H19C19 9 15.5 11.5 14 14C15.5 16.5 19 19 19 24.5H9C9 19 12.5 16.5 14 14C12.5 11.5 9 9 9 3.5Z" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <Path d="M10.8 23C11.3 20 13 18.6 14 17.6C15 18.6 16.7 20 17.2 23Z" fill={colors.gold} />
      <Path d="M11.5 7.5H16.5C16 9.3 14.8 10.6 14 11.5C13.2 10.6 12 9.3 11.5 7.5Z" fill={colors.gold} />
    </Svg>
  );
}

/** A warning triangle, for money trouble. */
export function WarningIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path d="M14 3L26 24.5H2Z" fill={colors.red} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <Path d="M14 10.5V16.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={14} cy={20.3} r={1.5} fill="#FFFFFF" />
    </Svg>
  );
}
