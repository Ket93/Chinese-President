import { ExchangeScreen } from './screens/ExchangeScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { RoomScreen } from './screens/RoomScreen.js';
import { RoundEndScreen } from './screens/RoundEndScreen.js';
import { TableScreen } from './screens/TableScreen.js';
import { useGameState } from './state/GameContext.js';
import { useSocketEvents } from './state/useSocketEvents.js';

export function App() {
  useSocketEvents();
  const { connectionStatus, roomState, gameState } = useGameState();

  if (connectionStatus !== 'connected' && !roomState) {
    return (
      <div className="centered-screen">
        <p className="connecting-text">Connecting&hellip;</p>
      </div>
    );
  }

  if (!roomState) return <LobbyScreen />;
  if (roomState.phase === 'lobby') return <RoomScreen />;
  if (!gameState) {
    return (
      <div className="centered-screen">
        <p className="connecting-text">Loading game&hellip;</p>
      </div>
    );
  }

  if (gameState.round.phase === 'exchange') return <ExchangeScreen />;
  if (gameState.round.phase === 'roundEnd') return <RoundEndScreen />;
  return <TableScreen />;
}
