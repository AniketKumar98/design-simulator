const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

export function formatCompactNumber(value) {
  if (!Number.isFinite(value)) {
    return 'inf';
  }

  if (Math.abs(value) < 1000) {
    return `${Math.round(value)}`;
  }

  return compactFormatter.format(value);
}

export function formatRps(value) {
  return `${formatCompactNumber(value)} req/s`;
}

export function formatValueWithUnit(value, unit) {
  return `${formatCompactNumber(value)} ${unit}`;
}

export function formatPercent(value) {
  return `${percentFormatter.format(value * 100)}%`;
}

export function formatUtilization(loadRatio) {
  return `${percentFormatter.format(loadRatio * 100)}%`;
}
