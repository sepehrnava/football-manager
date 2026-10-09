import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { useGame } from '../state/GameContext';
import { cancelled, deleteAccount as deleteUser, signIn as providerSignIn, signOut as providerSignOut } from './auth';
import { backupTime, downloadBackup, removeBackup, uploadBackup } from './backup';
import { firebase, SIGN_IN } from './firebase';

type Busy = 'signIn' | 'backup' | 'restore' | 'delete' | null;

interface AccountValue {
  /** Which sign-in this device offers; null hides every account option. */
  provider: typeof SIGN_IN;
  user: User | null;
  lastBackup: number | null;
  /** A backup found right after signing in, waiting for Restore or Keep. */
  found: number | null;
  busy: Busy;
  error: string | null;
  signIn: () => Promise<void>;
  backupNow: () => Promise<void>;
  restore: () => Promise<void>;
  keepLocal: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountValue | null>(null);

/** Minimum time between automatic backups when the app goes to the background. */
const AUTO_EVERY = 5 * 60 * 1000;

export function AccountProvider({ children }: { children: ReactNode }) {
  const game = useGame();
  const [user, setUser] = useState<User | null>(null);
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [found, setFound] = useState<number | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SIGN_IN) return;
    return onAuthStateChanged(firebase().auth, (u) => {
      setUser(u);
      if (u) backupTime(u.uid).then(setLastBackup).catch(() => {});
      else setLastBackup(null);
    });
  }, []);

  /** Runs one account task at a time and turns failures into a short message. */
  const run = async (what: Exclude<Busy, null>, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(what);
    setError(null);
    try {
      await task();
    } catch (e) {
      if (!cancelled(e)) setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const upload = useCallback(
    async (u: User) => {
      const backup = await game.snapshot();
      await uploadBackup(u.uid, backup);
      setLastBackup(backup.savedAt);
    },
    [game],
  );

  // Back up quietly when the app goes to the background, unless a found backup is still undecided.
  const auto = useRef({ upload, user, found, last: 0 });
  useEffect(() => {
    auto.current = { ...auto.current, upload, user, found };
  });
  useEffect(() => {
    if (!SIGN_IN) return;
    const sub = AppState.addEventListener('change', (next) => {
      const a = auto.current;
      if (next !== 'background' || !a.user || a.found || Date.now() - a.last < AUTO_EVERY) return;
      a.last = Date.now();
      a.upload(a.user).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const value: AccountValue = {
    provider: SIGN_IN,
    user,
    lastBackup,
    found,
    busy,
    error,
    signIn: () =>
      run('signIn', async () => {
        const { user: u } = await providerSignIn();
        const time = await backupTime(u.uid);
        if (time) setFound(time);
        else await upload(u);
      }),
    backupNow: () =>
      run('backup', async () => {
        if (user) await upload(user);
      }),
    restore: () =>
      run('restore', async () => {
        if (!user) return;
        await game.restore(await downloadBackup(user.uid));
        setFound(null);
      }),
    keepLocal: () =>
      run('backup', async () => {
        if (!user) return;
        await upload(user);
        setFound(null);
      }),
    signOut: () =>
      run('signIn', async () => {
        await providerSignOut();
        setFound(null);
      }),
    deleteAccount: () =>
      run('delete', async () => {
        if (!user) return;
        await deleteUser(user, () => removeBackup(user.uid));
        setFound(null);
      }),
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
