import type { GameConfig, ThreeClubsTiebreak } from '@chinese-president/shared';
import { RoomCodeBadge } from '../components/common/RoomCodeBadge.js';
import { socket } from '../socket.js';
import { useGameState } from '../state/GameContext.js';

export function RoomScreen() {
  const { roomState, playerId, errorMessage } = useGameState();
  if (!roomState) return null;

  const isHost = roomState.hostId === playerId;
  const config = roomState.config;
  const canStart = roomState.players.length >= 4 && roomState.players.length <= 8;

  function updateConfig(partial: Partial<GameConfig>) {
    socket.emit('room:updateConfig', { config: partial });
  }
  function updateHouseRule(key: keyof GameConfig['houseRules'], value: boolean) {
    updateConfig({ houseRules: { ...config.houseRules, [key]: value } });
  }

  return (
    <div className="centered-screen">
      <div className="panel room-panel">
        <RoomCodeBadge code={roomState.roomCode} />

        <h2>
          Players ({roomState.players.length}/8)
        </h2>
        <ul className="player-list">
          {roomState.players.map((p) => (
            <li key={p.id} className="player-row">
              <span className="player-name">
                {p.name}
                {p.id === roomState.hostId && ' \u{1F451}'}
                {p.isBot && ' \u{1F916}'}
              </span>
              {isHost && p.isBot && (
                <button className="btn secondary small remove-bot-btn" type="button" onClick={() => socket.emit('room:removeBot', { playerId: p.id })}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <div className="host-controls">
            <button className="btn secondary add-bot-btn" type="button" disabled={roomState.players.length >= 8} onClick={() => socket.emit('room:addBot')}>
              + Add Bot
            </button>
          </div>
        )}

        {isHost ? (
          <div className="config-panel">
            <h3>Game Settings</h3>
            <label>
              Deck count
              <select value={config.deckCount} onChange={(e) => updateConfig({ deckCount: Number(e.target.value) as 1 | 2 })}>
                <option value={1}>1 deck (52 cards)</option>
                <option value={2}>2 decks (104 cards)</option>
              </select>
            </label>
            <label>
              Run length
              <input
                type="number"
                min={3}
                max={8}
                value={config.runLength}
                onChange={(e) => updateConfig({ runLength: Number(e.target.value) })}
              />
            </label>
            <label>
              3&#9827; tiebreak (deck count 2)
              <select value={config.threeClubsTiebreak} onChange={(e) => updateConfig({ threeClubsTiebreak: e.target.value as ThreeClubsTiebreak })}>
                <option value="random">Random</option>
                <option value="mostLowCards">Most low cards</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={config.retryFailedRequest} onChange={(e) => updateConfig({ retryFailedRequest: e.target.checked })} />
              Allow retry on a failed exchange request
            </label>
            <h4>House rules</h4>
            <label className="checkbox-row">
              <input type="checkbox" checked={config.houseRules.revolution} onChange={(e) => updateHouseRule('revolution', e.target.checked)} />
              Revolution (bomb flips ranking)
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={config.houseRules.eightEndsRound} onChange={(e) => updateHouseRule('eightEndsRound', e.target.checked)} />
              8 ends the trick
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={config.houseRules.noPassStreakBonus}
                onChange={(e) => updateHouseRule('noPassStreakBonus', e.target.checked)}
              />
              No-pass streak bonus
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={config.houseRules.threeThreeThreeClearsBomb}
                onChange={(e) => updateHouseRule('threeThreeThreeClearsBomb', e.target.checked)}
              />
              3-3-3 clears bomb
            </label>
          </div>
        ) : (
          <div className="config-summary">
            <p>
              {config.deckCount} deck(s) &middot; run length {config.runLength}
            </p>
            <p>Waiting for the host to start the game&hellip;</p>
          </div>
        )}

        {isHost && (
          <button className="btn" type="button" disabled={!canStart} onClick={() => socket.emit('room:startGame')}>
            {canStart ? 'Start Game' : `Need ${Math.max(0, 4 - roomState.players.length)} more player(s)`}
          </button>
        )}

        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </div>
    </div>
  );
}
