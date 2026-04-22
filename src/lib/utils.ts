import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export function formatDate(isoString: string) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
