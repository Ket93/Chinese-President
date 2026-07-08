import { RANKS, type Rank } from '@chinese-president/shared';

export function RankPicker({ onPick }: { onPick: (rank: Rank) => void }) {
  return (
    <div className="rank-picker">
      {RANKS.map((rank) => (
        <button key={rank} className="btn secondary rank-btn" type="button" onClick={() => onPick(rank)}>
          {rank}
        </button>
      ))}
    </div>
  );
}
