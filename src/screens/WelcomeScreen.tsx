import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '../cloud/AccountContext';
import { Button } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors } from '../ui/theme';
import { SignInButton } from './AccountSheet';
import { Hero } from './StartHome';

/**
 * First launch: sign in to back up progress, or continue as a guest. Calls onDone once the
 * player has chosen; the choice is remembered by the caller.
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const a = useAccount();
  const insets = useSafeAreaInsets();
  const signedIn = !!a.user && !a.found;

  // Signed in with nothing to restore: nothing more to ask.
  useEffect(() => {
    if (signedIn && !a.busy) onDone();
  }, [signedIn, a.busy, onDone]);

  return (
    <View style={[s.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <FadeIn from="scale" duration={320} style={s.hero}>
        <Hero />
      </FadeIn>
      <FadeIn delay={500} duration={320}>
        <View style={s.actions}>
          {a.found ? (
            <>
              <Text style={s.text}>A backup was found on your account.</Text>
              <Button label="RESTORE BACKUP" variant="green" disabled={!!a.busy} onPress={a.restore} />
              <Text style={s.guest} onPress={a.busy ? undefined : onDone}>
                Not now
              </Text>
            </>
          ) : (
            <>
              <Text style={s.text}>Sign in to keep your progress safe.</Text>
              <SignInButton />
              <Text style={s.guest} onPress={a.busy ? undefined : onDone} accessibilityRole="button">
                Continue as guest
              </Text>
            </>
          )}
          {a.error ? <Text style={s.error}>{a.error}</Text> : null}
        </View>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hero: { flex: 1 },
  actions: { marginTop: 20, gap: 12 },
  text: { fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  guest: { fontSize: 16, fontWeight: '800', color: colors.muted, textAlign: 'center', paddingVertical: 10 },
  error: { fontSize: 13, fontWeight: '700', color: colors.red, textAlign: 'center' },
});
