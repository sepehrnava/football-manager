import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

/**
 * Firebase settings come from EXPO_PUBLIC_* values in .env.local (see .env.example).
 * Without them, or on web, cloud save is simply off and the game works as before.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Google sign-in needs a development or store build; Expo Go lacks the native module. */
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Which sign-in this device offers, if any: Apple on iOS, Google on Android. */
export const SIGN_IN: 'apple' | 'google' | null = !Object.values(config).every(Boolean)
  ? null
  : Platform.OS === 'ios'
    ? 'apple'
    : Platform.OS === 'android' && !inExpoGo && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      ? 'google'
      : null;

let services: { app: FirebaseApp; auth: FirebaseAuth.Auth; db: Firestore } | null = null;

/** Firebase, started on first use. Only call when SIGN_IN is set. */
export function firebase() {
  if (services) return services;
  const app = getApps()[0] ?? initializeApp(config);
  // Metro loads Firebase's React Native build, which has this; the public types do not list it.
  const { getReactNativePersistence } = FirebaseAuth as unknown as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
  };
  const auth = FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  // Long-polling detection keeps Firestore working on mobile networks that block streaming.
  const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  services = { app, auth, db };
  return services;
}
