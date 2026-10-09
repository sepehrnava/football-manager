import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

import { careerAchievements } from '../game/achievements';
import { createChallenge, todayKey } from '../game/challenge';
import { reducer, userClub, type Action } from '../game/game';
import { EMPTY_META, recordChallenge, unlock, type Meta } from '../game/meta';
import type { GameState } from '../game/types';
import { clearGame, loadGame, loadMeta, saveGame, saveMeta, type Slot } from './saveStore';

interface App {
  game: GameState | null;
  slot: Slot;
  meta: Meta;
  /** The career club's name while the challenge is open, for the way back. */
  returnTo: string | null;
}

type AppAction =
  | Action
  | { type: 'switch'; slot: Slot; game: GameState | null; returnTo: string | null }
  | { type: 'meta'; meta: Meta }
  | { type: 'seen' };

/** Game actions go to the game; finishing a challenge also updates the meta. */
function appReducer(app: App, action: AppAction): App {
  if (action.type === 'switch') return { ...app, slot: action.slot, game: action.game, returnTo: action.returnTo };
  if (action.type === 'meta') return { ...app, meta: action.meta };
  if (action.type === 'seen') return { ...app, meta: { ...app.meta, fresh: app.meta.fresh.slice(1) } };
  const game = reducer(app.game, action);
  if (game === app.game || !game) return { ...app, game };
  let meta = unlock(app.meta, careerAchievements(app.game, game, action), todayKey());
  const finished = game.phase !== app.game?.phase && (game.phase === 'summary' || game.phase === 'gameover');
  if (finished && game.challenge) meta = recordChallenge(meta, game);
  return { ...app, game, meta };
}

interface GameContextValue {
  state: GameState | null;
  dispatch: Dispatch<Action>;
  loaded: boolean;
  /** Marks the oldest new achievement as announced. */
  seenAchievement: () => void;
  /** Which game is open: the career or today's Daily Challenge. */
  slot: Slot;
  meta: Meta;
  returnTo: string | null;
  resetCareer: () => void;
  /** `prepared` is today's fresh challenge if the caller already built it. */
  openChallenge: (prepared?: GameState) => Promise<void>;
  leaveChallenge: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [app, dispatch] = useReducer(appReducer, { game: null, slot: 'career', meta: EMPTY_META, returnTo: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([loadGame('career').catch(() => null), loadMeta()])
      .then(([saved, meta]) => {
        dispatch({ type: 'meta', meta });
        if (saved) dispatch({ type: 'load', state: saved });
      })
      .finally(() => setLoaded(true));
  }, []);

  // Saves are batched: the world is large, and a fast simulation changes the
  // state every matchday. Write at most about once a second, and right away
  // when the app goes to the background or switches game.
  const latest = useRef<{ slot: Slot; game: GameState } | null>(null);
  const { game, slot, meta, returnTo } = app;
  useEffect(() => {
    if (!loaded || !game) return;
    latest.current = { slot, game };
    const t = setTimeout(() => {
      saveGame(slot, game);
    }, 1000);
    return () => clearTimeout(t);
  }, [game, slot, loaded]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && latest.current) {
        saveGame(latest.current.slot, latest.current.game);
      }
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (loaded) saveMeta(meta);
  }, [meta, loaded]);

  const flush = async () => {
    const last = latest.current;
    latest.current = null;
    if (last) await saveGame(last.slot, last.game);
  };

  const seenAchievement = useCallback(() => dispatch({ type: 'seen' }), []);
  // Each new achievement is announced for a few seconds, then the next one.
  const announcing = meta.fresh[0];
  useEffect(() => {
    if (!announcing) return;
    const t = setTimeout(seenAchievement, 3200);
    return () => clearTimeout(t);
  }, [announcing, seenAchievement]);

  const resetCareer = () => {
    latest.current = null;
    clearGame('career').catch(() => {});
    dispatch({ type: 'reset' });
  };

  /** Opens today's challenge: the saved one if it is today's, else a fresh one. */
  const openChallenge = async (prepared?: GameState) => {
    const from = slot === 'career' && game ? userClub(game).name : returnTo;
    await flush();
    const today = todayKey();
    const saved = await loadGame('challenge').catch(() => null);
    const next =
      saved?.challenge?.day === today
        ? saved
        : prepared?.challenge?.day === today
          ? prepared
          : createChallenge(today);
    dispatch({ type: 'switch', slot: 'challenge', game: next, returnTo: from });
  };

  const leaveChallenge = async () => {
    await flush();
    const career = await loadGame('career').catch(() => null);
    dispatch({ type: 'switch', slot: 'career', game: career, returnTo: null });
  };

  return (
    <GameContext.Provider
      value={{
        state: game,
        dispatch,
        loaded,
        slot,
        meta,
        returnTo,
        resetCareer,
        openChallenge,
        leaveChallenge,
        seenAchievement,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

/** For screens that only render while a game exists. */
export function useCareer() {
  const { state, dispatch } = useGame();
  if (!state) throw new Error('No active career');
  return { state, dispatch };
}
