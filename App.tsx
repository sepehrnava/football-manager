import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AchievementToast } from './src/screens/Honours';
import { MainScreen } from './src/screens/MainScreen';
import { NewClubScreen } from './src/screens/NewClubScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AdsProvider } from './src/ads/AdsContext';
import { AccountProvider, useAccount } from './src/cloud/AccountContext';
import { GameProvider, useGame } from './src/state/GameContext';
import { colors } from './src/ui/theme';

const WELCOME_KEY = 'top-squad/welcome-v1';

/** Whether the first-launch welcome (sign in or guest) was already answered on this device. */
function useWelcomeSeen() {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY)
      .then((v) => setSeen(v === '1'))
      .catch(() => setSeen(true));
  }, []);
  const done = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {});
  }, []);
  return [seen, done] as const;
}

function Root() {
  const { state, loaded } = useGame();
  const { provider } = useAccount();
  const [welcomeSeen, welcomeDone] = useWelcomeSeen();
  if (!loaded || welcomeSeen === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  if (state) return <MainScreen />;
  if (provider && !welcomeSeen) return <WelcomeScreen onDone={welcomeDone} />;
  return <NewClubScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <AccountProvider>
          <AdsProvider>
            <View style={styles.app}>
              <Root />
              <AchievementToast />
            </View>
            <StatusBar style="dark" />
          </AdsProvider>
        </AccountProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
