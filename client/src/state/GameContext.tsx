import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { type ClientAction, type ClientState, gameReducer, initialClientState } from './gameReducer.js';

const GameStateContext = createContext<ClientState | null>(null);
const GameDispatchContext = createContext<Dispatch<ClientAction> | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialClientState);
  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>{children}</GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

export function useGameState(): ClientState {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameProvider');
  return ctx;
}

export function useGameDispatch(): Dispatch<ClientAction> {
  const ctx = useContext(GameDispatchContext);
  if (!ctx) throw new Error('useGameDispatch must be used within GameProvider');
  return ctx;
}
