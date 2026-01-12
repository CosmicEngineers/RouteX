/**
 * Utility functions for consistent number and currency formatting
 * Prevents React hydration errors by using consistent formatting on both server and client
 */

/**
 * Format number with consistent locale (en-US) to avoid hydration mismatches
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency in Indian Rupees
 * @param value - Amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `₹${formatNumber(value, decimals)}`;
}

/**
 * Format currency in Crores
 * @param value - Amount in rupees
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string in crores
 */
export function formatCrores(value: number, decimals: number = 2): string {
  const crores = value / 10000000; // 1 crore = 10 million
  return `₹${formatNumber(crores, decimals)} Cr`;
}

/**
 * Format large numbers with K/M suffix
 * @param value - Number to format
 * @returns Formatted string with suffix
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${formatNumber(value / 1000000, 1)}M`;
  }
  if (value >= 1000) {
    return `${formatNumber(value / 1000, 1)}K`;
  }
  return formatNumber(value);
}

/**
 * Format percentage
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format weight in metric tons
 * @param value - Weight in MT
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with MT suffix
 */
export function formatMT(value: number, decimals: number = 0): string {
  return `${formatNumber(value, decimals)} MT`;
}

/**
 * Format distance in nautical miles
 * @param value - Distance in NM
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with NM suffix
 */
export function formatNM(value: number, decimals: number = 0): string {
  return `${formatNumber(value, decimals)} NM`;
}
