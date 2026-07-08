import type { Rank, Suit } from '@chinese-president/shared';
import { CardBack } from './CardBack.js';
import { SUIT_COLOR_VAR, SUIT_SYMBOL } from './suitGlyphs.js';

export interface SvgCardProps {
  rank: Rank;
  suit: Suit;
  selected?: boolean;
  faceUp?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'normal' | 'small';
}

export function SvgCard({ rank, suit, selected = false, faceUp = true, disabled = false, onClick, size = 'normal' }: SvgCardProps) {
  if (!faceUp) return <CardBack size={size} />;

  const color = SUIT_COLOR_VAR[suit];
  const glyph = SUIT_SYMBOL[suit];
  const dims = size === 'small' ? { w: 52, h: 73 } : { w: 76, h: 106 };
  const interactive = !!onClick && !disabled;

  return (
    <button
      type="button"
      className={`svg-card${selected ? ' selected' : ''}${interactive ? ' interactive' : ''}`}
      style={{ width: dims.w, height: dims.h }}
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={selected}
      aria-label={`${rank} of ${suit}`}
    >
      <svg viewBox="0 0 100 140" width="100%" height="100%">
        <rect x="2" y="2" width="96" height="136" rx="10" fill="var(--card-bg)" stroke={selected ? 'var(--accent-strong)' : 'var(--card-border)'} strokeWidth={selected ? 3 : 2} />
        <text x="10" y="24" fontSize="19" fontWeight="700" fill={color}>
          {rank}
        </text>
        <text x="10" y="42" fontSize="17" fill={color}>
          {glyph}
        </text>
        <g transform="rotate(180 50 70)">
          <text x="10" y="24" fontSize="19" fontWeight="700" fill={color}>
            {rank}
          </text>
          <text x="10" y="42" fontSize="17" fill={color}>
            {glyph}
          </text>
        </g>
        <text x="50" y="84" fontSize="40" fill={color} textAnchor="middle">
          {glyph}
        </text>
      </svg>
    </button>
  );
}
