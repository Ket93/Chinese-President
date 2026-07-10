import { useEffect, useRef, useState } from 'react';
import type { PlayerPublic, RoundState } from '@chinese-president/shared';

export interface BigMessageOverlayProps {
  round: RoundState;
  players: PlayerPublic[];
  myPlayerId: string;
}

interface BigMessage {
  id: number;
  title: string;
  subtitle?: string;
  tone: 'info' | 'warning' | 'success';
}

const MESSAGE_LIFETIME_MS = 2200;

export function BigMessageOverlay({ round, players, myPlayerId }: BigMessageOverlayProps) {
  const [messages, setMessages] = useState<BigMessage[]>([]);
  const counterRef = useRef(0);
  const lastTrickSignatureRef = useRef<string | null>(null);
  const lastFinishedCountRef = useRef(round.finishedOrder.length);

  function playerName(id: string): string {
    const p = players.find((pl) => pl.id === id);
    if (!p) return 'Someone';
    return p.id === myPlayerId ? 'You' : p.name;
  }

  function pushMessage(title: string, subtitle: string | undefined, tone: BigMessage['tone']) {
    const id = ++counterRef.current;
    setMessages((prev) => [...prev, { id, title, subtitle, tone }]);
    setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), MESSAGE_LIFETIME_MS);
  }

  // Trick-just-ended: announce whose turn it is (and why the trick ended, if notable).
  useEffect(() => {
    const resolution = round.lastTrickResolution;
    const signature = resolution ? `${resolution.winnerId}-${resolution.reason}-${round.trickHistory.length}` : null;
    if (signature === lastTrickSignatureRef.current) return;
    lastTrickSignatureRef.current = signature;
    if (!resolution || round.trick.currentCombo !== null || !round.trick.leaderId) return;

    const leaderName = playerName(round.trick.leaderId);
    const leadsVerb = leaderName === 'You' ? 'lead' : 'leads';
    if (resolution.reason === 'noOneCanBeat') {
      pushMessage('No one could beat that!', `${leaderName} ${leadsVerb} again`, 'warning');
    } else if (resolution.reason === 'eightEndsRound') {
      pushMessage('8 ends the trick!', `${leaderName} ${leadsVerb} again`, 'warning');
    } else {
      pushMessage(leaderName === 'You' ? 'Your turn!' : `${leaderName}'s turn!`, undefined, 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.lastTrickResolution, round.trick.currentCombo, round.trick.leaderId, round.trickHistory.length]);

  // Someone just emptied their hand.
  useEffect(() => {
    if (round.finishedOrder.length > lastFinishedCountRef.current) {
      for (const id of round.finishedOrder.slice(lastFinishedCountRef.current)) {
        pushMessage(`${playerName(id)} ${playerName(id) === 'You' ? 'are' : 'is'} out of cards!`, undefined, 'success');
      }
    }
    lastFinishedCountRef.current = round.finishedOrder.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.finishedOrder.length]);

  if (messages.length === 0) return null;

  return (
    <div className="big-message-layer">
      {messages.map((m) => (
        <div key={m.id} className={`big-message big-message-${m.tone}`}>
          <div className="big-message-title">{m.title}</div>
          {m.subtitle && <div className="big-message-subtitle">{m.subtitle}</div>}
        </div>
      ))}
    </div>
  );
}
