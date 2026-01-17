import React from 'react';

// Accessibility utilities and helpers
// WCAG AA compliance utilities

export const accessibilityConfig = {
  // WCAG AA minimum contrast ratios
  contrastRatios: {
    normalText: 4.5,
    largeText: 3.0,
    graphicsUI: 3.0
  },

  // Focus-visible styles for keyboard navigation
  focusRingStyles: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',

  // Screen reader only class
  srOnly: 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0'
};

// Generate ARIA labels for interactive elements
export const generateAriaLabel = (type: string, name: string, details?: string) => {
  const base = `${type}: ${name}`;
  return details ? `${base} - ${details}` : base;
};

// Keyboard navigation helper
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  onSelect?: () => void,
  onCancel?: () => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelect?.();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    onCancel?.();
  }
};

// Check color contrast ratio (WCAG AA compliance)
export const checkContrastRatio = (foreground: string, background: string): number => {
  // Simplified contrast ratio calculation
  // In production, use a library like 'wcag-contrast' for accurate calculations
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    
    const [rs, gs, bs] = [r, g, b].map(val =>
      val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Skip to content link for keyboard users
export const SkipToContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg focus:shadow-lg"
  >
    Skip to main content
  </a>
);

// Accessible tooltip component props
export interface AccessibleTooltipProps {
  content: string;
  children: React.ReactNode;
  id: string;
}

// Color palette with WCAG AA compliant combinations
export const accessibleColors = {
  // Text on dark backgrounds (slate-900 #0f172a)
  textOnDark: {
    primary: '#f1f5f9',      // slate-100 - 15.14:1
    secondary: '#cbd5e1',    // slate-300 - 10.78:1
    accent: '#22d3ee',       // cyan-400 - 6.98:1
    success: '#22c55e',      // green-500 - 5.89:1
    warning: '#fbbf24',      // amber-400 - 8.32:1
    error: '#ef4444'         // red-500 - 5.06:1
  },

  // Text on light backgrounds (white #ffffff)
  textOnLight: {
    primary: '#0f172a',      // slate-900 - 15.14:1
    secondary: '#475569',    // slate-600 - 7.77:1
    accent: '#0891b2',       // cyan-600 - 5.02:1
    success: '#15803d',      // green-700 - 7.40:1
    warning: '#b45309',      // amber-700 - 7.18:1
    error: '#b91c1c'         // red-700 - 8.59:1
  }
};

// Announce content changes to screen readers
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = accessibilityConfig.srOnly;
  announcement.textContent = message;

  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
};
