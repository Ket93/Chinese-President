import { useState, type ReactNode } from 'react';
import { RANK_VALUE, type Rank, type Suit } from '@chinese-president/shared';
import { CardChooserModal } from '../components/exchange/CardChooserModal.js';
import { RankPicker } from '../components/exchange/RankPicker.js';
import { SuitPicker } from '../components/exchange/SuitPicker.js';
import { socket } from '../socket.js';
import { useGameState } from '../state/GameContext.js';

function isHighRank(rank: Rank): boolean {
  return RANK_VALUE[rank] > RANK_VALUE['10'];
}

export function ExchangeScreen() {
  const { gameState, playerId } = useGameState();
  const [pendingHighRank, setPendingHighRank] = useState<Rank | null>(null);

  if (!gameState?.round.exchange || !playerId) return null;
  const { round, you, players } = gameState;
  const exchange = round.exchange!;
  const tx = exchange.transactions[exchange.currentIndex];
  if (!tx) return null;

  const requesterName = players.find((p) => p.id === tx.requesterId)?.name ?? '?';
  const targetName = players.find((p) => p.id === tx.targetId)?.name ?? '?';
  const stepLabel =
    exchange.currentIndex === 0 ? "President's Request (1 of 2)" : exchange.currentIndex === 1 ? "President's Request (2 of 2)" : "Vice President's Request";

  function handleRankPick(rank: Rank) {
    if (isHighRank(rank)) {
      setPendingHighRank(rank);
      return;
    }
    socket.emit('exchange:submitRequest', { rank });
  }
  function handleSuitPick(suit: Suit) {
    if (!pendingHighRank) return;
    socket.emit('exchange:submitRequest', { rank: pendingHighRank, suit });
    setPendingHighRank(null);
  }

  let body: ReactNode;

  if (tx.status === 'awaitingRequest' && tx.requesterId === playerId) {
    body = pendingHighRank ? (
      <SuitPicker rank={pendingHighRank} onPick={handleSuitPick} onCancel={() => setPendingHighRank(null)} />
    ) : (
      <>
        <p>Request a card from {targetName}. Ranks 3&ndash;10 need only a rank; J and above need the exact suit too.</p>
        <RankPicker onPick={handleRankPick} />
      </>
    );
  } else if (tx.status === 'awaitingRequest') {
    body = <p className="exchange-waiting">Waiting for {requesterName} to request a card from {targetName}&hellip;</p>;
  } else if (tx.status === 'awaitingTargetChoice' && tx.targetId === playerId) {
    const candidates = you.hand.filter((c) => tx.candidateCardIds?.includes(c.id));
    body = (
      <CardChooserModal
        title={`You have multiple ${tx.requestedRank}s — choose one to give ${requesterName}`}
        cards={candidates}
        onChoose={(cardId) => socket.emit('exchange:submitTargetChoice', { cardId })}
      />
    );
  } else if (tx.status === 'awaitingTargetChoice') {
    body = <p className="exchange-waiting">{targetName} is choosing which card to hand over&hellip;</p>;
  } else if (tx.status === 'awaitingReturn' && tx.requesterId === playerId) {
    body = (
      <CardChooserModal
        title={`Choose a card to give back to ${targetName}`}
        cards={you.hand}
        onChoose={(cardId) => socket.emit('exchange:submitReturn', { cardId })}
      />
    );
  } else if (tx.status === 'awaitingReturn') {
    body = <p className="exchange-waiting">{requesterName} is choosing a card to give back&hellip;</p>;
  } else {
    body = <p className="exchange-waiting">Resolving&hellip;</p>;
  }

  return (
    <div className="centered-screen">
      <div className="panel exchange-panel">
        <h2>Card Exchange</h2>
        <p className="exchange-step-label">{stepLabel}</p>
        {body}
      </div>
    </div>
  );
}
