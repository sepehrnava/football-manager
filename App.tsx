import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AchievementToast } from './src/screens/Honours';
import { MainScreen } from './src/screens/MainScreen';
import { NewClubScreen } from './src/screens/NewClubScreen';
import { GameProvider, useGame } from './src/state/GameContext';
import { colors } from './src/ui/theme';

function Root() {
  const { state, loaded } = useGame();
  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  return state ? <MainScreen /> : <NewClubScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <View style={styles.app}>
          <Root />
          <AchievementToast />
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
