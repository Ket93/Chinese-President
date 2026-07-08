import { useMemo } from 'react';
import { isValidPlay, type ValidationFailureReason } from '@chinese-president/shared';
import { Hand } from '../components/card/Hand.js';
import { PlayAnimationOverlay } from '../components/table/PlayAnimationOverlay.js';
import { PlayerSeat } from '../components/table/PlayerSeat.js';
import { RankLegend } from '../components/table/RankLegend.js';
import { TableCombo } from '../components/table/TableCombo.js';
import { useSelection } from '../hooks/useSelection.js';
import { socket } from '../socket.js';
import { useGameState } from '../state/GameContext.js';

const REASON_TEXT: Record<ValidationFailureReason, string> = {
  NOT_A_VALID_COMBO_SHAPE: 'Not a valid combination.',
  KIND_MISMATCH: 'Must match the combo type on the table.',
  RUN_LENGTH_MISMATCH: 'Run must be the same length as the table.',
  MUST_BEAT_BOMB_WITH_BOMB: 'Only a higher bomb can beat a bomb.',
  DOES_NOT_BEAT_TABLE: 'Not high enough to beat the table.',
};

export function TableScreen() {
  const { gameState, roomState, playerId } = useGameState();
  const { selected, toggle, clear } = useSelection();

  const myIndex = gameState ? gameState.players.findIndex((p) => p.id === playerId) : -1;
  const n = gameState?.players.length ?? 0;

  const seatPositions = useMemo(() => {
    if (!gameState || myIndex < 0 || n === 0) return [];
    const rx = 40;
    const ry = 32;
    return gameState.players.map((_, i) => {
      const offset = (i - myIndex + n) % n;
      const angle = ((90 + offset * (360 / n)) * Math.PI) / 180;
      return { left: 50 + rx * Math.cos(angle), top: 50 + ry * Math.sin(angle) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.players, myIndex, n]);

  if (!gameState || !roomState || !playerId) return null;
  const { round, you, players } = gameState;

  const isMyTurn = round.trick.activePlayerId === playerId;
  const selectedCards = you.hand.filter((c) => selected.has(c.id));
  const ruleCtx = { deckCount: roomState.config.deckCount, runLength: roomState.config.runLength, revolutionActive: round.revolutionActive };
  const validation = selectedCards.length > 0 ? isValidPlay(selectedCards, round.trick.currentCombo, ruleCtx) : null;

  const mustIncludeThreeClubs = round.openingPlayRequiresThreeClubs && round.trick.currentCombo === null;
  const includesThreeClubs = selectedCards.some((c) => c.rank === '3' && c.suit === 'clubs');
  const missingThreeClubs = mustIncludeThreeClubs && selectedCards.length > 0 && !includesThreeClubs;

  const canPlay = isMyTurn && !!validation?.ok && !missingThreeClubs;
  const canPass = isMyTurn && round.trick.currentCombo !== null;

  function handlePlay() {
    if (!canPlay) return;
    socket.emit('game:playCards', { cardIds: [...selected] });
    clear();
  }
  function handlePass() {
    if (!canPass) return;
    socket.emit('game:pass');
    clear();
  }

  return (
    <div className="table-screen">
      {round.revolutionActive && <div className="revolution-banner">REVOLUTION — ranking is reversed!</div>}
      <div className="table-oval">
        {players.map((p, i) => (
          <PlayerSeat
            key={p.id}
            player={p}
            isMe={p.id === playerId}
            isActive={round.trick.activePlayerId === p.id}
            hasPassed={round.trick.passedPlayerIds.includes(p.id)}
            style={{ left: `${seatPositions[i]?.left ?? 50}%`, top: `${seatPositions[i]?.top ?? 50}%` }}
          />
        ))}
        <div className="table-center">
          <TableCombo combo={round.trick.currentCombo} leaderId={round.trick.leaderId} players={players} />
        </div>
        <PlayAnimationOverlay
          combo={round.trick.currentCombo}
          leaderId={round.trick.leaderId}
          players={players}
          seatPositions={seatPositions}
        />
      </div>

      <div className="hand-area">
        <div className={`hand-status${isMyTurn ? ' my-turn' : ''}`}>
          {isMyTurn
            ? mustIncludeThreeClubs
              ? 'Your turn — you must open with a combination that includes the 3 of Clubs'
              : round.trick.currentCombo
                ? 'Your turn — beat the table or pass'
                : 'Your turn — lead with any combination'
            : 'Waiting for other players…'}
        </div>
        <Hand cards={you.hand} selectedIds={selected} onToggle={toggle} disabled={!isMyTurn} />
        <div className="hand-controls">
          <button className="btn" type="button" disabled={!canPlay} onClick={handlePlay}>
            Play
          </button>
          <button className="btn secondary" type="button" disabled={!canPass} onClick={handlePass}>
            Pass
          </button>
        </div>
        {validation && !validation.ok && <p className="validation-hint">{REASON_TEXT[validation.reason]}</p>}
        {validation?.ok && missingThreeClubs && <p className="validation-hint">Your opening play must include the 3 of Clubs.</p>}
      </div>
      <RankLegend revolutionActive={round.revolutionActive} />
    </div>
  );
}
