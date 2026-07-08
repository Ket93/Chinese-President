import { RANK_VALUE, type Card } from '@chinese-president/shared';
import { SvgCard } from './SvgCard.js';

export interface HandProps {
  cards: Card[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function Hand({ cards, selectedIds, onToggle, disabled }: HandProps) {
  const sorted = [...cards].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);

  return (
    <div className="hand">
      {sorted.map((card) => (
        <div key={card.id} className="hand-card-slot">
          <SvgCard
            rank={card.rank}
            suit={card.suit}
            selected={selectedIds.has(card.id)}
            disabled={disabled}
            onClick={() => onToggle(card.id)}
          />
        </div>
      ))}
    </div>
  );
}
