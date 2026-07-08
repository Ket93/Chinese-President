import type { CSSProperties } from 'react';
import type { PlayerPublic, SeatRankTitle } from '@chinese-president/shared';
import { CardBack } from '../card/CardBack.js';

export interface PlayerSeatProps {
  player: PlayerPublic;
  isMe: boolean;
  isActive: boolean;
  hasPassed: boolean;
  style: CSSProperties;
}

const RANK_TITLE_LABEL: Record<SeatRankTitle, string> = {
  president: 'President',
  vicePresident: 'Vice President',
  citizen: 'Citizen',
  viceAsshole: 'Vice Asshole',
  asshole: 'Asshole',
};

export function PlayerSeat({ player, isMe, isActive, hasPassed, style }: PlayerSeatProps) {
  const backCount = Math.min(player.cardCount, 7);

  return (
    <div className={`player-seat${isActive ? ' active' : ''}${isMe ? ' is-me' : ''}`} style={style}>
      {!isMe && (
        <div className="seat-cards mini-hand">
          {Array.from({ length: backCount }).map((_, i) => (
            <div key={i} className="hand-card-slot">
              <CardBack size="small" />
            </div>
          ))}
        </div>
      )}
      <div className="seat-label">
        <span className="seat-name">
          {player.name}
          {player.isBot ? ' \u{1F916}' : ''}
          {!player.connected && ' (offline)'}
        </span>
        {player.rankTitle && <span className="seat-rank-badge">{RANK_TITLE_LABEL[player.rankTitle]}</span>}
        <span className="seat-count">{player.cardCount} card{player.cardCount === 1 ? '' : 's'}</span>
        {hasPassed && <span className="seat-passed">PASSED</span>}
        {player.isOutOfTrick && <span className="seat-out">OUT</span>}
      </div>
    </div>
  );
}
