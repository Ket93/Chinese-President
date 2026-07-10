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

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? '?';
  }

  const requesterName = nameOf(tx.requesterId);
  const targetName = nameOf(tx.targetId);
  const stepLabel =
    exchange.currentIndex === 0 ? "President's Request (1 of 2)" : exchange.currentIndex === 1 ? "President's Request (2 of 2)" : "Vice President's Request";

  // The transaction just before this one already resolved (succeeded or was
  // forfeited) — surface that outcome explicitly, since otherwise the flow
  // just silently moves on and it's not obvious whether the request landed.
  const previousTx = exchange.transactions[exchange.currentIndex - 1];
  let previousOutcome: ReactNode = null;
  if (previousTx) {
    const rankLabel = previousTx.requestedSuit
      ? `the ${previousTx.requestedRank} of ${previousTx.requestedSuit}`
      : `a ${previousTx.requestedRank}`;
    if (previousTx.status === 'forfeited') {
      previousOutcome = (
        <p className="exchange-outcome exchange-outcome-fail">
          &#10060; {nameOf(previousTx.targetId)} didn&rsquo;t have {rankLabel} &mdash; that request came up empty.
        </p>
      );
    } else if (previousTx.status === 'complete') {
      previousOutcome = (
        <p className="exchange-outcome exchange-outcome-success">
          &#9989; {nameOf(previousTx.targetId)} had {rankLabel} and handed it over.
        </p>
      );
    }
  }

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
      <>
        <p className="exchange-outcome exchange-outcome-success">&#9989; {targetName} had it and gave it over! Now give a card back.</p>
        <CardChooserModal
          title={`Choose a card to give back to ${targetName}`}
          cards={you.hand}
          onChoose={(cardId) => socket.emit('exchange:submitReturn', { cardId })}
        />
      </>
    );
  } else if (tx.status === 'awaitingReturn') {
    body = (
      <>
        {tx.targetId === playerId && (
          <p className="exchange-outcome exchange-outcome-success">&#9989; You had it and handed it over to {requesterName}.</p>
        )}
        <p className="exchange-waiting">{requesterName} is choosing a card to give back&hellip;</p>
      </>
    );
  } else {
    body = <p className="exchange-waiting">Resolving&hellip;</p>;
  }

  return (
    <div className="centered-screen">
      <div className="panel exchange-panel">
        <h2>Card Exchange</h2>
        <p className="exchange-step-label">{stepLabel}</p>
        {previousOutcome}
        {body}
      </div>
    </div>
  );
}
