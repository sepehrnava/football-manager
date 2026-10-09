import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAccount } from '../cloud/AccountContext';
import { Button, Sheet } from '../ui/components';
import { colors } from '../ui/theme';

function when(time: number) {
  const mins = Math.round((Date.now() - time) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const d = new Date(time);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString();
}

/** The sign-in button for this platform: Apple on iOS, Google on Android. */
function SignInButton() {
  const { provider, signIn, busy } = useAccount();
  if (busy === 'signIn') return <ActivityIndicator color={colors.ink} style={s.spinner} />;
  if (provider === 'apple') {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={14}
        style={s.apple}
        onPress={signIn}
      />
    );
  }
  // Loaded only in Android builds, where the native module exists.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSigninButton } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Wide}
      color={GoogleSigninButton.Color.Dark}
      onPress={signIn}
      style={s.google}
    />
  );
}

export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const a = useAccount();
  const [confirm, setConfirm] = useState<'restore' | 'delete' | null>(null);
  if (!visible || !a.provider) return null;
  const close = () => {
    setConfirm(null);
    onClose();
  };
  const name = a.provider === 'apple' ? 'Apple' : 'Google';

  return (
    <Sheet visible title="Account" onClose={close}>
      {!a.user ? (
        <>
          <Text style={s.text}>Back up your progress so a new phone never means starting over.</Text>
          <SignInButton />
        </>
      ) : a.found ? (
        <>
          <Text style={s.text}>A backup from {when(a.found)} was found.</Text>
          <View style={s.actions}>
            <Button label="RESTORE BACKUP" variant="green" disabled={!!a.busy} onPress={a.restore} />
            <Button label="KEEP THIS PHONE'S PROGRESS" variant="light" disabled={!!a.busy} onPress={a.keepLocal} />
          </View>
        </>
      ) : (
        <>
          <Text style={s.text}>
            Signed in with {name}
            {a.user.email ? ` · ${a.user.email}` : ''}
          </Text>
          <Text style={s.status}>
            {a.busy === 'backup' ? 'Backing up…' : a.lastBackup ? `Last backup ${when(a.lastBackup)}` : 'No backup yet'}
          </Text>
          <View style={s.actions}>
            <Button label="BACK UP NOW" variant="green" disabled={!!a.busy} onPress={a.backupNow} />
            {a.lastBackup ? (
              <Button
                label={confirm === 'restore' ? 'TAP AGAIN: REPLACE THIS PHONE' : 'RESTORE BACKUP'}
                variant={confirm === 'restore' ? 'red' : 'light'}
                disabled={!!a.busy}
                onPress={() => (confirm === 'restore' ? a.restore().then(close) : setConfirm('restore'))}
              />
            ) : null}
          </View>
          <View style={s.links}>
            <Text style={s.link} onPress={a.busy ? undefined : a.signOut}>
              Sign out
            </Text>
            <Text
              style={[s.link, { color: colors.red }]}
              onPress={a.busy ? undefined : () => (confirm === 'delete' ? a.deleteAccount() : setConfirm('delete'))}
            >
              {confirm === 'delete' ? 'Tap again to delete account and backup' : 'Delete account'}
            </Text>
          </View>
        </>
      )}
      {a.error ? <Text style={s.error}>{a.error}</Text> : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  text: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 14, lineHeight: 21 },
  status: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: -8, marginBottom: 14 },
  actions: { gap: 10 },
  apple: { width: '100%', height: 50 },
  google: { width: '100%', height: 52 },
  spinner: { paddingVertical: 14 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 12 },
  link: { fontSize: 14, fontWeight: '800', color: colors.muted, paddingVertical: 6, flexShrink: 1 },
  error: { fontSize: 13, fontWeight: '700', color: colors.red, marginTop: 12 },
});
