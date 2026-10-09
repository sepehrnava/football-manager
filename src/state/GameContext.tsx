import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

import { reducer, type Action } from '../game/game';
import type { GameState } from '../game/types';

// v2 changed the save format (contracts, market); v1 saves start a new career.
const SAVE_KEY = 'pocket-manager/save-v2';

interface GameContextValue {
  state: GameState | null;
  dispatch: Dispatch<Action>;
  loaded: boolean;
  resetCareer: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as GameState) : null;
        if (saved?.version === 2) dispatch({ type: 'load', state: saved });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Saves are batched: the world is large, and a fast simulation changes the
  // state every matchday. Write at most about once a second, and right away
  // when the app goes to the background.
  const latest = useRef<GameState | null>(null);
  useEffect(() => {
    if (!loaded || !state) return;
    latest.current = state;
    const t = setTimeout(() => {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state)).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [state, loaded]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && latest.current) {
        AsyncStorage.setItem(SAVE_KEY, JSON.stringify(latest.current)).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const resetCareer = () => {
    AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    dispatch({ type: 'reset' });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, loaded, resetCareer }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

/** For screens that only render while a career exists. */
export function useCareer() {
  const { state, dispatch } = useGame();
  if (!state) throw new Error('No active career');
  return { state, dispatch };
}
