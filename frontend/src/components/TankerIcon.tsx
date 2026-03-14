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
 * Renders a small yellow filled circle with the vessel ID centered inside.
 */
export function tankerSvgString(_color: string, vesselId?: string): string {
  const idLabel = vesselId
    ? `<text x="11" y="11" font-size="6" font-family="monospace" font-weight="bold" fill="#1a1a1a" text-anchor="middle" dominant-baseline="middle">${vesselId}</text>`
    : '';
  return `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="9" fill="#facc15" stroke="#a16207" stroke-width="1.5"/>
  ${idLabel}
</svg>`;
}

/**
 * React component rendering a vessel as a small yellow filled circle.
 */
export function TankerIcon({ size = 14, color = '#facc15', vesselId, className }: TankerIconProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#a16207" strokeWidth="1" />
    </svg>
  );
}
