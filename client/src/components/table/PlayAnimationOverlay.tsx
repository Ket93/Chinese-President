import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Card, Combo, PlayerPublic } from '@chinese-president/shared';
import { SvgCard } from '../card/SvgCard.js';

export interface SeatPosition {
  left: number;
  top: number;
}

export interface PlayAnimationOverlayProps {
  combo: Combo | null;
  leaderId: string | null;
  players: PlayerPublic[];
  seatPositions: SeatPosition[];
}

interface Flight {
  batchKey: number;
  card: Card;
  index: number;
  fromLeft: number;
  fromTop: number;
}

const FLIGHT_DURATION_MS = 420;
const STAGGER_MS = 60;

export function PlayAnimationOverlay({ combo, leaderId, players, seatPositions }: PlayAnimationOverlayProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const lastSignatureRef = useRef<string | null>(null);
  const batchCounterRef = useRef(0);

  useEffect(() => {
    const signature = combo ? combo.cards.map((c) => c.id).sort().join(',') : null;
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    if (!combo || !leaderId) return;
    const seatIndex = players.findIndex((p) => p.id === leaderId);
    const origin = seatPositions[seatIndex];
    if (!origin) return;

    const batchKey = ++batchCounterRef.current;
    const newFlights: Flight[] = combo.cards.map((card, index) => ({
      batchKey,
      card,
      index,
      fromLeft: origin.left,
      fromTop: origin.top,
    }));

    setFlights((prev) => [...prev, ...newFlights]);
    // Account for the per-card stagger delay so later cards in a multi-card
    // combo (pair/full house/run/bomb) aren't yanked out mid-animation.
    const lifespan = FLIGHT_DURATION_MS + (combo.cards.length - 1) * STAGGER_MS + 80;
    // Intentionally no cleanup-driven clearTimeout here: `players`/`seatPositions`
    // get new array references on every unrelated state broadcast, which would
    // otherwise cancel this timeout before it ever fires. Each batch removes
    // only its own cards via batchKey, so overlapping flights never collide.
    setTimeout(() => {
      setFlights((prev) => prev.filter((f) => f.batchKey !== batchKey));
    }, lifespan);
  }, [combo, leaderId, players, seatPositions]);

  if (flights.length === 0) return null;

  return (
    <div className="flying-card-layer">
      {flights.map((f) => (
        <div
          key={`${f.batchKey}-${f.card.id}`}
          className="flying-card"
          style={
            {
              '--from-left': `${f.fromLeft}%`,
              '--from-top': `${f.fromTop}%`,
              animationDelay: `${f.index * STAGGER_MS}ms`,
            } as CSSProperties
          }
        >
          <SvgCard rank={f.card.rank} suit={f.card.suit} size="small" />
        </div>
      ))}
    </div>
  );
}
