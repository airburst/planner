const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function formatCurrency(n: number): string {
  return gbpFormatter.format(n);
}

export function fmt(n: number): string {
  return formatCurrency(n);
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
