import { format, parseISO, isValid } from "date-fns";

export function formatCurrency(
  amount: number,
  currency = "AUD",
  locale = "en-AU",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "d MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "d MMM");
  } catch {
    return dateStr;
  }
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function titleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
