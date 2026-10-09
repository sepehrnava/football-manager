import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import { Bytes, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

import type { Meta } from '../game/meta';
import type { GameState } from '../game/types';
import { firebase } from './firebase';

/** Everything worth keeping: the career, today's challenge and the cross-career progress. */
export interface Backup {
  version: 1;
  savedAt: number;
  career: GameState | null;
  challenge: GameState | null;
  meta: Meta;
}

/**
 * One Firestore document per player, holding the gzip-compressed backup. A career is about
 * 1.8 MB of JSON and about 265 KB compressed, well under Firestore's 1 MB document limit, so the
 * project can stay on Firebase's free plan (Cloud Storage would need billing).
 */
const backupDoc = (uid: string) => doc(firebase().db, 'saves', uid);

export async function uploadBackup(uid: string, backup: Backup) {
  const bytes = gzipSync(strToU8(JSON.stringify(backup)));
  await setDoc(backupDoc(uid), { savedAt: backup.savedAt, data: Bytes.fromUint8Array(bytes) });
}

/** When the last backup was made, or null if there is none. */
export async function backupTime(uid: string): Promise<number | null> {
  const snap = await getDoc(backupDoc(uid));
  return snap.exists() ? (snap.get('savedAt') as number) : null;
}

export async function downloadBackup(uid: string): Promise<Backup> {
  const snap = await getDoc(backupDoc(uid));
  const data = snap.get('data') as Bytes;
  return JSON.parse(strFromU8(gunzipSync(data.toUint8Array()))) as Backup;
}

export async function removeBackup(uid: string) {
  await deleteDoc(backupDoc(uid));
}
