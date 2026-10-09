import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { userClub } from '../game/game';
import { randomLooks, SKIN_TONES, type Looks } from '../game/looks';
import { useCareer } from '../state/GameContext';
import { PlayerFace, ShirtAvatar } from '../ui/avatar';
import { colors } from '../ui/theme';

/** Hand-picked looks that cover every skin tone, hair style and beard at least once. */
const SAMPLES: Looks[] = [
  { skin: 0, hair: 'sidePart', hairColor: 3, beard: 'none', headband: false },
  { skin: 5, hair: 'buzz', hairColor: 0, beard: 'stubble', headband: false },
  { skin: 2, hair: 'quiff', hairColor: 1, beard: 'short', headband: false },
  { skin: 4, hair: 'afro', hairColor: 0, beard: 'none', headband: true },
  { skin: 1, hair: 'curly', hairColor: 4, beard: 'full', headband: false },
  { skin: 3, hair: 'twists', hairColor: 0, beard: 'goatee', headband: false },
  { skin: 1, hair: 'long', hairColor: 2, beard: 'stubble', headband: true },
  { skin: 0, hair: 'bald', hairColor: 1, beard: 'full', headband: false },
  { skin: 4, hair: 'bun', hairColor: 1, beard: 'moustache', headband: false },
  { skin: 2, hair: 'short', hairColor: 5, beard: 'short', headband: false },
  { skin: 5, hair: 'curly', hairColor: 0, beard: 'none', headband: false },
  { skin: 3, hair: 'sidePart', hairColor: 6, beard: 'none', headband: false },
];

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

/** Prototype only: how drawn faces and shirt avatars would look. Changes nothing in the game. */
export function FacesPreview({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state } = useCareer();
  const insets = useSafeAreaInsets();
  const [salt, setSalt] = useState(0);
  if (!visible) return null;
  const crest = userClub(state).crest;
  const squad = state.squad.slice(0, 10);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top + 8 }]}>
        <View style={s.header}>
          <Text style={s.title}>Player faces · preview</Text>
          <Pressable onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel="Close preview">
            <Text style={s.closeText}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={s.note}>A prototype. Nothing in the game changes until you decide.</Text>

          <Text style={s.section}>SAMPLE FACES</Text>
          <View style={s.grid}>
            {SAMPLES.map((l, i) => (
              <View key={i} style={s.cell}>
                <PlayerFace looks={l} crest={crest} size={84} />
                <Text style={s.caption} numberOfLines={1}>
                  {l.hair} · {l.beard}
                </Text>
              </View>
            ))}
          </View>
          <View style={s.tones}>
            {SKIN_TONES.map((c) => (
              <View key={c} style={[s.tone, { backgroundColor: c }]} />
            ))}
          </View>

          <View style={s.sectionRow}>
            <Text style={s.section}>YOUR SQUAD: FACE OR SHIRT</Text>
            <Pressable onPress={() => setSalt(salt + 1)} style={s.shuffle} accessibilityRole="button" accessibilityLabel="Shuffle faces">
              <Text style={s.shuffleText}>Shuffle faces</Text>
            </Pressable>
          </View>
          <Text style={s.note}>
            Faces here are random, as generated players would get. Real players would show the shirt until their
            looks are filled in.
          </Text>
          <View style={s.card}>
            {squad.map((p, i) => (
              <View key={p.id} style={[s.row, i < squad.length - 1 && s.rowBorder]}>
                <PlayerFace looks={randomLooks(`${p.id}:${salt}`, p.age)} crest={crest} size={40} />
                <ShirtAvatar crest={crest} label={initials(p.name)} size={40} />
                <Text style={s.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={s.meta}>
                  {p.positions[0]} · {p.age}
                </Text>
              </View>
            ))}
          </View>

          <Text style={s.section}>SIZES</Text>
          <View style={s.sizes}>
            {[24, 32, 48, 72, 120].map((size) => (
              <PlayerFace key={size} looks={SAMPLES[2]} crest={crest} size={size} />
            ))}
          </View>
          <View style={s.sizes}>
            {[24, 32, 48, 72, 120].map((size) => (
              <ShirtAvatar key={size} crest={crest} label="10" size={size} />
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.ink },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  closeText: { fontSize: 16, fontWeight: '900', color: colors.muted },
  content: { paddingHorizontal: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  note: { fontSize: 13, fontWeight: '600', color: colors.muted },
  section: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, color: colors.muted, marginTop: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '31%', alignItems: 'center', gap: 4 },
  caption: { fontSize: 11, fontWeight: '700', color: colors.muted },
  tones: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  tone: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border },
  shuffle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.ink },
  shuffleText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.faint },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted },
  sizes: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
});
