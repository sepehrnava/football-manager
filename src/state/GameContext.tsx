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
import { clearGame, loadGame, saveGame } from './saveStore';

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
    loadGame()
      .then((saved) => {
        if (saved) dispatch({ type: 'load', state: saved });
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
      saveGame(state);
    }, 1000);
    return () => clearTimeout(t);
  }, [state, loaded]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && latest.current) {
        saveGame(latest.current);
      }
    });
    return () => sub.remove();
  }, []);

  const resetCareer = () => {
    latest.current = null;
    clearGame().catch(() => {});
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
