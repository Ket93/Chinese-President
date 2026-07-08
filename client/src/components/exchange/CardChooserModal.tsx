import type { Card } from '@chinese-president/shared';
import { SvgCard } from '../card/SvgCard.js';

export interface CardChooserModalProps {
  title: string;
  cards: Card[];
  onChoose: (cardId: string) => void;
}

export function CardChooserModal({ title, cards, onChoose }: CardChooserModalProps) {
  return (
    <div className="modal-overlay">
      <div className="panel modal-panel">
        <h3>{title}</h3>
        <div className="mini-hand modal-card-row">
          {cards.map((c) => (
            <div key={c.id} className="hand-card-slot">
              <SvgCard rank={c.rank} suit={c.suit} onClick={() => onChoose(c.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
