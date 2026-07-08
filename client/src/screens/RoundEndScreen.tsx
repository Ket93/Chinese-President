import type { SeatRankTitle } from '@chinese-president/shared';
import { socket } from '../socket.js';
import { useGameState } from '../state/GameContext.js';

const RANK_TITLE_LABEL: Record<SeatRankTitle, string> = {
  president: 'President',
  vicePresident: 'Vice President',
  citizen: 'Citizen',
  viceAsshole: 'Vice Asshole',
  asshole: 'Asshole',
};

export function RoundEndScreen() {
  const { gameState, roomState, playerId } = useGameState();
  if (!gameState || !roomState) return null;
  const { round, players, sessionStats } = gameState;
  const isHost = roomState.hostId === playerId;

  const finishers = round.finishedOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is (typeof players)[number] => !!p);

  return (
    <div className="centered-screen">
      <div className="panel round-end-panel">
        <h2>Round {round.roundNumber} Complete</h2>
        <ol className="finish-order">
          {finishers.map((p) => (
            <li key={p.id}>
              <span className="finisher-name">{p.name}</span>
              {p.rankTitle && <span className="seat-rank-badge">{RANK_TITLE_LABEL[p.rankTitle]}</span>}
            </li>
          ))}
        </ol>

        <h3>President Wins This Session</h3>
        <ul className="president-stats">
          {players.map((p) => (
            <li key={p.id}>
              {p.name}: {sessionStats.presidentCounts[p.id] ?? 0}
            </li>
          ))}
        </ul>

        {isHost ? (
          <button className="btn" type="button" onClick={() => socket.emit('room:startNextRound')}>
            Start Next Round
          </button>
        ) : (
          <p>Waiting for the host to start the next round&hellip;</p>
        )}
      </div>
    </div>
  );
}
