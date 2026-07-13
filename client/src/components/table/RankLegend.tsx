import { RANKS, SUITS } from '@chinese-president/shared';
import { SUIT_COLOR_VAR, SUIT_SYMBOL } from '../card/suitGlyphs.js';

export interface RankLegendProps {
  revolutionActive?: boolean;
}

export function RankLegend({ revolutionActive = false }: RankLegendProps) {
  const ranks = revolutionActive ? [...RANKS].reverse() : RANKS;

  return (
    <div className="rank-legend panel">
      <div className="rank-legend-title">
        Rank order (low&nbsp;&rarr;&nbsp;high){revolutionActive && <span className="rank-legend-revolution"> — REVERSED</span>}
      </div>
      <div className="rank-legend-ranks">{ranks.join(' < ')}</div>
      <div className="rank-legend-title rank-legend-suit-title">Suit tiebreak (same rank only)</div>
      <div className="rank-legend-suits">
        {SUITS.map((suit, i) => (
          <span key={suit} className="rank-legend-suit-entry">
            <span className="rank-legend-suit" style={{ color: SUIT_COLOR_VAR[suit] }}>
              {SUIT_SYMBOL[suit]}
            </span>
            {i < SUITS.length - 1 && <span className="rank-legend-suit-lt">&lt;</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
