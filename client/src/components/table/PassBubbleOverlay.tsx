import { useEffect, useRef, useState } from 'react';
import type { PlayerPublic } from '@chinese-president/shared';

export interface SeatPosition {
  left: number;
  top: number;
}

export interface PassBubbleOverlayProps {
  passedPlayerIds: string[];
  players: PlayerPublic[];
  seatPositions: SeatPosition[];
}

interface Bubble {
  id: number;
  left: number;
  top: number;
}

const BUBBLE_LIFETIME_MS = 1600;

/**
 * Pops a transient "PASSED" bubble directly over a player's seat the moment
 * they pass — the persistent small badge on PlayerSeat is easy to miss, this
 * makes it unmistakable in the same visual language as the big center
 * messages.
 */
export function PassBubbleOverlay({ passedPlayerIds, players, seatPositions }: PassBubbleOverlayProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const counterRef = useRef(0);
  const lastPassedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const previouslyPassed = lastPassedRef.current;
    const newlyPassed = passedPlayerIds.filter((id) => !previouslyPassed.has(id));
    lastPassedRef.current = new Set(passedPlayerIds);
    if (newlyPassed.length === 0) return;

    for (const playerId of newlyPassed) {
      const seatIndex = players.findIndex((p) => p.id === playerId);
      const origin = seatPositions[seatIndex];
      if (!origin) continue;
      const id = ++counterRef.current;
      setBubbles((prev) => [...prev, { id, left: origin.left, top: origin.top }]);
      setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== id)), BUBBLE_LIFETIME_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedPlayerIds, players, seatPositions]);

  if (bubbles.length === 0) return null;

  return (
    <div className="pass-bubble-layer">
      {bubbles.map((b) => (
        <div key={b.id} className="pass-bubble" style={{ left: `${b.left}%`, top: `${b.top}%` }}>
          PASS
        </div>
      ))}
    </div>
  );
}
