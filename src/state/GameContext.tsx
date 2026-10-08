import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

import { reducer, type Action } from '../game/game';
import type { GameState } from '../game/types';

const SAVE_KEY = 'pocket-manager/save-v1';

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
        if (saved?.version === 1) dispatch({ type: 'load', state: saved });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !state) return;
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

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
