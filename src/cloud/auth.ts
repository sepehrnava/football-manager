import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

import { firebase, SIGN_IN } from './firebase';

/** Sign in with Apple, then with Firebase. A hashed nonce proves the token is for this request. */
async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const apple = await AppleAuthentication.signInAsync({ nonce: hashed });
  if (!apple.identityToken) throw new Error('Apple did not return a sign-in token');
  const credential = new OAuthProvider('apple.com').credential({ idToken: apple.identityToken, rawNonce });
  return signInWithCredential(firebase().auth, credential);
}

/** Sign in with Google (Android build only; the module is loaded on demand). */
async function signInWithGoogle() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success' || !result.data.idToken) throw new Error('cancelled');
  const credential = GoogleAuthProvider.credential(result.data.idToken);
  return signInWithCredential(firebase().auth, credential);
}

export async function signIn() {
  return SIGN_IN === 'apple' ? signInWithApple() : signInWithGoogle();
}

export async function signOut() {
  if (SIGN_IN === 'google') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut().catch(() => {});
  }
  await firebaseSignOut(firebase().auth);
}

/** True when the user closed the sign-in window themselves: nothing to report. */
export function cancelled(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  const message = (e as { message?: string })?.message ?? '';
  return code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED' || message === 'cancelled';
}

/** Firebase only lets a recently signed-in user delete their account; sign in again first if needed. */
export async function deleteAccount(user: User, removeBackup: () => Promise<void>) {
  await removeBackup();
  try {
    await user.delete();
  } catch (e) {
    if ((e as { code?: string })?.code !== 'auth/requires-recent-login') throw e;
    await signIn();
    await firebase().auth.currentUser?.delete();
  }
}
