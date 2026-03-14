'use client';

import React from 'react';

interface TankerIconProps {
  size?: number;
  color?: string;
  vesselId?: string;
  className?: string;
}

/**
 * Pure SVG string for use in Google Maps data URL markers.
 * Renders a white outline ring with the vessel ID centered inside.
 */
export function tankerSvgString(color: string, vesselId?: string): string {
  const idLabel = vesselId
    ? `<text x="14" y="14" font-size="6.5" font-family="monospace" font-weight="bold" fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="middle">${vesselId}</text>`
    : '';
  return `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
  <circle cx="14" cy="14" r="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.88)" stroke-width="2"/>
  ${idLabel}
</svg>`;
}

/**
 * React component rendering a vessel as a white outline ring.
 * ring stroke uses the color prop; vessel ID shown when size ≥ 20.
 */
export function TankerIcon({ size = 24, color = '#94a3b8', vesselId, className }: TankerIconProps) {
  const showId = !!vesselId && size >= 20;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.05)" stroke={color} strokeWidth="1.8" />
      {showId && (
        <text
          x={cx}
          y={cy}
          fontSize={Math.max(5, size * 0.27)}
          fontFamily="monospace"
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {vesselId}
        </text>
      )}
    </svg>
  );
}
