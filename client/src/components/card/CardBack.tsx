import { useId } from 'react';

export interface CardBackProps {
  size?: 'normal' | 'small';
}

export function CardBack({ size = 'normal' }: CardBackProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternId = `cardback-${rawId}`;
  const dims = size === 'small' ? { w: 52, h: 73 } : { w: 76, h: 106 };

  return (
    <div className="svg-card card-back" style={{ width: dims.w, height: dims.h }}>
      <svg viewBox="0 0 100 140" width="100%" height="100%">
        <defs>
          <pattern id={patternId} width="12" height="12" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="var(--card-back-a)" />
            <rect width="6" height="12" fill="var(--card-back-b)" />
          </pattern>
        </defs>
        <rect x="2" y="2" width="96" height="136" rx="10" fill={`url(#${patternId})`} stroke="var(--accent)" strokeWidth="2" />
        <rect x="13" y="13" width="74" height="114" rx="6" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.55" />
      </svg>
    </div>
  );
}
