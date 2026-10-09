import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AchievementToast } from './src/screens/Honours';
import { MainScreen } from './src/screens/MainScreen';
import { NewClubScreen } from './src/screens/NewClubScreen';
import { GameProvider, useGame } from './src/state/GameContext';
import { FadeIn } from './src/ui/motion';
import { FONTS } from './src/ui/text';
import { colors } from './src/ui/theme';

function Root() {
  const { state, loaded, slot } = useGame();
  if (!loaded) return <Loading />;
  // Switching between the career, the challenge and a new club cross-fades.
  return (
    <FadeIn key={state ? slot : 'new'} from="scale" duration={320} style={styles.app}>
      {state ? <MainScreen /> : <NewClubScreen />}
    </FadeIn>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

export default function App() {
  // A font that fails to load falls back to the system font rather than blocking the game.
  const [fontsLoaded, fontError] = useFonts(FONTS);
  return (
    <SafeAreaProvider>
      <GameProvider>
        <View style={styles.app}>
          {fontsLoaded || fontError ? (
            <>
              <Root />
              <AchievementToast />
            </>
          ) : (
            <Loading />
          )}
        </View>
        <StatusBar style="dark" />
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
